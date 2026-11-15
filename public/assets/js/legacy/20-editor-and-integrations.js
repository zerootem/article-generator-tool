/* ============================================================
   طبقة المحرر الموحد (Unified Editor)
   ============================================================ */
   /* ============================================================
   إغلاق كل القوائم المفتوحة (الأوضاع + الترجمة + عناصر المقال)
   ============================================================ */
window.closeAllModweebMenus = function(){
  document.querySelectorAll('.unified-menu.open').forEach(m => m.remove());
  document.querySelectorAll('.unified-menu-trigger[aria-expanded="true"]')
    .forEach(b => b.setAttribute('aria-expanded', 'false'));
  document.querySelectorAll('.modweeb-translate-btn.active')
    .forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.modweeb-translate-btn[aria-expanded="true"]')
    .forEach(b => b.setAttribute('aria-expanded', 'false'));
};

(function(){
  'use strict';
  const legacy = {
    renderBlocks: window.modweebRenderBlocks,
    updatePreview: window.modweebUpdatePreview,
    updateStats: window.modweebUpdateStats,
    schedule: window.modweebScheduleRender,
    saveHistory: window.modweebSaveToHistory,
    clearAll: window.clearAll,
    loadStorage: window.modweebLoadFromLocalStorage,
    generate: window.generateFullHTML,
    updateBlock: window.updateBlock
  };
  const state = {
    editor: null, lines: null, preview: null, initialized: false, dirty: false,
    selection: {start: 0, end: 0}, ranges: [], previousEditorValue: '', draft: null, draftId: null, draftInserted: false, rawHTMLDraft: null,
    history: [], historyIndex: -1, historyTimer: null, syncing: false, targetRange: null
  };
  const labels = {
    heading: 'عنوان', paragraph: 'فقرة', image: 'صورة', link: 'رابط', button: 'زر',
    downloadBox: 'صندوق تحميل', blockquote: 'اقتباس', note: 'ملاحظة', alert: 'تنبيه',
    table: 'جدول', steps: 'خطوات', list: 'قائمة',
    code: 'كتلة كود', codeTabs: 'تبويبات كود',
    spoiler: 'إخفاء', accordion: 'أكورديون', accordionGroup: 'أكورديون مجمع',
    faq: 'أسئلة شائعة', toc: 'جدول المحتويات', relatedManual: 'منشورات يدوية',
    relatedAuto: 'منشورات تلقائية', lazyYt: 'فيديو YouTube', basics: 'أساسيات المقال',
    mark: 'تمييز', kbd: 'اختصار لوحة المفاتيح', inlineCode: 'كود مضمن', keyPoints: 'نقاط',
    audioPlayer: 'مشغل صوت', videoPlayer: 'مشغل فيديو'
};

  const help = {
    heading: 'ينشئ عنواناً HTML من H1 إلى H6 مع دعم data-before/data-after.',
    paragraph: 'فقرة عادية أو بمسافة بادئة أو حرف استهلالي أو مرجعية.',
    image: 'صورة بنمط قياسي أو كامل أو مع تعليق أو شبكة أو تمرير.',
    link: 'رابط خارجي آمن بأنماط متعددة (extL / alt / sec / زر).',
    button: 'زر CTA (عادي أو خطي) مع إمكانية إضافة أيقونة.',
    downloadBox: 'صندوق تحميل ملف.',
    blockquote: 'اقتباس بثلاثة أنماط (عادي/s1/s2).',
    note: 'ملاحظة معلومات/تحذير/سؤال (qs).',
    alert: 'تنبيه بستة أنواع + خيار Outline.',
    table: 'جدول HTML بكلاسات موسعة (bordered, stripped, sticky, إلخ).',
    steps: 'قائمة خطوات مرقمة (steps).',
    list: 'قائمة نقطية (ul) أو بنمط s1.',
    code: 'كتلة pre/code مع data-comment, data-source, data-lines, data-copy.',
    codeTabs: 'أكواد HTML/CSS/JS/JSON في تبويبات تفاعلية.',
    spoiler: 'إخفاء / أكورديون / Blur Text Spoiler.',
    accordion: 'أكورديون بأنماط متعددة (ac / ac alt).',
    accordionGroup: 'مجموعة Accordion داخل showH.',
    faq: 'أسئلة وأجوبة مع microdata (FAQPage).',
    toc: 'جدول محتويات تلقائي أو يدوي.',
    relatedManual: 'منشورات ذات صلة يدوية.',
    relatedAuto: 'منشورات ذات صلة تلقائية بخصائص data-*.',
    lazyYt: 'يوتيوب كسول (lazy) أو مؤجل (defer).',
    basics: 'وصف مقتطف المقال + الصورة المصغرة + العنوان الفرعي + more.',
    mark: 'تمييز نصي بـ 9 ألوان (block, red, gray, orange, blue, green, gold, purple).',
    kbd: 'اختصار لوحة مفاتيح.',
    inlineCode: 'كود مضمن قصير.',
    keyPoints: 'نقاط رئيسية (pills).',
    audioPlayer: 'مشغل صوت HTML5 (audio controls).',
    videoPlayer: 'مشغل فيديو HTML5 (video controls + playsinline).'
};

  const menuData = {
    heading: [['heading','عنوان',[['h1','H1'],['h2','H2'],['h3','H3'],['h4','H4'],['h5','H5'],['h6','H6']]]],
    paragraph: [['paragraph','فقرة',[['normal','عادية'],['indent','مسافة بادئة'],['dropcap','حرف استهلالي'],['ref','مرجعية']]]],
    quote: [['blockquote','اقتباس',[['normal','عادي'],['s1','نمط s1'],['s2','نمط s2']]]],
    noteAlert: [
        ['note','ملاحظة',[['info','معلومات'],['warning','تحذير'],['question','سؤال (qs)']]],
        ['alert','تنبيه',[['info','معلومات'],['warning','تحذير'],['success','نجاح'],['error','خطأ'],['tip','نصيحة'],['question','سؤال']]]
    ],
    media: [
        ['image','صورة',[['standard','قياسية'],['full','كاملة العرض'],['figure','مع تعليق'],['grid','شبكة'],['scroll','تمرير'],['lazyload','تحميل كسول'],['showall','عرض الكل']]],
        ['lazyYt','YouTube',[['lazy','كسول'],['defer','مؤجل (Defer)']]],
        ['audioPlayer','مشغل صوت',[['default','HTML5 Audio']]],
        ['videoPlayer','مشغل فيديو',[['default','HTML5 Video']]]
    ],
    buttonLink: [
        ['button','زر',[['default','زر']]],
        ['link','رابط',[['extL','خارجي'],['alt','alt'],['sec','sec'],['button','زر'],['buttonLn','زر خطي']]]
    ],
    download: [['downloadBox','تحميل',[['default','Download Box']]]],
    table: [['table','جدول',[['default','جدول']]]],
    codeSteps: [
        ['steps','خطوات',[['default','Steps']]],
        ['list','قائمة',[['default','ul'],['s1','ul.s1']]],
        ['code','كود',[['html','HTML'],['css','CSS'],['js','JavaScript'],['json','JSON']]],
        ['codeTabs','أكواد متعددة',[['default','HTML + CSS + JS + JSON']]],
        ['inlineCode','كود مضمن',[['default','مصطلح']]]
    ],
    toc: [['toc','محتويات',[['automatic','تلقائي'],['manual','يدوي']]]],
    related: [
        ['relatedManual','يدوية',[['default','منشورات يدوية']]],
        ['relatedAuto','تلقائية',[['default','منشورات تلقائية']]]
    ],
    basics: [['basics','أساسيات',[['default','Meta وMore']]]],
    faqAccordion: [
        ['faq','أسئلة شائعة',[['default','FAQ Schema']]],
        ['accordion','أكورديون',[['sp','Spoiler'],['ac','عادي'],['ac alt','نمط alt'],['group','مجمع'],['blur','Blur Text']]]
    ],
    highlight: [['mark','تمييز',[
        ['','عادي (أصفر)'],
        ['block','كتلة (block)'],
        ['red','أحمر (red)'],
        ['gray','رمادي (gray)'],
        ['orange','برتقالي (orange)'],
        ['blue','أزرق (blue)'],
        ['green','أخضر (green)'],
        ['gold','ذهبي (gold)'],
        ['purple','بنفسجي (purple)']
    ]]],
    keyboard: [['kbd','اختصار',[['default','اختصار']]]]
};

  const menuTitles = {
    heading: 'مستويات العناوين', paragraph: 'أنماط الفقرات', quote: 'أنماط الاقتباس',
    noteAlert: 'الملاحظات والتنبيهات', media: 'الصور والفيديو', buttonLink: 'الأزرار والروابط',
    download: 'صندوق التحميل', table: 'جدول', codeSteps: 'الأكواد والخطوات',
    toc: 'جدول المحتويات', related: 'المنشورات ذات الصلة', basics: 'أساسيات Blogger',
    faqAccordion: 'الأسئلة والأكورديون', highlight: 'تمييز النص', keyboard: 'اختصار لوحة المفاتيح'
  };
  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function escapeAttr(v){ return String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function blocksForOutput(){ return (modweebBlocks || []).filter(b => !state.draftId || b.id !== state.draftId); }
  function prettyHTML(html){
    const src = String(html || '').replace(/\r\n?/g, '\n').trim();
    if (!src) return '';
    const tokens = src.replace(/>\s+</g, '><').split(/(<!--[\s\S]*?-->|<[^>]+>)/g).filter(Boolean);
    const lines = [], inline = ['a','b','strong','em','i','span','code','small','label'];
    let indent = 0, current = '';
    const put = (text, level) => { if (level === undefined) level = indent; const v = text.trim(); if (!v) return; lines.push('  '.repeat(Math.max(0, level)) + v); };
    tokens.forEach(token => {
      if (token.startsWith('<!--')) { if (current){put(current);current='';} put(token); return; }
      if (token.startsWith('</')) { if (current){put(current);current='';} indent = Math.max(0, indent - 1); put(token); return; }
      if (token.startsWith('<')) {
        const m = token.match(/^<\s*([a-z0-9-]+)/i), tag = m ? m[1].toLowerCase() : '';
        const self = /\/>$/.test(token) || /^(img|br|hr|input|meta|link)$/i.test(tag);
        if (inline.includes(tag) && current) current += token;
        else { if (current){put(current);current='';} put(token); }
        if (!self && !inline.includes(tag)) indent++;
        return;
      }
      const v = token.replace(/\s+/g, ' ').trim();
      if (v) current += v;
    });
    if (current) put(current);
    return lines.join('\n');
  }
  function htmlFromBlocks(){
    let html = '', ranges = [];
    blocksForOutput().forEach(b => {
      const chunk = prettyHTML(modweebRenderPreviewItem(b) || '');
      if (!chunk) return;
      if (html) html += '\n\n';
      const start = html.length;
      html += chunk;
      ranges.push({id: b.id, type: b.type, start, end: html.length});
    });
    state.ranges = ranges;
    return html;
  }
  function setLineNumbers(){
    if (!state.editor || !state.lines) return;
    const count = Math.max(1, state.editor.value.split('\n').length);
    const pos = state.editor.selectionStart || 0;
    const before = state.editor.value.slice(0, pos);
    const current = before.split('\n').length;
    let html = [];
    for (let i = 1; i <= count; i++) html.push('<span class="mw-line' + (i === current ? ' is-current' : '') + '">' + i + '</span>');
    state.lines.innerHTML = html.join('\n');
    state.lines.scrollTop = state.editor.scrollTop;
    updateCursorInfo();
  }
  function updateCursorInfo(){
    if (!state.editor) return;
    const pos = state.editor.selectionStart || 0;
    const before = state.editor.value.slice(0, pos);
    const line = before.split('\n').length;
    const col = pos - (before.lastIndexOf('\n') + 1) + 1;
    const p = document.getElementById('mwFooterPosition');
    if (p) p.textContent = 'السطر ' + line + ' العمود ' + col;
    state.selection = {start: state.editor.selectionStart || 0, end: state.editor.selectionEnd || 0};
  }
  function updateFooter(){
    if (!state.editor) return;
    const html = state.editor.value || '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const text = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const w = document.getElementById('mwFooterWords'); if (w) w.textContent = 'الكلمات ' + words;
    const c = document.getElementById('mwFooterChars'); if (c) c.textContent = 'الأحرف ' + text.length;
    const l = document.getElementById('mwFooterLines'); if (l) l.textContent = 'الأسطر ' + Math.max(1, html.split('\n').length);
  }
  function updatePreview(){
    const html = state.editor ? state.editor.value : (modweebArticleHTML || '');
    const t = document.getElementById('unifiedPreview');
    if (t) t.innerHTML = html.trim() ? '<div class="modweeb-preview-content">' + html + '</div>' : '<div class="unified-empty">أضف عنصراً من الشريط لبدء المقال</div>';
    const meta = document.getElementById('unifiedPreviewMeta');
    if (meta) meta.textContent = (html.match(/<[^/!][^>]*>/g) || []).length + ' عنصر HTML';
    updateFooter();
    if (typeof modweebUpdateStats === 'function') modweebUpdateStats();
  }
  function renderEditor(html, dirty){
    if (!state.editor) return;
    state.editor.value = html || '';
    state.previousEditorValue = state.editor.value;
    modweebArticleHTML = state.editor.value;
    state.dirty = !!dirty;
    setLineNumbers();
    updatePreview();
    const st = document.getElementById('mwFooterSave');
    if (st) { st.textContent = dirty ? 'تعديلات غير محفوظة' : 'متزامن'; st.className = 'mw-status ' + (dirty ? 'dirty' : 'saved'); }
  }
  function pushHistory(html, immediate){
    clearTimeout(state.historyTimer);
    const save = () => {
      if (state.history[state.historyIndex] === html) return;
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push(html);
      if (state.history.length > 60) state.history.shift();
      state.historyIndex = state.history.length - 1;
    };
    if (immediate) save(); else state.historyTimer = setTimeout(save, 450);
  }
  function commitHTML(html, immediate){
    if (immediate === undefined) immediate = true;
    const formatted = String(html || '');
    renderEditor(formatted, true);
    pushHistory(formatted, immediate);
  }
  function refreshFromBlocks(){
    if (state.dirty || state.draft) return;
    const html = htmlFromBlocks();
    renderEditor(html, false);
    pushHistory(html, true);
  }
  function insertMore(){
    if (!state.editor) return;
    const start = state.editor.selectionStart, end = state.editor.selectionEnd, value = state.editor.value;
    const before = value.slice(0, start), after = value.slice(end);
    const marker = '<!--more-->';
    const left = before && !before.endsWith('\n') ? '\n' : '';
    const right = after && !after.startsWith('\n') ? '\n' : '';
    const next = before + left + marker + right + after;
    const cursor = (before + left + marker + right).length;
    commitHTML(next, true);
    state.editor.focus();
    state.editor.setSelectionRange(cursor, cursor);
    updateCursorInfo();
    modweebShowStatus('تم إدراج فاصل Blogger');
  }
  function openMenu(key, trigger){
  document.querySelectorAll('.unified-menu.open').forEach(m => m.remove());
  const data = menuData[key];
  if (!data) return;

  // 1) تأكد أن الزر مرئي بالكامل داخل شريطه قبل فتح القائمة
  const toolbar = trigger.closest('.unified-toolbar');
  if (toolbar) {
    const tbRect = toolbar.getBoundingClientRect();
    const tgRect = trigger.getBoundingClientRect();
    const pad = 14;
    // إن كان الزر جزئياً أو كلياً خارج المنطقة المرئية
    if (tgRect.left < tbRect.left + pad || tgRect.right > tbRect.right - pad) {
      const btnCenterInContent = (tgRect.left - tbRect.left) + toolbar.scrollLeft + tgRect.width / 2;
      const targetScrollLeft = btnCenterInContent - tbRect.width / 2;
      toolbar.scrollLeft = Math.max(0, targetScrollLeft);
    }
  }

  // 2) ابنِ القائمة وأضفها إلى body مباشرة
  const menu = document.createElement('div');
  menu.className = 'unified-menu open';
  menu.innerHTML = '<div class="menu-section-title">' + (menuTitles[key] || 'العناصر') + '</div>' + data.map(([type, label, options]) => '<div>' + options.map(([value, text]) => '<button type="button" data-type="' + type + '" data-option="' + escapeAttr(value) + '"><span>' + label + ' · ' + text + '</span></button>').join('') + '</div>').join('');
  document.body.appendChild(menu);

  // 3) استخدم rAF لضمان استقرار التمرير قبل حساب الموضع
  requestAnimationFrame(() => {
    const rect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const menuW = menuRect.width || 160;
    const menuH = menuRect.height || 200;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;

    // الموضع الأفقي: نفضّل أن تكون الحافة اليمنى للقائمة عند يمين الزر
    let right = vw - rect.right;
    // لو تجاوزت يمين الشاشة
    if (right < pad) right = pad;
    // لو تجاوزت يسار الشاشة (وهذه حالة الزر عند الحافة اليسرى)
    if (right + menuW > vw - pad) {
      // نُزيح القائمة لليسار فقط بالحد المطلوب
      right = Math.max(pad, vw - menuW - pad);
    }

    // الموضع الرأسي: أسفل الزر
    let top = rect.bottom + 6;
    if (top + menuH > vh - pad) {
      const topAbove = rect.top - menuH - 6;
      if (topAbove >= pad) top = topAbove;
      else top = Math.max(pad, vh - menuH - pad);
    }

    menu.style.top = top + 'px';
    menu.style.right = right + 'px';
  });

  menu.addEventListener('click', e => {
    const b = e.target.closest('button[data-type]');
    if (!b) return;
    closeMenus();
    openElementSheet(b.dataset.type, b.dataset.option);
  });
}
  function closeMenus(){
  document.querySelectorAll('.unified-menu.open').forEach(m => m.remove());
  document.querySelectorAll('.unified-menu-trigger[aria-expanded="true"]').forEach(function(b){
    b.setAttribute('aria-expanded', 'false');
    // إزالة التركيز لتفادي بقاء :focus على الجوال بعد اللمس
    try { if (document.activeElement === b) b.blur(); } catch(e){}
  });
}
    function newDraft(type, option){
    if (typeof modweebAddBlock !== 'function') return null;
    modweebAddBlock(type);
    const draft = modweebBlocks.pop();
    if (!draft) return {id: 'draft-' + Date.now(), type};
    draft.id = 'draft-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    if (type === 'heading') draft.headingLevel = option || 'h2';
    if (type === 'paragraph') draft.paragraphStyle = option || 'normal';
    if (type === 'image') draft.imageStyle = option || 'standard';
    if (type === 'link') draft.linkStyle = option || 'extL';
    if (type === 'blockquote') draft.quoteStyle = option || 'normal';
    if (type === 'note') draft.noteStyle = option === 'question' ? 'question' : (option || 'info');
    if (type === 'alert') {
        draft.alertStyle = option || 'info';
        if (option === 'tip' || option === 'question') draft.alertStyle = option;
    }
    if (type === 'code') draft.codeLanguage = option || 'html';
    if (type === 'accordion' || type === 'spoiler' || type === 'accordionGroup') {
        draft.accordionType = option || 'ac';
    }
    if (type === 'toc') draft.tocStyle = option || 'automatic';
    if (type === 'lazyYt') draft.youtubeMode = option || 'lazy';
    if (type === 'list') draft.listStyle = option || 'default';
    if (type === 'mark') draft.markClass = option || '';
    return draft;
}
  function selectedRange(type){
    const utility = window.ModweebEditorRanges;
    if (utility && typeof utility.findActive === 'function') {
      return utility.findActive(state.ranges, state.selection.start, state.selection.end, type);
    }
    const low = Math.min(state.selection.start, state.selection.end);
    const high = Math.max(state.selection.start, state.selection.end);
    return state.ranges
      .filter(r => (!type || r.type === type) && (low === high ? low >= r.start && low <= r.end : low < r.end && high > r.start))
      .sort((a, b) => (a.end - a.start) - (b.end - b.start))[0] || null;
  }
  function renderDraft(){
    if (!state.draft) return;
    const form = document.getElementById('unifiedElementForm');
    if (form) form.innerHTML = modweebRenderEditor(state.draft);
  }
  function openRawHTMLFallback(range){
    state.draft = null; state.draftId = null; state.targetRange = range; state.draftInserted = false;
    state.rawHTMLDraft = range.raw;
    const title = document.getElementById('unifiedElementTitle');
    if (title) title.textContent = 'تحرير HTML الخام';
    const hint = document.getElementById('unifiedElementHelp');
    if (hint) hint.textContent = 'يُعرض المحتوى كنص، ويستبدل النطاق المحدد فقط عند الحفظ.';
    const form = document.getElementById('unifiedElementForm');
    if (form) {
      form.innerHTML = '<label for="unifiedRawHTML" class="mw-field-label">HTML للعنصر المحدد</label><textarea id="unifiedRawHTML" spellcheck="false" dir="ltr" style="width:100%;min-height:240px;font-family:monospace;white-space:pre;tab-size:2"></textarea>';
      form.querySelector('#unifiedRawHTML').value = range.raw;
    }
    openSheet('unifiedElementSheet');
    const rawEditor = document.getElementById('unifiedRawHTML');
    if (rawEditor) rawEditor.focus();
  }
  function openElementSheet(type, option){
    closeMenus();
    if (document.activeElement === state.editor) updateCursorInfo();
    state.rawHTMLDraft = null;
    const range = selectedRange(type);
    const existing = range ? modweebBlocks.find(b => b.id === range.id) : null;
    const draft = existing ? clone(existing) : newDraft(type, option);
    if (!draft) return;
    state.draft = draft;
    state.draftId = draft.id;
    state.targetRange = range;
    state.draftInserted = !existing;
    if (state.draftInserted) modweebBlocks.push(state.draft);
    const title = document.getElementById('unifiedElementTitle');
    if (title) title.textContent = (existing ? 'تعديل ' : 'إضافة ') + (labels[type] || type);
    const hint = document.getElementById('unifiedElementHelp');
    if (hint) hint.textContent = help[type] || 'هذا العنصر يولد HTML منظماً.';
    renderDraft();
    openSheet('unifiedElementSheet');
  }
  function discardDraft(){
    if (state.draftInserted && state.draftId) modweebBlocks = modweebBlocks.filter(b => b.id !== state.draftId);
    state.draft = null; state.draftId = null; state.targetRange = null; state.draftInserted = false; state.rawHTMLDraft = null;
    closeSheet('unifiedElementSheet');
  }
  function saveDraft(){
    if (state.rawHTMLDraft !== null && state.targetRange) {
      const rawEditor = document.getElementById('unifiedRawHTML');
      const replacement = rawEditor ? rawEditor.value : state.rawHTMLDraft;
      const range = state.targetRange, value = state.editor.value;
      const next = value.slice(0, range.start) + replacement + value.slice(range.end);
      state.draft = null; state.draftId = null; state.targetRange = null; state.draftInserted = false; state.rawHTMLDraft = null;
      commitHTML(next, true);
      if (state.editor) {
        const cursor = Math.min(range.start + replacement.length, next.length);
        state.editor.focus();
        state.editor.setSelectionRange(cursor, cursor);
        updateCursorInfo();
      }
      closeSheet('unifiedElementSheet');
      modweebShowStatus('تم حفظ HTML للعنصر المحدد');
      return;
    }
    if (!state.draft) return;
    const draft = clone(state.draft);
    const chunk = prettyHTML(modweebRenderPreviewItem(draft) || '');
    let value = state.editor.value, next, index = 0;
    if (state.targetRange) {
      next = value.slice(0, state.targetRange.start) + chunk + value.slice(state.targetRange.end);
      index = state.targetRange.start;
    } else {
      const start = state.selection.start || value.length;
      const end = state.selection.end || start;
      const before = value.slice(0, start), after = value.slice(end);
      next = before + (before && !before.endsWith('\n') ? '\n\n' : '') + chunk + (after && !after.startsWith('\n') ? '\n\n' : '') + after;
      index = start;
    }
    modweebBlocks = modweebBlocks.filter(b => b.id !== state.draftId);
    const bi = state.targetRange ? modweebBlocks.findIndex(b => b.id === state.targetRange.id) : -1;
    if (bi >= 0) modweebBlocks[bi] = draft;
    else {
      const insertAt = state.ranges.filter(r => r.end <= index).length;
      modweebBlocks.splice(insertAt, 0, draft);
    }
    state.draft = null; state.draftId = null; state.targetRange = null; state.draftInserted = false; state.rawHTMLDraft = null;
    commitHTML(next, true);
    closeSheet('unifiedElementSheet');
    modweebShowStatus('تم حفظ ' + (labels[draft.type] || 'العنصر'));
  }
  function formatCurrent(){
    if (!state.editor) return;
    const pos = state.editor.selectionStart;
    const next = prettyHTML(state.editor.value);
    commitHTML(next, true);
    state.editor.focus();
    state.editor.setSelectionRange(Math.min(pos, next.length), Math.min(pos, next.length));
    modweebShowStatus('تم تنسيق HTML');
  }
  function unifiedUndo(){
    if (state.historyIndex <= 0) return;
    state.historyIndex--;
    renderEditor(state.history[state.historyIndex], true);
    if (state.editor) state.editor.focus();
    modweebShowStatus('تم التراجع');
  }
  function unifiedRedo(){
    if (state.historyIndex >= state.history.length - 1) return;
    state.historyIndex++;
    renderEditor(state.history[state.historyIndex], true);
    if (state.editor) state.editor.focus();
    modweebShowStatus('تم التقدم');
  }
  function unifiedClear(){
    showConfirmPopup('سيتم مسح محتوى المحرر الحالي. هل تريد المتابعة؟', () => {
      modweebBlocks = [];
      commitHTML('', true);
      modweebArticleHTML = '';
      if (typeof window.modweebResetEditorState === 'function') window.modweebResetEditorState();
      if (typeof window.modweebResetArticleContent === 'function') window.modweebResetArticleContent();
      modweebShowStatus('تم مسح المقال');
    }, () => {}, 'مسح المقال', 'إلغاء');
  }
  function togglePreview(){
    const w = document.querySelector('.unified-workspace');
    const btn = document.querySelector('.unified-preview-toggle');
    if (!w) return;
    const hidden = w.classList.toggle('preview-hidden');
    modweebShowStatus(
  hidden ? ' تم إخفاء المعاينة' : ' تم إظهار المعاينة',
  1500
);
    if (btn) {
      btn.classList.toggle('active', !hidden);
      btn.setAttribute('aria-pressed', String(!hidden));
      // تحديث النص
      const span = btn.querySelector('span');
      if (span) span.textContent = hidden ? 'إظهار' : 'إخفاء';
      // تحديث الأيقونة
      const svg = btn.querySelector('svg');
      if (svg) {
        if (hidden) {
          // المعاينة مخفية → أيقونة عين عادية (لفتح المعاينة)
          svg.innerHTML = "<path d='M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z'/><circle cx='12' cy='12' r='2.5'/>";
        } else {
          // المعاينة ظاهرة → أيقونة عين مقطوعة (لإخفاء المعاينة)
          svg.innerHTML = "<path d='m3 3 18 18'/><path d='M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.2 18.2 0 0 1-3.4 4.5M6.3 6.3C3.5 8.2 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 3.7-.7'/>";
        }
      }
      // تحديث الـ title للـ tooltip
      btn.title = hidden ? 'إظهار المعاينة المباشرة' : 'إخفاء المعاينة المباشرة';
    }
}
  function patchLegacy(){
    window.modweebRenderBlocks = function(){ if (!state.initialized || state.dirty || state.draft) return; refreshFromBlocks(); };
    window.modweebUpdatePreview = updatePreview;
    window.modweebUpdateStats = function(){
      if (state.editor) {
        const html = state.editor.value;
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const text = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
        const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
        const uw = document.getElementById('unifiedStatsWords'); if (uw) uw.textContent = words;
        const uc = document.getElementById('unifiedStatsChars'); if (uc) uc.textContent = text.length;
        const ur = document.getElementById('unifiedStatsReadTime'); if (ur) ur.textContent = Math.ceil(words/200) + ' دقيقة';
      }
    };
    window.modweebScheduleRender = function(){ if (state.draft) renderDraft(); else if (!state.dirty) refreshFromBlocks(); else updatePreview(); };
    window.modweebSaveToHistory = function(silent){ if (legacy.saveHistory) legacy.saveHistory(silent); if (!silent && !state.dirty && !state.draft) refreshFromBlocks(); };
    window.generateFullHTML = function(){
      if (state.editor && state.initialized) {
        modweebArticleHTML = state.editor.value;
        const c = document.getElementById('codeArea');
        if (c) c.textContent = modweebArticleHTML;
        updatePreview();
        return modweebArticleHTML;
      }
      return legacy.generate ? legacy.generate() : '';
    };
    window.generateHeaderHTML = function(){
      const html = window.generateFullHTML();
      if (String(html || '').trim()) modweebShowStatus('تم توليد كود المقال HTML');
      else modweebShowStatus('لا يوجد محتوى');
      return html;
    };
    window.clearAll = function(){ if (state.initialized) unifiedClear(); else if (legacy.clearAll) legacy.clearAll(); };
    window.saveToLocalStorage = function(){
      try {
        localStorage.setItem('modweebGeneratorV2', JSON.stringify({blocks: modweebBlocks, html: state.editor ? state.editor.value : modweebArticleHTML, timestamp: Date.now()}));
        const st = document.getElementById('mwFooterSave');
        if (st) { st.textContent = 'محفوظ'; st.className = 'mw-status saved'; }
        modweebShowStatus('تم حفظ المقال');
      } catch(e){ modweebShowStatus('فشل الحفظ'); }
    };
    window.updateBlock = function(id, key, value){
      if (state.draft && id === state.draftId) { state.draft[key] = value; renderDraft(); return; }
      if (legacy.updateBlock) legacy.updateBlock(id, key, value);
    };
    window.modweebCommitBlocks = function(nextBlocks, options){
      if (options === undefined) options = {};
      const incoming = Array.isArray(nextBlocks) ? clone(nextBlocks) : [];
      const base = options.mode === 'append' ? clone(modweebBlocks || []) : [];
      modweebBlocks = base.concat(incoming);
      state.draft = null; state.draftId = null; state.targetRange = null; state.draftInserted = false; state.rawHTMLDraft = null;
      const html = htmlFromBlocks();
      renderEditor(html, false);
      pushHistory(html, true);
      if (options.save !== false) window.saveToLocalStorage();
      return html;
    };
    window.modweebCommitHTML = function(html, options){
      if (options === undefined) options = {};
      const value = String(html || '');
      state.draft = null; state.draftId = null; state.targetRange = null; state.draftInserted = false; state.rawHTMLDraft = null;
      renderEditor(value, false);
      pushHistory(value, true);
      if (options.save !== false) window.saveToLocalStorage();
      return value;
    };
    window.modweebResetEditorState = function(){
      clearTimeout(state.historyTimer);
      state.historyTimer = null;
      state.history = [''];
      state.historyIndex = 0;
      state.ranges = [];
      state.selection = {start: 0, end: 0};
      state.previousEditorValue = '';
      state.dirty = false;
      state.draft = null; state.draftId = null; state.targetRange = null;
      state.draftInserted = false; state.rawHTMLDraft = null;
      modweebBlocks = [];
      if (state.editor) renderEditor('', false);
    };
  }
  function findElementRange(value, position){
    const html = String(value || '');
    const stack = [], candidates = [];
    const voidTags = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i;
    const blockStart = /^(address|article|aside|blockquote|div|dl|fieldset|footer|form|h[1-6]|header|hr|main|nav|ol|pre|section|table|ul)$/i;
    const closesOpen = {p:/^p$/i, li:/^li$/i, dt:/^(dt|dd)$/i, dd:/^(dt|dd)$/i, option:/^option$/i, tr:/^tr$/i, tbody:/^tr$/i, thead:/^tr$/i, tfoot:/^tr$/i, td:/^(td|th)$/i, th:/^(td|th)$/i};
    let i = 0;
    while (i < html.length) {
      const lt = html.indexOf('<', i);
      if (lt < 0) break;
      if (html.startsWith('<!--', lt)) {
        const close = html.indexOf('-->', lt + 4), end = close < 0 ? html.length : close + 3;
        if (position >= lt && position <= end) candidates.push({start:lt,end,raw:html.slice(lt,end),name:'#comment'});
        i = end; continue;
      }
      let j = lt + 1, quote = '';
      for (; j < html.length; j++) {
        const ch = html[j];
        if (quote) { if (ch === quote) quote = ''; continue; }
        if (ch === '"' || ch === "'") { quote = ch; continue; }
        if (ch === '>') break;
      }
      if (j >= html.length) break;
      const token = html.slice(lt, j + 1);
      const nm = token.match(/^<\s*(\/?)\s*([a-z][a-z0-9:-]*)\b/i);
      if (!nm) { i = j + 1; continue; }
      const closing = !!nm[1], name = nm[2].toLowerCase();
      if (closing) {
        for (let k = stack.length - 1; k >= 0; k--) {
          if (stack[k].name !== name) continue;
          const open = stack.splice(k, 1)[0], end = j + 1;
          candidates.push({start:open.start,end,raw:html.slice(open.start,end),name,parentName:open.parentName});
          break;
        }
      } else {
        const closeRule = blockStart.test(name) ? /^p$/i : closesOpen[name];
        if (closeRule) {
          for (let k = stack.length - 1; k >= 0; k--) {
            if (closeRule.test(stack[k].name)) { stack.splice(k); break; }
          }
        }
        if (voidTags.test(name) || /\/\s*>$/.test(token)) candidates.push({start:lt,end:j + 1,raw:token,name,parentName:stack.length ? stack[stack.length - 1].name : ''});
        else stack.push({name,start:lt,parentName:stack.length ? stack[stack.length - 1].name : ''});
      }
      i = j + 1;
    }
    const containing = candidates.filter(c => position >= c.start && position <= c.end);
    if (!containing.length) return null;
    const ranked = containing.map(candidate => {
      if (candidate.name === '#comment') return {candidate,mapping:{type:'rawHTML'},priority:0};
      const holder = document.createElement('div');
      holder.innerHTML = candidate.raw;
      const el = holder.firstElementChild;
      let mapping = el ? mapHTMLTagToBlockType(el.tagName.toLowerCase(), el) : null;
      if (candidate.name === 'code' && candidate.parentName === 'pre') mapping = null;
      if (mapping && mapping.type === 'basics') return {candidate,mapping:{type:'rawHTML'},priority:0};
      const wrapper = el && (el.tagName.toLowerCase() === 'figure' || el.tagName.toLowerCase() === 'pre' || (el.tagName.toLowerCase() === 'table' && el.classList.contains('tr-caption-container')) || (el.tagName.toLowerCase() === 'div' && ['table','alert','showH','zmImg','dlBox','psImg','glImg','pre','tabs'].some(cls => el.classList.contains(cls))));
      return {candidate,mapping,priority:wrapper ? 0 : 1};
    });
    ranked.sort((a,b) => {
      if (!!a.mapping !== !!b.mapping) return a.mapping ? -1 : 1;
      if (a.mapping && a.priority !== b.priority) return a.priority - b.priority;
      return (a.candidate.end - a.candidate.start) - (b.candidate.end - b.candidate.start);
    });
    return ranked[0].candidate;
  }
  function init(){
    const editor = document.getElementById('unifiedCodeEditor');
    state.editor = editor;
    state.lines = document.getElementById('unifiedLineNumbers');
    state.preview = document.getElementById('unifiedPreview');
    if (!editor) return;
    state.initialized = true;
    patchLegacy();
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('modweebGeneratorV2') || 'null'); } catch(e){}
    const initial = saved && saved.html != null ? saved.html : htmlFromBlocks();
    renderEditor(initial || '', false);
    pushHistory(editor.value, true);
    editor.addEventListener('input', () => {
      const previous = state.previousEditorValue;
      const rangeUtility = window.ModweebEditorRanges;
      if (rangeUtility && typeof rangeUtility.adjustAfterEdit === 'function') {
        state.ranges = rangeUtility.adjustAfterEdit(state.ranges, previous, editor.value);
      }
      state.previousEditorValue = editor.value;
      state.dirty = true;
      modweebArticleHTML = editor.value;
      setLineNumbers();
      updatePreview();
      pushHistory(editor.value, false);
      const st = document.getElementById('mwFooterSave');
      if (st) { st.textContent = 'تعديلات غير محفوظة'; st.className = 'mw-status dirty'; }
    });
    ['click','keyup','select','focus'].forEach(t => editor.addEventListener(t, () => { updateCursorInfo(); setLineNumbers(); }));
    editor.addEventListener('scroll', () => { if (state.lines) state.lines.scrollTop = editor.scrollTop; });
    editor.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = editor.selectionStart, en = editor.selectionEnd;
        editor.setRangeText('  ', s, en, 'end');
        editor.dispatchEvent(new Event('input'));
      }
    });
    document.querySelectorAll('[data-unified-menu]').forEach(btn => btn.addEventListener('click', e => {
  e.stopPropagation();
  const isMyOpen = btn.getAttribute('aria-expanded') === 'true';

  /* 1) قائمة هذا الزر مفتوحة → أغلقها */
  if (isMyOpen){
    closeMenus();
    return;
  }

  /* 2) هناك قائمة أخرى مفتوحة (أوضاع/ترجمة) → أغلقها بدون فتح الجديدة */
  if (document.querySelector('.unified-menu.open')){
    if (typeof window.closeAllModweebMenus === 'function') window.closeAllModweebMenus();
    closeMenus();
    return;
  }

  /* 3) لا يوجد شيء مفتوح → افتح */
  btn.setAttribute('aria-expanded', 'true');
  openMenu(btn.dataset.unifiedMenu, btn);
}));
    document.querySelectorAll('[data-unified-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = btn.dataset.unifiedAction;
        if (a === 'undo') unifiedUndo();
        if (a === 'redo') unifiedRedo();
        if (a === 'clear') unifiedClear();
        if (a === 'more') insertMore();
        if (a === 'format') formatCurrent();
        if (a === 'focus-edit') {
  const pos = editor.selectionStart || 0;
  const range = findElementRange(editor.value, pos);
  if (!range) { modweebShowStatus('ضع المؤشر داخل عنصر HTML قابل للتحرير'); return; }
  if (range.name === '#comment') { openRawHTMLFallback(range); return; }
  const holder = document.createElement('div');
  holder.innerHTML = range.raw;
  const el = holder.firstElementChild;
  if (!el) { modweebShowStatus('تعذر قراءة العنصر'); return; }
  const mapped = mapHTMLTagToBlockType(el.tagName.toLowerCase(), el);
  if (!mapped || mapped.type === 'rawHTML') { openRawHTMLFallback(range); return; }
  const draft = modweebTemplateDefaultBlock({ id: 'edit-' + Date.now(), type: mapped.type });
  populateBlockProperties(draft, el, mapped);
  state.draft = draft;
  state.draftId = draft.id;
  state.targetRange = range;
  state.draftInserted = false;
  state.rawHTMLDraft = null;
  const title = document.getElementById('unifiedElementTitle');
  if (title) title.textContent = 'تعديل ' + (labels[mapped.type] || mapped.type);
  const hint = document.getElementById('unifiedElementHelp');
  if (hint) hint.textContent = help[mapped.type] || 'حرّر خصائص العنصر ثم احفظه.';
  renderDraft();
  openSheet('unifiedElementSheet');
}
        if (a === 'save') window.saveToLocalStorage();
        if (a === 'toggle-preview') togglePreview();
      });
    });
    document.querySelectorAll('[data-unified-sheet-cancel]').forEach(btn => btn.addEventListener('click', discardDraft));
    const saveBtn = document.querySelector('[data-unified-sheet-save]');
    if (saveBtn) saveBtn.addEventListener('click', saveDraft);
    document.addEventListener('click', e => {
      if (!e.target.closest('[data-unified-menu]') && !e.target.closest('.unified-menu')) closeMenus();
    });
    /* إغلاق عند النقر خارج القائمة */
document.addEventListener('click', e => {
  if (!e.target.closest('[data-unified-menu]') && !e.target.closest('.unified-menu')) closeMenus();
});

/* إغلاق عند الضغط على Escape + اختصار Ctrl+S */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeMenus(); if (state.draft || state.rawHTMLDraft !== null) discardDraft(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); window.saveToLocalStorage(); }
});

/* إغلاق عند تغيير حجم النافذة */
window.addEventListener('resize', closeMenus);

/* إغلاق القائمة عند التمرير في أي شريط */
const unifiedToolbar = document.getElementById('unifiedToolbar');
if (unifiedToolbar) {
  unifiedToolbar.addEventListener('scroll', closeMenus, { passive: true });
}
const unifiedElementsToolbar = document.getElementById('unifiedElementsToolbar');
if (unifiedElementsToolbar) {
  unifiedElementsToolbar.addEventListener('scroll', closeMenus, { passive: true });
}

/* إغلاق عند أي تمرير في الصفحة (لأي عنصر قابل للتمرير) */
window.addEventListener('scroll', closeMenus, { passive: true, capture: true });
    setLineNumbers();
    updatePreview();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* ============================================================
   دوال إضافية: convertHTMLToBlocks + smartInsertResult
   ============================================================ */
function convertHTMLToBlocks(e){}
function mapHTMLTagToBlockType(tag, el){
  const cls = el.classList ? Array.from(el.classList) : String(el.className || '').split(/\s+/).filter(Boolean);
  const par = el.parentElement;
  const pcls = par && par.classList ? Array.from(par.classList) : String(par && par.className || '').split(/\s+/).filter(Boolean);
  if (tag === 'style' || (tag === 'div' && el.hasAttribute('hidden'))) return {type:'rawHTML'};
  const rules = [
    /* العناوين */
    {tag:/^h[1-6]$/, type:'heading'},

    /* الفقرات */
    {tag:'p', class:'pIndent', type:'paragraph', props:{paragraphStyle:'indent'}},
    {tag:'p', class:'pRef',    type:'paragraph', props:{paragraphStyle:'ref'}},
    {tag:'p', class:'dropCap', type:'paragraph', props:{paragraphStyle:'dropcap'}},
    {tag:'p', hasChildClass:'dropCap', type:'paragraph', props:{paragraphStyle:'dropcap'}},

    /* الملاحظات والتنبيهات */
    {tag:'p', class:'note wr', type:'note', props:{noteStyle:'warning'}},
    {tag:'p', class:'note qs', type:'note', props:{noteStyle:'question'}},
    {tag:'p', class:'note',    type:'note', props:{noteStyle:'info'}},
    {tag:'p', type:'paragraph'},
    {tag:'div', class:'alert tip outline',      type:'alert', props:{alertStyle:'tip',      alertOutlined:true}},
    {tag:'div', class:'alert tip',              type:'alert', props:{alertStyle:'tip'}},
    {tag:'div', class:'alert question outline', type:'alert', props:{alertStyle:'question', alertOutlined:true}},
    {tag:'div', class:'alert question',         type:'alert', props:{alertStyle:'question'}},
    {tag:'div', class:'alert info outline',     type:'alert', props:{alertStyle:'info',     alertOutlined:true}},
    {tag:'div', class:'alert warning outline',  type:'alert', props:{alertStyle:'warning',  alertOutlined:true}},
    {tag:'div', class:'alert success outline',  type:'alert', props:{alertStyle:'success',  alertOutlined:true}},
    {tag:'div', class:'alert error outline',    type:'alert', props:{alertStyle:'error',    alertOutlined:true}},
    {tag:'div', class:'alert warning',          type:'alert', props:{alertStyle:'warning'}},
    {tag:'div', class:'alert success',          type:'alert', props:{alertStyle:'success'}},
    {tag:'div', class:'alert error',            type:'alert', props:{alertStyle:'error'}},
    {tag:'div', class:'alert outline',          type:'alert', props:{alertStyle:'info', alertOutlined:true}},
    {tag:'div', class:'alert',                  type:'alert', props:{alertStyle:'info'}},

    /* الاقتباس */
    {tag:'blockquote', class:'s1', type:'blockquote', props:{quoteStyle:'s1'}},
    {tag:'blockquote', class:'s2', type:'blockquote', props:{quoteStyle:'s2'}},
    {tag:'blockquote',             type:'blockquote', props:{quoteStyle:'normal'}},

    /* الصور */
    {tag:'figure', type:'image', props:{imageStyle:'figure'}},
    {tag:'table', class:'tr-caption-container', type:'image', props:{imageStyle:'figure'}},
    {tag:'img',  class:'full',               type:'image', props:{imageStyle:'full'}},
    {tag:'img',  parentClass:'grImg',        type:'image', props:{imageStyle:'grid'}},
    {tag:'img',  parentClass:'glImg',        type:'image', props:{imageStyle:'scroll'}},
    {tag:'div',  class:'zmImg',              type:'image', props:{imageStyle:'standard'}},
    {tag:'div',  class:'psImg grImg',         type:'image', props:{imageStyle:'grid'}},
    {tag:'div',  class:'psImg hdImg',         type:'image', props:{imageStyle:'showall'}},
    {tag:'div',  class:'glImg',               type:'image', props:{imageStyle:'scroll'}},
    {tag:'img',  class:'lazyload',           type:'image', props:{imageStyle:'lazyload'}},
    {tag:'img',  type:'image',               props:{imageStyle:'standard'}},

    /* الروابط والأزرار */
    {tag:'a', class:'button ln', type:'link', props:{linkStyle:'buttonLn'}},
    {tag:'a', class:'button',    type:'button'},
    {tag:'a', class:'extL alt',  type:'link', props:{linkStyle:'alt'}},
    {tag:'a', class:'extL sec',  type:'link', props:{linkStyle:'sec'}},
    {tag:'a', class:'extL',      type:'link', props:{linkStyle:'extL'}},
    {tag:'a',                    type:'link', props:{linkStyle:'extL'}},

    /* صندوق التحميل */
    {tag:'div', class:'dlBox', type:'downloadBox'},

    /* الجدول */
    {tag:'div', class:'table', type:'table'},
    {tag:'table', type:null},

    /* القوائم */
    {tag:'ol', class:'steps',    type:'steps'},
    {tag:'ul', class:'s1',       type:'list', props:{listStyle:'s1'}},
    {tag:'ul',                   type:'list', props:{listStyle:'default'}},
    {tag:'div', class:'kp-wrap', type:'keyPoints'},

    /* الأكواد */
    {tag:'div', class:'pre tabs', type:'codeTabs'},
    {tag:'pre', parentClass:'pre tabs', type:'codeTabs'},
    {tag:'pre', type:'code'},
    {tag:'kbd', type:'kbd'},
    {tag:'code', parentTag:'pre', type:null}, // تجاهل code داخل pre
    {tag:'code', type:'inlineCode'},

    /* الإخفاء والأكورديون */
    {tag:'span', class:'spoiler', type:'accordion', props:{accordionType:'blur'}},
    {tag:'details', class:'sp toc', type:'toc'},
    {tag:'details', class:'sp arp', type:'relatedAuto'},
    {tag:'details', class:'sp',     type:'accordion', props:{accordionType:'sp'}},
    {tag:'details', class:'ac alt', type:'accordion', props:{accordionType:'ac alt'}},
    {tag:'details', class:'ac',     type:'accordion', props:{accordionType:'ac'}},
    {tag:'div', class:'showH', itemscope:true, type:'faq'},
    {tag:'div', class:'showH', type:'accordion', props:{accordionType:'group'}},

    /* المحتويات والمنشورات ذات الصلة */
    {tag:'div',    class:'pRelate', type:'relatedManual'},

    /* الوسائط */
    {tag:'div', class:'lazyYt',  type:'lazyYt', props:{youtubeMode:'lazy'}},
    {tag:'div', class:'videoYt', type:'lazyYt', props:{youtubeMode:'defer'}},
    {tag:'audio', type:'audioPlayer'},
    {tag:'video', type:'videoPlayer'},

    /* التمييز */
    {tag:'mark', type:'mark'},

    /* الأساسيات (snippet hidden) */
    {tag:'div', hidden:true, type:'basics'}
  ];

  for (const r of rules) {
    const tagOk = r.tag instanceof RegExp ? r.tag.test(tag) : r.tag === tag;
    if (!tagOk) continue;
    if (r.type === null) return null;
    const classOk  = !r.class        || r.class.split(/\s+/).every(c => cls.includes(c));
    const parentOk = !r.parentClass  || r.parentClass.split(/\s+/).every(c => pcls.includes(c));
    const parentTagOk = !r.parentTag || (par && par.tagName.toLowerCase() === r.parentTag);
    const itemOk   = r.itemscope === undefined || el.hasAttribute('itemscope') === r.itemscope;
    const hiddenOk = r.hidden    === undefined || el.hasAttribute('hidden') === r.hidden;
    const childOk  = !r.hasChildClass || !!el.querySelector('.' + r.hasChildClass);
    if (classOk && parentOk && parentTagOk && itemOk && hiddenOk && childOk) {
      return {type: r.type, props: r.props || {}};
    }
  }
  return null;
}

function populateBlockProperties(b, el, mapped){
    const tag   = el.tagName.toLowerCase();
    const props = mapped.props || {};

    switch (mapped.type) {

        /* ─── heading ─── */
        case 'heading':
            b.content       = el.textContent.trim();
            b.headingLevel  = tag;
            b.headingBefore = el.getAttribute('data-before') || '';
            b.headingAfter  = el.getAttribute('data-after')  || '';
            break;

        /* ─── paragraph ─── */
        case 'paragraph':
            b.paragraphStyle = props.paragraphStyle || 'normal';
            b.content = el.innerHTML;
            if (b.paragraphStyle === 'dropcap') {
                const cap = el.querySelector('.dropCap');
                if (cap) b.dropCapChar = cap.textContent.trim();
            }
            if (b.paragraphStyle === 'ref') {
                const parts = el.innerHTML.split(/<br\s*\/?>/i);
                if (parts[1]) b.refSource = parts[1].trim();
            }
            break;

        /* ─── link ─── */
        case 'link':
            b.linkText  = el.textContent.trim();
            b.linkUrl   = el.getAttribute('href') || '';
            b.linkStyle = props.linkStyle || 'extL';
            break;

        /* ─── button ─── */
        case 'button':
            b.buttonText     = el.textContent.trim();
            b.buttonUrl      = el.getAttribute('href') || '';
            b.buttonOutlined = el.classList.contains('ln');
            const icEl = el.querySelector('i.icon');
            b.buttonIcon = icEl ? (icEl.classList.contains('dl') ? 'dl' : icEl.classList.contains('demo') ? 'demo' : '') : '';
            break;

        /* ─── blockquote ─── */
        case 'blockquote': {
            b.quoteStyle = props.quoteStyle || 'normal';
            const p = el.querySelector('p');
            b.content = p ? p.innerHTML : el.textContent.trim();
            const author = el.querySelector('span');
            if (author) b.quoteAuthor = author.textContent.trim();
            break;
        }

        /* ─── note ─── */
        case 'note': {
            b.noteStyle = props.noteStyle || 'info';
            const clone = el.cloneNode(true);
            const bTag = clone.querySelector('b');
            if (bTag) b.noteTitle = bTag.textContent.trim();
            if (bTag) bTag.remove();
            b.content = clone.innerHTML.replace(/^\s*<br\s*\/?>/i, '').trim();
            break;
        }

        /* ─── alert ─── */
        case 'alert': {
            const has = name => el.classList.contains(name);
            b.alertStyle = has('warning') ? 'warning'
                         : has('success') ? 'success'
                         : has('error')   ? 'error'
                         : has('tip')     ? 'tip'
                         : has('question')? 'question'
                         : 'info';
            b.alertOutlined = has('outline');
            const clone = el.cloneNode(true);
            const bTag = clone.querySelector('b');
            if (bTag) b.alertTitle = bTag.textContent.trim();
            if (bTag) bTag.remove();
            b.content = clone.innerHTML.trim();
            break;
        }

        /* ─── image ─── */
        case 'image': {
            let img = tag === 'img' ? el : el.querySelector('img');
            if (img) {
                b.imageUrl  = img.getAttribute('data-src') || img.getAttribute('src') || '';
                b.imageAlt  = img.getAttribute('alt') || '';
                b.imageWidth  = img.getAttribute('width')  || '1280';
                b.imageHeight = img.getAttribute('height') || '720';
            }
            if (props.imageStyle) b.imageStyle = props.imageStyle;

            if (b.imageStyle === 'figure') {
                const fc = el.querySelector('figcaption') || (el.parentElement && el.parentElement.querySelector('.tr-caption'));
                if (fc) b.caption = fc.textContent.trim();
                b.imageCaptionStyle = el.classList.contains('tr-caption-container') ? 'table' : 'figure';
            }
            if (b.imageStyle === 'grid' || b.imageStyle === 'scroll' || b.imageStyle === 'showall') {
                const imgs = el.querySelectorAll('img');
                const urls = [];
                imgs.forEach(i => { const s = i.getAttribute('src') || i.getAttribute('data-src'); if (s) urls.push(s); });
                b.gridUrls = urls.join('\n');
                if (b.imageStyle === 'scroll') {
                    if (el.classList.contains('h200')) b.scrollHeight = 'h200';
                    else if (el.classList.contains('h250')) b.scrollHeight = 'h250';
                    else b.scrollHeight = 'h150';
                }
            }
            b.imageLightbox = !!el.querySelector('.zmImg') || el.classList.contains('zmImg') || !!el.closest('.zmImg');
            break;
        }

        /* ─── table ─── */
        case 'table': {
            const rows = el.querySelectorAll('tr');
            const data = [];
            rows.forEach(r => {
                const cells = Array.from(r.querySelectorAll('td, th')).map(c => c.textContent.trim());
                if (cells.length) data.push(cells);
            });
            b.tableRows = data.length || 2;
            b.tableCols = data[0] ? data[0].length : 2;
            b.tableData = data.length ? data : [['',''],['','']];
            b.tableClasses = Array.from(el.classList).filter(c => c !== 'table').join(' ') || 'bordered stripped hovered';
            break;
        }

        /* ─── list ─── */
        case 'list': {
            const items = [];
            el.querySelectorAll(':scope > li').forEach(li => items.push(li.innerHTML));
            b.listItems = items.length ? items : [''];
            b.listStyle = props.listStyle || 'default';
            break;
        }

        /* ─── steps ─── */
        case 'steps': {
            const items = [];
            el.querySelectorAll(':scope > li').forEach(li => items.push(li.innerHTML));
            b.steps = items.length ? items : [''];
            break;
        }

        /* ─── keyPoints ─── */
        case 'keyPoints': {
            const items = [];
            el.querySelectorAll('.kp-item').forEach(it => items.push(it.textContent.trim()));
            b.steps = items.length ? items : [''];
            break;
        }

        /* ─── code ─── */
        case 'code': {
            const codeEl = el.querySelector('code') || el;
            b.codeContent = codeEl.textContent;
            const langCls = codeEl.className || '';
            if (langCls.includes('language-css'))  b.codeLanguage = 'css';
            else if (langCls.includes('language-js')) b.codeLanguage = 'js';
            else if (langCls.includes('language-json')) b.codeLanguage = 'json';
            else b.codeLanguage = 'html';
            b.codeComment   = el.getAttribute('data-comment') || '';
            b.codeSource    = el.getAttribute('data-source')  || '';
            b.codeLines     = el.getAttribute('data-lines')   || '';
            b.codeCopy      = el.getAttribute('data-copy') !== 'false';
            b.codeHighlight = el.getAttribute('data-highlight') !== 'false';
            b.codeSyntax    = el.getAttribute('data-syntax') !== 'false';
            break;
        }

        /* ─── codeTabs ─── */
        case 'codeTabs': {
            const pres = el.querySelectorAll(':scope > pre');
            const codes = ['', '', '', ''];
            const sources = ['', '', '', ''];
            pres.forEach((p, i) => {
                if (i > 3) return;
                const c = p.querySelector('code');
                codes[i]   = c ? c.textContent : '';
                sources[i] = p.getAttribute('data-source') || '';
            });
            b.tabHtml = codes[0]; b.tabCss = codes[1]; b.tabJs = codes[2]; b.tabJson = codes[3];
            if (sources[0]) b.tabHtmlSource = sources[0];
            if (sources[1]) b.tabCssSource  = sources[1];
            if (sources[2]) b.tabJsSource   = sources[2];
            if (sources[3]) b.tabJsonSource = sources[3];
            break;
        }

        /* ─── accordion / spoiler / group / blur ─── */
        case 'accordion': {
            const type = props.accordionType || 'ac';
            b.accordionType = type;
            if (type === 'blur') {
                b.spoilerBlurText = el.textContent.trim();
            } else if (type === 'group') {
                const items = [];
                el.querySelectorAll(':scope > details.ac').forEach(dt => {
                    const sum = dt.querySelector('summary');
                    const div = dt.querySelector('div p') || dt.querySelector('div');
                    items.push({
                        summary: sum ? sum.textContent.trim() : '',
                        content: div ? div.innerHTML : '',
                        alt: dt.classList.contains('alt')
                    });
                });
                b.accordions = items.length ? items : [{summary:'',content:'',alt:false}];
            } else {
                const sum = el.querySelector('summary');
                if (sum) b.summary = sum.textContent.trim();
                const div = el.querySelector('div p') || el.querySelector('div');
                if (div) b.content = div.innerHTML;
            }
            break;
        }

        /* ─── faq ─── */
        case 'faq': {
            const items = [];
            el.querySelectorAll('details.ac').forEach(dt => {
                const q = dt.querySelector('summary');
                const a = dt.querySelector('[itemprop="text"]') || dt.querySelector('div p');
                items.push({question: q ? q.textContent.trim() : '', answer: a ? a.innerHTML : ''});
            });
            b.faqItems = items.length ? items : [{question:'', answer:''}];
            break;
        }

        /* ─── toc ─── */
        case 'toc': {
            const sum = el.querySelector('summary');
            b.tocLabel = sum ? sum.textContent.trim() : 'جدول المحتويات';
            const links = el.querySelectorAll('.aToc ol li a');
            if (links.length) {
                b.tocStyle = 'manual';
                const items = [];
                links.forEach(a => items.push({text: a.textContent.trim(), id: (a.getAttribute('href')||'').replace(/^#/, '')}));
                b.tocManualItems = items;
            } else {
                b.tocStyle = 'automatic';
            }
            break;
        }

        /* ─── relatedManual ─── */
        case 'relatedManual': {
            const title = el.querySelector('b');
            b.relatedTitle = title ? title.textContent.trim() : 'قد ترغب في قراءة هذا المنشور:';
            const links = [];
            el.querySelectorAll('li a').forEach(a => links.push({text:a.textContent.trim(), url:a.getAttribute('href') || ''}));
            b.relatedLinks = links.length ? links : [{text:'', url:''}];
            break;
        }

        /* ─── relatedAuto ─── */
        case 'relatedAuto': {
            const sum = el.querySelector('summary');
            b.relatedAutoLabel = sum ? sum.textContent.trim() : 'منشورات ذات صلة';
            const rel = el.querySelector('.aRel');
            if (rel) {
                b.relatedDataLabel = rel.getAttribute('data-label') || '';
                b.relatedMax = parseInt(rel.getAttribute('data-max-results') || rel.getAttribute('data-max-posts')) || 6;
                b.relatedSortBy = rel.getAttribute('data-sort-by') || 'updated';
                b.relatedRandom = rel.getAttribute('data-random') === 'true';
            }
            break;
        }

        /* ─── lazyYt ─── */
        case 'lazyYt':
            if (props.youtubeMode === 'defer') {
                const iframe = el.querySelector('iframe');
                b.youtubeMode = 'defer';
                const ds = iframe ? (iframe.getAttribute('data-src') || '') : '';
                const m = ds.match(/embed\/([^?&]+)/);
                b.youtubeId = m ? m[1] : '';
            } else {
                b.youtubeMode = 'lazy';
                b.youtubeId = el.getAttribute('data-embed') || '';
            }
            {
                const style = el.getAttribute('style') || '';
                const rm = style.match(/--ratio:\s*([^;"]+)/);
                if (rm) b.ratio = rm[1].trim().replace(/\s*\/\s*/, '/');
            }
            break;

        /* ─── audioPlayer ─── */
        case 'audioPlayer': {
            const src = el.querySelector('source');
            b.audioUrl = src ? (src.getAttribute('src') || '') : (el.getAttribute('src') || '');
            b.audioPreload = el.getAttribute('preload') || 'metadata';
            break;
        }

        /* ─── videoPlayer ─── */
        case 'videoPlayer': {
            const src = el.querySelector('source');
            b.videoUrl   = src ? (src.getAttribute('src') || '') : (el.getAttribute('src') || '');
            b.videoType  = src ? (src.getAttribute('type') || 'video/mp4') : 'video/mp4';
            b.videoPoster  = el.getAttribute('poster') || '';
            b.videoPreload = el.getAttribute('preload') || 'metadata';
            b.videoWidth   = el.getAttribute('width')  || '100%';
            break;
        }

        /* ─── mark ─── */
        case 'mark': {
            b.markText = el.textContent;
            const classes = (el.className || '').split(/\s+/).filter(Boolean);
            b.markClass = classes.join(' ');
            break;
        }

        /* ─── kbd ─── */
        case 'kbd':
            b.kbdText = el.textContent.trim();
            break;

        /* ─── inlineCode ─── */
        case 'inlineCode':
            b.inlineCode = el.textContent.trim();
            break;

        /* ─── downloadBox ─── */
        case 'downloadBox': {
            const fN = el.querySelector('.fN span:first-child');
            const fS = el.querySelector('.fN .fS');
            const dl = el.querySelector('a.button');
            if (fN) b.fileName = fN.textContent.trim();
            if (fS) b.fileSize = fS.textContent.trim();
            if (dl) b.downloadFile = dl.getAttribute('href') || '';
            break;
        }

        /* ─── basics ─── */
        case 'basics': {
            if (el.textContent.trim()) b.metaDescription = el.textContent.trim();
            break;
        }
    }
}


/* ============================================================
   AI Mini Buttons - دوال الأزرار الصغيرة في نافذة النشر
   ============================================================ */

// --- 1) تحسين/توليد العنوان ---
async function aiGenTitle() {
    const titleInput = document.getElementById('bloggerPostTitle');
    const current = (titleInput?.value || '').trim();
    const topic = (document.getElementById('aiTopic')?.value || '').trim() || current;

    if (!topic) {
        modweebShowStatus(' أدخل عنواناً أو موضوعاً أولاً');
        return;
    }

    const btn = document.getElementById('btnAiTitle');
    btn.disabled = true; btn.classList.add('loading');
    const box = document.getElementById('suggestTitles');

    try {
        if (!window.modweebAI?.call || !window.modweebPrompts?.suggestTitles) throw new Error('خدمة الذكاء الاصطناعي غير مهيأة');
        const { systemPrompt, userPrompt } = window.modweebPrompts.suggestTitles({ title: topic, language: 'ar', count: 5 });
        const raw = await window.modweebAI.call({ systemPrompt, userPrompt, maxTokens: 800, jsonMode: true });
        const data = window.modweebAI.parseJSON(raw) || {};

        const list = Array.isArray(data.suggestions) ? data.suggestions.filter(t => typeof t === 'string').slice(0, 10) : [];
        box.innerHTML = '';
if (!list.length) {
    const empty = document.createElement('div');
empty.style.cssText = 'padding:10px 12px;color:var(--notifC);font-size:0.8rem';
empty.textContent = 'لا اقتراحات';
box.appendChild(empty);
} else {
    list.forEach(t => {
        const row = document.createElement('div');
        row.className = 'mw-suggest-item';

        const txt = document.createElement('span');
        txt.textContent = t;           //  آمن

        const meta = document.createElement('span');
        meta.className = 'mw-sug-meta';
        meta.textContent = 'اختيار ←';

        row.appendChild(txt);
        row.appendChild(meta);
        row.addEventListener('click', () => pickTitle(t));

        box.appendChild(row);
    });
}
        box.classList.add('show');
    } catch(e) {
        modweebShowStatus(' فشل التوليد: ' + e.message);
    } finally {
        btn.disabled = false; btn.classList.remove('loading');
    }
}

function pickTitle(t) {
    document.getElementById('bloggerPostTitle').value = t;
    document.getElementById('suggestTitles').classList.remove('show');
    modweebAutoSlug(t, true);
    modweebShowStatus(' تم اختيار العنوان');
}

// --- 2) توليد Slug ---
function aiGenSlug() {
    if (!MW_SLUG_ENABLED) {
        modweebShowStatus('ميزة Slug معطّلة — يُنشئ Blogger الرابط تلقائياً', 2500);
        return;
    }
    const title = (document.getElementById('bloggerPostTitle')?.value || '').trim();
    if (!title) {
        modweebShowStatus('أدخل عنوان المقال أولاً');
        return;
    }
    const slug = modweebToSlug(title);
    const el = document.getElementById('bloggerPostSlug');
    el.value = slug;
    modweebShowStatus('تم توليد Slug: ' + slug);
    try { navigator.clipboard.writeText(slug); } catch(e){}
}

// --- 3) توليد 5 تصنيفات ---
async function aiGenLabels() {
    const title = (document.getElementById('bloggerPostTitle')?.value || '').trim();
    const topic = (document.getElementById('aiTopic')?.value || '').trim() || title;
    if (!topic) { modweebShowStatus(' أدخل عنواناً أو موضوعاً'); return; }

    const btn = document.getElementById('btnAiLabels');
    btn.disabled = true; btn.classList.add('loading');
    const box = document.getElementById('suggestLabels');

    try {
        if (!window.modweebAI?.call || !window.modweebPrompts?.keywords) throw new Error('خدمة الذكاء الاصطناعي غير مهيأة');
        const request = window.modweebPrompts.keywords({ topic, language: (document.getElementById('aiLanguage')?.value || 'ar') });
        const raw = await window.modweebAI.call({ systemPrompt: request.systemPrompt, userPrompt: request.userPrompt, maxTokens: 700, jsonMode: true });
        const data = window.modweebAI.parseJSON(raw) || {};

        let kws = Array.isArray(data.keywords) ? data.keywords : String(data.keywords || '').split(',').map(s => s.trim());
        kws = kws.filter(Boolean).slice(0, 5);

        //  العنوان
box.innerHTML = '<div style="font-size:.75rem;color:var(--notifC);margin-bottom:6px">اضغط لاختيار تصنيف:</div>';

//  الوسوم
kws.forEach(k => {
    const tag = document.createElement('span');
    tag.className = 'mw-suggest-tag';
    tag.textContent = k;                //  آمن
    tag.addEventListener('click', () => pickLabel(k));
    box.appendChild(tag);
});
        box.classList.add('show');
    } catch(e) {
        modweebShowStatus(' فشل التوليد: ' + e.message);
    } finally {
        btn.disabled = false; btn.classList.remove('loading');
    }
}

function pickLabel(label) {
    const input = document.getElementById('bloggerPostLabels');
    const current = input.value.split(',').map(s => s.trim()).filter(Boolean);
    if (!current.includes(label)) current.push(label);
    input.value = current.join(', ');
    modweebShowStatus(' تمت الإضافة: ' + label, 1200);
}

// --- 4) توليد وصف SEO ---
async function aiGenMeta() {
    const title = (document.getElementById('bloggerPostTitle')?.value || '').trim();
    const topic = (document.getElementById('aiTopic')?.value || '').trim() || title;
    if (!topic) { modweebShowStatus(' أدخل عنواناً أو موضوعاً'); return; }

    const btn = document.getElementById('btnAiMeta');
    btn.disabled = true; btn.classList.add('loading');
    const box = document.getElementById('suggestMeta');

    try {
        // استخدام نص المقال إذا كان موجوداً
        const articleText = (window.modweebArticleHTML || '').replace(/<[^>]+>/g, ' ').slice(0, 1500);

        if (!window.modweebAI?.call || !window.modweebPrompts?.seoMeta) throw new Error('خدمة الذكاء الاصطناعي غير مهيأة');
        const request = window.modweebPrompts.seoMeta({ topic, mainKeyword: topic, language: (document.getElementById('aiLanguage')?.value || 'ar'), articleText });
        const raw = await window.modweebAI.call({ systemPrompt: request.systemPrompt, userPrompt: request.userPrompt, maxTokens: 800, jsonMode: true });
        const data = window.modweebAI.parseJSON(raw) || {};

        const suggestions = [];
        if (data.metaDescription) suggestions.push(data.metaDescription);

        box.innerHTML = '';

if (!suggestions.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:.8rem;color:var(--notifC);text-align:center;padding:8px';
    empty.textContent = 'لم يتم التوليد';
    box.appendChild(empty);
} else {
    suggestions.forEach(s => {
        const item = document.createElement('div');
        item.className = 'mw-suggest-item';

        const txt = document.createElement('span');
        txt.textContent = s;            //  آمن

        const meta = document.createElement('span');
        meta.className = 'mw-sug-meta';
        meta.textContent = s.length + ' حرف';

        item.appendChild(txt);
        item.appendChild(meta);
        item.addEventListener('click', () => pickMeta(s));

        box.appendChild(item);
    });
}
        box.classList.add('show');
    } catch(e) {
        modweebShowStatus(' فشل التوليد: ' + e.message);
    } finally {
        btn.disabled = false; btn.classList.remove('loading');
    }
}

function pickMeta(meta) {
    document.getElementById('bloggerMetaDescription').value = meta;
    document.getElementById('suggestMeta').classList.remove('show');
    modweebShowStatus(' تم اختيار الوصف');
}

/* ============================================================
   Internal Links - روابط داخلية من Blogger API
   ============================================================ */
let _bloggerPostsCache = null;

function openInternalLinksSheet() {
    openSheet('internalLinksSheet');
    // تحميل أولي
    if (!_bloggerPostsCache) loadBloggerPosts();
}

async function loadBloggerPosts() {
    const list = document.getElementById('internalLinksList');
    const query = (document.getElementById('internalSearchInput')?.value || '').trim();

    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--notifC);font-size:.85rem">جاري التحميل...</div>';

    try {
        const blogId = (document.getElementById('bloggerBlogId')?.value || BLOGGER_CONFIG.BLOG_ID).trim();
        const token = await getValidAccessToken();
        if (!token) throw new Error('تعذر الحصول على صلاحية');

        // جلب آخر 50 مقالاً
        const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${BLOGGER_CONFIG.API_KEY}&maxResults=50&fetchBodies=false`;
        const r = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });

        if (!r.ok) throw new Error('فشل جلب المقالات (' + r.status + ')');

        const data = await r.json();
        _bloggerPostsCache = data.items || [];

        displayInternalPosts(query);
    } catch(e) {
        list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--danger);font-size:.85rem"> ${e.message}</div>`;
    }
}

function displayInternalPosts(filter = '') {
    const list = document.getElementById('internalLinksList');
    if (!_bloggerPostsCache || !_bloggerPostsCache.length) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--notifC);font-size:.85rem">لا توجد مقالات</div>';
        return;
    }

    const q = filter.toLowerCase();
    const filtered = filter
        ? _bloggerPostsCache.filter(p => (p.title || '').toLowerCase().includes(q))
        : _bloggerPostsCache;

    if (!filtered.length) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--notifC);font-size:.85rem">لا توجد نتائج مطابقة</div>';
        return;
    }

    //  تفريغ القائمة بأمان
    list.innerHTML = '';

    //  بناء العناصر بـ createElement بدل innerHTML
    filtered.forEach(p => {
        const title = p.title || 'بدون عنوان';
        const url   = p.url   || '#';
        const date  = p.published ? new Date(p.published).toLocaleDateString('ar') : '';

        // الحاوية الرئيسية
        const item = document.createElement('div');
        item.className = 'mw-suggest-item';
        item.style.cssText = 'border:1px solid var(--contentL);padding:10px;border-radius:8px;cursor:pointer';

        // الجزء الأيسر (العنوان + التاريخ)
        const inner = document.createElement('div');
        inner.style.cssText = 'flex:1;min-width:0';

        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-weight:600;font-size:.85rem;margin-bottom:3px';
        titleEl.textContent = title;            //  textContent يعرض النص ولا ينفّذ HTML

        const dateEl = document.createElement('div');
        dateEl.className = 'mw-sug-meta';
        dateEl.textContent = date;

        inner.appendChild(titleEl);
        inner.appendChild(dateEl);
        item.appendChild(inner);

        // السهم
        const arrow = document.createElement('span');
        arrow.className = 'mw-sug-meta';
        arrow.textContent = 'إدراج ←';
        item.appendChild(arrow);

        //  الحدث عبر addEventListener بدل onclick inline
        item.addEventListener('click', () => {
            insertInternalLink(url, title);
        });

        list.appendChild(item);
    });
}

// البحث المباشر
document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('internalSearchInput');
    if (inp) inp.addEventListener('input', (e) => displayInternalPosts(e.target.value));
});

function insertInternalLink(url, title) {
    const safeUrl   = modweebEscapeAttr(url);
    const safeTitle = modweebEscapeHtml(title);
    const html = `<a href="${safeUrl}" target="_blank" rel="noopener">${safeTitle}</a>`;

    // إدراج في المحرر الموحد
    if (typeof window.modweebCommitHTML === 'function') {
        const editor = document.getElementById('unifiedCodeEditor');
        if (editor) {
            const pos = editor.selectionStart || editor.value.length;
            const before = editor.value.slice(0, pos);
            const after = editor.value.slice(pos);
            const sep = before && !before.endsWith('\n') ? '\n\n' : '';
            const sep2 = after && !after.startsWith('\n') ? '\n\n' : '';
            const next = before + sep + html + sep2 + after;
            window.modweebCommitHTML(next, { save: false });
            modweebShowStatus(' تم إدراج الرابط الداخلي');
            closeSheet('internalLinksSheet');
            return;
        }
    }

    modweebShowStatus(' الرابط: ' + url);
    try { navigator.clipboard.writeText(html); modweebShowStatus('تم نسخ الرابط كـ HTML'); } catch(e){}
    closeSheet('internalLinksSheet');
}

/* ============================================================
   Google Autocomplete - كلمات بحث حقيقية
   ============================================================ */
let _autoSelected = new Set();

function openAutocompleteSheet() {
    openSheet('autocompleteSheet');
    _autoSelected.clear();
    const inp = document.getElementById('autocompleteInput');
    if (inp) {
        const topic = (document.getElementById('aiTopic')?.value || '').trim();
        if (topic) inp.value = topic;
    }
}

async function fetchGoogleSuggestions() {
    const q = (document.getElementById('autocompleteInput')?.value || '').trim();
    if (!q) { modweebShowStatus(' اكتب كلمة أولاً'); return; }

    const btn = document.getElementById('btnAutoFetch');
    btn.disabled = true; btn.classList.add('loading');
    const box = document.getElementById('autocompleteResults');
    box.innerHTML = '<div style="width:100%;text-align:center;padding:20px;color:var(--notifC);font-size:.85rem">جاري جلب الاقتراحات...</div>';

    try {
        // استخدام CORS proxy عام لجلب الاقتراحات
        const proxy = 'https://api.allorigins.win/raw?url=';
        const target = encodeURIComponent(`http://suggestqueries.google.com/complete/search?client=firefox&hl=ar&q=${encodeURIComponent(q)}`);

        const r = await fetch(proxy + target);
        const data = await r.json();

        const suggestions = Array.isArray(data?.[1]) ? data[1] : [];

        if (!suggestions.length) {
            box.innerHTML = '<div style="width:100%;text-align:center;padding:20px;color:var(--notifC);font-size:.85rem">لا توجد اقتراحات</div>';
            return;
        }

        // جلب اقتراحات إضافية ببادئات مختلفة
        const prefixes = ['ما هو', 'كيف', 'أفضل', 'لماذا', 'متى'];
        const extra = [];
        for (const p of prefixes.slice(0, 3)) {
            try {
                const t2 = encodeURIComponent(`http://suggestqueries.google.com/complete/search?client=firefox&hl=ar&q=${encodeURIComponent(p + ' ' + q)}`);
                const r2 = await fetch(proxy + t2);
                const d2 = await r2.json();
                if (Array.isArray(d2?.[1])) extra.push(...d2[1]);
            } catch(e){}
        }

        const all = [...new Set([...suggestions, ...extra])].slice(0, 30);
        _autoSelected.clear();

        box.innerHTML = '';
all.forEach(s => {
    const tag = document.createElement('span');
    tag.className = 'mw-suggest-tag';
    tag.textContent = s;               //  آمن
    tag.dataset.sug = s;               //  آمن
    tag.addEventListener('click', () => toggleAutoTag(tag));
    box.appendChild(tag);
});
    } catch(e) {
        box.innerHTML = `<div style="width:100%;text-align:center;padding:20px;color:var(--danger);font-size:.85rem"> ${e.message}</div>`;
    } finally {
        btn.disabled = false; btn.classList.remove('loading');
    }
}

function toggleAutoTag(el) {
    const text = el.dataset.sug;
    if (_autoSelected.has(text)) {
        _autoSelected.delete(text);
        el.style.background = '';
        el.style.color = '';
        el.style.borderColor = '';
    } else {
        _autoSelected.add(text);
        el.style.background = 'var(--linkC)';
        el.style.color = '#fff';
        el.style.borderColor = 'var(--linkC)';
    }
}

function applyAutocompleteToLabels() {
    if (!_autoSelected.size) {
        modweebShowStatus(' اختر كلمة واحدة على الأقل');
        return;
    }
    const input = document.getElementById('bloggerPostLabels');
    const current = input.value.split(',').map(s => s.trim()).filter(Boolean);
    for (const s of _autoSelected) {
        if (!current.includes(s)) current.push(s);
    }
    input.value = current.join(', ');
    modweebShowStatus(' تمت إضافة ' + _autoSelected.size + ' تصنيف');
    closeSheet('autocompleteSheet');
}

// يتبع نافذة الاساسيات (رفع صوره)
function modweebUploadThumbnail(blockId){
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = function(ev){
        const file = ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e){
            updateBlock(blockId, 'thumbnailUrl', e.target.result);
            modweebShowStatus('تم تحميل الصورة المصغرة');
        };
        reader.readAsDataURL(file);
    };
    inp.click();
}

/* ============================================================
   تحسينات المحرر: التفاف السطر + إخفاء المحرر
   ============================================================ */
(function initEditorEnhancements(){
  function setup(){
    const wrapBtn  = document.getElementById('unifiedWrapBtn');
    const hideBtn  = document.getElementById('unifiedHideEditorBtn');
    const editorWrap = document.querySelector('.unified-editor-wrap');
    const editor   = document.getElementById('unifiedCodeEditor');
    const workspace = document.querySelector('.unified-workspace');
    if (!wrapBtn || !hideBtn || !workspace) return;

    // استرجاع الحالة من localStorage (افتراضي: الالتفاف مُفعَّل)
    const wrapOn = localStorage.getItem('modweebEditorWrap') !== 'off';
    const editorHidden = localStorage.getItem('modweebEditorHidden') === 'on';

    /* أيقونات */
    const ICON_WRAP_ON  = '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M3 12h12a3 3 0 1 1 0 6h-3"/><path d="m13 16-2 2 2 2"/><path d="M3 18h6"/></svg>';
    const ICON_WRAP_OFF = '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/></svg>';
    const ICON_HIDE_ON  = '<svg viewBox="0 0 24 24"><path d="m3 3 18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.2 18.2 0 0 1-3.4 4.5M6.3 6.3C3.5 8.2 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 3.7-.7"/></svg>';
    const ICON_HIDE_OFF = '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>';

function applyWrap(on, silent){
  if (editorWrap) editorWrap.classList.toggle('wrap-on', on);
  if (editor) editor.setAttribute('wrap', on ? 'soft' : 'off');
  wrapBtn.classList.toggle('active', on);
  wrapBtn.title = on ? 'إيقاف التفاف السطر' : 'تفعيل التفاف السطر';
  wrapBtn.innerHTML = on ? ICON_WRAP_ON : ICON_WRAP_OFF;
  localStorage.setItem('modweebEditorWrap', on ? 'on' : 'off');

  if (!silent){
    modweebShowStatus(
      on ? ' تم تفعيل التفاف السطر' : ' تم إيقاف التفاف السطر',
      1500
    );
  }
}

/* أيقونات زر الإخفاء/الإظهار (Pills) */
const ICON_EYE_OFF = '<path d="m3 3 18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.2 18.2 0 0 1-3.4 4.5M6.3 6.3C3.5 8.2 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 3.7-.7"/>';
const ICON_EYE     = '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>';

/* تطبيق حالة إخفاء المحرر */
function applyHidden(hidden, silent){
  workspace.classList.toggle('editor-hidden', hidden);

  if (hideBtn) {
    // الزر الآن Pills: نحدّث الأيقونة والنص والحالة النشطة
    hideBtn.classList.toggle('active', !hidden);
    hideBtn.setAttribute('aria-pressed', String(!hidden));
    hideBtn.title = hidden ? 'إظهار المحرر' : 'إخفاء المحرر';

    const svgEl  = hideBtn.querySelector('svg');
    const spanEl = hideBtn.querySelector('span');
    if (svgEl)  svgEl.innerHTML  = hidden ? ICON_EYE : ICON_EYE_OFF;
    if (spanEl) spanEl.textContent = hidden ? 'إظهار المحرر' : 'إخفاء المحرر';
  }

  localStorage.setItem('modweebEditorHidden', hidden ? 'on' : 'off');
  setTimeout(() => window.dispatchEvent(new Event('resize')), 120);

  if (!silent){
    modweebShowStatus(
      hidden ? ' تم إخفاء المحرر' : ' تم إظهار المحرر',
      1500
    );
  }
}

/* التهيئة الأولية (silent = لا تنبيه) */
applyWrap(wrapOn, true);
applyHidden(editorHidden, true);

    /* ربط الأزرار */
    wrapBtn.addEventListener('click', () => {
      const nextState = !wrapBtn.classList.contains('active');
      applyWrap(nextState);
    });
    hideBtn.addEventListener('click', () => {
      const nextState = !workspace.classList.contains('editor-hidden');
      applyHidden(nextState);
    });

    // زر الإظهار في شريط عناصر المقال
const showBtnInToolbar = document.getElementById('unifiedShowEditorBtn');
if (showBtnInToolbar) {
  showBtnInToolbar.addEventListener('click', () => applyHidden(false));
}

    /* اختصارات لوحة المفاتيح */
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+W : التفاف
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        applyWrap(!wrapBtn.classList.contains('active'));
      }
      // Ctrl+Shift+H : إخفاء المحرر
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        applyHidden(!workspace.classList.contains('editor-hidden'));
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();

/* ============================================================
   تبديل إظهار/إخفاء شريط عناصر المقال
   ============================================================ */
(function initToggleElementsToolbar(){
  function setup(){
    const btn = document.getElementById('unifiedToggleElementsBtn');
    const bar = document.getElementById('unifiedElementsToolbar');
    if (!btn || !bar) return;

    // الحالة الافتراضية: ظاهر
    const hidden = localStorage.getItem('modweebElementsToolbarHidden') === 'on';

    function apply(hidden, silent){
  bar.classList.toggle('hidden', hidden);
  btn.classList.toggle('active', !hidden);
  btn.setAttribute('aria-pressed', String(!hidden));
  btn.title = hidden ? 'إظهار عناصر المقال' : 'إخفاء عناصر المقال';
  localStorage.setItem('modweebElementsToolbarHidden', hidden ? 'on' : 'off');
  // أعِد حساب أبعاد المحرر
  setTimeout(() => window.dispatchEvent(new Event('resize')), 200);

  // تنبيه (يُتجاهل عند التهيئة)
  if (!silent){
    modweebShowStatus(
      hidden ? ' تم إخفاء عناصر المقال' : ' تم إظهار عناصر المقال',
      1500
    );
  }
}

apply(hidden, true); // التهيئة الأولية بدون تنبيه

    btn.addEventListener('click', () => {
      const isHidden = bar.classList.contains('hidden');
      apply(!isHidden);
    });

    // اختصار: Ctrl+Shift+E
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        const isHidden = bar.classList.contains('hidden');
        apply(!isHidden);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();

/* ============================================================
   إصلاح عرض الأحرف العربية المحوّلة إلى كيانات HTML
   (Blogger يحوّل ؟ ، ؛ ٪ ّ ً إلى &#xxxx; عند الحفظ)
   ============================================================ */
(function fixArabicEntities(){
  const entityMap = {
    '&#1567;':'\u061F', '&#x61F;':'\u061F', '&#x061F;':'\u061F',
    '&#1548;':'\u060C', '&#x60C;':'\u060C', '&#x060C;':'\u060C',
    '&#1563;':'\u061B', '&#x61B;':'\u061B', '&#x061B;':'\u061B',
    '&#1642;':'\u066A', '&#x66A;':'\u066A', '&#x066A;':'\u066A',
    '&#1617;':'\u0651', '&#x651;':'\u0651', '&#x0651;':'\u0651',
    '&#1611;':'\u064B', '&#x64B;':'\u064B', '&#x064B;':'\u064B',
    '&#1612;':'\u064C', '&#x64C;':'\u064C', '&#x064C;':'\u064C',
    '&#1613;':'\u064D', '&#x64D;':'\u064D', '&#x064D;':'\u064D',
    '&#1614;':'\u064E', '&#x64E;':'\u064E', '&#x064E;':'\u064E',
    '&#1615;':'\u064F', '&#x64F;':'\u064F', '&#x064F;':'\u064F',
    '&#1616;':'\u0650', '&#x650;':'\u0650', '&#x0650;':'\u0650',
    '&#1618;':'\u0652', '&#x652;':'\u0652', '&#x0652;':'\u0652'
  };
  const pattern = new RegExp(
    Object.keys(entityMap).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
    'gi'
  );

  function decode(str){
    if (!str || typeof str !== 'string') return str;
    return str.replace(pattern, m => entityMap[m] || m);
  }
  window._modweebDecodeArabic = decode;

  // 1) حقن الحل في modweebShowStatus (بعد تحميل الدالة الأصلية)
  function patchStatus(){
    const origStatus = window.modweebShowStatus;
    if (origStatus && !origStatus._patched) {
      const wrapped = function(msg, dur){
        return origStatus(decode(String(msg||'')), dur);
      };
      wrapped._patched = true;
      window.modweebShowStatus = wrapped;
      return true;
    }
    return false;
  }

  // 2) حقن الحل في showConfirmPopup
  function patchConfirm(){
    const origConfirm = window.showConfirmPopup;
    if (origConfirm && !origConfirm._patched) {
      const wrapped = function(msg, okCb, cancelCb, okText, cancelText){
        return origConfirm(decode(msg), okCb, cancelCb, decode(okText), decode(cancelText));
      };
      wrapped._patched = true;
      window.showConfirmPopup = wrapped;
      return true;
    }
    return false;
  }

  // 3) تنظيف عام لأي عقدة في DOM
  function cleanNode(node){
    if (!node) return;
    if (node.nodeType === 3) { // TEXT_NODE
      const v = node.nodeValue;
      if (v && /&#\d+;|&#x[0-9a-f]+;/i.test(v)) {
        const fixed = decode(v);
        if (fixed !== v) node.nodeValue = fixed;
      }
    } else if (node.nodeType === 1) { // ELEMENT_NODE
      // تنظيف placeholder
      if (node.placeholder) {
        const f = decode(node.placeholder);
        if (f !== node.placeholder) node.placeholder = f;
      }
      // تنظيف title
      if (node.title) {
        const f = decode(node.title);
        if (f !== node.title) node.title = f;
      }
      // مرور على الأبناء
      const children = node.childNodes;
      for (let i = 0; i < children.length; i++) cleanNode(children[i]);
    }
  }

  function cleanAll(){
    try {
      patchStatus();
      patchConfirm();
      if (document.body) cleanNode(document.body);
    } catch(e){ /* صامت */ }
  }

  // 4) MutationObserver لمراقبة التغييرات الجديدة
  function startObserver(){
    if (!document.body) return;
    const observer = new MutationObserver(mutations => {
      let needs = false;
      for (const m of mutations) {
        if (m.type === 'childList' && m.addedNodes.length) { needs = true; break; }
        if (m.type === 'characterData') { needs = true; break; }
      }
      if (needs) {
        // تأخير بسيط لتجميع التغييرات
        clearTimeout(startObserver._t);
        startObserver._t = setTimeout(cleanAll, 40);
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // 5) التنفيذ الفوري والمتأخر
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){
      cleanAll();
      startObserver();
      // إعادة التنفيذ عدة مرات لضمان العمل بعد تحميل قالب بلوجر
      [100, 400, 1000, 2500, 5000, 8000].forEach(function(d){
        setTimeout(cleanAll, d);
      });
    });
  } else {
    cleanAll();
    startObserver();
    [100, 400, 1000, 2500, 5000, 8000].forEach(function(d){
      setTimeout(cleanAll, d);
    });
  }

  // 6) مراقبة حالة شريط التمرير (عندما يظهر قسم جديد)
  // نعيد الفحص أيضاً عند أي فتح لنافذة سفلية
  window.addEventListener('modweebSheetOpened', cleanAll);
})();

/* ============================================================
   أزرار النسخ في رؤوس المحرر والمعاينة
   ============================================================ */
(function initCopyHeaderButtons(){
  function setup(){
    const copyEditorBtn = document.getElementById('unifiedCopyEditorBtn');
    const copyPreviewBtn = document.getElementById('unifiedCopyPreviewBtn');

    function showCopied(btn){
      if (!btn) return;
      btn.classList.add('copied');
      const originalTitle = btn.title;
      btn.title = ' تم النسخ';
      setTimeout(function(){
        btn.classList.remove('copied');
        btn.title = originalTitle;
      }, 1400);
    }

    function getHTML(){
      // نأخذ القيمة من المحرر مباشرة إن وُجد، وإلا من المتغير العام
      const editor = document.getElementById('unifiedCodeEditor');
      if (editor && editor.value && editor.value.trim()) return editor.value;
      if (typeof generateFullHTML === 'function') {
        try { return generateFullHTML() || ''; } catch(e){}
      }
      return window.modweebArticleHTML || '';
    }

    function copyText(text){
      if (!text || !text.trim()) {
        if (typeof modweebShowStatus === 'function') modweebShowStatus('لا يوجد محتوى للنسخ');
        return Promise.reject(new Error('empty'));
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      // fallback للتوافق
      return new Promise(function(resolve, reject){
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.top = '-9999px';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          resolve();
        } catch(e) { reject(e); }
      });
    }

    function handleCopy(btn, label){
      const text = getHTML();
      copyText(text).then(function(){
        showCopied(btn);
        if (typeof modweebShowStatus === 'function') {
          modweebShowStatus(' تم نسخ ' + (label || 'الكود') + ' (' + text.length + ' حرف)', 1800);
        }
      }).catch(function(err){
        if (typeof modweebShowStatus === 'function') {
          modweebShowStatus(' فشل النسخ: ' + (err.message || '') , 2500);
        }
      });
    }

    if (copyEditorBtn) {
      copyEditorBtn.addEventListener('click', function(){
        handleCopy(copyEditorBtn, 'كود المحرر');
      });
    }
    if (copyPreviewBtn) {
      copyPreviewBtn.addEventListener('click', function(){
        handleCopy(copyPreviewBtn, 'كود المعاينة');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();

/* ============================================================
   ضمان ظهور نص "معاينة مباشرة" في رأس المعاينة
   (بالإضافة إلى ضبط أبعاد النصوص بلا التفاف)
   ============================================================ */
(function ensurePanelHeadTexts(){
  function setup(){
    // نحدد رأس المحرر ورأس المعاينة
    const editorPanel = document.querySelector('.unified-workspace .unified-panel:nth-child(1) .unified-panel-head');
    const previewPanel = document.querySelector('.unified-workspace .unified-panel:nth-child(2) .unified-panel-head');

    function ensureTextInHeader(headEl, desiredText, actionWrapSelector){
      if (!headEl) return;
      // ابحث عن span يحوي نصاً (ليس الأزرار)
      let label = null;
      headEl.querySelectorAll('span').forEach(function(s){
        if (s.textContent.trim() && !s.closest('button')) label = s;
      });
      if (label) return; // النص موجود، لا شيء للعمل

      // النص غير موجود , أنشئه
      const wrap = headEl.querySelector(actionWrapSelector) ||
                   headEl.querySelector('.unified-editor-head-actions') ||
                   headEl;
      const span = document.createElement('span');
      span.textContent = desiredText;
      // أضفه بعد الأزرار إن وُجدت
      const buttons = wrap.querySelectorAll('button');
      if (buttons.length) buttons[buttons.length - 1].insertAdjacentElement('afterend', span);
      else wrap.appendChild(span);
    }

    ensureTextInHeader(editorPanel, 'محرر HTML', '.unified-editor-head-actions');
    ensureTextInHeader(previewPanel, 'معاينة مباشرة', '.unified-editor-head-actions');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();

/* ============================================================
   زر الترجمة - قائمة اللغات (عربي + إنجليزي)
   ============================================================ */
(function initModweebTranslate(){
  function setup(){
    const button = document.getElementById('modweebTranslateBtn');
    if (!button) return;

    const LANGS = [
      { code: 'ar', name: 'العربية' },
      { code: 'en', name: 'English' }
    ];
    const GLOBE_ICON = '<circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/>';

    /* ===== قراءة اللغة الحالية ===== */
    function getCurrentLang(){
      const m = document.cookie.match(/(?:^|; )googtrans=([^;]*)/);
      if (!m) return 'ar';
      const val = decodeURIComponent(m[1]);
      const parts = val.split('/');
      const code = parts[parts.length - 1] || 'ar';
      return code === 'auto' ? 'ar' : code;
    }

    /* ===== منطق الترجمة الأصلي , بدون أي تغيير ===== */
    function selectLang(code){
      const domainPart = '.' + location.hostname;
      document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'googtrans=; path=/; domain=' + domainPart + '; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      if (code === 'ar'){
        location.reload();
        return;
      }
      const v = '/ar/' + code;
      document.cookie = 'googtrans=' + v + '; path=/';
      document.cookie = 'googtrans=' + v + '; domain=' + domainPart + '; path=/';
      location.reload();
    }

    /* ===== بناء القائمة بنفس نمط قائمة الأوضاع ===== */
    let currentMenu = null;

    function buildMenu(){
      const menu = document.createElement('div');
      menu.className = 'unified-menu open';
      menu.setAttribute('data-translate-menu', '1');

      const current = getCurrentLang();
      let html = '<div class="menu-section-title">اللغة</div>';

      LANGS.forEach(lang => {
        html += '<div>'
              +   '<button type="button" data-lang="' + lang.code + '"'
              +           (lang.code === current ? ' class="is-active"' : '') + '>'
              +     '<span class="mw-theme-icon"><svg viewBox="0 0 24 24">' + GLOBE_ICON + '</svg></span>'
              +     '<span class="mw-theme-label">' + lang.name + '</span>'
              +     '<span class="mw-theme-check"></span>'
              +   '</button>'
              + '</div>';
      });

      menu.innerHTML = html;
      return menu;
    }

    function closeMenu(){
      if (currentMenu){
        currentMenu.remove();
        currentMenu = null;
      }
      button.classList.remove('active');
      button.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', outsideClick, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, { passive: true, capture: true });
      window.removeEventListener('resize', closeMenu);
    }

    function outsideClick(e){
      if (currentMenu && !currentMenu.contains(e.target) && !button.contains(e.target)){
        closeMenu();
      }
    }
    function onScroll(e){
      if (currentMenu && !currentMenu.contains(e.target)) closeMenu();
    }
    function onKey(e){
      if (e.key === 'Escape') closeMenu();
    }

    function openMenu(){
      /* ⛔ إذا كانت أي قائمة مفتوحة (أوضاع/عناصر) → أغلقها ولا تفتح هذه */
      if (document.querySelector('.unified-menu.open')){
        if (typeof window.closeAllModweebMenus === 'function') window.closeAllModweebMenus();
        return;
      }

      currentMenu = buildMenu();
      document.body.appendChild(currentMenu);

      requestAnimationFrame(() => {
        const rect     = button.getBoundingClientRect();
        const menuRect = currentMenu.getBoundingClientRect();
        const menuW    = menuRect.width  || 120;
        const menuH    = menuRect.height || 120;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const pad = 8;

        let right = vw - rect.right;
        if (right < pad) right = pad;
        if (right + menuW > vw - pad) right = Math.max(pad, vw - menuW - pad);

        let top = rect.bottom + 6;
        if (top + menuH > vh - pad){
          const topAbove = rect.top - menuH - 6;
          top = topAbove >= pad ? topAbove : Math.max(pad, vh - menuH - pad);
        }

        currentMenu.style.top   = top + 'px';
        currentMenu.style.right = right + 'px';
      });

      currentMenu.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-lang]');
        if (!b) return;
        closeMenu();
        selectLang(b.dataset.lang);
      });

      button.classList.add('active');
      button.setAttribute('aria-expanded', 'true');

      // capture:true → إغلاق فوري عند النقر خارج القائمة
      setTimeout(() => {
        document.addEventListener('click', outsideClick, true);
        document.addEventListener('keydown', onKey, true);
        window.addEventListener('scroll', onScroll, { passive: true, capture: true });
        window.addEventListener('resize', closeMenu);
      }, 0);
    }

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentMenu) closeMenu();
      else openMenu();
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();

/* ============================================================
   مؤشرات تمرير الأشرطة (Scroll Hints)
   ============================================================ */
(function initScrollHints(){
  function setup(){
    const targets = [];

    // شريط التحكم وشريط عناصر المقال
    const tb = document.getElementById('unifiedToolbar');
    if (tb) targets.push(tb);
    const eb = document.getElementById('unifiedElementsToolbar');
    if (eb) targets.push(eb);

    // هيدر الأزرار العلوي (الأعمق فقط - نتخطى الخارجي المكرر)
    document.querySelectorAll('.modweeb-gen-header-actions').forEach(el => {
      if (el.querySelector(':scope > .modweeb-gen-header-actions')) return;
      targets.push(el);
    });

    targets.forEach(el => {
      if (!el || el.dataset.mwHintInit === '1') return;
      el.dataset.mwHintInit = '1';

      const parent = el.parentNode;
      if (!parent) return;

      // غلّف الشريط بحاوية position: relative
      const wrap = document.createElement('div');
      wrap.className = 'mw-scroll-wrap';
      parent.insertBefore(wrap, el);
      wrap.appendChild(el);

      // سهم يسار , طويل متوسط مع خط ذيل
const hintL = document.createElement('span');
hintL.className = 'mw-scroll-hint mw-scroll-hint-left';
hintL.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 12H6"/><path d="m11 17-5-5 5-5"/></svg>';
// سهم يمين , طويل متوسط مع خط ذيل
const hintR = document.createElement('span');
hintR.className = 'mw-scroll-hint mw-scroll-hint-right';
hintR.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12h13"/><path d="m13 7 5 5-5 5"/></svg>';
      wrap.appendChild(hintL);
      wrap.appendChild(hintR);

      const update = () => {
        const max = el.scrollWidth - el.clientWidth;
        if (max <= 4){
          hintL.classList.remove('is-visible');
          hintR.classList.remove('is-visible');
          return;
        }
        // يعمل مع LTR و RTL
        const ratio = Math.min(1, Math.abs(el.scrollLeft) / max);
        const atStart = ratio < 0.02;
        const atEnd   = ratio > 0.98;
        hintL.classList.toggle('is-visible', !atEnd);
        hintR.classList.toggle('is-visible', !atStart);
      };

      el.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      if (window.ResizeObserver){
        try { new ResizeObserver(update).observe(el); } catch(e){}
      }
      setTimeout(update, 250);
      requestAnimationFrame(update);
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();

/* ============================================================
   عميل الذكاء الاصطناعي الموحد (Unified AI Client)
   يتصل مباشرة بـ 6 مزودين: OpenAI, Gemini, Claude, OpenRouter, Groq, Mistral
   ============================================================ */
(function initUnifiedAIClient(){
  'use strict';

  /* النماذج الافتراضية لكل مزود — يمكن تعديلها */
  const MODEL_DEFAULTS = {
    openai:     'gpt-4o-mini',
    gemini:     'gemini-1.5-flash',
    claude:     'claude-3-5-haiku-20241022',
    openrouter: 'openai/gpt-4o-mini',
    groq:       'llama-3.1-8b-instant',
    mistral:    'mistral-small-latest'
  };

  /* نقاط النهاية */
  const ENDPOINTS = {
    openai:     'https://api.openai.com/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    groq:       'https://api.groq.com/openai/v1/chat/completions',
    mistral:    'https://api.mistral.ai/v1/chat/completions',
    claude:     'https://api.anthropic.com/v1/messages',
    gemini:     'https://generativelanguage.googleapis.com/v1beta/models'
  };

  /* إعداد وضع التوليد واختيار نموذج Puter */
  const GENERATION_MODE_KEY = 'modweebGenerationMode';
  const PUTER_MODEL_KEY = 'modweebPuterModel';
  const PUTER_DEFAULT_MODEL = 'gpt-5.4-nano';
  let puterModelsCache = [];

  function getGenerationMode(){
    const saved = localStorage.getItem(GENERATION_MODE_KEY);
    if (saved === 'puter') return 'puter';
    if (saved === 'worker' && window.modweebWorkerAI && window.modweebWorkerAI.configured) return 'worker';
    return 'cloud';
  }
  function setGenerationMode(mode){
    const safeMode = mode === 'puter' ? 'puter'
      : (mode === 'worker' && window.modweebWorkerAI && window.modweebWorkerAI.configured ? 'worker' : 'cloud');
    localStorage.setItem(GENERATION_MODE_KEY, safeMode);
    const selector = document.getElementById('aiGenerationMode');
    if (selector && selector.value !== safeMode) selector.value = safeMode;
    refreshModeUI();
    return safeMode;
  }
  function refreshModeUI(){
    const mode = getGenerationMode();
    const selector = document.getElementById('aiGenerationMode');
    const puterPanel = document.getElementById('aiPuterPanel');
    const cloudPanel = document.getElementById('aiCloudProviderPanel');
    const workerPanel = document.getElementById('aiWorkerPanel');
    const workerOption = document.getElementById('workerGenerationMode');
    const puterModel = document.getElementById('aiPuterModel');
    if (workerOption) {
      workerOption.disabled = !(window.modweebWorkerAI && window.modweebWorkerAI.configured);
      workerOption.textContent = workerOption.disabled ? 'خادم محمي — غير مضبوط' : 'خادم محمي — مفاتيح محفوظة في Cloudflare';
    }
    if (selector && selector.value !== mode) selector.value = mode;
    if (puterModel && puterModel.value !== getPuterModel()) puterModel.value = getPuterModel();
    if (puterPanel) puterPanel.style.display = mode === 'puter' ? 'block' : 'none';
    if (cloudPanel) cloudPanel.style.display = mode === 'cloud' ? 'block' : 'none';
    if (workerPanel) workerPanel.style.display = mode === 'worker' ? 'block' : 'none';
  }
  function getPuterModel(){
    return localStorage.getItem(PUTER_MODEL_KEY) || PUTER_DEFAULT_MODEL;
  }
  function setPuterModel(modelId){
    const id = String(modelId || '').trim();
    if (!id) throw new Error('puter_model_invalid');
    localStorage.setItem(PUTER_MODEL_KEY,id);
    const select = document.getElementById('aiPuterModel');
    if (select && !Array.from(select.options).some(o => o.value === id)) {
      const option = document.createElement('option'); option.value=id; option.textContent=id; select.appendChild(option);
    }
    if (select) select.value=id;
    return id;
  }
  function formatPuterModel(model){
    const id = String(model.id || '');
    const label = model.name && model.name !== id ? `${model.name} — ${id}` : id;
    const cost = model.cost;
    if (!cost || cost.currency !== 'usd-cents' || !cost.tokens) return label;
    const scale = 1000000 / Number(cost.tokens);
    const input = Number(cost.input), output = Number(cost.output);
    if (!Number.isFinite(input) || !Number.isFinite(output)) return label;
    return `${label} · $${(input*scale/100).toFixed(2)}/$${(output*scale/100).toFixed(2)} لكل مليون إدخال/إخراج`;
  }
  async function loadPuterModels(){
    const status = document.getElementById('aiPuterStatus');
    const btn = document.getElementById('aiPuterModelsBtn');
    const select = document.getElementById('aiPuterModel');
    if (btn) { btn.disabled=true; btn.textContent='جارٍ تحميل الكتالوج…'; }
    if (status) status.textContent='جارٍ الاتصال بكتالوج Puter…';
    try {
      if (!window.puter || !window.puter.ai || typeof window.puter.ai.listModels !== 'function') throw new Error('puter_sdk_unavailable');
      const models = await window.puter.ai.listModels();
      const filtered = (Array.isArray(models) ? models : []).filter(m => m && m.id && !/(embedding|\bembed\b|image|\btts\b|audio|speech|video|whisper|moderation|realtime|transcri)/i.test(m.id));
      if (!filtered.length) throw new Error('empty_model_catalog');
      puterModelsCache = filtered;
      const selected = getPuterModel();
      select.innerHTML='';
      filtered.forEach(m => {
        const option=document.createElement('option'); option.value=m.id; option.textContent=formatPuterModel(m); select.appendChild(option);
      });
      if (!filtered.some(m => m.id === selected)) {
        const fallback = filtered.find(m => m.id === PUTER_DEFAULT_MODEL) || filtered[0];
        localStorage.setItem(PUTER_MODEL_KEY, fallback.id);
        select.value=fallback.id;
      } else select.value=selected;
      if (status) status.textContent=`تم تحميل ${filtered.length} نموذجًا؛ السعر والحصة حسب الكتالوج وحساب Puter`;
      return filtered;
    } catch(e) {
      if (status) status.textContent = e.message === 'puter_sdk_unavailable' ? 'تعذر تحميل SDK؛ تحقق من الإنترنت وأعد تحميل الصفحة' : 'تعذر تحميل الكتالوج؛ يمكنك تجربة النموذج الافتراضي';
      if (typeof modweebShowStatus === 'function') modweebShowStatus(status ? status.textContent : 'تعذر تحميل نماذج Puter', 5000);
      return [];
    } finally {
      if (btn) { btn.disabled=false; btn.textContent='تحديث كتالوج النماذج'; }
    }
  }
  function extractPuterText(response){
    let content = response && response.message ? response.message.content : response;
    if (typeof content === 'string') return content.trim();
    if (Array.isArray(content)) return content.map(part => typeof part === 'string' ? part : (part && (part.text || part.content) || '')).join('\n').trim();
    if (content && typeof content.text === 'string') return content.text.trim();
    return '';
  }
  async function callPuterAI(opts){
    if (!window.puter || !window.puter.ai || typeof window.puter.ai.chat !== 'function') throw new Error('puter_sdk_unavailable');
    const model = opts.model || getPuterModel();
    try {
      const response = await window.puter.ai.chat([
        {role:'system',content:opts.systemPrompt || ''},
        {role:'user',content:opts.userPrompt || ''}
      ], {model, max_tokens:opts.maxTokens || 12000, temperature:opts.temperature === undefined ? 0.7 : opts.temperature, normalize:true});
      const text = extractPuterText(response);
      if (!text) throw new Error('empty_response');
      return text;
    } catch(e) {
      if (e.message === 'empty_response' || e.message === 'puter_sdk_unavailable') throw e;
      throw new Error('puter_error: ' + String(e.message || e));
    }
  }
  /* المزود النشط */
  function getActiveProvider(){
    return localStorage.getItem('modweebActiveProvider') || 'openai';
  }
  function setActiveProvider(id){
    localStorage.setItem('modweebActiveProvider', id);
  }

  /* استرجاع المفتاح (مفكوك التشفير) */
  async function getApiKey(providerId){
    if (!window.modweebAgent || typeof window.modweebAgent.getKey !== 'function') return '';
    try { return await window.modweebAgent.getKey(providerId); }
    catch(e){ return ''; }
  }

  /* استرجاع اسم النموذج المخصص (إن وُجد) */
  function getModel(providerId){
    return localStorage.getItem('modweebModel_' + providerId) || MODEL_DEFAULTS[providerId];
  }
  function setModel(providerId, model){
    if (model) localStorage.setItem('modweebModel_' + providerId, model);
    else localStorage.removeItem('modweebModel_' + providerId);
  }

  /* بناء الطلب حسب المزود */
  function buildRequest(providerId, apiKey, systemPrompt, userPrompt, opts){
    const model      = opts.model || getModel(providerId);
    const maxTokens  = opts.maxTokens  || 4000;
    const temperature = (opts.temperature !== undefined) ? opts.temperature : 0.7;
    const jsonMode   = !!opts.jsonMode;

    switch(providerId){
      /* ── OpenAI-compatible: OpenAI, OpenRouter, Groq, Mistral ── */
      case 'openai':
      case 'openrouter':
      case 'groq':
      case 'mistral': {
        const body = {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt }
          ],
          max_tokens: maxTokens,
          temperature
        };
        /* JSON mode مدعوم أصلاً في OpenAI فقط */
        if (jsonMode && providerId === 'openai'){
          body.response_format = { type: 'json_object' };
        }
        return {
          url: ENDPOINTS[providerId],
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey
          },
          body
        };
      }

      /* ── Anthropic Claude ── */
      case 'claude': {
        return {
          url: ENDPOINTS.claude,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: {
            model,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
            max_tokens: maxTokens,
            temperature
          }
        };
      }

      /* ── Google Gemini ── */
      case 'gemini': {
        return {
          url: ENDPOINTS.gemini + '/' + model + ':generateContent?key=' + encodeURIComponent(apiKey),
          headers: { 'Content-Type': 'application/json' },
          body: {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: Object.assign({
              maxOutputTokens: maxTokens,
              temperature
            }, jsonMode ? { responseMimeType: 'application/json' } : {})
          }
        };
      }
    }
    return null;
  }

/* جلب النماذج المتاحة من المزود */
async function fetchAvailableModels(providerId, apiKey){
  const urls = {
    openai:     'https://api.openai.com/v1/models',
    openrouter: 'https://openrouter.ai/api/v1/models',
    groq:       'https://api.groq.com/openai/v1/models',
    mistral:    'https://api.mistral.ai/v1/models',
    claude:     'https://api.anthropic.com/v1/models',
    gemini:     'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(apiKey)
  };
  const url = urls[providerId];
  if (!url) return [];

  const headers = {};
  if (providerId === 'claude'){
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  } else if (providerId !== 'gemini'){
    headers['Authorization'] = 'Bearer ' + apiKey;
  }

  try {
    const r = await fetch(url, { headers });
    if (!r.ok) return [];
    const data = await r.json();
    const ids = [];
    if (Array.isArray(data.data)){
      data.data.forEach(m => { if (m && m.id) ids.push(m.id); });
    } else if (Array.isArray(data.models)){
      data.models.forEach(m => {
        if (!m) return;
        const name = (m.name || m.id || '').replace(/^models\//, '');
        // لأجل Gemini: نحتفظ فقط بالنماذج الداعمة للتوليد
        if (providerId === 'gemini'){
          const methods = m.supportedGenerationMethods || m.supportedActions || [];
          if (methods.length && !methods.includes('generateContent')) return;
        }
        if (name) ids.push(name);
      });
    }
    return ids;
  } catch(e){ return []; }
}

/* اختيار أفضل نموذج من القائمة المتاحة */
function pickBestModel(providerId, available){
  const preferences = {
    groq:       ['llama-3.1-8b-instant', 'llama-3.1-70b', 'llama-3.3-70b', 'llama3-8b', 'mixtral-8x7b', 'gemma2-9b', 'gemma-7b'],
    openai:     ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    claude:     ['claude-3-5-haiku', 'claude-3-5-sonnet', 'claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus'],
    gemini:     ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-pro'],
    openrouter: ['openai/gpt-4o-mini', 'openai/gpt-3.5-turbo', 'anthropic/claude-3-5-haiku', 'google/gemini-flash-1.5'],
    mistral:    ['mistral-small-latest', 'mistral-medium-latest', 'open-mistral-7b', 'mistral-tiny', 'mistral-large-latest']
  };
  const prefs = preferences[providerId] || [];
  // 1) ابحث عن أول نموذج يطابق التفضيلات (match جزئي)
  for (const pref of prefs){
    const m = available.find(id => id.toLowerCase().includes(pref.toLowerCase()));
    if (m) return m;
  }
  // 2) ابحث عن أي نموذج داعم للمحادثة (تجنب النماذج الخاصة)
  const excluded = /whisper|tts|embedding|dall-e|moderation|audio|image/i;
  const safe = available.find(id => !excluded.test(id));
  return safe || available[0] || '';
}

/* استخراج النص من الاستجابة */
  function extractText(providerId, data){
    try {
      switch(providerId){
        case 'openai':
        case 'openrouter':
        case 'groq':
        case 'mistral':
          return data.choices?.[0]?.message?.content || '';
        case 'claude':
          return (data.content && data.content[0] && data.content[0].text) || '';
        case 'gemini':
          return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
    } catch(e){}
    return '';
  }

  /* الدالة الرئيسية */
  /* تنفيذ محاولة واحدة */
async function attemptCall(providerId, apiKey, model, opts){
  const req = buildRequest(providerId, apiKey, opts.systemPrompt || '', opts.userPrompt || '', {
    model,
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
    jsonMode: opts.jsonMode
  });
  if (!req) throw new Error('unsupported_provider');

  const r = await fetch(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify(req.body)
  });

  if (r.status === 429) throw new Error('rate_limit');

  if (!r.ok){
    const errData = await r.json().catch(() => ({}));
    const msg = errData.error?.message
             || errData.error?.type
             || errData.message
             || ('HTTP ' + r.status);
    const err = new Error(msg);
    err.httpStatus = r.status;
    throw err;
  }

  const data = await r.json();
  const text = extractText(providerId, data);
  if (!text) throw new Error('empty_response');
  return text;
}

async function callAI(opts){
  if (!opts.providerId && getGenerationMode() === 'worker') {
    if (!window.modweebWorkerAI || !window.modweebWorkerAI.configured) throw new Error('الخادم الآمن غير مضبوط بعد.');
    return await window.modweebWorkerAI.generate(opts);
  }
  if (!opts.providerId && getGenerationMode() === 'puter') return await callPuterAI(opts);
  const providerId = opts.providerId || getActiveProvider();
  const apiKey     = await getApiKey(providerId);

  /* لا يوجد مفتاح صالح: لا نرسل محتوى المستخدم إلى خادم وسيط */
  if (!apiKey){
    const savedButLocked = !!(window.modweebAgent && typeof window.modweebAgent.hasKey === 'function' && window.modweebAgent.hasKey(providerId));
    throw new Error(savedButLocked ? 'agent_locked' : 'no_key');
  }

  const initialModel = opts.model || getModel(providerId);

  /* المحاولة الأولى */
  try {
    return await attemptCall(providerId, apiKey, initialModel, opts);
  } catch(firstErr){
    /* هل الخطأ بسبب النموذج تحديداً؟ */
    const msg = String(firstErr.message || '');
    const modelProblem = /model|does not exist|does not have access|not found|no access|invalid.*model|permission/i.test(msg)
                      || firstErr.httpStatus === 404
                      || firstErr.httpStatus === 403;

    if (!modelProblem) throw firstErr;

    /* كشف النماذج المتاحة تلقائياً */
    if (typeof modweebShowStatus === 'function'){
      modweebShowStatus(' جارٍ اكتشاف النماذج المتاحة...', 4000);
    }

    let available = [];
    try { available = await fetchAvailableModels(providerId, apiKey); }
    catch(e){ available = []; }

    if (!available.length){
      throw new Error('لا توجد نماذج متاحة لحسابك — تحقق من المفتاح على موقع المزود');
    }

    const fallbackModel = pickBestModel(providerId, available);

    if (!fallbackModel || fallbackModel === initialModel){
      throw new Error('لم يُعثر على نموذج بديل مناسب — النماذج المتاحة: ' + available.slice(0, 5).join(', '));
    }

    /* احفظ الاختيار الجديد تلقائياً */
    setModel(providerId, fallbackModel);

    if (typeof modweebShowStatus === 'function'){
      modweebShowStatus(' تم اختيار النموذج تلقائياً: ' + fallbackModel, 4000);
    }

    /* أعد المحاولة بالنموذج الجديد */
    return await attemptCall(providerId, apiKey, fallbackModel, opts);
  }
}

  /* مساعد: استدعاء يُرجع JSON مباشرة */
  async function callAIJson(opts){
    opts.jsonMode = true;
    const raw = await callAI(opts);
    return parseJSONSafe(raw);
  }

  /* مساعد: تحليل JSON مع تنظيف العلامات */
function parseJSONSafe(raw){
    if (!raw) return null;
    let s = String(raw)
      .replace(/^\s*```json[\r\n]*/im, '')
      .replace(/^\s*```[\r\n]*/im, '')
      .replace(/[\r\n]*```\s*$/im, '')
      .trim();
    try { return JSON.parse(s); }
    catch(e){
      const m = s.match(/\{[\s\S]*\}/);
      if (m) { try { return JSON.parse(m[0]); } catch(e2){} }
    }
    return null;
  }

  /* تصدير */
  window.modweebAI = {
    call: callAI,
    callJson: callAIJson,
    parseJSON: parseJSONSafe,
    getActiveProvider,
    setActiveProvider,
    getModel,
    setModel,
    modelDefaults: MODEL_DEFAULTS,
    listProviders: () => Object.keys(MODEL_DEFAULTS),
    getGenerationMode,
    setGenerationMode,
    getPuterModel,
    setPuterModel,
    loadPuterModels,
    refreshModeUI
  };
})();

/* ============================================================
   وكيل الذكاء الاصطناعي , تشفير وحفظ المفاتيح
   ============================================================ */
(function initAIAgent(){

/* ============================================================
    تشفير حقيقي بـ Master Password
   ============================================================ */
const AGENT_STORAGE_KEY = 'modweebAIAgentKeys_v2'; // v2 , التنسيق تغيّر
const AGENT_SALT_KEY    = 'modweebAIAgentSalt_v1';
const AGENT_VERIFIER    = 'modweebAIAgentVerify_v1';

/* المفتاح السِرّي يبقى في الذاكرة فقط , يُمسح عند إغلاق التبويب */
let _agentMasterKey = null;  // CryptoKey بعد فك القفل
let _agentSessionId = null;  // لتمييز الجلسة

/* --- Salt عشوائي (يُنشأ مرة واحدة) --- */
function getOrCreateSalt() {
  let saltB64 = localStorage.getItem(AGENT_SALT_KEY);
  if (!saltB64) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    saltB64 = btoa(String.fromCharCode(...salt));
    localStorage.setItem(AGENT_SALT_KEY, saltB64);
  }
  return Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
}

/* --- اشتقاق المفتاح من كلمة مرور المستخدم --- */
async function deriveKeyFromPassword(password) {
  if (!password || password.length < 8) {
    throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  }
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(password),
    { name: 'PBKDF2' }, false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: getOrCreateSalt(),
      iterations: 250000,     // 2.5x أقوى من السابق
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt','decrypt']
  );
}

/* --- هل تم إعداد كلمة مرور سابقة؟ --- */
function hasMasterPassword() {
  return !!localStorage.getItem(AGENT_VERIFIER);
}

/* --- إعداد كلمة المرور أول مرة --- */
async function setupMasterPassword(password) {
  const key = await deriveKeyFromPassword(password);
  // نختبر صحة المفتاح بحفظ verifier
  const testValue = 'modweeb-verifier-' + Date.now();
  const payload = await encryptWithKey(key, testValue);
  localStorage.setItem(AGENT_VERIFIER, payload);
  _agentMasterKey = key;
  _agentSessionId = Date.now();
  await migrateLegacyAgentKeys(key);
  return true;
}

/* --- فك القفل بكلمة المرور --- */
async function unlockWithPassword(password) {
  const verifier = localStorage.getItem(AGENT_VERIFIER);
  if (!verifier) throw new Error('لم يتم إعداد كلمة مرور بعد');

  const key = await deriveKeyFromPassword(password);
  const decrypted = await decryptWithKey(key, verifier);
  if (!decrypted || !decrypted.startsWith('modweeb-verifier-')) {
    throw new Error('كلمة المرور غير صحيحة');
  }
  _agentMasterKey = key;
  _agentSessionId = Date.now();
  await migrateLegacyAgentKeys(key);
  return true;
}

/* --- قفل الجلسة --- */
function lockAgent() {
  _agentMasterKey = null;
  _agentSessionId = null;
}

/* --- تشفير/فك تشفير باستخدام مفتاح محدد --- */
async function encryptWithKey(key, plain) {
  if (!plain) return '';
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain)
  );
  const ivB64 = btoa(String.fromCharCode(...iv));
  const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(cipher)));
  return ivB64 + '::' + cipherB64;
}

async function decryptWithKey(key, payload) {
  if (!payload || !payload.includes('::')) return '';
  try {
    const [ivB64, cipherB64] = payload.split('::');
    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
    const cipher = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, key, cipher
    );
    return new TextDecoder().decode(plain);
  } catch(e) {
    return '';  // كلمة مرور خاطئة أو بيانات تالفة
  }
}

/* --- الواجهة القديمة (تحتاج إعادة بناء) --- */
/* ============================================================
   تشفير مع تراجع آمن (Fallback)
   - مع كلمة مرور رئيسية: AES-GCM 256-bit
   - بدونها: تشويش base64 (يعمل فوراً)
   ============================================================ */

/* علامة تمييز التشفير الاحتياطي */
const PLAIN_PREFIX = 'plain:';

/* تشويش base64 (ليس تشفيراً حقيقياً , للحفاظ على الوظيفة) */
function obfuscate(plain) {
  try {
    return PLAIN_PREFIX + btoa(unescape(encodeURIComponent(String(plain))));
  } catch(e) {
    return PLAIN_PREFIX + btoa(String(plain));
  }
}

function deobfuscate(payload) {
  try {
    const raw = payload.slice(PLAIN_PREFIX.length);
    return decodeURIComponent(escape(atob(raw)));
  } catch(e) {
    try { return atob(payload.slice(PLAIN_PREFIX.length)); }
    catch(e2) { return ''; }
  }
}

/* --- الواجهة الموحدة --- */
async function encryptText(plain) {
  if (!plain) return '';
  /* مفتاح رئيسي موجود → AES-GCM قوي */
  if (_agentMasterKey) {
    return encryptWithKey(_agentMasterKey, plain);
  }
  throw new Error('أنشئ كلمة مرور رئيسية وافتح القفل أولاً؛ لن يُحفظ المفتاح بصيغة Base64 غير الآمنة.');
}

async function decryptText(payload) {
  if (!payload) return '';
  /* القيم القديمة المشوشة لا تُفتح إلا بعد إعداد/فتح قفل المستخدم؛ بعدها ترحّل إلى AES-GCM. */
  if (payload.startsWith(PLAIN_PREFIX)) {
    return _agentMasterKey ? deobfuscate(payload) : '';
  }
  /* payload مشفَّر AES-GCM → يحتاج مفتاحاً */
  if (!_agentMasterKey) return '';
  return decryptWithKey(_agentMasterKey, payload);
}


  // ============ قائمة المزوّدين ============
  const PROVIDERS = {
    openai: {
      name: 'OpenAI',
      keyLabel: 'API Key',
      placeholder: 'sk-...',
      help: `
        <h4><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> كيفية الحصول على مفتاح OpenAI</h4>
        <ol>
          <li>افتح <a href="https://platform.openai.com/signup" target="_blank">platform.openai.com</a> وسجّل حساباً.</li>
          <li>اذهب إلى <a href="https://platform.openai.com/api-keys" target="_blank">API Keys</a>.</li>
          <li>اضغط <kbd>Create new secret key</kbd>.</li>
          <li>انسخ المفتاح (يبدأ بـ <kbd>sk-</kbd>) والصقه أعلاه.</li>
        </ol>
        <span class="note"> يحتاج رصيداً مدفوعاً , احصل عليه من Billing.</span>
      `
    },
    gemini: {
      name: 'Google Gemini',
      keyLabel: 'API Key',
      placeholder: 'AIza...',
      help: `
        <h4><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> كيفية الحصول على مفتاح Gemini</h4>
        <ol>
          <li>افتح <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a>.</li>
          <li>سجّل الدخول بحساب Google.</li>
          <li>اضغط <kbd>Create API key</kbd>.</li>
          <li>انسخ المفتاح (يبدأ بـ <kbd>AIza</kbd>).</li>
        </ol>
        <span class="note"> يوجد مستوى مجاني سخي للاستخدام الشخصي.</span>
      `
    },
    claude: {
      name: 'Anthropic Claude',
      keyLabel: 'API Key',
      placeholder: 'sk-ant-...',
      help: `
        <h4><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> كيفية الحصول على مفتاح Claude</h4>
        <ol>
          <li>افتح <a href="https://console.anthropic.com/" target="_blank">console.anthropic.com</a>.</li>
          <li>سجّل حساباً جديداً.</li>
          <li>اذهب إلى <kbd>Settings → API Keys</kbd>.</li>
          <li>اضغط <kbd>Create Key</kbd> وانسخ المفتاح.</li>
        </ol>
        <span class="note"> يحتاج رصيداً مدفوعاً.</span>
      `
    },
    openrouter: {
      name: 'OpenRouter',
      keyLabel: 'API Key',
      placeholder: 'sk-or-...',
      help: `
        <h4><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> الحصول على مفتاح OpenRouter</h4>
        <ol>
          <li>افتح <a href="https://openrouter.ai/" target="_blank">openrouter.ai</a>.</li>
          <li>أنشئ حساباً (يمكن ربطه بـ Google).</li>
          <li>اذهب إلى <a href="https://openrouter.ai/keys" target="_blank">Keys</a>.</li>
          <li>اضغط <kbd>Create Key</kbd>.</li>
        </ol>
        <span class="note"> بوابة واحدة تتيح الوصول لعشرات النماذج (GPT، Claude، Llama، Gemini).</span>
      `
    },
    groq: {
      name: 'Groq',
      keyLabel: 'API Key',
      placeholder: 'gsk_...',
      help: `
        <h4><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> الحصول على مفتاح Groq</h4>
        <ol>
          <li>افتح <a href="https://console.groq.com/" target="_blank">console.groq.com</a>.</li>
          <li>سجّل بحساب Google أو GitHub.</li>
          <li>اذهب إلى <a href="https://console.groq.com/keys" target="_blank">API Keys</a>.</li>
          <li>اضغط <kbd>Create API Key</kbd>.</li>
        </ol>
        <span class="note"> سريع جداً ومجاني بحدود سخية (Llama, Mixtral, Gemma).</span>
      `
    },
    mistral: {
      name: 'Mistral AI',
      keyLabel: 'API Key',
      placeholder: '...',
      help: `
        <h4><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> الحصول على مفتاح Mistral</h4>
        <ol>
          <li>افتح <a href="https://console.mistral.ai/" target="_blank">console.mistral.ai</a>.</li>
          <li>سجّل حساباً.</li>
          <li>اذهب إلى <kbd>API Keys → Create new key</kbd>.</li>
        </ol>
        <span class="note"> مستوى مجاني متاح لنماذج open-source.</span>
      `
    }
  };

  let currentProvider = 'openai';
  let state = {
    keys: {},        // مشفرة: {openai: 'iv::cipher', ...}
    decrypted: {}    // فك تشفير مؤقت في الذاكرة
  };

  // ============ تحميل/حفظ ============
  function loadStore(){
    try{
      const raw = localStorage.getItem(AGENT_STORAGE_KEY);
      state.keys = raw ? JSON.parse(raw) : {};
    }catch(e){ state.keys = {}; }
  }
  function saveStore(){
    try{
      localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(state.keys));
    }catch(e){}
  }
  async function migrateLegacyAgentKeys(key){
    let changed = false;
    for (const [providerId, payload] of Object.entries(state.keys || {})) {
      if (typeof payload !== 'string' || !payload.startsWith(PLAIN_PREFIX)) continue;
      const plain = deobfuscate(payload);
      if (!plain) continue;
      state.keys[providerId] = await encryptWithKey(key, plain);
      state.decrypted[providerId] = plain;
      changed = true;
    }
    if (changed) saveStore();
  }

  // ============ بناء التبويبات ============
  function renderTabs(){
    const wrap = document.getElementById('aiagentTabs');
    if (!wrap) return;
    wrap.innerHTML = '';
    Object.keys(PROVIDERS).forEach(id => {
      const p = PROVIDERS[id];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'aiagent-tab' + (id === currentProvider ? ' active' : '') + (state.keys[id] ? ' has-key' : '');
      btn.setAttribute('aria-pressed', String(id === currentProvider));
      btn.setAttribute('aria-label', p.name + (state.keys[id] ? ' — مفتاح محفوظ ومشفّر' : ' — لا يوجد مفتاح محفوظ'));
      btn.title = state.keys[id] ? 'مفتاح محفوظ ومشفّر على هذا المتصفح' : 'لا يوجد مفتاح محفوظ لهذا المزود';
      const dot = document.createElement('span'); dot.className = 'dot'; dot.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span'); name.textContent = p.name;
      const status = document.createElement('small'); status.className = 'aiagent-tab-state';
      status.textContent = state.keys[id] ? 'محفوظ' : 'غير محفوظ';
      btn.append(dot, name, status);
      btn.addEventListener('click', () => {
        currentProvider = id;
        renderTabs();
        renderProvider();
      });
      wrap.appendChild(btn);
    });
  }

  // ============ بناء محتوى المزود ============
  async function renderProvider(){
    const p = PROVIDERS[currentProvider];
    const wrap = document.getElementById('aiagentProvider');
    if (!p || !wrap) return;

    // فك التشفير المؤقت
    let currentKey = state.decrypted[currentProvider] || '';
    if (!currentKey && state.keys[currentProvider]){
      currentKey = await decryptText(state.keys[currentProvider]);
      state.decrypted[currentProvider] = currentKey;
    }

    wrap.innerHTML = `
      <div class="aiagent-field">
        <label>${p.keyLabel} , ${p.name}</label>
        <div class="aiagent-input-wrap">
          <input type="password" id="aiagentKeyInput" placeholder="${p.placeholder}" dir="ltr" autocomplete="off" spellcheck="false" value="${currentKey.replace(/"/g,'&quot;')}">
          <button type="button" class="toggle-vis" id="aiagentToggleVis" title="إظهار/إخفاء">
            <svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>
          </button>
        </div>
      </div>
      <div class="aiagent-help">${p.help}</div>
    `;

    // زر الإظهار/الإخفاء
    const input = document.getElementById('aiagentKeyInput');
    const toggle = document.getElementById('aiagentToggleVis');
    if (toggle && input){
      toggle.addEventListener('click', () => {
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        toggle.innerHTML = isPass
          ? '<svg viewBox="0 0 24 24"><path d="m3 3 18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.2 18.2 0 0 1-3.4 4.5M6.3 6.3C3.5 8.2 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 3.7-.7"/></svg>'
          : '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
      });
    }

    // إظهار/إخفاء زر الحذف
    const clearBtn = document.getElementById('aiagentClearBtn');
    if (clearBtn) clearBtn.classList.toggle('show', !!state.keys[currentProvider]);

    // حالة سابقة
    setStatus('', '');
  }

  // ============ حالة (موحّدة عبر شريط إشعارات النافذة) ============
function setStatus(msg, type){
  // إخفاء العنصر القديم لتفادي التعارض البصري
  const el = document.getElementById('aiagentStatus');
  if (el) { el.className = 'aiagent-status'; el.textContent = ''; }

  if (typeof modweebShowStatus !== 'function') return;
  if (!msg) return;

  // loading = مستمر حتى استدعاء جديد | err = 4.5s | ok = 3s
  const dur = (type === 'loading') ? 0 : (type === 'err' ? 4500 : 3000);
  modweebShowStatus(msg, dur);
}

  // ============ حفظ ============
  async function saveProvider(){
    const input = document.getElementById('aiagentKeyInput');
    if (!input) return;
    const val = input.value.trim();
    if (!val){
      setStatus(' الرجاء إدخال المفتاح أولاً', 'err');
      return;
    }
    try{
      const encrypted = await encryptText(val);
      state.keys[currentProvider] = encrypted;
      state.decrypted[currentProvider] = val;
      saveStore();
      renderTabs();
      const clearBtn = document.getElementById('aiagentClearBtn');
      if (clearBtn) clearBtn.classList.add('show');
      setStatus(' تم تشفير المفتاح وحفظه محلياً', 'ok');
setTimeout(() => setStatus('', ''), 3000);
renderActiveProviderSelect();  // ← جديد: تحديث القائمة (لأنها تعرض  عند وجود مفتاح)
    }catch(e){
      setStatus(' فشل التشفير: ' + e.message, 'err');
    }
  }

  // ============ حذف ============
  function clearProvider(){
    delete state.keys[currentProvider];
    delete state.decrypted[currentProvider];
    saveStore();
    const input = document.getElementById('aiagentKeyInput');
    if (input) input.value = '';
    renderTabs();
    const clearBtn = document.getElementById('aiagentClearBtn');
    if (clearBtn) clearBtn.classList.remove('show');
    setStatus(' تم حذف المفتاح', 'ok');
    setTimeout(() => setStatus('', ''), 2500);
  }

  // ============ اختبار الاتصال ============
  async function testProvider(){
    const input = document.getElementById('aiagentKeyInput');
    if (!input) return;
    let key = input.value.trim();
    if (!key && state.keys[currentProvider]){
      key = await decryptText(state.keys[currentProvider]);
    }
    if (!key){
      setStatus(' لا يوجد مفتاح للاختبار', 'err');
      return;
    }
    setStatus('جاري اختبار الاتصال..', 'loading');
    try{
      let ok = false, errMsg = '';
      if (currentProvider === 'openai'){
        const r = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': 'Bearer ' + key }
        });
        ok = r.ok; if(!ok) errMsg = 'HTTP ' + r.status;
      } else if (currentProvider === 'gemini'){
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(key));
        ok = r.ok; if(!ok) errMsg = 'HTTP ' + r.status;
      } else if (currentProvider === 'claude'){
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }]
          })
        });
        ok = r.ok; if(!ok) errMsg = 'HTTP ' + r.status;
      } else if (currentProvider === 'openrouter'){
        const r = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { 'Authorization': 'Bearer ' + key }
        });
        ok = r.ok; if(!ok) errMsg = 'HTTP ' + r.status;
      } else if (currentProvider === 'groq'){
        const r = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': 'Bearer ' + key }
        });
        ok = r.ok; if(!ok) errMsg = 'HTTP ' + r.status;
      } else if (currentProvider === 'mistral'){
        const r = await fetch('https://api.mistral.ai/v1/models', {
          headers: { 'Authorization': 'Bearer ' + key }
        });
        ok = r.ok; if(!ok) errMsg = 'HTTP ' + r.status;
      }
      if (ok) setStatus(' الاتصال ناجح , المفتاح صالح', 'ok');
      else setStatus(' فشل الاتصال: ' + errMsg, 'err');
    }catch(e){
      setStatus(' تعذّر الاتصال: ' + (e.message || 'CORS أو شبكة'), 'err');
    }
  }

  /* ============ اختيار المزود النشط ============ */
function renderActiveProviderSelect(){
  const sel = document.getElementById('aiagentActiveProviderSelect');
  if (!sel) return;
  const active = (window.modweebAI && window.modweebAI.getActiveProvider)
                  ? window.modweebAI.getActiveProvider()
                  : 'openai';
  sel.innerHTML = '';
  Object.keys(PROVIDERS).forEach(id => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = PROVIDERS[id].name + (state.keys[id] ? ' ' : ' (لا مفتاح)');
    if (id === active) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = () => {
    if (window.modweebAI && window.modweebAI.setActiveProvider) {
      window.modweebAI.setActiveProvider(sel.value);
      modweebShowStatus(' تم تعيين المزود النشط: ' + PROVIDERS[sel.value].name, 2000);
    }
  };
}

// ============ فتح النافذة ============
function openAgent(){
  loadStore();
  renderTabs();
  renderProvider();
  if (window.modweebAI) {
    const mode = document.getElementById('aiGenerationMode');
    const model = document.getElementById('aiPuterModel');
    if (mode) mode.value = window.modweebAI.getGenerationMode();
    if (model) model.value = window.modweebAI.getPuterModel();
    window.modweebAI.refreshModeUI();
  }
  setTimeout(renderActiveProviderSelect, 100);
  const popup = document.getElementById('aiPopup');
  if ((!popup || !popup.classList.contains('show')) && typeof window.openAIPopup === 'function') window.openAIPopup();
  if (typeof window.setAIPopupTab === 'function') window.setAIPopupTab('settings');
}

  // ============ ربط الأزرار ============
  function bind(){
    const btn = document.getElementById('aiSettingsToggle');
    if (btn) btn.addEventListener('click', () => {
      openAgent();
      refreshLockScreen();
    });

    const saveBtn = document.getElementById('aiagentSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveProvider);

    const clearBtn = document.getElementById('aiagentClearBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearProvider);

    const testBtn = document.getElementById('aiagentTestBtn');
    if (testBtn) testBtn.addEventListener('click', testProvider);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
  const generationModeSelect = document.getElementById('aiGenerationMode');
  if (generationModeSelect) {
    generationModeSelect.value = window.modweebAI.getGenerationMode();
    window.modweebAI.refreshModeUI();
  }
  const puterModelSelect = document.getElementById('aiPuterModel');
  if (puterModelSelect) {
    window.modweebAI.setPuterModel(window.modweebAI.getPuterModel());
    puterModelSelect.addEventListener('change', () => {
      try { window.modweebAI.setPuterModel(puterModelSelect.value); }
      catch(e) { modweebShowStatus('تعذر حفظ اختيار نموذج Puter'); }
    });
  }

  /* ============================================================
   منطق شاشة القفل
   ============================================================ */
function refreshLockScreen() {
  const lock     = document.getElementById('aiAgentLockScreen');
  const tabs     = document.getElementById('aiagentTabs');
  const provider = document.getElementById('aiagentProvider');
  const confirm  = document.getElementById('aiAgentPwdConfirm');
  const btn      = document.getElementById('aiAgentUnlockBtn');
  const msg      = document.getElementById('aiAgentLockMsg');

  if (!lock) return;

  // إذا لم تُنشأ كلمة مرور بعد → وضع "إنشاء"
  const needsSetup = !hasMasterPassword();

  if (_agentMasterKey) {
    // مفتوح → أخفِ شاشة القفل
    lock.style.display = 'none';
    if (tabs) tabs.style.display = 'flex';
    if (provider) provider.style.display = 'flex';
  } else {
    // مقفل → أخفِ المحتوى
    lock.style.display = 'flex';
    if (tabs) tabs.style.display = 'none';
    if (provider) provider.style.display = 'none';
    if (confirm) confirm.style.display = needsSetup ? 'block' : 'none';
    if (btn) btn.textContent = needsSetup ? ' إنشاء كلمة المرور' : ' فتح القفل';
    if (msg) {
      msg.textContent = needsSetup
        ? ' احفظ كلمة المرور في مكان آمن , لا يمكن استرجاعها'
        : ' أدخل كلمة المرور للوصول إلى مفاتيحك';
      msg.style.color = needsSetup ? 'var(--warning)' : 'var(--notifC)';
    }
  }
}

// ربط زر الإنشاء/الفتح
const unlockBtn = document.getElementById('aiAgentUnlockBtn');
if (unlockBtn) {
  unlockBtn.addEventListener('click', async () => {
    const pwd     = document.getElementById('aiAgentPwdInput')?.value || '';
    const confirm = document.getElementById('aiAgentPwdConfirm')?.value || '';
    const msg     = document.getElementById('aiAgentLockMsg');

    try {
      if (!hasMasterPassword()) {
        // وضع الإنشاء
        if (pwd.length < 8) throw new Error('كلمة المرور قصيرة جداً (8 أحرف على الأقل)');
        if (pwd !== confirm) throw new Error('كلمتا المرور غير متطابقتين');
        await setupMasterPassword(pwd);
        msg.textContent = ' تم إنشاء كلمة المرور بنجاح';
        msg.style.color = 'var(--success)';
      } else {
        // وضع الفتح
        if (!pwd) throw new Error('أدخل كلمة المرور');
        await unlockWithPassword(pwd);
        msg.textContent = ' تم فتح القفل';
        msg.style.color = 'var(--success)';
      }

      // امسح حقول الإدخال فوراً
      document.getElementById('aiAgentPwdInput').value = '';
      document.getElementById('aiAgentPwdConfirm').value = '';

      // أعِد تحميل الواجهة
      loadStore();
      renderTabs();
      renderProvider();
      setTimeout(refreshLockScreen, 300);

    } catch(e) {
      msg.textContent = ' ' + e.message;
      msg.style.color = 'var(--danger)';
      // امسح الحقل عند الخطأ
      document.getElementById('aiAgentPwdInput').value = '';
    }
  });
}

// إضافة زر "قفل الجلسة" في التذييل
const lockBtn = document.createElement('button');
lockBtn.className = 'modweeb-gen-btn secondary';
lockBtn.textContent = ' قفل الجلسة';
lockBtn.addEventListener('click', () => {
  lockAgent();
  refreshLockScreen();
  modweebShowStatus(' تم قفل الجلسة , ستُطلب كلمة المرور عند التالي', 2000);
});
const footer = document.querySelector('#aiAgentSheet .sheet-footer');
if (footer) footer.insertBefore(lockBtn, footer.firstChild);

  // ============ واجهة عامة للاستخدام لاحقاً ============
  window.modweebAgent = {
    getKey: async (providerId) => {
      loadStore();
      const enc = state.keys[providerId];
      if (!enc) return '';
      return await decryptText(enc);
    },
    hasKey: (providerId) => {
      loadStore();
      return !!state.keys[providerId];
    },
    listProviders: () => Object.keys(PROVIDERS).map(id => ({ id, name: PROVIDERS[id].name })),
    isUnlocked: () => !!_agentMasterKey
  };

  // expose crypto للاستخدام من وحدات أخرى (Blogger settings)
  window.modweebCrypto = {
    encrypt: encryptText,
    decrypt: decryptText,
    isUnlocked: () => !!_agentMasterKey
  };
})();



/* ============================================================
   إعدادات بلوجر , إدخال وحفظ المفاتيح (نسخة تبويبات)
   ============================================================ */
(function initBloggerSettings(){
  const STORAGE_KEY = 'modweebBloggerSettings_v1';
  let currentField = 'blogId';

  // ============ تعريف الحقول مع التعليمات ============
  const FIELDS = {
    blogId: {
      id: 'blogId',
      icon: '1. ',
      label: 'Blog ID',
      shortLabel: 'Blog ID',
      placeholder: '2986788159829882847',
      inputType: 'text',
      required: true,
      hint: 'رقم مدونتك من رابط لوحة التحكم',
      help: `
        <h4><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> كيفية الحصول على Blog ID</h4>
        <ol>
          <li>افتح <a href="https://www.blogger.com/" target="_blank">blogger.com</a> وسجّل الدخول بحسابك.</li>
          <li>من القائمة اليسرى اختر <b>مدونتك</b> من قائمة المدونات.</li>
          <li>انسخ الرقم الظاهر في رابط لوحة التحكم. مثال:
            <br><kbd>blogger.com/blog/posts/<b>2986788159829882847</b></kbd>
          </li>
          <li>هذا الرقم الطويل هو <b>Blog ID</b> , الصقه في الحقل أعلاه.</li>
        </ol>
        <span class="note"> Blog ID ثابت لا يتغير. لا يحتاج تجديداً حتى لو غيّرت مفاتيح أخرى.</span>
      `
    },

    apiKey: {
      id: 'apiKey',
      icon: '2. ',
      label: 'API Key',
      shortLabel: 'API Key',
      placeholder: 'AIzaSy...',
      inputType: 'password',
      required: true,
      hint: 'مفتاح عام للقراءة من Google Cloud',
      help: `
        <h4><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> كيفية الحصول على API Key</h4>
        <ol>
          <li><b>أولاً: فعّل Blogger API</b>
            <ul>
              <li>افتح <a href="https://console.cloud.google.com/apis/library/blogger.googleapis.com" target="_blank">Blogger API v3</a></li>
              <li>تأكد أن المشروع الصحيح مختار من الأعلى</li>
              <li>اضغط <b>Enable</b> إذا لم يكن مفعّلاً</li>
            </ul>
          </li>
          <li><b>ثانياً: أنشئ المفتاح</b>
            <ul>
              <li>افتح <a href="https://console.cloud.google.com/apis/credentials" target="_blank">Credentials</a></li>
              <li>اضغط <b>+ CREATE CREDENTIALS</b> → <b>API key</b></li>
              <li>انسخ المفتاح (يبدأ بـ <kbd>AIza...</kbd>)</li>
            </ul>
          </li>
          <li><b>ثالثاً (مستحسن): قيّد المفتاح</b>
            <ul>
              <li>اضغط <b>Edit</b> بجانب المفتاح</li>
              <li>في <b>API restrictions</b> اختر <b>Restrict key</b></li>
              <li>اختر <b>Blogger API v3</b> فقط</li>
              <li>احفظ</li>
            </ul>
          </li>
        </ol>
        <span class="note"> API Key مجاني بالكامل، ولا يستهلك رصيداً. القيد يمنع استخدامه في خدمات أخرى.</span>
      `
    },

    clientId: {
      id: 'clientId',
      icon: '3. ',
      label: 'Client ID',
      shortLabel: 'Client ID',
      placeholder: '354080095998-xxxx.apps.googleusercontent.com',
      inputType: 'text',
      required: true,
      hint: 'معرّف عميل OAuth 2.0',
      help: `
        <h4><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> كيفية الحصول على Client ID</h4>
        <ol>
          <li><b>أولاً: إعداد شاشة الموافقة</b>
            <ul>
              <li>افتح <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank">OAuth consent screen</a></li>
              <li>اختر <b>External</b> → <b>Create</b></li>
              <li>أدخل:
                <br>• <b>App name:</b> Modweeb Publisher
                <br>• <b>User support email:</b> بريدك
                <br>• <b>Developer contact:</b> بريدك
              </li>
              <li>اضغط <b>Save and Continue</b> في كل الصفحات (تجاهل Scopes و Test users)</li>
            </ul>
          </li>
          <li><b>ثانياً: إنشاء OAuth Client</b>
            <ul>
              <li>افتح <a href="https://console.cloud.google.com/apis/credentials" target="_blank">Credentials</a></li>
              <li>اضغط <b>+ CREATE CREDENTIALS</b> → <b>OAuth client ID</b></li>
              <li><b>Application type:</b> اختر <b>Web application</b></li>
              <li><b>Name:</b> Modweeb Publisher</li>
            </ul>
          </li>
          <li><b>ثالثاً: أضف عنوان إعادة التوجيه</b>
            <ul>
              <li>في <b>Authorized redirect URIs</b> اضغط <b>+ ADD URI</b></li>
              <li>الصق:
                <br><kbd>https://developers.google.com/oauthplayground</kbd>
              </li>
              <li>اضغط <b>Create</b></li>
            </ul>
          </li>
          <li>انسخ <b>Client ID</b> الظاهر والصقه أعلاه.</li>
        </ol>
        <span class="note"> Client ID ليس سرياً، لكن احتفظ به مع Client Secret لأن كلاهما مطلوب.</span>
      `
    },

    clientSecret: {
      id: 'clientSecret',
      icon: '4. ',
      label: 'Client Secret',
      shortLabel: 'Secret',
      placeholder: 'GOCSPX-...',
      inputType: 'password',
      required: true,
      hint: 'كلمة سر عميل OAuth (سرّية)',
      help: `
        <h4><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> كيفية الحصول على Client Secret</h4>
        <ol>
          <li>Client Secret يظهر <b>مرة واحدة</b> عند إنشاء OAuth Client في الخطوة السابقة.</li>
          <li>إذا لم يظهر لك:
            <ul>
              <li>افتح <a href="https://console.cloud.google.com/apis/credentials" target="_blank">Credentials</a></li>
              <li>ابحث عن OAuth Client الذي أنشأته في جدول <b>OAuth 2.0 Client IDs</b></li>
              <li>اضغط على اسمه لعرض التفاصيل</li>
              <li>انسخ <b>Client secret</b> من هناك</li>
            </ul>
          </li>
          <li>إن فقدت الـ Secret:
            <ul>
              <li>لا يمكن استرجاعه , فقط توليد واحد جديد</li>
              <li>في نفس الصفحة اضغط <b>ADD SECRET</b> أو <b>Reset secret</b></li>
              <li>بعد التوليد، يجب تجديد Refresh Token لأن القديم يصبح غير صالح</li>
            </ul>
          </li>
        </ol>
        <span class="note"> Client Secret سرّي جداً. لا تشاركه مع أحد ولا تضعه في GitHub.</span>
      `
    },

    refreshToken: {
      id: 'refreshToken',
      icon: '5. ',
      label: 'Refresh Token',
      shortLabel: 'Refresh',
      placeholder: '1//04...',
      inputType: 'password',
      required: true,
      hint: 'توكن دائم للنشر بدون تسجيل دخول',
      help: `
        <h4><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> كيفية الحصول على Refresh Token</h4>
        <ol>
          <li>افتح <a href="https://developers.google.com/oauthplayground/" target="_blank">OAuth 2.0 Playground</a>.</li>
          <li>اضغط أيقونة <b>⚙️ (ترس)</b> في أعلى اليمين.</li>
          <li> فعّل <b>Use your own OAuth credentials</b>.</li>
          <li>أدخل:
            <ul>
              <li><b>OAuth Client ID:</b> الصق Client ID من الحقل السابق</li>
              <li><b>OAuth Client secret:</b> الصق Client Secret</li>
            </ul>
          </li>
          <li>أغلق نافذة الإعدادات (اضغط الترس مرة أخرى).</li>
          <li>في القائمة اليسرى، ابحث عن <b>Blogger API v3</b>.</li>
          <li>اختر: <kbd>https://www.googleapis.com/auth/blogger</kbd></li>
          <li>اضغط <b>Authorize APIs</b> في الأسفل.</li>
          <li>ستفتح نافذة Google → اختر حساب المدونة → <b>Allow</b>.</li>
          <li>ستعود إلى Playground → اضغط <b>Exchange authorization code for tokens</b>.</li>
          <li>انسخ <b>Refresh token</b> (يبدأ بـ <kbd>1//04...</kbd>).</li>
        </ol>
        <span class="note"> إذا لم يظهر refresh_token، تأكد من تفعيل "Use your own OAuth credentials" أولاً.</span>
      `
    }
  };

  const FIELD_ORDER = ['blogId', 'apiKey', 'clientId', 'clientSecret', 'refreshToken'];

  // ============ تشفير محلي مستقل (لا يعتمد على وكيل AI) ============
const BLOG_PREFIX = 'mwbg:';
function localEncrypt(plain){
  try {
    return BLOG_PREFIX + btoa(unescape(encodeURIComponent(String(plain))));
  } catch(e) {
    return BLOG_PREFIX + btoa(String(plain));
  }
}
function localDecrypt(payload){
  if (!payload) return '';
  if (payload.startsWith(BLOG_PREFIX)){
    try { return decodeURIComponent(escape(atob(payload.slice(BLOG_PREFIX.length)))); }
    catch(e){ try { return atob(payload.slice(BLOG_PREFIX.length)); } catch(e2){ return ''; } }
  }
  if (payload.startsWith('plain:')){
    try { return decodeURIComponent(escape(atob(payload.slice(6)))); }
    catch(e){ try { return atob(payload.slice(6)); } catch(e2){ return ''; } }
  }
  // قيمة مشفَّرة بـ AES-GCM قديماً , أعِدها كما هي لتفادي فقدانها
  return payload;
}
const encrypt = async (t) => {
  if (!window.modweebCrypto || !window.modweebCrypto.isUnlocked()) {
    throw new Error('افتح قفل مفاتيح الذكاء الاصطناعي بكلمة المرور الرئيسية قبل حفظ بيانات Blogger.');
  }
  return window.modweebCrypto.encrypt(t);
};
const decrypt = async (t) => {
  if (String(t || '').startsWith(BLOG_PREFIX) || String(t || '').startsWith('plain:')) {
    if (!window.modweebCrypto || !window.modweebCrypto.isUnlocked()) return '';
    return localDecrypt(t);
  }
  return window.modweebCrypto ? window.modweebCrypto.decrypt(t) : '';
};

  // ============ تحميل/حفظ ============
  async function loadSettings(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const enc = JSON.parse(raw);
      const out = {};
      for (const key of Object.keys(enc)){
        out[key] = await decrypt(enc[key]);
      }
      return out;
    }catch(e){ return {}; }
  }

  async function saveSettings(obj){
    try{
      const enc = {};
      for (const key of Object.keys(obj)){
        if (obj[key]) enc[key] = await encrypt(obj[key]);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enc));
    }catch(e){
      setStatus('لم تُحفظ الإعدادات. افتح القفل بكلمة المرور الرئيسية ثم حاول مرة أخرى.', 'err');
      throw e;
    }
  }

  // ============ رسم التبويبات ============
  async function renderTabs(){
    const wrap = document.getElementById('bloggerSettingsTabs');
    if (!wrap) return;
    const settings = await loadSettings();

    wrap.innerHTML = '';
    FIELD_ORDER.forEach(id => {
      const f = FIELDS[id];
      const hasValue = !!(settings[id] && String(settings[id]).trim());

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'aiagent-tab' +
        (id === currentField ? ' active' : '') +
        (hasValue ? ' has-key' : '');

      // نقطة الحالة
      const dot = document.createElement('span');
      dot.className = 'dot';
      btn.appendChild(dot);

      // الأيقونة + النص
      const label = document.createElement('span');
      label.textContent = f.icon + ' ' + f.shortLabel;
      btn.appendChild(label);

      //  عند الاكتمال
      if (hasValue){
        const check = document.createElement('span');
        check.className = 'status-icon';
        check.textContent = '';
        btn.appendChild(check);
      }

      btn.addEventListener('click', () => {
        currentField = id;
        renderTabs();
        renderProvider();
      });
      wrap.appendChild(btn);
    });

    // الملخص العلوي
    renderOverview(settings);
  }

  // ============ ملخص الاكتمال ============
  function renderOverview(settings){
    const el = document.getElementById('bloggerOverview');
    if (!el) return;

    const total = FIELD_ORDER.length;
    const filled = FIELD_ORDER.filter(id => settings[id] && String(settings[id]).trim()).length;

    if (filled === 0){
      el.classList.remove('show');
      return;
    }

    el.classList.add('show');
    el.innerHTML = `
      <div class="overview-title">
        <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10.01-3-3"/></svg>
        اكتمال الإعدادات: ${filled} من ${total}
      </div>
      <div class="overview-badges">
        ${FIELD_ORDER.map(id => {
          const f = FIELDS[id];
          const ok = settings[id] && String(settings[id]).trim();
          return `<span class="overview-badge ${ok ? 'ok' : ''}">${ok ? '' : '○'} ${f.shortLabel}</span>`;
        }).join('')}
      </div>
    `;
  }

  // ============ رسم محتوى الحقل الحالي ============
  async function renderProvider(){
    const f = FIELDS[currentField];
    const wrap = document.getElementById('bloggerSettingsProvider');
    if (!f || !wrap) return;

    const settings = await loadSettings();
    const currentValue = settings[f.id] || '';

    // بناء محتوى الحقل
    wrap.innerHTML = `
      <div class="aiagent-field">
        <label>${f.icon} ${f.label}${f.required ? ' <span style="color:var(--danger);font-size:10px">*</span>' : ''}</label>
        <div class="aiagent-input-wrap">
          <input type="${f.inputType}"
                 id="bgs_currentField"
                 placeholder="${f.placeholder}"
                 dir="ltr"
                 autocomplete="off"
                 spellcheck="false"
                 value="${currentValue.replace(/"/g,'&quot;')}">
          <button type="button" class="toggle-vis" id="bgs_toggleVis" title="إظهار/إخفاء">
            <svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>
          </button>
        </div>
        <div style="font-size:9.5px;color:var(--notifC);margin-top:4px;display:flex;justify-content:space-between;align-items:center">
          <span>${f.hint}</span>
          <span id="bgs_fieldStatus" style="font-weight:600"></span>
        </div>
      </div>
      <div class="aiagent-help">${f.help}</div>
    `;

    // ربط زر الإظهار/الإخفاء
    const input = document.getElementById('bgs_currentField');
    const toggle = document.getElementById('bgs_toggleVis');
    if (toggle && input){
      // إذا كان الحقل من نوع password، ابدأ مخفياً
      if (f.inputType !== 'password'){
        toggle.style.display = 'none';
      }
      toggle.addEventListener('click', () => {
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        toggle.innerHTML = isPass
          ? '<svg viewBox="0 0 24 24"><path d="m3 3 18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.2 18.2 0 0 1-3.4 4.5M6.3 6.3C3.5 8.2 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 3.7-.7"/></svg>'
          : '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
      });
    }

    // عرض حالة الحقل
    updateFieldStatus(currentValue);

    // تحديث الحالة عند الكتابة
    input.addEventListener('input', () => {
      updateFieldStatus(input.value);
    });

    // أزرار الحفظ/الحذف
    const clearBtn = document.getElementById('bloggerSettingsClearBtn');
    if (clearBtn) clearBtn.style.display = FIELD_ORDER.some(id => settings[id]) ? 'inline-flex' : 'none';

    setStatus('', '');
  }

  function updateFieldStatus(value){
    const statusEl = document.getElementById('bgs_fieldStatus');
    if (!statusEl) return;
    const v = (value || '').trim();
    if (!v){
      statusEl.textContent = '';
      return;
    }
    statusEl.textContent = ' محفوظ';
    statusEl.style.color = 'var(--success, #16a34a)';
  }

  // ============ حفظ الحقل الحالي ============
  async function saveCurrentField(){
    const input = document.getElementById('bgs_currentField');
    if (!input) return false;
    const val = input.value.trim();
    if (!val){
      setStatus(' الرجاء إدخال القيمة أولاً', 'err');
      return false;
    }

    const settings = await loadSettings();
    settings[currentField] = val;
    try {
      await saveSettings(settings);
    } catch(e) {
      setStatus(e.message || 'افتح القفل قبل حفظ الإعدادات', 'err');
      return false;
    }
    syncToApp(settings);

    // تحديث التبويبات
    await renderTabs();

    setStatus(' تم حفظ "' + FIELDS[currentField].label + '" مشفَّراً', 'ok');
    setTimeout(() => setStatus('', ''), 2500);
    return true;
  }

// حفظ الحقل الحالي ثم عرض حالة الاكتمال
async function saveAll(){
  // 1) احفظ الحقل الحالي إن وُجدت قيمة
  const input = document.getElementById('bgs_currentField');
  if (input && input.value.trim()){
    const ok = await saveCurrentField();
    if (!ok) return;
  }

  // 2) اقرأ الإعدادات بعد الحفظ
  const settings = await loadSettings();
  const filled = FIELD_ORDER.filter(id =>
    settings[id] && String(settings[id]).trim()
  );
  const missing = FIELD_ORDER.filter(id =>
    FIELDS[id].required && !(settings[id] && String(settings[id]).trim())
  );

  // 3) اعرض النتيجة المناسبة
  if (missing.length === 0){
    setStatus(' جميع المفاتيح محفوظة ومشفَّرة', 'ok');
  } else if (filled.length > 0){
    setStatus(
      ' تم حفظ ' + filled.length + ' حقل , متبقي: ' +
      missing.map(id => FIELDS[id].shortLabel).join('، '),
      'ok'
    );
  } else {
    setStatus(' الرجاء إدخال قيمة على الأقل', 'err');
  }
  setTimeout(() => setStatus('', ''), 4000);
}

  // ============ قراءة القيم (من الحفظ) ============
  async function readAll(){
    const settings = await loadSettings();
    // أضف قيمة الحقل الحالي إن لم تكن محفوظة
    const input = document.getElementById('bgs_currentField');
    if (input && input.value.trim()){
      settings[currentField] = input.value.trim();
    }
    return settings;
  }

  // ============ مزامنة مع BLOGGER_CONFIG ============
  function syncToApp(settings){
    try{
      if (typeof BLOGGER_CONFIG !== 'undefined'){
        if (settings.blogId)       BLOGGER_CONFIG.BLOG_ID       = settings.blogId;
        if (settings.apiKey)       BLOGGER_CONFIG.API_KEY       = settings.apiKey;
        if (settings.clientId)     BLOGGER_CONFIG.CLIENT_ID     = settings.clientId;
        if (settings.clientSecret) BLOGGER_CONFIG.CLIENT_SECRET = settings.clientSecret;
        if (settings.refreshToken) BLOGGER_CONFIG.REFRESH_TOKEN = settings.refreshToken;
      }
      const blogIdInput = document.getElementById('bloggerBlogId');
      if (blogIdInput && settings.blogId) blogIdInput.value = settings.blogId;
      if (typeof currentAccessToken !== 'undefined') currentAccessToken = null;
      if (typeof tokenExpiryTime !== 'undefined') tokenExpiryTime = 0;
    }catch(e){}
  }

  // ============ حالة (موحّدة عبر شريط إشعارات النافذة) ============
function setStatus(msg, type){
  const el = document.getElementById('bloggerSettingsStatus');
  if (el) { el.className = 'aiagent-status'; el.textContent = ''; }

  if (typeof modweebShowStatus !== 'function') return;
  if (!msg) return;

  const dur = (type === 'loading') ? 0 : (type === 'err' ? 4500 : 3000);
  modweebShowStatus(msg, dur);
}

  // ============ حذف الكل ============
  async function clearAll(){
    if (!confirm('هل تريد حذف جميع المفاتيح المحفوظة؟')) return;
    try{
      localStorage.removeItem(STORAGE_KEY);
      setStatus(' تم حذف جميع المفاتيح', 'ok');
      await renderTabs();
      await renderProvider();
      setTimeout(() => setStatus('', ''), 2500);
    }catch(e){}
  }

  // ============ اختبار الاتصال ============
  async function test(){
    const data = await readAll();
    if (!data.blogId || !data.apiKey){
      setStatus(' Blog ID و API Key مطلوبان للاختبار', 'err');
      return;
    }
    setStatus(' جاري اختبار الوصول إلى Blogger API...', 'loading');
    try{
      const url = 'https://www.googleapis.com/blogger/v3/blogs/' +
        encodeURIComponent(data.blogId) + '?key=' + encodeURIComponent(data.apiKey);
      const r = await fetch(url);
      if (!r.ok){
        const errData = await r.json().catch(() => ({}));
        throw new Error('HTTP ' + r.status +
          (errData.error && errData.error.message ? ' , ' + errData.error.message : ''));
      }
      const blogData = await r.json();
      setStatus(' الاتصال ناجح , المدونة: ' + (blogData.name || 'غير مسماة'), 'ok');
    }catch(e){
      setStatus(' فشل الاتصال: ' + (e.message || 'تحقق من المفاتيح'), 'err');
    }
  }

  // ============ فتح النافذة ============
  async function open(){
    await renderTabs();
    await renderProvider();
    setStatus('', '');
    const publishSheet = document.getElementById('bloggerPublishSheet');
    if (!publishSheet || !publishSheet.classList.contains('show')) {
      if (typeof openSheet === 'function') openSheet('bloggerPublishSheet');
    }
    if (typeof window.setBloggerPublishTab === 'function') window.setBloggerPublishTab('settings');
  }

  // ============ ربط الأزرار ============
  function bind(){
    const btn = document.getElementById('bloggerHeaderSettingsBtn');
    if (btn) btn.addEventListener('click', open);

    // زر الحفظ الرئيسي (حفظ الكل)
    const saveBtn = document.getElementById('bloggerSettingsSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveAll);

    // زر الحذف
    const clearBtn = document.getElementById('bloggerSettingsClearBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearAll);

    // زر اختبار الاتصال
    const testBtn = document.getElementById('bloggerSettingsTestBtn');
    if (testBtn) testBtn.addEventListener('click', test);

    // زر حفظ عند الضغط على Enter في الحقل
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target && e.target.id === 'bgs_currentField'){
        e.preventDefault();
        saveCurrentField();
      }
    });

    // تحميل المفاتيح عند بدء التشغيل ومزامنتها
    (async () => {
      const settings = await loadSettings();
      if (settings.blogId) syncToApp(settings);
    })();
  }

  // ============ واجهة عامة ============
  window.openBloggerSettingsFromPublish = function(){
    open();
  };

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();

/* ============================================================
   إخفاء السهم عند إخفاء شريط العناصر (توافق قديم)
   ============================================================ */
(function syncHintVisibilityWithToolbar(){
  function setup(){
    const bar = document.getElementById('unifiedElementsToolbar');
    if (!bar) return;
    const wrap = bar.parentElement;
    if (!wrap || !wrap.classList.contains('mw-scroll-wrap')) return;

    const observer = new MutationObserver(() => {
      const hidden = bar.classList.contains('hidden');
      wrap.querySelectorAll('.mw-scroll-hint').forEach(h => {
        h.style.display = hidden ? 'none' : '';
      });
    });
    observer.observe(bar, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();

/* ============================================================
   قائمة أوضاع العرض: افتراضي / ليلي / ضوء
   ============================================================ */
(function initThemeModeMenu(){
  'use strict';
  const STORAGE_KEY = 'modweebThemeMode';
  const btn = document.getElementById('darkModeToggle');
  if (!btn) return;

  const MODES = [
    { id: 'default', label: 'افتراضي' },
    { id: 'dark',    label: 'ليلي'   },
    { id: 'light',   label: 'ضوء'    }
  ];

  /* الأيقونات */
  const ICON_AUTO  = "<rect x='3' y='4' width='18' height='12' rx='2'/><path d='M8 20h8'/><path d='M12 16v4'/>";
  const ICON_SUN   = "<circle cx='12' cy='12' r='4'/><path d='M12 2v2'/><path d='M12 20v2'/><path d='m4.93 4.93 1.41 1.41'/><path d='m17.66 17.66 1.41 1.41'/><path d='M2 12h2'/><path d='M20 12h2'/><path d='m6.34 17.66-1.41 1.41'/><path d='m19.07 4.93-1.41 1.41'/>";
  const ICON_MOON  = "<path d='M2.03009 12.42C2.39009 17.57 6.76009 21.76 11.9901 21.99C15.6801 22.15 18.9801 20.43 20.9601 17.72C21.7801 16.61 21.3401 15.87 19.9701 16.12C19.3001 16.24 18.6101 16.29 17.8901 16.26C13.0001 16.06 9.00009 11.97 8.98009 7.13996C8.97009 5.83996 9.24009 4.60996 9.73009 3.48996C10.2701 2.24996 9.62009 1.65996 8.37009 2.18996C4.41009 3.85996 1.70009 7.84996 2.03009 12.42Z'/>";

  function getSavedMode(){
    try { return localStorage.getItem(STORAGE_KEY) || 'default'; }
    catch(e){ return 'default'; }
}

  function systemPrefersDark(){
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch(e){ return false; }
  }

  /* تطبيق الوضع */
  function applyMode(mode, silent){
    const html = document.documentElement;
    const body = document.body;

    /* نزيل دائماً الوضع الفاتح القسري أولاً */
    html.classList.remove('modweeb-force-light');
    body.classList.remove('modweeb-force-light');

    let finalDark = false;

    if (mode === 'dark'){
      html.classList.add('dark');
      body.classList.add('dark');
      html.classList.remove('drK');
      body.classList.remove('drK');
      finalDark = true;
    } else if (mode === 'light'){
      html.classList.remove('dark', 'drK');
      body.classList.remove('dark', 'drK');
      html.classList.add('modweeb-force-light');
      body.classList.add('modweeb-force-light');
      finalDark = false;
    } else {
      /* افتراضي: نحترم سمة بلوجر + تفضيل النظام */
      html.classList.remove('dark', 'drK');
      body.classList.remove('dark', 'drK');
      if (systemPrefersDark()){
        html.classList.add('dark');
        body.classList.add('dark');
        finalDark = true;
      }
    }

    /* مزامنة المتغير القديم إن وُجد */
    try { window.isDarkMode = finalDark; } catch(e){}

    try { localStorage.setItem(STORAGE_KEY, mode); } catch(e){}

    updateButtonIcon(mode);

    if (!silent && typeof modweebShowStatus === 'function'){
      const label = (MODES.find(m => m.id === mode) || {}).label || mode;
      modweebShowStatus(' تم التبديل إلى الوضع: ' + label, 1500);
    }
  }

  function updateButtonIcon(mode){
    const icon = document.getElementById('darkModeIcon');
    if (!icon) return;
    if (mode === 'dark'){
      icon.innerHTML = ICON_SUN;         /* في الوضع الليلي، اعرض شمساً (للتبديل) */
    } else if (mode === 'light'){
      icon.innerHTML = ICON_MOON;        /* في الوضع الفاتح، اعرض قمراً */
    } else {
      icon.innerHTML = ICON_AUTO;        /* افتراضي: شاشة/نظام */
    }
    const label = (MODES.find(m => m.id === mode) || {}).label || mode;
    btn.title = 'وضع العرض: ' + label;
  }

  /* بناء القائمة */
  function buildMenu(){
    const menu = document.createElement('div');
    menu.className = 'unified-menu open';
    menu.setAttribute('data-theme-menu', '1');

    const current = getSavedMode();
    let html = '<div class="menu-section-title">وضع العرض</div>';

    MODES.forEach(m => {
      const iconSvg = m.id === 'dark' ? ICON_MOON
                    : m.id === 'light' ? ICON_SUN
                    : ICON_AUTO;
      html += '<div>'
            +   '<button type="button" data-theme-mode="' + m.id + '"'
            +           (m.id === current ? ' class="is-active"' : '') + '>'
            +     '<span class="mw-theme-icon"><svg viewBox="0 0 24 24">' + iconSvg + '</svg></span>'
            +     '<span class="mw-theme-label">' + m.label + '</span>'
            +     '<span class="mw-theme-check"></span>'
            +   '</button>'
            + '</div>';
    });

    menu.innerHTML = html;
    return menu;
  }

  function openMenu(){
  /* ⛔ إن كانت أي قائمة مفتوحة → أغلقها ولا تفتح هذه */
  if (document.querySelector('.unified-menu.open')){
    if (typeof window.closeAllModweebMenus === 'function') window.closeAllModweebMenus();
    return;
  }
    closeMenu();
    const menu = buildMenu();
    document.body.appendChild(menu);

    /* تحديد الموضع , مثل قوائم عناصر المقال */
    requestAnimationFrame(() => {
      const rect     = btn.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const menuW    = menuRect.width  || 170;
      const menuH    = menuRect.height || 160;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pad = 8;

      let right = vw - rect.right;
      if (right < pad) right = pad;
      if (right + menuW > vw - pad) right = Math.max(pad, vw - menuW - pad);

      let top = rect.bottom + 6;
      if (top + menuH > vh - pad){
        const topAbove = rect.top - menuH - 6;
        top = topAbove >= pad ? topAbove : Math.max(pad, vh - menuH - pad);
      }

      menu.style.top   = top + 'px';
      menu.style.right = right + 'px';
    });

    menu.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-theme-mode]');
      if (!b) return;
      applyMode(b.dataset.themeMode);
      closeMenu();
    });

    btn.setAttribute('aria-expanded', 'true');

    setTimeout(() => {
      document.addEventListener('click', outsideClick);
      document.addEventListener('keydown', onKey);
      window.addEventListener('scroll', closeMenu, { passive: true, capture: true });
      window.addEventListener('resize', closeMenu);
    }, 0);
  }

  function closeMenu(){
    document.querySelectorAll('[data-theme-menu]').forEach(m => m.remove());
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', outsideClick);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('scroll', closeMenu, { capture: true });
    window.removeEventListener('resize', closeMenu);
  }

  function outsideClick(e){
    if (!e.target.closest('[data-theme-menu]') && !e.target.closest('#darkModeToggle')) {
      closeMenu();
    }
  }
  function onKey(e){
    if (e.key === 'Escape') closeMenu();
  }

  /* ============ التهيئة ============ */
  applyMode(getSavedMode(), true);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (document.querySelector('[data-theme-menu]')) closeMenu();
    else openMenu();
  });

  /* مراقبة تغيير تفضيل النظام , يؤثر فقط على وضع "افتراضي" */
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (getSavedMode() === 'default') applyMode('default', true);
    };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  } catch(e){}
})();

/* ═══════════════════════════════════════════════════════════
   🔒 تهيئة حالة حقول Slug حسب الإعداد MW_SLUG_ENABLED
   ═══════════════════════════════════════════════════════════ */
(function initSlugState(){
    function apply(){
        const input   = document.getElementById('bloggerPostSlug');
        const btn     = document.getElementById('btnAiSlug');
        const seoInput = document.getElementById('seoSlugField');
        const seoLabel = document.getElementById('seoSlugLen');

        if (!MW_SLUG_ENABLED) {
            /* 🔕 الوضع المعطّل */
            if (input) {
                input.disabled = true;
                input.value = '';
                input.placeholder = 'يُنشأ تلقائياً من العنوان';
                input.style.opacity = '.6';
                input.style.cursor = 'not-allowed';
            }
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = '.5';
                btn.style.cursor = 'not-allowed';
                btn.title = 'معطّل — يُنشئ Blogger الرابط تلقائياً';
            }
            if (seoInput) {
                seoInput.disabled = true;
                seoInput.value = '';
                seoInput.placeholder = 'معطّل';
                seoInput.style.opacity = '.6';
                seoInput.style.cursor = 'not-allowed';
            }
            if (seoLabel) {
                seoLabel.textContent = 'معطّل';
                seoLabel.style.color = 'var(--notifC)';
            }
        } else {
            /* ✅ الوضع المفعّل (إن أردت العودة لاحقاً) */
            if (input) {
                input.disabled = false;
                input.placeholder = 'my-post-slug';
                input.style.opacity = '1';
                input.style.cursor = '';
            }
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = '';
                btn.title = 'توليد Slug';
            }
            if (seoInput) {
                seoInput.disabled = false;
                seoInput.placeholder = 'my-article-slug';
                seoInput.style.opacity = '1';
                seoInput.style.cursor = '';
            }
            if (seoLabel) {
                seoLabel.textContent = '0';
                seoLabel.style.color = '';
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply);
    } else {
        apply();
    }

    /* إعادة التطبيق عند فتح نافذة النشر أو SEO */
    window.addEventListener('modweebSheetOpened', () => {
        setTimeout(apply, 100);
    });
})();

function modweebUpdateDragButton(){}
function modweebInitializeSortable(){}
function toggleDrag(){}
