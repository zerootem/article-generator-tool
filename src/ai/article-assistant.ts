import { articleOutlineMarkdown, formatArticleOutlineInstruction, normalizeArticleOutline, type ArticleOutline, type ArticleOutlineSection } from './article-outline';

type EditScope = 'article' | 'selection';
type SmartMode = 'assistant' | 'edit' | 'outline';
interface EditorSelection {
  start: number;
  end: number;
  baseHtml: string;
  html: string;
}

const w = window as any;
const byId = (id: string) => document.getElementById(id);
const uiText = (text: string): string => w.modweebI18n?.translate?.(text) || text;

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

function readOutlineDraft(): ArticleOutline | null {
  const draft = w._articleOutlineDraft as ArticleOutline | null;
  if (!draft) return null;
  draft.topic = (byId('articleOutlineTopic') as HTMLInputElement | null)?.value.trim().slice(0, 500) || '';
  draft.title = (byId('articleOutlineTitle') as HTMLInputElement | null)?.value.trim().slice(0, 180) || '';
  draft.mainKeyword = (byId('articleOutlineKeyword') as HTMLInputElement | null)?.value.trim().slice(0, 180) || '';
  const faqText = (byId('articleOutlineFaqQuestions') as HTMLTextAreaElement | null)?.value || '';
  draft.faqQuestions = faqText.split(/\r?\n/).map((question) => question.trim()).filter(Boolean);
  return draft;
}

function outlineField(labelText: string, control: HTMLInputElement | HTMLTextAreaElement, index: number, field: string): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'sheet-field';
  const label = document.createElement('label');
  control.id = `articleOutline-${field}-${index}`;
  control.dataset.outlineIndex = String(index);
  control.dataset.outlineField = field;
  label.htmlFor = control.id;
  label.textContent = labelText;
  wrapper.append(label, control);
  return wrapper;
}

function renderOutlineSections(): void {
  const host = byId('articleOutlineSections');
  const draft = w._articleOutlineDraft as ArticleOutline | null;
  if (!host || !draft) return;
  host.replaceChildren();
  const hasH3 = !!(byId('aiHasH3') as HTMLInputElement | null)?.checked;
  draft.sections.forEach((section, index) => {
    const card = document.createElement('section');
    card.className = 'article-outline-card';
    const cardHead = document.createElement('div');
    cardHead.className = 'article-outline-card-head';
    const cardLabel = document.createElement('span');
    cardLabel.textContent = `${uiText('القسم')} ${index + 1}`;
    const actions = document.createElement('div');
    actions.className = 'article-outline-card-actions';
    const makeAction = (action: string, text: string, aria: string, disabled = false) => {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.outlineAction = action; button.dataset.outlineIndex = String(index);
      button.textContent = text; button.setAttribute('aria-label', `${aria} ${index + 1}`); button.title = `${aria} ${index + 1}`;
      button.disabled = disabled;
      actions.appendChild(button);
    };
    makeAction('up', '↑', uiText('تحريك القسم لأعلى'), index === 0);
    makeAction('down', '↓', uiText('تحريك القسم لأسفل'), index === draft.sections.length - 1);
    makeAction('remove', '×', uiText('حذف القسم'), draft.sections.length <= 3);
    cardHead.append(cardLabel, actions);

    const heading = document.createElement('input');
    heading.type = 'text'; heading.value = section.heading; heading.maxLength = 140; heading.autocomplete = 'off';
    const purpose = document.createElement('textarea');
    purpose.value = section.purpose; purpose.maxLength = 320; purpose.rows = 2;
    const subheadings = document.createElement('textarea');
    subheadings.value = section.subheadings.join('\n'); subheadings.maxLength = 700; subheadings.rows = 2;
    const subheadingField = outlineField('عناوين H3 فرعية (اختياري)', subheadings, index, 'subheadings');
    subheadingField.hidden = !hasH3;
    card.append(cardHead, outlineField('عنوان H2', heading, index, 'heading'), outlineField('فائدة القسم للقارئ', purpose, index, 'purpose'), subheadingField);
    host.appendChild(card);
  });
}

function renderArticleOutline(outline: ArticleOutline): void {
  const result = byId('articleOutlineResult');
  const empty = byId('articleOutlineEmpty');
  const title = byId('articleOutlineTitle') as HTMLInputElement | null;
  const faq = byId('articleOutlineFaqQuestions') as HTMLTextAreaElement | null;
  if (result) result.hidden = false;
  if (empty) empty.hidden = true;
  if (title) title.value = outline.title;
  if (faq) faq.value = outline.faqQuestions.join('\n');
  renderOutlineSections();
  const insert = byId('smartInsertBtn'); if (insert) insert.style.display = 'inline-flex';
  const copy = byId('smartCopyBtn'); if (copy) copy.style.display = 'inline-flex';
}

async function runArticleOutline(): Promise<void> {
  const topic = (byId('articleOutlineTopic') as HTMLInputElement | null)?.value.trim() || '';
  const mainKeyword = (byId('articleOutlineKeyword') as HTMLInputElement | null)?.value.trim() || '';
  const button = byId('smartGenBtn') as HTMLButtonElement | null;
  const progress = byId('smartProgressBar');
  const empty = byId('articleOutlineEmpty');
  const result = byId('articleOutlineResult');
  const currentDraft = w._articleOutlineDraft as ArticleOutline | null;
  const previousOutline = currentDraft ? {
    ...(readOutlineDraft() as ArticleOutline),
    sections: currentDraft.sections.map((section) => ({ ...section, subheadings: [...section.subheadings] })),
    faqQuestions: [...currentDraft.faqQuestions],
  } : null;
  if (!topic) { showMessage('أدخل موضوع المقال أولاً لبناء المخطط.'); return; }
  if (button) { button.disabled = true; button.textContent = 'جارٍ اقتراح المخطط…'; }
  if (progress) {
    progress.style.display = 'block';
    const label = progress.querySelector('div');
    if (label) label.textContent = 'جاري إعداد مخطط المقال...';
  }
  if (empty) empty.hidden = !!previousOutline;
  if (result && !previousOutline) result.hidden = true;
  try {
    const request = w.modweebPrompts?.articleOutline?.({
      topic,
      mainKeyword,
      articleType: (byId('aiArticleType') as HTMLSelectElement | null)?.value || 'guide',
      size: (byId('aiSize') as HTMLSelectElement | null)?.value || 'md',
      language: (byId('aiLanguage') as HTMLSelectElement | null)?.value || 'ar',
      hasH3: !!(byId('aiHasH3') as HTMLInputElement | null)?.checked,
    });
    if (!request) throw new Error('قالب مخطط المقال غير متاح؛ أعد تحميل الأداة.');
    const raw = await callAI(request.systemPrompt, request.userPrompt, { maxTokens: 4500, jsonMode: true });
    const outline = normalizeArticleOutline(parseJson(raw), topic, mainKeyword);
    w._approvedArticleOutline = null;
    w._approvedArticleOutlineTitle = '';
    w._approvedArticleOutlinePrompt = '';
    w._articleOutlineDraft = outline;
    w._smartLastResult = { mode: 'outline' };
    w._smartLastHTML = '';
    renderArticleOutline(outline);
    showMessage('اكتمل المخطط. راجع ترتيب الأقسام وعدّل ما يلزم قبل اعتماده.');
  } catch (error) {
    if (previousOutline) {
      w._articleOutlineDraft = previousOutline;
      renderArticleOutline(previousOutline);
    } else if (empty) empty.hidden = false;
    showMessage(`${uiText('تعذر إعداد المخطط:')} ${error instanceof Error ? error.message : 'خطأ غير معروف'}`, 5000);
  } finally {
    if (progress) progress.style.display = 'none';
    if (button) { button.disabled = false; button.textContent = 'اقتراح مخطط'; }
  }
}

function applyArticleOutline(): void {
  const originalOutline = w._articleOutlineDraft as ArticleOutline | null;
  const currentTopic = (byId('articleOutlineTopic') as HTMLInputElement | null)?.value.trim() || '';
  const normalizeTopic = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  if (originalOutline && normalizeTopic(originalOutline.topic) !== normalizeTopic(currentTopic)) {
    showMessage('تغير موضوع المخطط؛ أنشئ اقتراحاً جديداً لهذا الموضوع قبل اعتماده.');
    return;
  }
  const outline = readOutlineDraft();
  if (!outline || !outline.topic || !outline.title) { showMessage('أدخل موضوعاً وعنواناً صالحين للمخطط.'); return; }
  if (outline.sections.length < 3) { showMessage('أبقِ ثلاثة أقسام رئيسية على الأقل قبل اعتماد المخطط.'); return; }
  if (outline.sections.some((section) => !section.heading)) { showMessage('أكمل عناوين جميع الأقسام قبل اعتماد المخطط.'); return; }
  const faqInput = byId('articleOutlineFaqQuestions') as HTMLTextAreaElement | null;
  const rawFaqCount = (faqInput?.value || '').split(/\r?\n/).map((question) => question.trim()).filter(Boolean).length;
  if (rawFaqCount > 5) { showMessage('أبقِ أسئلة FAQ بين أربعة وخمسة أسئلة.'); return; }
  if (outline.faqQuestions.length < 4) { showMessage('أضف أربعة أسئلة شائعة على الأقل قبل اعتماد المخطط.'); return; }
  const titleInput = byId('aiTopic') as HTMLInputElement | null;
  const keywordInput = byId('aiMainKeyword') as HTMLInputElement | null;
  if (titleInput) titleInput.value = outline.title;
  if (keywordInput) keywordInput.value = outline.mainKeyword;
  w._approvedArticleOutline = {
    ...outline,
    sections: outline.sections.map((section: ArticleOutlineSection) => ({ ...section, subheadings: [...section.subheadings] })),
    faqQuestions: [...outline.faqQuestions],
  };
  w._approvedArticleOutlineTitle = outline.title;
  w._approvedArticleOutlinePrompt = formatArticleOutlineInstruction(
    outline,
    !!(byId('aiHasH3') as HTMLInputElement | null)?.checked,
    (byId('aiLanguage') as HTMLSelectElement | null)?.value || 'ar',
  );
  showMessage('تم اعتماد المخطط؛ سيتبعه مولّد المقال عند إنشاء المقال بهذا العنوان.');
}

function handleOutlineSectionEvent(event: Event): void {
  const target = event.target as HTMLElement;
  const draft = w._articleOutlineDraft as ArticleOutline | null;
  if (!draft) return;
  if (event.type === 'input' && target.dataset.outlineIndex !== undefined) {
    const index = Number(target.dataset.outlineIndex);
    const section = draft.sections[index];
    if (!section) return;
    const value = (target as HTMLInputElement | HTMLTextAreaElement).value;
    if (target.dataset.outlineField === 'heading') section.heading = value.slice(0, 140);
    if (target.dataset.outlineField === 'purpose') section.purpose = value.slice(0, 320);
    if (target.dataset.outlineField === 'subheadings') section.subheadings = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 5);
    return;
  }
  if (event.type !== 'click') return;
  const button = target.closest<HTMLButtonElement>('[data-outline-action]');
  if (!button) return;
  const index = Number(button.dataset.outlineIndex);
  const action = button.dataset.outlineAction;
  if (action === 'remove' && draft.sections.length > 3) draft.sections.splice(index, 1);
  if (action === 'up' && index > 0) [draft.sections[index - 1], draft.sections[index]] = [draft.sections[index], draft.sections[index - 1]];
  if (action === 'down' && index < draft.sections.length - 1) [draft.sections[index + 1], draft.sections[index]] = [draft.sections[index], draft.sections[index + 1]];
  renderOutlineSections();
}

async function smartGenerate(): Promise<void> {
  const mode = (w._smartAssistantMode || 'assistant') as SmartMode;
  if (mode === 'outline') { await runArticleOutline(); return; }
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

type ChatMessage = { role: 'user' | 'assistant'; text: string; pendingHtml?: string; applied?: boolean; baseHtml?: string };
let smartChatHistory: ChatMessage[] = [];

function renderSmartChat(): void {
  const host = byId('smartChatMessages');
  if (!host) return;
  host.innerHTML = '';
  if (!smartChatHistory.length) {
    const empty = document.createElement('div');
    empty.className = 'smart-chat-empty';
    empty.id = 'smartChatEmpty';
    empty.textContent = 'لا توجد رسائل بعد. ابدأ بسؤال مثل: «أضف قسم مقارنة بعد القسم الثالث» أو «احذف قسم الأسعار».';
    host.appendChild(empty);
    return;
  }
  smartChatHistory.forEach((message, index) => {
    const row = document.createElement('div');
    row.className = `smart-chat-msg ${message.role}`;
    const bubble = document.createElement('div');
    bubble.className = 'smart-chat-bubble';
    bubble.textContent = message.text;
    row.appendChild(bubble);
    if (message.pendingHtml) {
      const actions = document.createElement('div');
      actions.className = 'smart-chat-msg-actions';
      const apply = document.createElement('button');
      apply.type = 'button';
      apply.className = 'modweeb-gen-btn primary smart-chat-apply';
      apply.textContent = 'تطبيق على المقال';
      apply.addEventListener('click', () => smartChatApply(index));
      actions.appendChild(apply);
      row.appendChild(actions);
    } else if (message.role === 'assistant' && message.applied) {
      const done = document.createElement('div');
      done.className = 'smart-chat-applied';
      done.textContent = 'تم تطبيق هذا التعديل على المقال.';
      row.appendChild(done);
    }
    host.appendChild(row);
  });
  host.scrollTop = host.scrollHeight;
}

async function smartChatSend(): Promise<void> {
  const input = byId('smartChatInput') as HTMLTextAreaElement | null;
  const sendButton = byId('smartChatSendBtn') as HTMLButtonElement | null;
  const text = input?.value.trim() || '';
  if (!text) { showMessage('اكتب رسالتك أولاً.'); return; }
  const editor = byId('unifiedCodeEditor') as HTMLTextAreaElement | null;
  if (!editor) { showMessage('محرر المقال غير متاح.'); return; }
  const baseHtml = editor.value;
  if (baseHtml.length > 60000) { showMessage('المقال طويل جداً للمحادثة الكاملة؛ استخدم «تعديل المقال» مع تحديد مقطع.', 6000); return; }
  if (input) input.value = '';
  smartChatHistory.push({ role: 'user', text });
  renderSmartChat();
  if (sendButton) { sendButton.disabled = true; sendButton.textContent = 'جارٍ الرد…'; }
  try {
    const topic = (byId('smartContextTopic') as HTMLInputElement | null)?.value.trim() || '';
    const language = (byId('aiLanguage') as HTMLSelectElement | null)?.value || 'ar';
    const historyText = smartChatHistory.slice(-11, -1).map((m) => `${m.role === 'user' ? 'المستخدم' : 'المساعد'}: ${m.text}`).join('\n');
    const systemPrompt = `أنت محرر مقال محترف داخل أداة ModWeeb لتوليد المقالات، وتتحدث مع المستخدم باللغة ${language === 'ar' ? 'العربية' : 'English'}.
تستطيع قراءة HTML المقال الحالي وتنفيذ أي طلب عليه: إضافة قسم أو عنصر، حذف عنصر، إعادة صياغة، تصحيح، ترتيب، تغيير العناوين، أو شرح فقط.
أعد JSON صالحاً فقط بلا Markdown خارجه، بهذا الشكل حصراً: {"reply":"رد قصير مفيد للمستخدم","articleHtml":"HTML الكامل للمقال بعد التعديل، أو سلسلة فارغة \\"\\" إذا كان الرد شرحاً أو سؤالاً بلا تعديل"}.
قواعد التعديل:
- إذا طلب المستخدم تعديلاً فارجع articleHtml كاملاً بعد التعديل، وليس مقتطفاً، واحتفظ بكل ما لم يُطلب تغييره حرفياً.
- حافظ على بنية القالب: H1 واحد، أقسام H2 متسلسلة، أكورديون ac في نهاية كل قسم، فقرة pRef الأخيرة الثابتة، وأبقِ ملاحظة البداية إن وجدت.
- لا تضف جدول محتويات toc ولا عنواناً فرعياً (subtitle) ولا <style>.
- الأنماط المسموحة داخل الفقرات: <b> <em> <code> <mark> <br>، والروابط بأحد النمطين: <a class='extL' href='URL' rel='nofollow noreferrer noopener' target='_blank'>اسم</a> أو <a class='extL alt' href='URL' rel='nofollow noreferrer noopener' target='_blank'>اسم</a>، وأضف نمطاً واحداً على الأقل من note (info|warning|question) أو blockquote s2 في كل قسم إن كان القسم بلا عنصر إضافي، مع تنويع الأنماط بين الفقرات (normal/indent).
- إن كانت تعليمات داخل أكورديون فاكتبها كقائمة مرقمة <ol><li>...</li></ol>.
- لا تختلق روابط أو مصادر أو حقائق؛ إن احتجت رابطاً ولم يتوفر فلا تضعه.
- إن كان طلب المستخدم غير واضح، اسأل سؤالاً توضيحياً واحداً وضع articleHtml فارغاً.${topic ? `\nموضوع المقال: ${topic}.` : ''}`;
    const userPrompt = `${historyText ? `سياق المحادثة السابقة:\n${historyText}\n\n` : ''}طلب المستخدم الحالي: ${text}\n\nHTML المقال الحالي:\n${baseHtml}`;
    const raw = await callAI(systemPrompt, userPrompt, { maxTokens: 16000, jsonMode: true });
    let reply = '';
    let nextHtml = '';
    try {
      const result = parseJson(raw);
      reply = String(result?.reply || '').trim();
      nextHtml = cleanHtml(String(result?.articleHtml || '')).trim();
    } catch {
      reply = String(raw || '').trim();
    }
    if (!reply) reply = nextHtml ? 'أعددت التعديل المقترح؛ راجعه ثم اضغط «تطبيق على المقال».' : 'لم يُرجع النموذج رداً.';
    if (nextHtml && nextHtml === baseHtml.trim()) nextHtml = '';
    smartChatHistory.push({ role: 'assistant', text: reply, pendingHtml: nextHtml || undefined, baseHtml: nextHtml ? baseHtml : undefined });
    renderSmartChat();
  } catch (error) {
    smartChatHistory.push({ role: 'assistant', text: `تعذر إكمال الطلب: ${error instanceof Error ? error.message : 'خطأ غير معروف'}` });
    renderSmartChat();
  } finally {
    if (sendButton) { sendButton.disabled = false; sendButton.textContent = 'إرسال'; }
  }
}

function smartChatApply(index: number): void {
  const message = smartChatHistory[index];
  const editor = byId('unifiedCodeEditor') as HTMLTextAreaElement | null;
  if (!message?.pendingHtml || !editor) return;
  if (editor.value !== message.baseHtml) { showMessage('تغيّر المقال منذ اقتراح التعديل؛ أعد إرسال الطلب لتجنب فقد أي جزء.'); return; }
  applyEditorHtml(message.pendingHtml, message.pendingHtml.length);
  message.pendingHtml = undefined;
  message.applied = true;
  renderSmartChat();
  showMessage('تم تطبيق تعديل المحادثة على المقال وحفظه في سجل التراجع.');
}

function smartChatClear(): void {
  smartChatHistory = [];
  renderSmartChat();
  showMessage('تم مسح المحادثة.');
}

function smartCopyResult(): void {
  const result = w._smartLastResult || {};
  const text = result.mode === 'outline'
    ? articleOutlineMarkdown(readOutlineDraft() || w._articleOutlineDraft, (byId('aiLanguage') as HTMLSelectElement | null)?.value || 'ar')
    : result.mode === 'edit'
      ? result.scope === 'selection' ? result.replacementHtml : JSON.stringify({ findHtml: result.findHtml, replacementHtml: result.replacementHtml }, null, 2)
      : String(result.html || '');
  if (!text.trim()) { showMessage('لا يوجد محتوى للنسخ'); return; }
  navigator.clipboard?.writeText(text).then(() => showMessage('تم النسخ')).catch(() => showMessage('تعذر النسخ'));
}

function smartInsertResult(): void {
  const result = w._smartLastResult;
  if (!result) { showMessage('لا توجد نتيجة'); return; }
  if (result.mode === 'outline') { applyArticleOutline(); return; }
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
      if (id === 'aiAgentSheet') { w.openAgent?.(); return; }
      if (id === 'bloggerSettingsSheet') { w.openBloggerSettingsFromPublish?.(); return; }
      return originalOpenSheet.call(this, id, ...args);
    } as typeof originalOpenSheet & { __modweebRouted?: boolean };
    routed.__modweebRouted = true;
    w.openSheet = routed;
  }

  const configureReturn = (buttonId: string, action: () => void) => {
    const button = byId(buttonId) as HTMLButtonElement | null;
    if (!button) return;
    button.onclick = (event) => { event.preventDefault(); action(); };
  };
  configureReturn('aiSettingsBackBtn', () => w.setAIPopupTab?.('generate'));
  configureReturn('bloggerSettingsBackBtn', () => w.setBloggerPublishTab?.('compose'));
  configureReturn('smartImproveBackBtn', () => w.setSmartAssistantTab?.('assistant'));

  const outlineSections = byId('articleOutlineSections');
  outlineSections?.addEventListener('input', handleOutlineSectionEvent);
  outlineSections?.addEventListener('click', handleOutlineSectionEvent);
  byId('addArticleOutlineSection')?.addEventListener('click', () => {
    const draft = w._articleOutlineDraft as ArticleOutline | null;
    if (!draft) { showMessage('أنشئ مخططاً أولاً ثم أضف الأقسام.'); return; }
    if (draft.sections.length >= 18) { showMessage('وصل المخطط إلى الحد الأقصى للأقسام.'); return; }
    draft.sections.push({ heading: '', purpose: '', subheadings: [] });
    renderOutlineSections();
    const lastHeading = outlineSections?.querySelector<HTMLInputElement>('.article-outline-card:last-child input');
    lastHeading?.focus();
  });

  const originalOpenSmart = w.openSmartAssistant;
  const originalOpenImprove = w.openImproveTextSheet;
  w.openImproveTextSheet = () => {
    openImproveMode();
    if (typeof originalOpenImprove === 'function') originalOpenImprove.call(w);
    else w.openSheet?.('improveTextSheet');
  };
  w.openSmartAssistant = (mode: SmartMode = 'assistant') => {
    w._smartSelection = captureSelection();
    w._smartLastResult = null;
    w._smartLastHTML = '';
    const preview = byId('smartResultPreview'); if (preview) preview.style.display = 'none';
    const insert = byId('smartInsertBtn'); if (insert) insert.style.display = 'none';
    const copy = byId('smartCopyBtn'); if (copy) copy.style.display = 'none';
    if (mode === 'outline') {
      w._articleOutlineDraft = null;
      const result = byId('articleOutlineResult'); if (result) result.hidden = true;
      const empty = byId('articleOutlineEmpty'); if (empty) empty.hidden = false;
    }
    originalOpenSmart?.(mode);
    if (mode === 'edit') {
      const prompt = byId('smartEditPrompt') as HTMLTextAreaElement | null;
      if (prompt && !prompt.value && w._smartSelection.html) prompt.value = 'عدّل الجزء المحدد مع الحفاظ على معناه وتنسيقه.';
    }
  };

  w.smartChatSend = smartChatSend;
  w.smartChatApply = smartChatApply;
  w.smartChatClear = smartChatClear;
  w.modweebClearSmartChat = smartChatClear;
  w.smartGenerate = smartGenerate;
  w.smartInsertResult = smartInsertResult;
  w.smartCopyResult = smartCopyResult;
  w.applyArticleOutline = applyArticleOutline;
  w.runArticleOutline = runArticleOutline;
  w.runImproveText = runImproveText;
  w.applyImproveResult = applyImproveResult;
}
