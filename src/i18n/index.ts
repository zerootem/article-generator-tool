import { staticEnglish } from './static-en';
import { dynamicEnglish, englishTemplates } from './dynamic-en';
import { pwaEnglish, publicTitle, publicDescription } from '../pwa/copy';
import { editorEnglish } from './editor-en';

export type UILanguage = 'ar' | 'en';
export const UI_LANGUAGE_KEY = 'modweebUILanguage_v1';
export const normalizeText = (text: string): string => text.trim().replace(/\s+/g, ' ');
export function validLanguage(value: unknown): UILanguage {
  return value === 'en' ? 'en' : 'ar';
}
const english: Record<string, string> = {
  ...staticEnglish, ...dynamicEnglish, ...editorEnglish, ...pwaEnglish,
  'مولد المقالات': 'Article Generator', 'لغة الواجهة': 'Interface language', 'اللغة': 'Language',
  'حفظ': 'Save', 'رجوع': 'Back', 'قفل': 'Lock', 'اختبار': 'Test',
  'إنشاء القفل': 'Create vault', 'تحديث النماذج': 'Refresh models', 'فحص الخادم': 'Check worker',
  'تطبيق التصنيفات': 'Apply labels', 'إغلاق النافذة': 'Close dialog', 'إجراء': 'Action',
  'غير محفوظ — اضغط حفظ': 'Unsaved — press Save',
  'وسجّل الدخول بحسابك.': 'and sign in to your account.',
  'من قائمة المدونات.': 'from your list of blogs.',
  ', الصقه في الحقل أعلاه.': ', paste it into the field above.',
};
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const templates = Object.entries({
  ...englishTemplates,
  'توجد عناوين فرعية لتقسيم المحتوى ({0})': 'Content has subheadings ({0})',
}).map(([source, target]) => {
  const slots: string[] = [];
  let previous = 0, pattern = '';
  for (const match of normalizeText(source).matchAll(/\{(\d+)\}/g)) {
    pattern += escapeRegex(normalizeText(source).slice(previous, match.index)) + '(.+?)';
    slots.push(match[1]); previous = (match.index || 0) + match[0].length;
  }
  pattern += escapeRegex(normalizeText(source).slice(previous));
  return { expression: new RegExp('^' + pattern + '$'), target, slots };
});
export function translateUiText(source: string, language: UILanguage): string {
  if (language === 'ar') return source;
  const key = normalizeText(source);
  let result = english[key];
  if (!result) for (const template of templates) {
    const match = key.match(template.expression);
    if (!match) continue;
    const values = Object.fromEntries(template.slots.map((slot, i) => [slot, match[i + 1]]));
    result = template.target.replace(/\{(\d+)\}/g, (_, slot: string) => values[slot] ?? '');
    break;
  }
  if (!result) return source;
  return (source.match(/^\s*/)?.[0] || '') + result + (source.match(/\s*$/)?.[0] || '');
}

// Text belonging to the article/editor is data, not interface copy.
const protectedContent = '#unifiedPreview, #smartResultContent, #smartEditResultContent, #smartEditPreview, #improveResultBox, #autocompleteResults, #internalLinksResults, #internalLinksList, [data-ui-language-name], [data-i18n-skip]';
const textExclusions = 'script, style, code, pre, kbd, textarea, input, [contenteditable="true"]';
export function isProtectedContent(element: Element): boolean {
  if (element.closest('[data-ui-copy]')) return false;
  return !!element.closest(protectedContent);
}
interface OriginalText { source: string; written: string }
export function installInterfaceLanguage(): void {
  if (window.modweebI18n) return;
  let language: UILanguage = 'ar';
  try {
    const saved = localStorage.getItem(UI_LANGUAGE_KEY);
    const cookie = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
    language = validLanguage(saved || (cookie ? decodeURIComponent(cookie[1]).split('/').pop() : 'ar'));
  } catch { /* Storage restrictions must never prevent in-memory switching. */ }
  // Retire only the old translation cookie, not other application/browser data.
  for (const path of ['/', new URL('.', location.href).pathname]) {
    for (const domain of ['', '; domain=' + location.hostname, '; domain=.' + location.hostname]) {
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domain}`;
    }
  }
  const texts = new WeakMap<Text, OriginalText>();
  const attributes = new WeakMap<Element, Map<string, OriginalText>>();
  function translateText(node: Text): void {
    const parent = node.parentElement;
    if (!parent || parent.closest(textExclusions) || isProtectedContent(parent)) return;
    const old = texts.get(node);
    const source = old && node.data === old.written ? old.source : node.data;
    if (!source.trim()) return;
    const option = parent.closest('option');
    // An option without value otherwise changes its submitted value with its label.
    if (option && !option.hasAttribute('value')) option.setAttribute('value', option.value);
    const written = translateUiText(source, language);
    texts.set(node, { source, written });
    if (node.data !== written) node.data = written;
  }
  function translateAttributes(element: Element): void {
    if (isProtectedContent(element) || element.matches('script,style,code,pre,kbd')) return;
    // Natural-language fields follow their value when filled and UI direction when empty.
    // Explicit LTR code, URLs, provider IDs and password fields remain untouched.
    if (element.matches('input[type="text"][dir="rtl"],input:not([type])[dir="rtl"],textarea[dir="rtl"]') && !element.matches('#unifiedCodeEditor,#unifiedRawHTML')) element.setAttribute('dir', 'auto');
    if (element.matches('select[dir="rtl"]')) element.removeAttribute('dir');
    const values = attributes.get(element) || new Map<string, OriginalText>();
    for (const name of ['title', 'placeholder', 'aria-label', 'aria-description', ...(element.tagName === 'OPTGROUP' ? ['label'] : [])]) {
      const current = element.getAttribute(name);
      if (current === null) continue;
      const old = values.get(name);
      const source = old && current === old.written ? old.source : current;
      const written = translateUiText(source, language);
      values.set(name, { source, written });
      if (current !== written) element.setAttribute(name, written);
    }
    attributes.set(element, values);
  }
  function visit(root: Node): void {
    if (root.nodeType === Node.TEXT_NODE) { translateText(root as Text); return; }
    if (!(root instanceof Element) || isProtectedContent(root) || root.matches('script,style,code,pre,kbd')) return;
    translateAttributes(root);
    for (const element of root.querySelectorAll('*')) translateAttributes(element);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) translateText(node as Text);
  }
  function apply(next: UILanguage): void {
    language = next;
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.getElementById('unifiedShell')?.setAttribute('dir', next === 'ar' ? 'rtl' : 'ltr');
    document.querySelectorAll('#unifiedPreview,#smartResultContent,#smartEditResultContent,#improveResultBox').forEach(element => element.setAttribute('dir', 'auto'));
    document.title = translateUiText(publicTitle, next);
    document.querySelector('meta[name="description"]')?.setAttribute('content', translateUiText(publicDescription, next));
    visit(document.body);
    const button = document.getElementById('modweebTranslateBtn');
    button?.setAttribute('aria-label', translateUiText('لغة الواجهة', next));
    button?.setAttribute('title', translateUiText('لغة الواجهة', next));
    button?.setAttribute('data-current-language', next);
    try { localStorage.setItem(UI_LANGUAGE_KEY, next); } catch { /* Session still works. */ }
  }
  window.modweebI18n = {
    getLanguage: () => language,
    setLanguage: (next: UILanguage) => {
      apply(validLanguage(next));
      window.dispatchEvent(new CustomEvent('modweebLanguageChanged', { detail: { language } }));
    },
    translate: (source: string) => translateUiText(source, language),
  };
  // Batched updates preserve event handlers, focus, input values and article HTML.
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') translateAttributes(record.target as Element);
      else if (record.type === 'characterData') translateText(record.target as Text);
      else for (const node of record.addedNodes) visit(node);
    }
  }).observe(document.body, {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['title', 'placeholder', 'aria-label', 'aria-description', 'label'],
  });
  apply(language);
}
declare global {
  interface Window {
    modweebI18n?: {
      getLanguage: () => UILanguage;
      setLanguage: (language: UILanguage) => void;
      translate: (source: string) => string;
    };
  }
}
