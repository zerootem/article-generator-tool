import { describe, expect, it } from 'vitest';
import worker, { validateGeneratePayload, type WorkerEnv } from './index';

const allowedOrigin = 'https://zerootem.github.io';
const baseEnv: WorkerEnv = {
  ALLOWED_ORIGINS: allowedOrigin,
  TEAM_DOMAIN: 'https://team.cloudflareaccess.com',
  POLICY_AUD: 'test-audience',
  ADMIN_EMAIL: 'owner@example.com',
};

describe('worker API guardrails', () => {
  it('accepts only bounded non-empty prompts', () => {
    expect(validateGeneratePayload({ systemPrompt: 'system', userPrompt: 'article' })).toMatchObject({
      systemPrompt: 'system', userPrompt: 'article', jsonMode: false,
    });
    expect(validateGeneratePayload({ systemPrompt: '', userPrompt: 'article' })).toBeNull();
    expect(validateGeneratePayload({ systemPrompt: 's'.repeat(16_001), userPrompt: 'article' })).toBeNull();
    expect(validateGeneratePayload(['system', 'user'])).toBeNull();
  });

  it('returns a basic health response without disclosing configuration', async () => {
    const response = await worker.fetch(new Request('https://worker.example/api/health'), baseEnv);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('rejects an unlisted origin before performing any API action', async () => {
    const response = await worker.fetch(new Request('https://worker.example/api/admin/status', {
      headers: { Origin: 'https://attacker.example' },
    }), baseEnv);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'origin_not_allowed' });
  });

  it('requires an Access JWT for admin status even when origin is allowed', async () => {
    const response = await worker.fetch(new Request('https://worker.example/api/admin/status', {
      headers: { Origin: allowedOrigin },
    }), baseEnv);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'unauthorized' });
  });
});
