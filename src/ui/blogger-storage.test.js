import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
const source = readFileSync(new URL('../../public/assets/js/legacy/20-editor-and-integrations.js', import.meta.url), 'utf8');
const start = source.indexOf('const BLOG_PREFIX', source.indexOf('(function initBloggerSettings()'));
const end = source.indexOf('  // ============ رسم التبويبات ============', start);
async function fixture() {
  const key = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const data = new Map(); let unlocked = true, blocked = false;
  let field = null;
  const cryptoAPI = {
    isUnlocked: () => unlocked,
    async encrypt(text) {
      const iv = webcrypto.getRandomValues(new Uint8Array(12));
      const value = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
      return Buffer.from(iv).toString('base64') + '::' + Buffer.from(value).toString('base64');
    },
    async decrypt(payload) {
      try {
        const [iv, value] = payload.split('::');
        return new TextDecoder().decode(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(iv, 'base64') }, key, Buffer.from(value, 'base64')));
      } catch { return ''; }
    },
  };
  const context = {
    STORAGE_KEY: 'synthetic-blogger-test', FIELD_ORDER: ['blogId', 'apiKey', 'clientId', 'clientSecret', 'refreshToken'],
    drafts: {}, savedValues: {},
    window: { modweebCrypto: cryptoAPI }, atob, btoa,
    localStorage: {
      getItem: id => data.get(id) || null,
      setItem: (id, value) => { if (blocked) throw new Error('QuotaExceededError'); data.set(id, value); },
    }, document: { getElementById: () => field },
  };
  runInNewContext(source.slice(start, end) + '\nglobalThis.store = { loadSettings, saveSettings, readStoredPayloads, captureCurrentField };', context);
  return { ...context.store, data, cryptoAPI, drafts: context.drafts, setField: value => { field = value; }, lock: () => { unlocked = false; }, block: () => { blocked = true; }, raw: () => data.get(context.STORAGE_KEY), seed: value => data.set(context.STORAGE_KEY, value) };
}
describe('Blogger encrypted persistence', () => {
  it('does not treat an unedited empty locked field as an overriding draft', async () => {
    const x = await fixture();
    x.setField({ value: '', dataset: { field: 'blogId', dirty: 'false' } });
    x.captureCurrentField(); expect(x.drafts).toEqual({});
    x.setField({ value: '900', dataset: { field: 'blogId', dirty: 'true' } });
    x.captureCurrentField(); expect(x.drafts).toEqual({ blogId: '900' });
  });
  it('stores actual ciphertext, not plaintext or Base64 fallback', async () => {
    const x = await fixture(); await x.saveSettings({ apiKey: 'synthetic-api-key-only' });
    expect(x.raw()).not.toContain('synthetic-api-key-only');
    expect(x.readStoredPayloads().apiKey).toContain('::');
    expect(await x.loadSettings()).toEqual({ apiKey: 'synthetic-api-key-only' });
  });
  it('merges a changed field without replacing other encrypted values', async () => {
    const x = await fixture(); await x.saveSettings({ blogId: '100', clientSecret: 'synthetic-secret' });
    const secret = x.readStoredPayloads().clientSecret;
    await x.saveSettings({ blogId: '200' });
    expect(x.readStoredPayloads().clientSecret).toBe(secret);
    expect(await x.loadSettings()).toEqual({ blogId: '200', clientSecret: 'synthetic-secret' });
  });
  it('rejects locked writes and preserves existing records', async () => {
    const x = await fixture(); await x.saveSettings({ apiKey: 'synthetic-key' }); const raw = x.raw(); x.lock();
    await expect(x.saveSettings({ blogId: '300' })).rejects.toThrow('افتح الخزنة');
    expect(x.raw()).toBe(raw); expect(await x.loadSettings()).toEqual({});
  });
  it('never silently overwrites damaged JSON or invalid record shapes', async () => {
    for (const raw of ['{broken', '[]', '{"apiKey":42}']) {
      const x = await fixture(); x.seed(raw);
      await expect(x.saveSettings({ blogId: '400' })).rejects.toThrow();
      expect(x.raw()).toBe(raw);
    }
  });
  it('reports unreadable encrypted fields rather than returning an empty success', async () => {
    const x = await fixture(); x.seed('{"apiKey":"not-an-aes-record"}');
    await expect(x.loadSettings()).rejects.toThrow('لن تُستبدل');
    expect(x.raw()).toBe('{"apiKey":"not-an-aes-record"}');
  });
  it('propagates storage write failure without changing the existing blob', async () => {
    const x = await fixture(); await x.saveSettings({ blogId: '500' }); const raw = x.raw(); x.block();
    await expect(x.saveSettings({ blogId: '600' })).rejects.toThrow('QuotaExceededError');
    expect(x.raw()).toBe(raw);
  });
  it('can read both legacy encodings after unlocking for migration', async () => {
    const x = await fixture(); x.seed(JSON.stringify({ apiKey: 'mwbg:' + btoa('synthetic-old-key'), refreshToken: 'plain:' + btoa('synthetic-old-token') }));
    const values = await x.loadSettings(); expect(values).toEqual({ apiKey: 'synthetic-old-key', refreshToken: 'synthetic-old-token' });
    await x.saveSettings(values); expect(x.raw()).not.toContain('mwbg:'); expect(x.raw()).not.toContain('plain:');
  });
  it('does not erase a stored key when another update is blank', async () => {
    const x = await fixture(); await x.saveSettings({ clientSecret: 'synthetic-secret' }); const raw = x.raw();
    await x.saveSettings({ clientSecret: '' }); expect(x.raw()).toBe(raw);
  });
});
