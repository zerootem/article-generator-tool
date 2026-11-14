import type { WorkerAIRequest } from '../main';

export interface WorkerAIClient {
  configured: boolean;
  baseUrl: string | null;
  generate(request: WorkerAIRequest): Promise<string>;
  adminStatus(): Promise<{
    authenticated: boolean;
    email: string;
    providerConfigured: boolean;
    modelConfigured: boolean;
    settingsReady: boolean;
    allowedModels: string[];
    currentModel: string;
  }>;
  saveModel(model: string): Promise<void>;
}

const configuredUrl = String(import.meta.env.VITE_WORKER_URL || '').trim();
const baseUrl = configuredUrl ? configuredUrl.replace(/\/+$/, '') : '';
const configured = /^https:\/\//i.test(baseUrl);

async function request(path: string, init: RequestInit): Promise<unknown> {
  if (!configured) throw new Error('الخادم الآمن غير مضبوط في إعدادات البناء بعد.');
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: { ...(init.body ? { 'Content-Type': 'text/plain;charset=UTF-8' } : {}), ...(init.headers || {}) },
    });
  } catch {
    throw new Error('تعذر الاتصال بالخادم الآمن. تحقق من إعداد Cloudflare Access وCORS والاتصال.');
  }
  let data: Record<string, unknown> = {};
  try { data = await response.json() as Record<string, unknown>; } catch { /* generic message below */ }
  if (!response.ok) {
    const errors: Record<string, string> = {
      unauthorized: 'سجّل الدخول بحساب المالك عبر Cloudflare Access ثم أعد المحاولة.',
      origin_not_allowed: 'عنوان هذه الصفحة غير مسموح به في إعداد الخادم.',
      rate_limited: 'تم تجاوز حد الطلبات المؤقت. انتظر قليلاً ثم حاول مجدداً.',
      service_not_configured: 'لم تكتمل إعدادات خدمة الذكاء الاصطناعي بعد.',
      upstream_error: 'تعذر إكمال الطلب لدى مزود الذكاء الاصطناعي.',
      generation_failed: 'تعذر توليد المحتوى حالياً.',
      model_not_allowed: 'النموذج المطلوب غير مسموح به على الخادم.',
    };
    const code = typeof data.error === 'string' ? data.error : '';
    throw new Error(errors[code] || 'تعذر تنفيذ الطلب الآمن.');
  }
  return data;
}

export const workerAI: WorkerAIClient = {
  configured,
  baseUrl: configured ? baseUrl : null,
  async generate(input) {
    const data = await request('/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        systemPrompt: input.systemPrompt,
        userPrompt: input.userPrompt,
        jsonMode: input.jsonMode === true,
        ...(input.model ? { model: input.model } : {}),
      }),
    }) as { text?: unknown };
    if (typeof data.text !== 'string' || !data.text.trim()) throw new Error('لم يُرجع الخادم الآمن محتوى صالحاً.');
    return data.text;
  },
  async adminStatus() {
    return await request('/api/admin/status', { method: 'GET' }) as {
      authenticated: boolean; email: string; providerConfigured: boolean; modelConfigured: boolean; settingsReady: boolean;
      allowedModels: string[]; currentModel: string;
    };
  },
  async saveModel(model) {
    await request('/api/admin/settings', { method: 'POST', body: JSON.stringify({ model }) });
  },
};
