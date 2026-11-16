import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { translateUiText } from './index';
const root = new URL('../../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const css = readFileSync(new URL('src/styles/app.css', root), 'utf8');
const locale = readFileSync(new URL('src/i18n/index.ts', root), 'utf8');
describe('confirmed interface layout regressions', () => {
  it('localizes known editor type headers without translating user data', () => {
    expect(translateUiText('إضافة أسئلة شائعة','en')).toBe('Add FAQ');
    expect(translateUiText('تعديل عنوان','en')).toBe('Edit heading');
    expect(translateUiText('أسئلة وأجوبة مع microdata (FAQPage).','en')).toBe('Questions and answers with FAQPage microdata.');
    expect(translateUiText('إضافة أسئلة شائعة','ar')).toBe('إضافة أسئلة شائعة');
  });
  it('keeps native-language fields automatic and select/code semantics separate', () => {
    expect(locale).toContain("element.setAttribute('dir', 'auto')");
    expect(locale).toContain("element.matches('select[dir=\"rtl\"]')");
    expect(locale).toContain("document.getElementById('unifiedShell')?.setAttribute('dir'");
    expect(locale).toContain("!element.matches('#unifiedCodeEditor,#unifiedRawHTML')");
    for (const selector of ['.improve-result-box', '.seo-meta-field input,.seo-meta-field textarea', '.tmpl-setup-field input,.tmpl-setup-field textarea', '.smart-result-block']) {
      const rule = css.slice(css.indexOf(selector+'{')).split('}')[0];
      expect(rule).not.toMatch(/direction\s*:\s*rtl/);
    }
    expect(css).toContain('[dir="auto"]:placeholder-shown { direction: rtl; }');
  });
  it('raises secondary text contrast in light mode without replacing the dark override', () => {
    expect(css).toContain('--notifC:#5b6575');expect(css).not.toContain('--notifC:#888');
    expect(css).toContain('--notifC:rgba(255,255,255,.9)');
  });
  it('shortens the template return label while preserving its destination and SVG', () => {
    expect(html).toMatch(/onclick="openSheet\('templatesSheet'\)"[^>]*aria-label="العودة إلى مكتبة القوالب"[^>]*>[\s\S]*?<svg[\s\S]*?<span>رجوع<\/span><\/button>/);
  });
});
