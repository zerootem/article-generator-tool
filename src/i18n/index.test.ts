import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizeText, translateUiText, validLanguage, isProtectedContent } from './index';
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const legacy = readFileSync(new URL('../../public/assets/js/legacy/20-editor-and-integrations.js', import.meta.url), 'utf8');
const languageSection = legacy.slice(legacy.indexOf('(function initModweebTranslate()'), legacy.indexOf('(function initScrollHints()'));
describe('local UI language switching', () => {
  it('normalizes dictionary whitespace but preserves original Arabic text', () => {
    expect(normalizeText('  مولد\nالمقالات  ')).toBe('مولد المقالات');
    expect(translateUiText('  مولد\nالمقالات  ', 'ar')).toBe('  مولد\nالمقالات  ');
    expect(translateUiText('  مولد\nالمقالات  ', 'en')).toBe('  Article Generator  ');
  });
  it('changes common controls without sending them to any translation service', () => {
    expect(translateUiText('اللغة', 'en')).toBe('Language');
    expect(translateUiText('لغة الواجهة', 'en')).toBe('Interface language');
    expect(translateUiText('قوالب', 'en')).toBe('Templates');
    expect(translateUiText('حفظ', 'ar')).toBe('حفظ');
  });
  it('translates short labels produced by modal density', () => {
    expect(translateUiText('حفظ', 'en')).toBe('Save');
    expect(translateUiText('رجوع', 'en')).toBe('Back');
    expect(translateUiText('قفل', 'en')).toBe('Lock');
    expect(translateUiText('اختبار', 'en')).toBe('Test');
  });
  it('localizes dynamic counters while retaining their values and Arabic source', () => {
    expect(translateUiText('توجد عناوين فرعية لتقسيم المحتوى (3)', 'en')).toBe('Content has subheadings (3)');
    expect(translateUiText('تم الحفظ مشفراً: 2 من 5 حقول', 'en')).toBe('Encrypted save: 2 of 5 fields');
    expect(translateUiText('تم الحفظ مشفراً: 2 من 5 حقول', 'ar')).toBe('تم الحفظ مشفراً: 2 من 5 حقول');
  });
  it('never invents translations for model IDs or unknown user text', () => {
    expect(translateUiText('gpt-synthetic-model', 'en')).toBe('gpt-synthetic-model');
    expect(translateUiText('عنوان مقال خاص غير موجود في القاموس', 'en')).toBe('عنوان مقال خاص غير موجود في القاموس');
  });
  it('accepts only supported interface locales', () => {
    expect(validLanguage('en')).toBe('en');
    for (const value of ['ar', 'auto', 'fr', null]) expect(validLanguage(value)).toBe('ar');
  });
  it('protects article/result containers but permits explicit empty-state UI copy', () => {
    const result = { closest: (selector: string) => selector.includes('#unifiedPreview') ? {} : null } as unknown as Element;
    expect(isProtectedContent(result)).toBe(true);
    const empty = { closest: (selector: string) => selector === '[data-ui-copy]' ? {} : null } as unknown as Element;
    expect(isProtectedContent(empty)).toBe(false);
  });
  it('ships no Google translation iframe/widget/script and no locale reload', () => {
    expect(html).not.toContain('google_translate_element');
    expect(html).not.toContain('translate.google.com');
    expect(html).toContain('translate="no"');
    expect(html).toContain('<meta name="google" content="notranslate">');
    expect(languageSection).not.toContain('location.reload');
    expect(languageSection).not.toContain('document.cookie');
    expect(languageSection).toContain('modweebI18n?.setLanguage');
  });
});
