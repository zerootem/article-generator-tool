import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const core = readFileSync(new URL('../../public/assets/js/legacy/10-app-core.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
function fixture(value = '', clipboardFails = false) {
  const input = { value, select() {}, setSelectionRange() {} }, message = {};
  const opened = [], copied = [], statuses = [], sheets = [];
  const context = {
    URL, document: { getElementById: id => id === 'publishedUrlInput' ? input : message },
    navigator: { clipboard: { async writeText(text) { if (clipboardFails) throw new Error('denied'); copied.push(text); } } },
    window: { open: (...args) => opened.push(args) },
    openSheet: id => sheets.push(id), closeSheet() {},
    modweebShowStatus: text => statuses.push(text),
  };
  const source = core.slice(core.indexOf('function showSuccessPopup('), core.indexOf('function sanitizeSlugEnglish('));
  runInNewContext(source, context);
  return { ...context, input, message, opened, copied, statuses, sheets };
}
describe('publication feedback controls', () => {
  it('provides the readonly field expected by the existing success handler', () => {
    expect(html).toContain('id="publishedUrlInput"');
    expect(html).not.toContain('id="successSlugPreview"');
    const x = fixture(); x.showSuccessPopup('https://example.com/post', 'post');
    expect(x.input.value).toBe('https://example.com/post');
    expect(x.sheets).toEqual(['successSheet']);
  });
  it('copies the actual URL with truthful success feedback', async () => {
    const x = fixture('https://example.com/post'); await x.copyPublishedUrl();
    expect(x.copied).toEqual(['https://example.com/post']);
    expect(x.statuses).toContain('تم نسخ الرابط');
  });
  it('does not claim clipboard success after failure', async () => {
    const x = fixture('https://example.com/post', true); await x.copyPublishedUrl();
    expect(x.statuses).not.toContain('تم نسخ الرابط');
    expect(x.statuses[0]).toContain('تعذر النسخ');
  });
  it('retains the fallback when Clipboard API is unavailable', async () => {
    const x = fixture('https://example.com/post');
    x.navigator.clipboard = null;
    x.document.execCommand = () => true;
    await x.copyPublishedUrl();
    expect(x.statuses).toContain('تم نسخ الرابط');
  });
  it('opens valid web links without access to the opener', () => {
    const x = fixture('https://example.com/post'); x.openPublishedUrl();
    expect(x.opened).toEqual([['https://example.com/post', '_blank', 'noopener,noreferrer']]);
  });
  it('rejects executable and empty links', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,test', '']) {
      const x = fixture(url); x.openPublishedUrl();
      expect(x.opened).toHaveLength(0); expect(x.statuses).toContain('رابط المنشور غير صالح');
    }
  });
});
