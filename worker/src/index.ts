import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface KVNamespace {
  get<T = unknown>(key: string, type?: 'json'): Promise<T | null>;
  put(key: string, value: string): Promise<void>;
}

export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface WorkerEnv {
  TEAM_DOMAIN?: string;
  POLICY_AUD?: string;
  ADMIN_EMAIL?: string;
  ALLOWED_ORIGINS?: string;
  AI_PROVIDER_API_KEY?: string;
  AI_MODEL?: string;
  AI_ALLOWED_MODELS?: string;
  AI_SETTINGS?: KVNamespace;
  AI_RATE_LIMITER?: RateLimiter;
}

export interface GeneratePayload {
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
  model?: string;
}

const MAX_BODY_BYTES = 40_000;
const MAX_PROMPT_CHARS = 16_000;
const MAX_OUTPUT_TOKENS = 5_000;
const UPSTREAM_TIMEOUT_MS = 45_000;
const DEFAULT_ALLOWED_MODELS = ['gpt-4.1-mini'];
const SAFE_HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...SAFE_HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

function getOrigins(env: WorkerEnv): string[] {
  return (env.ALLOWED_ORIGINS || '').split(',').map((x) => x.trim()).filter(Boolean);
}

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

function isAllowedOrigin(request: Request, env: WorkerEnv): string | null {
  const origin = request.headers.get('Origin');
  if (!origin || !getOrigins(env).includes(origin)) return null;
  return origin;
}

export function validateGeneratePayload(value: unknown): GeneratePayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.systemPrompt !== 'string' || typeof record.userPrompt !== 'string') return null;
  if (!record.systemPrompt.trim() || !record.userPrompt.trim()) return null;
  if (record.systemPrompt.length > MAX_PROMPT_CHARS || record.userPrompt.length > MAX_PROMPT_CHARS) return null;
  if (record.jsonMode !== undefined && typeof record.jsonMode !== 'boolean') return null;
  if (record.model !== undefined && (typeof record.model !== 'string' || record.model.length > 100)) return null;
  return {
    systemPrompt: record.systemPrompt,
    userPrompt: record.userPrompt,
    jsonMode: record.jsonMode === true,
    model: typeof record.model === 'string' ? record.model : undefined,
  };
}

async function authenticatedEmail(request: Request, env: WorkerEnv): Promise<string | null> {
  const teamDomain = env.TEAM_DOMAIN;
  const audience = env.POLICY_AUD;
  const adminEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!teamDomain || !audience || !adminEmail) return null;

  let issuer: URL;
  try {
    issuer = new URL(teamDomain);
  } catch {
    return null;
  }
  if (issuer.protocol !== 'https:' || !issuer.hostname.endsWith('.cloudflareaccess.com')) return null;

  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token || token.length > 12_000) return null;

  try {
    const jwks = createRemoteJWKSet(new URL('/cdn-cgi/access/certs', issuer));
    const { payload } = await jwtVerify(token, jwks, { issuer: issuer.origin, audience });
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    if (!email || email !== adminEmail) return null;
    return email;
  } catch {
    return null;
  }
}

async function checkRateLimit(email: string, env: WorkerEnv): Promise<'ok' | 'limited' | 'unavailable'> {
  // Refuse requests without the binding: the shared upstream key must never be exposed
  // through an unbounded endpoint when the production limiter has not been configured.
  if (!env.AI_RATE_LIMITER) return 'unavailable';
  try {
    const { success } = await env.AI_RATE_LIMITER.limit({ key: email });
    return success ? 'ok' : 'limited';
  } catch {
    return 'unavailable';
  }
}

function allowedModels(env: WorkerEnv): string[] {
  // This allowlist is non-secret deployment configuration, not user-controlled input.
  if (env.AI_ALLOWED_MODELS) {
    try {
      const values = JSON.parse(env.AI_ALLOWED_MODELS);
      if (Array.isArray(values)) return values.filter((x): x is string => typeof x === 'string' && /^[a-zA-Z0-9._:/-]{1,100}$/.test(x));
    } catch { return []; }
  }
  const configured = env.AI_MODEL?.trim();
  return configured ? [configured] : DEFAULT_ALLOWED_MODELS;
}

async function readBody(request: Request): Promise<unknown | null> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) return null;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function generate(request: Request, env: WorkerEnv, email: string): Promise<Response> {
  const cors = corsHeaders(request.headers.get('Origin') || '');
  if (!env.AI_PROVIDER_API_KEY || !env.AI_MODEL || !env.AI_SETTINGS || !env.AI_RATE_LIMITER) {
    return json({ error: 'service_not_configured' }, 503, cors);
  }
  const limit = await checkRateLimit(email, env);
  if (limit === 'unavailable') return json({ error: 'service_not_configured' }, 503, cors);
  if (limit === 'limited') return json({ error: 'rate_limited' }, 429, cors);

  const raw = await readBody(request);
  const input = validateGeneratePayload(raw);
  if (!input) return json({ error: 'invalid_request' }, 400, cors);

  let configuredModel = env.AI_MODEL.trim();
  try {
    const stored = await env.AI_SETTINGS.get<{ model?: string }>('settings', 'json');
    if (stored?.model && allowedModels(env).includes(stored.model)) configuredModel = stored.model;
  } catch {
    return json({ error: 'service_not_configured' }, 503, cors);
  }
  const requestedModel = input.model || configuredModel;
  if (!allowedModels(env).includes(requestedModel)) return json({ error: 'model_not_allowed' }, 400, cors);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.AI_PROVIDER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: requestedModel,
        messages: [
          { role: 'system', content: input.systemPrompt },
          { role: 'user', content: input.userPrompt },
        ],
        max_tokens: MAX_OUTPUT_TOKENS,
        ...(input.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!upstream.ok) return json({ error: 'upstream_error' }, 502, cors);
    const data = await upstream.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) return json({ error: 'empty_response' }, 502, cors);
    return json({ text: content }, 200, corsHeaders(request.headers.get('Origin') || ''));
  } catch {
    return json({ error: 'generation_failed' }, 502, cors);
  } finally {
    clearTimeout(timeout);
  }
}

async function adminStatus(email: string, env: WorkerEnv, request: Request): Promise<Response> {
  let storedModel = '';
  let settingsReady = false;
  if (env.AI_SETTINGS) {
    try {
      const stored = await env.AI_SETTINGS.get<{ model?: string }>('settings', 'json');
      settingsReady = !!stored;
      if (stored?.model && allowedModels(env).includes(stored.model)) storedModel = stored.model;
    } catch { /* no details */ }
  }
  const models = allowedModels(env);
  return json({
    authenticated: true,
    email,
    providerConfigured: !!env.AI_PROVIDER_API_KEY,
    modelConfigured: !!env.AI_MODEL,
    settingsReady,
    allowedModels: models,
    currentModel: storedModel || env.AI_MODEL || models[0] || '',
  }, 200, corsHeaders(request.headers.get('Origin') || ''));
}

async function updateAdminSettings(request: Request, env: WorkerEnv): Promise<Response> {
  const cors = corsHeaders(request.headers.get('Origin') || '');
  if (!env.AI_SETTINGS || !env.AI_MODEL) return json({ error: 'service_not_configured' }, 503, cors);
  const value = await readBody(request);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return json({ error: 'invalid_request' }, 400, cors);
  const model = (value as Record<string, unknown>).model;
  if (typeof model !== 'string' || !allowedModels(env).includes(model)) return json({ error: 'model_not_allowed' }, 400, cors);
  try {
    await env.AI_SETTINGS.put('settings', JSON.stringify({ model, updatedAt: new Date().toISOString() }));
    return json({ saved: true }, 200, corsHeaders(request.headers.get('Origin') || ''));
  } catch {
    return json({ error: 'settings_unavailable' }, 503);
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/health' && request.method === 'GET') return json({ ok: true });

    const origin = isAllowedOrigin(request, env);
    if (!origin) return json({ error: 'origin_not_allowed' }, 403);
    const headers = corsHeaders(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

    if (!['POST', 'GET'].includes(request.method)) return json({ error: 'not_found' }, 404, headers);
    const email = await authenticatedEmail(request, env);
    if (!email) return json({ error: 'unauthorized' }, 401, headers);

    if (url.pathname === '/api/generate' && request.method === 'POST') return generate(request, env, email);
    if (url.pathname === '/api/admin/status' && request.method === 'GET') return adminStatus(email, env, request);
    if (url.pathname === '/api/admin/settings' && request.method === 'POST') return updateAdminSettings(request, env);
    return json({ error: 'not_found' }, 404, headers);
  },
};
