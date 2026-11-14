type EditScope = 'article' | 'selection';
type SmartMode = 'assistant' | 'edit' | 'improve';
interface EditorSelection {
  start: number;
  end: number;
  baseHtml: string;
  html: string;
}

const w = window as any;
const byId = (id: string) => document.getElementById(id);

function captureSelection(): EditorSelection {
  const editor = byId('unifiedCodeEditor') as HTMLTextAreaElement | null;
  const baseHtml = editor?.value || '';
  const start = editor?.selectionStart ?? baseHtml.length;
  const end = editor?.selectionEnd ?? start;
  return { start, end, baseHtml, html: baseHtml.slice(start, end) };
}

function plainText(html: string): string {
  const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
  return (parsed.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function cleanHtml(html: string): string {
  if (typeof w.modweebSanitizeHtml === 'function') return w.modweebSanitizeHtml(String(html || ''));
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,form,meta,link').forEach((node) => node.remove());
  doc.body.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      if (/^on/i.test(attribute.name) || (/^(href|src|xlink:href)$/i.test(attribute.name) && /^\s*javascript:/i.test(attribute.value))) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  return doc.body.innerHTML;
}

function escapeText(text: string): string {
  if (typeof w.modweebEscapeHtml === 'function') return w.modweebEscapeHtml(String(text));
  return String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
}

function toParagraphHtml(text: string, blockContext: boolean): string {
  const pieces = String(text || '').trim().split(/\n\s*\n/).filter(Boolean);
  if (!pieces.length) return '';
  return pieces.map((piece) => {
    const safe = escapeText(piece).replace(/\n/g, '<br>');
    return blockContext ? `<p>${safe}</p>` : safe;
  }).join(blockContext ? '\n' : '<br>');
}

function parseJson(raw: string): any {
  const ai = w.modweebAI;
  const parsed = ai?.parseJSON?.(raw);
  if (parsed && typeof parsed === 'object') return parsed;
  const cleaned = String(raw || '').replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

function showMessage(message: string, duration = 3000): void {
  if (typeof w.modweebShowStatus === 'function') w.modweebShowStatus(message, duration);
}

function renderSmartResult(text: string): void {
  const content = byId('smartResultContent');
  const preview = byId('smartResultPreview');
  const insert = byId('smartInsertBtn') as HTMLButtonElement | null;
  const copy = byId('smartCopyBtn') as HTMLButtonElement | null;
  if (content) content.textContent = text || 'لم يُرجع النموذج نتيجة.';
  if (preview) preview.style.display = 'block';
  if (insert) insert.style.display = 'inline-flex';
  if (copy) copy.style.display = 'inline-flex';
}

async function callAI(systemPrompt: string, userPrompt: string, options: Record<string, unknown> = {}): Promise<string> {
  if (!w.modweebAI?.call) throw new Error('خدمة الذكاء الاصطناعي غير مهيأة.');
  return await w.modweebAI.call({ systemPrompt, userPrompt, ...options });
}

function applyEditorHtml(nextHtml: string, cursor: number): void {
  if (typeof w.modweebCommitHTML === 'function') w.modweebCommitHTML(nextHtml, { save: true });
  else {
    const editor = byId('unifiedCodeEditor') as HTMLTextAreaElement | null;
    if (editor) editor.value = nextHtml;
  }
  const editor = byId('unifiedCodeEditor') as HTMLTextAreaElement | null;
  if (editor) {
    const position = Math.max(0, Math.min(cursor, editor.value.length));
    editor.focus();
    editor.setSelectionRange(position, position);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

async function smartGenerate(): Promise<void> {
  const mode = (w._smartAssistantMode || 'assistant') as SmartMode;
  if (mode === 'improve') { await runImproveText(); return; }
  const topic = (byId('smartContextTopic') as HTMLInputElement | null)?.value.trim() || '';
  const language = (byId('aiLanguage') as HTMLSelectElement | null)?.value || 'ar';
  const button = byId('smartGenBtn') as HTMLButtonElement | null;
  const progress = byId('smartProgressBar');
  const preview = byId('smartResultPreview');
  const insertButton = byId('smartInsertBtn') as HTMLButtonElement | null;
  const copyButton = byId('smartCopyBtn') as HTMLButtonElement | null;
  if (button) { button.disabled = true; button.textContent = mode === 'edit' ? 'جارٍ إعداد التعديل…' : 'جارٍ التوليد…'; }
  if (progress) progress.style.display = 'block';
  if (preview) preview.style.display = 'none';
  if (insertButton) insertButton.style.display = 'none';
  if (copyButton) copyButton.style.display = 'none';

  try {
    if (mode === 'edit') {
      const instruction = (byId('smartEditPrompt') as HTMLTextAreaElement | null)?.value.trim() || '';
      const scope = ((byId('smartEditScope') as HTMLSelectElement | null)?.value || 'article') as EditScope;
      const editor = byId('unifiedCodeEditor') as HTMLTextAreaElement | null;
      if (!instruction) throw new Error('اكتب وصف التعديل المطلوب أولاً.');
      if (!editor) throw new Error('محرر المقال غير متاح.');
      const selection = (w._smartSelection || captureSelection()) as EditorSelection;
      const currentHtml = editor.value;
      let content = currentHtml;
      if (scope === 'selection') {
        if (selection.start === selection.end || !selection.html.trim()) throw new Error('حدد جزءاً من HTML قبل اختيار نطاق «النص المحدد».');
        if (currentHtml.slice(selection.start, selection.end) !== selection.html) throw new Error('تغير المقال منذ فتح المساعد؛ أغلقه وحدد الجزء من جديد.');
        content = selection.html;
      } else if (currentHtml.length > 30000) {
        throw new Error('المقال طويل جداً للتحرير الكامل الآمن. استخدم «النص المحدد فقط» لتجنب فقد أي جزء.');
      }
      const prompts = w.modweebPrompts;
      if (!prompts?.smartArticleEdit) throw new Error('قالب تحرير المقال غير متاح.');
      const request = prompts.smartArticleEdit({ prompt: instruction, topic, language, scope, content });
      const raw = await callAI(request.systemPrompt, request.userPrompt, { maxTokens: 6000, jsonMode: true });
      const result = parseJson(raw);
      if (scope === 'selection') {
        const replacementHtml = cleanHtml(String(result.replacementHtml || ''));
        if (!replacementHtml.trim()) throw new Error('لم يُرجع النموذج HTML بديلاً صالحاً.');
        w._smartLastResult = { mode: 'edit', scope, baseHtml: currentHtml, start: selection.start, end: selection.end, originalHtml: selection.html, replacementHtml };
        w._smartLastHTML = replacementHtml;
        renderSmartResult(`المقطع المحدد:\n${selection.html}\n\nالتعديل المقترح:\n${replacementHtml}`);
      } else {
        const findHtml = String(result.findHtml || '').trim();
        const replacementHtml = cleanHtml(String(result.replacementHtml || ''));
        if (!findHtml || !replacementHtml.trim()) throw new Error('لم يُرجع النموذج رقعة تعديل مكتملة.');
        const hits = currentHtml.split(findHtml).length - 1;
        if (hits !== 1) throw new Error(hits === 0 ? 'المقتطف المقترح لا يطابق HTML الحالي حرفياً. أعد المحاولة أو حدد المقطع.' : 'المقتطف يتكرر في المقال؛ استخدم تحديداً أدق لتجنب تعديل الموضع الخطأ.');
        w._smartLastResult = { mode: 'edit', scope, baseHtml: currentHtml, findHtml, replacementHtml };
        w._smartLastHTML = replacementHtml;
        renderSmartResult(`المقتطف الذي سيُستبدل:\n${findHtml}\n\nالتعديل المقترح:\n${replacementHtml}`);
      }
      const insert = byId('smartInsertBtn');
      if (insert) insert.textContent = 'تطبيق التعديل';
      showMessage('اكتمل الاقتراح. راجعه قبل التطبيق.');
      return;
    }

    const prompt = (byId('smartPromptInput') as HTMLTextAreaElement | null)?.value.trim() || '';
    if (!prompt) throw new Error('اكتب أمراً أولاً.');
    const format = w._smartFormat || 'html';
    const request = w.modweebPrompts.smartAssistant({ prompt, topic, language, format });
    const raw = await callAI(request.systemPrompt, request.userPrompt, { maxTokens: 3000 });
    const cleaned = String(raw || '').replace(/^\s*```(?:html|text)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    w._smartLastResult = { mode: 'assistant', html: cleaned };
    w._smartLastHTML = cleaned;
    renderSmartResult(cleaned || '(لا نتيجة)');
    showMessage('تم التوليد. راجع النتيجة قبل إدراجها.');
  } catch (error) {
    showMessage(`تعذر إكمال الطلب: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`, 5000);
  } finally {
    if (progress) progress.style.display = 'none';
    if (button) { button.disabled = false; button.textContent = mode === 'edit' ? 'إنشاء التعديل' : 'توليد'; }
  }
}

function smartCopyResult(): void {
  const result = w._smartLastResult || {};
  const text = result.mode === 'edit'
    ? result.scope === 'selection' ? result.replacementHtml : JSON.stringify({ findHtml: result.findHtml, replacementHtml: result.replacementHtml }, null, 2)
    : String(result.html || '');
  if (!text.trim()) { showMessage('لا يوجد محتوى للنسخ'); return; }
  navigator.clipboard?.writeText(text).then(() => showMessage('تم النسخ')).catch(() => showMessage('تعذر النسخ'));
}

function smartInsertResult(): void {
  const result = w._smartLastResult;
  if (!result) { showMessage('لا توجد نتيجة'); return; }
  const editor = byId('unifiedCodeEditor') as HTMLTextAreaElement | null;
  if (!editor) { showMessage('محرر المقال غير متاح'); return; }
  const current = editor.value;
  if (result.mode === 'edit') {
    if (current !== result.baseHtml) { showMessage('تغير المقال بعد إنشاء الاقتراح؛ أعد توليده قبل التطبيق.'); return; }
    let next = current;
    let cursor = 0;
    if (result.scope === 'selection') {
      if (current.slice(result.start, result.end) !== result.originalHtml) { showMessage('لم يعد التحديد مطابقاً؛ أعد فتح المساعد وحدد النص من جديد.'); return; }
      next = current.slice(0, result.start) + result.replacementHtml + current.slice(result.end);
      cursor = result.start + result.replacementHtml.length;
    } else {
      const index = current.indexOf(result.findHtml);
      if (index < 0 || current.indexOf(result.findHtml, index + 1) >= 0) { showMessage('تعذر تحديد موضع التعديل بأمان؛ لم يتغير المقال.'); return; }
      next = current.slice(0, index) + result.replacementHtml + current.slice(index + result.findHtml.length);
      cursor = index + result.replacementHtml.length;
    }
    applyEditorHtml(next, cursor);
    showMessage('تم تطبيق التعديل وحفظه في سجل التراجع.');
    (window as any).closeSheet?.('smartAssistantSheet');
    return;
  }

  const raw = String(result.html || '').trim();
  if (!raw) { showMessage('لا يوجد محتوى'); return; }
  const format = w._smartFormat || 'html';
  const html = format === 'plain' ? toParagraphHtml(raw, true) : cleanHtml(raw);
  const mode = (byId('smartInsertMode') as HTMLSelectElement | null)?.value || 'append';
  const selection = (w._smartSelection || captureSelection()) as EditorSelection;
  let next = current;
  let cursor = current.length;
  if (mode === 'replace-selection') {
    if (selection.start === selection.end || current.slice(selection.start, selection.end) !== selection.html) { showMessage('حدد نصاً في المحرر قبل الإدراج أو أعد فتح المساعد.'); return; }
    next = current.slice(0, selection.start) + html + current.slice(selection.end);
    cursor = selection.start + html.length;
  } else if (mode === 'cursor') {
    const position = Math.max(0, Math.min(selection.start, current.length));
    const separator = position > 0 && !current.slice(0, position).endsWith('\n') ? '\n\n' : '';
    next = current.slice(0, position) + separator + html + current.slice(position);
    cursor = position + separator.length + html.length;
  } else {
    const separator = current && !current.endsWith('\n') ? '\n\n' : '';
    next = current + separator + html;
    cursor = next.length;
  }
  applyEditorHtml(next, cursor);
  showMessage('تم إدراج المحتوى في المحرر.');
  (window as any).closeSheet?.('smartAssistantSheet');
}

function improveTextToHtml(text: string, originalHtml: string, insertMode: boolean): string {
  const blockContext = insertMode || /^\s*<(p|div|h[1-6]|li|blockquote|ul|ol|section|article)\b/i.test(originalHtml);
  return toParagraphHtml(text, blockContext);
}

function openImproveMode(): void {
  const input = byId('improveTextInput') as HTMLTextAreaElement | null;
  const selection = captureSelection();
  w._smartSelection = selection;
  w._improveTarget = null;
  w._improveLastResult = '';
  if (input && !input.value.trim() && selection.html.trim()) input.value = plainText(selection.html);
  const result = byId('improveResultSection');
  if (result) result.style.display = 'none';
  const apply = byId('applyImproveBtn');
  const copy = byId('copyImproveBtn');
  if (apply) apply.style.display = 'none';
  if (copy) copy.style.display = 'none';
}

async function runImproveText(): Promise<void> {
  const input = byId('improveTextInput') as HTMLTextAreaElement | null;
  const selection = (w._smartSelection || captureSelection()) as EditorSelection;
  const text = input?.value.trim() || plainText(selection.html);
  if (!text) { showMessage('حدد نصاً من المحرر أو الصق النص الذي تريد تحسينه.'); return; }
  const language = (byId('aiLanguage') as HTMLSelectElement | null)?.value || 'ar';
  const action = w._improveAction || 'rewrite';
  const button = byId('improveRunBtn') as HTMLButtonElement | null;
  const progress = byId('improveProgressBar');
  const results = byId('improveResultSection');
  const resultBox = byId('improveResultBox');
  const copy = byId('copyImproveBtn');
  const apply = byId('applyImproveBtn');
  const labels: Record<string, string> = { rewrite: 'إعادة صياغة', summarize: 'تلخيص', expand: 'توسيع', simplify: 'تبسيط', shorten: 'اختصار', fix: 'تصحيح' };
  w._improveTarget = { ...selection, typedText: !!input?.value.trim() };
  if (button) { button.disabled = true; button.textContent = 'جارٍ التحسين…'; }
  if (progress) progress.style.display = 'block';
  if (results) results.style.display = 'none';
  try {
    const request = w.modweebPrompts.improveText({ text, action, language });
    const improved = await callAI(request.systemPrompt, request.userPrompt, { maxTokens: 4000 });
    w._improveLastResult = String(improved || '').trim();
    if (!w._improveLastResult) throw new Error('لم يُرجع النموذج نصاً محسناً.');
    const label = byId('improveResultLabel');
    if (label) label.textContent = `النتيجة — ${labels[action] || ''}`;
    if (resultBox) resultBox.textContent = w._improveLastResult;
    if (results) results.style.display = 'block';
    if (copy) copy.style.display = 'inline-flex';
    if (apply) apply.style.display = 'inline-flex';
    showMessage('تم تحسين النص. راجعه قبل التطبيق.');
  } catch (error) {
    showMessage(`تعذر تحسين النص: ${error instanceof Error ? error.message : ''}`, 5000);
  } finally {
    if (progress) progress.style.display = 'none';
    if (button) { button.disabled = false; button.textContent = 'تحسين'; }
  }
}

function applyImproveResult(): void {
  const result = String(w._improveLastResult || '').trim();
  const target = w._improveTarget as EditorSelection | null;
  const editor = byId('unifiedCodeEditor') as HTMLTextAreaElement | null;
  if (!result || !editor || !target) { showMessage('لا توجد نتيجة أو هدف صالح للتطبيق.'); return; }
  if (editor.value !== target.baseHtml) { showMessage('تغير المقال بعد التحسين؛ أعد العملية لتفادي استبدال نص غير مقصود.'); return; }
  const replacement = improveTextToHtml(result, target.html, target.start === target.end);
  const next = editor.value.slice(0, target.start) + replacement + editor.value.slice(target.end);
  applyEditorHtml(next, target.start + replacement.length);
  showMessage('تم تطبيق التحسين وحفظه في سجل التراجع.');
  const apply = byId('applyImproveBtn');
  if (apply) apply.style.display = 'none';
}

export function installArticleAssistant(): void {
  const originalOpenSheet = w.openSheet;
  if (typeof originalOpenSheet === 'function' && !originalOpenSheet.__modweebRouted) {
    const routed = function (this: any, id: string, ...args: unknown[]) {
      if (id === 'improveTextSheet') { w.openSmartAssistant?.('improve'); return; }
      if (id === 'aiAgentSheet') { w.openAgent?.(); return; }
      if (id === 'bloggerSettingsSheet') { w.openBloggerSettingsFromPublish?.(); return; }
      return originalOpenSheet.call(this, id, ...args);
    } as typeof originalOpenSheet & { __modweebRouted?: boolean };
    routed.__modweebRouted = true;
    w.openSheet = routed;
  }

  const configureReturn = (panelId: string, label: string, action: () => void) => {
    const button = byId(panelId)?.querySelector<HTMLButtonElement>('.sheet-footer button:first-child');
    if (!button) return;
    button.textContent = label;
    button.onclick = (event) => { event.preventDefault(); action(); };
  };
  configureReturn('aiSettingsPanel', 'العودة إلى التوليد', () => w.setAIPopupTab?.('generate'));
  configureReturn('bloggerSettingsPanel', 'العودة إلى النشر', () => w.setBloggerPublishTab?.('compose'));
  configureReturn('smartImprovePanel', 'العودة للمساعد', () => w.setSmartAssistantTab?.('assistant'));

  const originalOpenSmart = w.openSmartAssistant;
  w.openSmartAssistant = (mode: SmartMode = 'assistant') => {
    w._smartSelection = captureSelection();
    w._smartLastResult = null;
    w._smartLastHTML = '';
    const preview = byId('smartResultPreview'); if (preview) preview.style.display = 'none';
    const insert = byId('smartInsertBtn'); if (insert) insert.style.display = 'none';
    const copy = byId('smartCopyBtn'); if (copy) copy.style.display = 'none';
    originalOpenSmart?.(mode);
    if (mode === 'improve') openImproveMode();
    if (mode === 'edit') {
      const prompt = byId('smartEditPrompt') as HTMLTextAreaElement | null;
      if (prompt && !prompt.value && w._smartSelection.html) prompt.value = 'عدّل الجزء المحدد مع الحفاظ على معناه وتنسيقه.';
    }
  };

  w.openImproveTextSheet = () => w.openSmartAssistant?.('improve');
  w.smartGenerate = smartGenerate;
  w.smartInsertResult = smartInsertResult;
  w.smartCopyResult = smartCopyResult;
  w.runImproveText = runImproveText;
  w.applyImproveResult = applyImproveResult;
}
