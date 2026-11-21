/* ============================================================
   1. المتغيرات الأساسية
   ============================================================ */
/* ═══════════════════════════════════════════════════════════
   ⚙️ إعدادات التحكم العامة
   ═══════════════════════════════════════════════════════════ */
const MW_SLUG_ENABLED = false;  // ← false = معطّل | true = مفعّل

let modweebBlocks = [];
let modweebHistory = [];
let modweebHistoryIndex = -1;
let modweebArticleHTML = "";
let modweebSortableInstance = null;
let modweebDragEnabled = true;

/* ============================================================
   2. كشف الوضع الليلي من قالب بلوجر تلقائياً
   ============================================================ */
let isDarkMode = false;
(function detectBloggerDarkMode(){
    function check(){
        if (document.documentElement.classList.contains('modweeb-force-light') ||
            document.body.classList.contains('modweeb-force-light')) {
            return;
        }
        const html = document.documentElement;
        const body = document.body;
        let isDark = html.classList.contains('dark') ||
                     html.classList.contains('drK') ||
                     body.classList.contains('dark') ||
                     body.classList.contains('drK');
        if (!isDark) {
            try {
                const bg = window.getComputedStyle(body).backgroundColor || '';
                const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                const alphaMatch = bg.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)/i);
                const opaque = !alphaMatch || Number(alphaMatch[1]) > 0.05;
                if (m && opaque) {
                    const avg = (parseInt(m[1]) + parseInt(m[2]) + parseInt(m[3])) / 3;
                    if (avg < 100) isDark = true;
                }
            } catch(e){}
        }
        if (!isDark) {
            try { isDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); }
            catch(e){}
        }
        if (isDark) {
            html.classList.add('dark');
            body.classList.add('dark');
            isDarkMode = true;
            const btn = document.getElementById('darkModeToggle');
            const icon = document.getElementById('darkModeIcon');
            if (btn) btn.title = 'الوضع الضوئي';
            if (icon) icon.innerHTML = "<circle cx='12' cy='12' r='4'/><path d='M12 2v2'/><path d='M12 20v2'/><path d='m4.93 4.93 1.41 1.41'/><path d='m17.66 17.66 1.41 1.41'/><path d='M2 12h2'/><path d='M20 12h2'/><path d='m6.34 17.66-1.41 1.41'/><path d='m19.07 4.93-1.41 1.41'/>";
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check);
    else check();
})();

/* ============================================================
   3. الوضع الليلي - تبديل
   ============================================================ */
function toggleDarkMode() {
    const icon = document.getElementById('darkModeIcon');
    const button = document.getElementById('darkModeToggle');
    if (!isDarkMode) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        isDarkMode = true;
        if (button) button.title = 'الوضع الضوئي';
        if (icon) icon.innerHTML = "<circle cx='12' cy='12' r='4'/><path d='M12 2v2'/><path d='M12 20v2'/><path d='m4.93 4.93 1.41 1.41'/><path d='m17.66 17.66 1.41 1.41'/><path d='M2 12h2'/><path d='M20 12h2'/><path d='m6.34 17.66-1.41 1.41'/><path d='m19.07 4.93-1.41 1.41'/>";
    } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        isDarkMode = false;
        if (button) button.title = 'الوضع الليلي';
        if (icon) icon.innerHTML = "<path d='M2.03009 12.42C2.39009 17.57 6.76009 21.76 11.9901 21.99C15.6801 22.15 18.9801 20.43 20.9601 17.72C21.7801 16.61 21.3401 15.87 19.9701 16.12C19.3001 16.24 18.6101 16.29 17.8901 16.26C13.0001 16.06 9.00009 11.97 8.98009 7.13996C8.97009 5.83996 9.24009 4.60996 9.73009 3.48996C10.2701 2.24996 9.62009 1.65996 8.37009 2.18996C4.41009 3.85996 1.70009 7.84996 2.03009 12.42Z'/>";
    }
}

/* ============================================================
   4. نظام الكتل (Block System)
   ============================================================ */
function modweebAddBlock(type){
    const defaults = {
        id: Date.now() + "-" + Math.random().toString(36).substr(2,5),
        type: type, content: "", paragraphStyle: "normal", dropCapChar: "", refSource: "",
        headingLevel: "h2",
        headingBefore: "", headingAfter: "",
        imageUrl: "", imageAlt: "", imageWidth: "1280", imageHeight: "720",
        imageStyle: "standard", imageLightbox: false, imageCaptionStyle: "figure",
        imageDisableCaption: false, gridUrls: "", scrollHeight: "h150", caption: "",
        linkUrl: "", linkText: "", linkStyle: "extL",
        buttonText: "", buttonUrl: "", buttonIcon: "", buttonOutlined: false,
        downloadFile: "", fileName: "", fileSize: "",
        quoteStyle: "normal", quoteAuthor: "",
        noteStyle: "info", alertStyle: "info", alertOutlined: false,
        tableRows: 2, tableCols: 2,
        tableData: [["", ""], ["", ""]],
        tableClasses: "bordered stripped hovered sticky",
        steps: ["الخطوة الأولى"],
        codeContent: "", codeLanguage: "html", codeComment: "", codeSource: "",
        codeLines: "", codeCopy: true, codeHighlight: true, codeSyntax: true,
        tabHtml: "", tabCss: "", tabJs: "", tabJson: "",
        tabHtmlSource: "src/index.html", tabCssSource: "src/style.css",
        tabJsSource: "src/main.js", tabJsonSource: "src/rules.json",
        audioUrl: "", audioTitle: "", audioPreload: "metadata",
        videoUrl: "", videoType: "video/mp4", videoWidth: "100%",
        videoPoster: "", videoPreload: "metadata",
        youtubeMode: "lazy",
        youtubeId: "", ratio: "4/3",
        summary: "", accordionType: "ac", details: "",
        accordions: [{summary: "", content: "", alt: false}],
        spoilerBlurText: "",
        faqItems: [{question: "", answer: ""}],
        tocLabel: "جدول المحتويات", tocStyle: "automatic",
        tocManualItems: [{text: "", id: ""}],
        relatedTitle: "قد ترغب في قراءة هذا المنشور:",
        relatedLinks: [{text: "", url: ""}],
        relatedAutoLabel: "منشورات ذات صلة", relatedMax: 6, relatedDataLabel: "",
        relatedSortBy: "updated", relatedRandom: true,
        metaDescription: "", thumbnailUrl: "", subtitle: "",
        markText: "", markClass: "",
        kbdText: "", inlineCode: "",
        listItems: [""], listStyle: "default"
    };
    modweebBlocks.push(defaults);
    modweebSaveToHistory();
}

function modweebAddBlockAndReturn(type){ modweebAddBlock(type); return modweebBlocks[modweebBlocks.length - 1]; }

function updateBlock(id, key, value){
    const b = modweebBlocks.find(x => x.id === id);
    if (b) { b[key] = value; modweebScheduleRender(); }
}

function deleteBlock(id){
    modweebBlocks = modweebBlocks.filter(b => b.id !== id);
    modweebSaveToHistory();
}

function moveBlock(id, dir){
    const i = modweebBlocks.findIndex(b => b.id === id);
    if (dir === "up" && i > 0) { const t = modweebBlocks[i]; modweebBlocks[i] = modweebBlocks[i-1]; modweebBlocks[i-1] = t; modweebSaveToHistory(); }
    else if (dir === "down" && i < modweebBlocks.length - 1) { const t = modweebBlocks[i]; modweebBlocks[i] = modweebBlocks[i+1]; modweebBlocks[i+1] = t; modweebSaveToHistory(); }
}

function modweebSaveToHistory(silent){
    if (silent === undefined) silent = false;
    modweebHistory = modweebHistory.slice(0, modweebHistoryIndex + 1);
    modweebHistory.push(JSON.parse(JSON.stringify(modweebBlocks)));
    modweebHistoryIndex++;
    if (modweebHistory.length > 20) { modweebHistory.shift(); modweebHistoryIndex--; }
    if (!silent) modweebRenderBlocks();
}

function modweebScheduleRender(){ requestAnimationFrame(() => modweebRenderBlocks()); }

function undo(){ if (modweebHistoryIndex > 0) { modweebBlocks = JSON.parse(JSON.stringify(modweebHistory[--modweebHistoryIndex])); modweebRenderBlocks(); modweebShowStatus("تم التراجع"); } }
function redo(){ if (modweebHistoryIndex < modweebHistory.length - 1) { modweebBlocks = JSON.parse(JSON.stringify(modweebHistory[++modweebHistoryIndex])); modweebRenderBlocks(); modweebShowStatus("تم الإعادة"); } }

function saveToLocalStorage(){
    try { localStorage.setItem("modweebGeneratorV2", JSON.stringify({blocks: modweebBlocks, timestamp: Date.now()})); modweebShowStatus("تم الحفظ"); } catch(e){ modweebShowStatus("فشل الحفظ"); }
}

function modweebLoadFromLocalStorage(){
    try {
        const d = localStorage.getItem("modweebGeneratorV2");
        if (d) {
            const parsed = JSON.parse(d);
            if (parsed.blocks) { modweebBlocks = parsed.blocks; modweebSaveToHistory(true); modweebRenderBlocks(); }
        }
    } catch(e){}
}

/* ============================================================
   5. الأكورديون / FAQ / Related / TOC / Lists / Table
   ============================================================ */

/* --- Steps / KeyPoints --- */
function addStep(id){ const b = modweebBlocks.find(x => x.id === id); if (b) { if (!b.steps) b.steps = []; b.steps.push(""); modweebScheduleRender(); } }
function removeStep(id, i){ const b = modweebBlocks.find(x => x.id === id); if (b && b.steps && b.steps.length > 1) { b.steps.splice(i, 1); modweebScheduleRender(); } }
function updateStep(id, i, v){ const b = modweebBlocks.find(x => x.id === id); if (b && b.steps && b.steps[i] !== undefined) { b.steps[i] = v; modweebScheduleRender(); } }

/* --- FAQ --- */
function addFaqItem(id){ const b = modweebBlocks.find(x => x.id === id); if (b) { b.faqItems.push({question: "", answer: ""}); modweebScheduleRender(); } }
function removeFaqItem(id, i){ const b = modweebBlocks.find(x => x.id === id); if (b && b.faqItems && b.faqItems.length > 1) { b.faqItems.splice(i, 1); modweebScheduleRender(); } }
function updateFaqItem(id, i, k, v){ const b = modweebBlocks.find(x => x.id === id); if (b && b.faqItems && b.faqItems[i]) { b.faqItems[i][k] = v; modweebScheduleRender(); } }

/* --- Accordion --- */
function addAccordionItem(id){ const b = modweebBlocks.find(x => x.id === id); if (b) { b.accordions.push({summary: "", content: "", alt: false}); modweebScheduleRender(); } }
function removeAccordionItem(id, i){ const b = modweebBlocks.find(x => x.id === id); if (b && b.accordions && b.accordions.length > 1) { b.accordions.splice(i, 1); modweebScheduleRender(); } }
function updateAccordionItem(id, i, k, v){ const b = modweebBlocks.find(x => x.id === id); if (b && b.accordions && b.accordions[i]) { b.accordions[i][k] = v; modweebScheduleRender(); } }

/* --- Related (Manual) --- */
function addRelatedLink(id){ const b = modweebBlocks.find(x => x.id === id); if (b) { b.relatedLinks.push({text: "", url: ""}); modweebScheduleRender(); } }
function removeRelatedLink(id, i){ const b = modweebBlocks.find(x => x.id === id); if (b && b.relatedLinks && b.relatedLinks.length > 1) { b.relatedLinks.splice(i, 1); modweebScheduleRender(); } }
function updateRelatedLink(id, i, k, v){ const b = modweebBlocks.find(x => x.id === id); if (b && b.relatedLinks && b.relatedLinks[i]) { b.relatedLinks[i][k] = v; modweebScheduleRender(); } }

/* --- TOC (Manual) --- */
function addTocItem(id){ const b = modweebBlocks.find(x => x.id === id); if (b) { if (!Array.isArray(b.tocManualItems)) b.tocManualItems = []; b.tocManualItems.push({text:"", id:""}); modweebScheduleRender(); } }
function removeTocItem(id, i){ const b = modweebBlocks.find(x => x.id === id); if (b && b.tocManualItems && b.tocManualItems.length > 1) { b.tocManualItems.splice(i, 1); modweebScheduleRender(); } }
function updateTocItem(id, i, k, v){ const b = modweebBlocks.find(x => x.id === id); if (b && b.tocManualItems && b.tocManualItems[i]) { b.tocManualItems[i][k] = v; modweebScheduleRender(); } }

/* --- List (ul/ul.s1) --- */
function addListItem(id){ const b = modweebBlocks.find(x => x.id === id); if (b) { if (!Array.isArray(b.listItems)) b.listItems = []; b.listItems.push(""); modweebScheduleRender(); } }
function removeListItem(id, i){ const b = modweebBlocks.find(x => x.id === id); if (b && b.listItems && b.listItems.length > 1) { b.listItems.splice(i, 1); modweebScheduleRender(); } }
function updateListItem(id, i, v){ const b = modweebBlocks.find(x => x.id === id); if (b && b.listItems && b.listItems[i] !== undefined) { b.listItems[i] = v; modweebScheduleRender(); } }

/* --- Table --- */
function modweebUpdateTableData(b){
    const rows = b.tableRows || 2, cols = b.tableCols || 2;
    if (!b.tableData) b.tableData = [];
    while (b.tableData.length < rows) b.tableData.push(Array(cols).fill(""));
    while (b.tableData.length > rows) b.tableData.pop();
    b.tableData.forEach(r => { while (r.length < cols) r.push(""); while (r.length > cols) r.pop(); });
}
function updateTableCell(id, r, c, v){ const b = modweebBlocks.find(x => x.id === id); if (b && b.tableData && b.tableData[r]) { b.tableData[r][c] = v; modweebScheduleRender(); } }

/* ============================================================
   6. Escape HTML + Sanitization
   ============================================================ */
function isPurifyAvailable(){
  return typeof window.DOMPurify !== 'undefined';
}

function modweebEscapeHtml(s){
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function modweebEscapeAttr(s){
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`/g, '&#96;');
}

function modweebEscapeJs(s){
  if (s == null) return '';
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/</g, '\\x3C')
    .replace(/>/g, '\\x3E')
    .replace(/&/g, '\\x26');
}

function modweebSanitizeHtml(html){
  if (!html) return '';
  if (isPurifyAvailable()){
    return window.DOMPurify.sanitize(String(html), {
      ALLOWED_TAGS: [
        'p','div','span','br','hr','section','article',
        'h1','h2','h3','h4','h5','h6',
        'strong','b','em','i','u','s','small','mark','sub','sup',
        'code','pre','kbd','blockquote','q','cite','abbr',
        'ul','ol','li','dl','dt','dd',
        'a','img','figure','figcaption','picture','source',
        'table','thead','tbody','tfoot','tr','th','td','caption','colgroup','col',
        'details','summary','button','input','label',
        'video','audio','iframe'
      ],
      ALLOWED_ATTR: [
        'href','src','alt','title','width','height','class','id','style',
        'target','rel','loading','decoding','srcset','sizes','type',
        'colspan','rowspan','scope','start','reversed','open','role',
        'aria-label','aria-hidden','aria-live','aria-pressed','aria-expanded',
        'data-embed','data-comment','data-source','data-max-posts','data-label',
        'data-max-results','data-sort-by','data-random','data-lines','data-copy',
        'data-highlight','data-syntax','data-before','data-after','data-text',
        'data-tab-active','data-js-tabs','for','hidden','checked',
        'itemprop','itemscope','itemtype','allow','allowfullscreen','frameborder',
        'controls','poster','playsinline','preload'
      ],
      ALLOW_DATA_ATTR: true,
      FORBID_TAGS: ['script','link','meta','base','form','textarea','select','option'],
      FORBID_ATTR: ['onerror','onload','onclick','onmouseover','onfocus','onblur','onchange','onsubmit','onkeydown','onkeyup'],
      ALLOW_UNKNOWN_PROTOCOLS: false
    });
  }
  const t = document.createElement('div');
  t.textContent = String(html);
  return t.innerHTML;
}

/* ============================================================
   6.1 تطبيع وسم "more" القديم إلى <!--more-->
   ============================================================ */
function modweebNormalizeMoreTag(html){
    if (!html) return html;
    let s = String(html);
    s = s.replace(/<a\b[^>]*\b(?:name|id)\s*=\s*['"]more['"][^>]*>[\s\S]*?<\/a>/gi, '<!--more-->');
    s = s.replace(/<a\b[^>]*\b(?:name|id)\s*=\s*['"]more['"][^>]*\/?>/gi, '<!--more-->');
    s = s.replace(/<!--\s*more\s*-->/gi, '<!--more-->');
    s = s.replace(/&lt;!--\s*more\s*--&gt;/gi, '<!--more-->');
    return s;
}

/* ============================================================
   7. Labels + Editor Renderer
   ============================================================ */
function modweebGetBlockLabel(type){
    return ({
        heading: "عنوان", paragraph: "فقرة", image: "صورة", link: "رابط", button: "زر",
        downloadBox: "تحميل", blockquote: "اقتباس", note: "ملاحظة", alert: "تنبيه",
        table: "جدول", steps: "خطوات", code: "كود", codeTabs: "كود متعدد",
        spoiler: "إخفاء", accordion: "أكورديون", accordionGroup: "أكورديون مجمع",
        faq: "أسئلة شائعة", toc: "جدول محتويات", relatedManual: "منشورات يدوية",
        relatedAuto: "منشورات تلقائية", lazyYt: "يوتيوب", basics: "أساسيات",
        mark: "تحديد", kbd: "اختصار", inlineCode: "كود مضمن", keyPoints: "نقاط",
        audioPlayer: "مشغل صوت", videoPlayer: "مشغل فيديو", list: "قائمة"
    })[type] || type;
}

function modweebRenderEditor(b){
    const t = b.id;
    switch(b.type){

        /* ─── Heading ─── */
        case "heading": {
            let h = `<select class="modweeb-gen-select" onchange="updateBlock('${t}','headingLevel',this.value)">
                <option value="h1" ${b.headingLevel==="h1"?"selected":""}>H1</option>
                <option value="h2" ${b.headingLevel==="h2"?"selected":""}>H2</option>
                <option value="h3" ${b.headingLevel==="h3"?"selected":""}>H3</option>
                <option value="h4" ${b.headingLevel==="h4"?"selected":""}>H4</option>
                <option value="h5" ${b.headingLevel==="h5"?"selected":""}>H5</option>
                <option value="h6" ${b.headingLevel==="h6"?"selected":""}>H6</option>
            </select>`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="نص العنوان" value="${modweebEscapeHtml(b.content||"")}" onchange="updateBlock('${t}','content',this.value)">`;
            h += `<p style="font-size:.7rem;color:var(--notifC);margin:2px 0 0">بادئة/لاحقة بصرية (CSS data-*):</p>`;
            h += `<div class="modweeb-flex">
                <input class="modweeb-gen-input" type="text" placeholder="بادئة (★ )" value="${modweebEscapeAttr(b.headingBefore||"")}" onchange="updateBlock('${t}','headingBefore',this.value)">
                <input class="modweeb-gen-input" type="text" placeholder="لاحقة ( ✓)" value="${modweebEscapeAttr(b.headingAfter||"")}" onchange="updateBlock('${t}','headingAfter',this.value)">
            </div>`;
            return h;
        }

        /* ─── Paragraph ─── */
        case "paragraph": {
            let h = `<select class="modweeb-gen-select" onchange="updateBlock('${t}','paragraphStyle',this.value)">
                <option value="normal" ${b.paragraphStyle==="normal"?"selected":""}>عادية</option>
                <option value="indent" ${b.paragraphStyle==="indent"?"selected":""}>مسافة بادئة</option>
                <option value="dropcap" ${b.paragraphStyle==="dropcap"?"selected":""}>حرف استهلالي</option>
                <option value="ref" ${b.paragraphStyle==="ref"?"selected":""}>مرجعية</option>
            </select>`;
            if (b.paragraphStyle === "dropcap") h += `<input class="modweeb-gen-input" type="text" placeholder="الحرف" value="${modweebEscapeAttr(b.dropCapChar||"")}" onchange="updateBlock('${t}','dropCapChar',this.value)">`;
            h += `<textarea class="modweeb-gen-textarea" placeholder="نص الفقرة" onchange="updateBlock('${t}','content',this.value)">${b.content||""}</textarea>`;
            if (b.paragraphStyle === "ref") h += `<input class="modweeb-gen-input" type="text" placeholder="المصدر" value="${modweebEscapeAttr(b.refSource||"")}" onchange="updateBlock('${t}','refSource',this.value)">`;
            return h;
        }

        /* ─── Image ─── */
        case "image": {
            let h = `<select class="modweeb-gen-select" onchange="updateBlock('${t}','imageStyle',this.value)">
                <option value="standard" ${b.imageStyle==="standard"?"selected":""}>قياسية</option>
                <option value="full" ${b.imageStyle==="full"?"selected":""}>كاملة العرض (full)</option>
                <option value="figure" ${b.imageStyle==="figure"?"selected":""}>مع تعليق</option>
                <option value="grid" ${b.imageStyle==="grid"?"selected":""}>شبكة (grImg)</option>
                <option value="scroll" ${b.imageStyle==="scroll"?"selected":""}>تمرير (glImg)</option>
                <option value="lazyload" ${b.imageStyle==="lazyload"?"selected":""}>تحميل كسول</option>
                <option value="showall" ${b.imageStyle==="showall"?"selected":""}>عرض الكل (Show All)</option>
            </select>`;
            h += `<input class="modweeb-gen-input" type="url" placeholder="رابط الصورة" value="${modweebEscapeAttr(b.imageUrl||"")}" onchange="updateBlock('${t}','imageUrl',this.value)">`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="نص بديل (alt)" value="${modweebEscapeAttr(b.imageAlt||"")}" onchange="updateBlock('${t}','imageAlt',this.value)">`;
            if (b.imageStyle === "full") {
                h += `<div class="modweeb-flex">
                    <input class="modweeb-gen-input" type="number" placeholder="العرض" value="${b.imageWidth||"1280"}" onchange="updateBlock('${t}','imageWidth',this.value)">
                    <input class="modweeb-gen-input" type="number" placeholder="الارتفاع" value="${b.imageHeight||"720"}" onchange="updateBlock('${t}','imageHeight',this.value)">
                </div>`;
            }
            if (b.imageStyle === "figure") {
                h += `<select class="modweeb-gen-select" onchange="updateBlock('${t}','imageCaptionStyle',this.value)">
                    <option value="figure" ${b.imageCaptionStyle==="figure"?"selected":""}>figure/figcaption</option>
                    <option value="table" ${b.imageCaptionStyle==="table"?"selected":""}>table.tr-caption</option>
                </select>`;
                h += `<input class="modweeb-gen-input" type="text" placeholder="نص التعليق" value="${modweebEscapeAttr(b.caption||"")}" onchange="updateBlock('${t}','caption',this.value)">`;
            }
            if (["grid", "scroll", "showall"].includes(b.imageStyle)) {
                h += `<textarea class="modweeb-gen-textarea" placeholder="روابط الصور (كل رابط في سطر)" onchange="updateBlock('${t}','gridUrls',this.value)">${b.gridUrls||""}</textarea>`;
            }
            if (b.imageStyle === "scroll") {
                h += `<select class="modweeb-gen-select" onchange="updateBlock('${t}','scrollHeight',this.value)">
                    <option value="h150" ${b.scrollHeight==="h150"?"selected":""}>150px</option>
                    <option value="h200" ${b.scrollHeight==="h200"?"selected":""}>200px</option>
                    <option value="h250" ${b.scrollHeight==="h250"?"selected":""}>250px</option>
                </select>`;
            }
            if (["standard","full","figure","grid","scroll","showall"].includes(b.imageStyle)) {
                h += `<label style="display:flex;align-items:center;gap:6px;font-size:.75rem;margin-top:4px;cursor:pointer">
                    <input type="checkbox" ${b.imageLightbox?"checked":""} onchange="updateBlock('${t}','imageLightbox',this.checked)"> تفعيل Lightbox (zmImg)
                </label>`;
                h += `<label style="display:flex;align-items:center;gap:6px;font-size:.75rem;margin-top:2px;cursor:pointer">
                    <input type="checkbox" ${b.imageDisableCaption?"checked":""} onchange="updateBlock('${t}','imageDisableCaption',this.checked)"> تعطيل نص alt في معاينة Lightbox
                </label>`;
            }
            return h;
        }

        /* ─── Link ─── */
        case "link": {
            let h = `<select class="modweeb-gen-select" onchange="updateBlock('${t}','linkStyle',this.value)">
                <option value="extL" ${b.linkStyle==="extL"?"selected":""}>رابط عادي</option>
                <option value="alt" ${b.linkStyle==="alt"?"selected":""}>نمط alt</option>
                <option value="sec" ${b.linkStyle==="sec"?"selected":""}>نمط sec</option>
                <option value="button" ${b.linkStyle==="button"?"selected":""}>زر</option>
                <option value="buttonLn" ${b.linkStyle==="buttonLn"?"selected":""}>زر خطي</option>
            </select>`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="نص الرابط" value="${modweebEscapeAttr(b.linkText||"")}" onchange="updateBlock('${t}','linkText',this.value)">`;
            h += `<input class="modweeb-gen-input" type="url" placeholder="الرابط" value="${modweebEscapeAttr(b.linkUrl||"")}" onchange="updateBlock('${t}','linkUrl',this.value)">`;
            return h;
        }

        /* ─── Button ─── */
        case "button": {
            let h = `<input class="modweeb-gen-input" type="text" placeholder="نص الزر" value="${modweebEscapeAttr(b.buttonText||"")}" onchange="updateBlock('${t}','buttonText',this.value)">`;
            h += `<input class="modweeb-gen-input" type="url" placeholder="الرابط" value="${modweebEscapeAttr(b.buttonUrl||"")}" onchange="updateBlock('${t}','buttonUrl',this.value)">`;
            h += `<select class="modweeb-gen-select" onchange="updateBlock('${t}','buttonIcon',this.value)">
                <option value="" ${!b.buttonIcon?"selected":""}>بدون أيقونة</option>
                <option value="dl" ${b.buttonIcon==="dl"?"selected":""}>تحميل (dl)</option>
                <option value="demo" ${b.buttonIcon==="demo"?"selected":""}>عرض (demo)</option>
            </select>`;
            h += `<label style="display:flex;align-items:center;gap:6px;font-size:.75rem;margin-top:4px;cursor:pointer">
                <input type="checkbox" ${b.buttonOutlined?"checked":""} onchange="updateBlock('${t}','buttonOutlined',this.checked)"> زر خطي (button ln)
            </label>`;
            return h;
        }

        /* ─── Download Box ─── */
        case "downloadBox": {
            let h = `<input class="modweeb-gen-input" type="text" placeholder="اسم الملف" value="${modweebEscapeAttr(b.fileName||"")}" onchange="updateBlock('${t}','fileName',this.value)">`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="الحجم" value="${modweebEscapeAttr(b.fileSize||"")}" onchange="updateBlock('${t}','fileSize',this.value)">`;
            h += `<input class="modweeb-gen-input" type="url" placeholder="رابط التحميل" value="${modweebEscapeAttr(b.downloadFile||"")}" onchange="updateBlock('${t}','downloadFile',this.value)">`;
            return h;
        }

        /* ─── Blockquote ─── */
        case "blockquote": {
            let h = `<select class="modweeb-gen-select" onchange="updateBlock('${t}','quoteStyle',this.value)">
                <option value="normal" ${b.quoteStyle==="normal"?"selected":""}>قياسي</option>
                <option value="s1" ${b.quoteStyle==="s1"?"selected":""}>نمط 1</option>
                <option value="s2" ${b.quoteStyle==="s2"?"selected":""}>نمط 2</option>
            </select>`;
            h += `<textarea class="modweeb-gen-textarea" placeholder="نص الاقتباس" onchange="updateBlock('${t}','content',this.value)">${b.content||""}</textarea>`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="الكاتب" value="${modweebEscapeAttr(b.quoteAuthor||"")}" onchange="updateBlock('${t}','quoteAuthor',this.value)">`;
            return h;
        }

        /* ─── Note ─── */
        case "note": {
            let h = `<select class="modweeb-gen-select" onchange="updateBlock('${t}','noteStyle',this.value)">
                <option value="info" ${b.noteStyle==="info"?"selected":""}>معلومات</option>
                <option value="warning" ${b.noteStyle==="warning"?"selected":""}>تحذير</option>
                <option value="question" ${b.noteStyle==="question"?"selected":""}>سؤال (qs)</option>
            </select>`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="${b.noteStyle==='warning'?'Warning!':b.noteStyle==='question'?'Did you know?':'Info!'}" value="${modweebEscapeAttr(b.noteTitle||'')}" onchange="updateBlock('${t}','noteTitle',this.value)">`;
            h += `<textarea class="modweeb-gen-textarea" placeholder="نص الملاحظة" onchange="updateBlock('${t}','content',this.value)">${b.content||""}</textarea>`;
            return h;
        }

        /* ─── Alert ─── */
        case "alert": {
            let h = `<select class="modweeb-gen-select" onchange="updateBlock('${t}','alertStyle',this.value)">
                <option value="info" ${b.alertStyle==="info"?"selected":""}>معلومات</option>
                <option value="warning" ${b.alertStyle==="warning"?"selected":""}>تحذير</option>
                <option value="success" ${b.alertStyle==="success"?"selected":""}>نجاح</option>
                <option value="error" ${b.alertStyle==="error"?"selected":""}>خطأ</option>
                <option value="tip" ${b.alertStyle==="tip"?"selected":""}>نصيحة (tip)</option>
                <option value="question" ${b.alertStyle==="question"?"selected":""}>سؤال (question)</option>
            </select>`;
            h += `<label style="display:flex;align-items:center;gap:6px;font-size:.75rem;margin-top:4px;cursor:pointer">
                <input type="checkbox" ${b.alertOutlined?"checked":""} onchange="updateBlock('${t}','alertOutlined',this.checked)"> نمط Outline (مخطط)
            </label>`;
            const alertTitles = {info:'Info!',warning:'Warning!',success:'Success!',error:'Error!',tip:'Tip!',question:'Question'};
            h += `<input class="modweeb-gen-input" type="text" placeholder="${alertTitles[b.alertStyle||'info']||'Info!'}" value="${modweebEscapeAttr(b.alertTitle||'')}" onchange="updateBlock('${t}','alertTitle',this.value)">`;
            h += `<textarea class="modweeb-gen-textarea" placeholder="نص التنبيه" onchange="updateBlock('${t}','content',this.value)">${b.content||""}</textarea>`;
            return h;
        }

        /* ─── Table ─── */
        case "table": {
            modweebUpdateTableData(b);
            let h = `<div class="modweeb-flex">
                <input class="modweeb-gen-input" type="number" min="1" max="10" value="${b.tableRows}" onchange="updateBlock('${t}','tableRows',parseInt(this.value)||2);modweebScheduleRender();" placeholder="صفوف">
                <input class="modweeb-gen-input" type="number" min="1" max="10" value="${b.tableCols}" onchange="updateBlock('${t}','tableCols',parseInt(this.value)||2);modweebScheduleRender();" placeholder="أعمدة">
            </div>`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="كلاسات الجدول" value="${modweebEscapeAttr(b.tableClasses||"")}" onchange="updateBlock('${t}','tableClasses',this.value)">`;
            h += `<p style="font-size:.68rem;color:var(--notifC);margin:2px 0 6px;line-height:1.5">خيارات: bordered, noborder, cborder, stripped, hovered, sticky, vab, full, mh100/mhvh/mh200/mh300, sp5/sp10/sp20, primary/warning/success/error/clr/clb</p>`;
            h += `<div style="display:grid;grid-template-columns:repeat(${b.tableCols},1fr);gap:2px;">`;
            for (let r = 0; r < b.tableRows; r++)
                for (let c = 0; c < b.tableCols; c++)
                    h += `<input class="modweeb-gen-input" type="text" value="${modweebEscapeAttr(b.tableData[r]&&b.tableData[r][c]||"")}" onchange="updateTableCell('${t}',${r},${c},this.value)" placeholder="خلية ${r+1}-${c+1}">`;
            h += `</div>`;
            return h;
        }

        /* ─── Steps ─── */
        case "steps": {
            if (!b.steps) b.steps = [""];
            let h = `<div class="modweeb-list-items">`;
            for (let i = 0; i < b.steps.length; i++) {
                h += `<div class="modweeb-flex">
                    <input class="modweeb-gen-input" type="text" value="${modweebEscapeAttr(b.steps[i]||"")}" onchange="updateStep('${t}',${i},this.value)" placeholder="الخطوة ${i+1}">`;
                if (b.steps.length > 1)
                    h += `<button class="modweeb-gen-btn icon-only sm danger" onclick="removeStep('${t}',${i})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>`;
                h += `</div>`;
            }
            h += `</div>`;
            h += `<button class="modweeb-gen-btn secondary sm" onclick="addStep('${t}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14"/></svg>إضافة خطوة</button>`;
            return h;
        }

        /* ─── List (ul / ul.s1) ─── */
        case "list": {
            if (!Array.isArray(b.listItems)) b.listItems = [""];
            let h = `<select class="modweeb-gen-select" onchange="updateBlock('${t}','listStyle',this.value)">
                <option value="default" ${b.listStyle==="default"?"selected":""}>قائمة قياسية (ul)</option>
                <option value="s1" ${b.listStyle==="s1"?"selected":""}>نمط s1</option>
            </select>`;
            h += `<div class="modweeb-list-items">`;
            for (let i = 0; i < b.listItems.length; i++) {
                h += `<div class="modweeb-flex">
                    <input class="modweeb-gen-input" type="text" value="${modweebEscapeAttr(b.listItems[i]||"")}" onchange="updateListItem('${t}',${i},this.value)" placeholder="العنصر ${i+1}">`;
                if (b.listItems.length > 1)
                    h += `<button class="modweeb-gen-btn icon-only sm danger" onclick="removeListItem('${t}',${i})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>`;
                h += `</div>`;
            }
            h += `</div>`;
            h += `<button class="modweeb-gen-btn secondary sm" onclick="addListItem('${t}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14"/></svg>إضافة عنصر</button>`;
            return h;
        }

        /* ─── FAQ ─── */
        case "faq": {
            if (!b.faqItems) b.faqItems = [{question: "", answer: ""}];
            let h = `<div class="modweeb-list-items">`;
            for (let i = 0; i < b.faqItems.length; i++) {
                const it = b.faqItems[i];
                h += `<div style="border:1px dashed var(--contentL);padding:.5rem;margin-bottom:.5rem;">`;
                h += `<input class="modweeb-gen-input" type="text" placeholder="السؤال" value="${modweebEscapeAttr(it.question||"")}" onchange="updateFaqItem('${t}',${i},'question',this.value)">`;
                h += `<textarea class="modweeb-gen-textarea" placeholder="الإجابة" onchange="updateFaqItem('${t}',${i},'answer',this.value)">${it.answer||""}</textarea>`;
                if (b.faqItems.length > 1)
                    h += `<button class="modweeb-gen-btn icon-only sm danger" onclick="removeFaqItem('${t}',${i})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>`;
                h += `</div>`;
            }
            h += `</div><button class="modweeb-gen-btn secondary sm" onclick="addFaqItem('${t}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14"/></svg>إضافة سؤال</button>`;
            return h;
        }

        /* ─── Code (single) ─── */
        case "code": {
            let h = `<select class="modweeb-gen-select" onchange="updateBlock('${t}','codeLanguage',this.value)">
                <option value="html" ${b.codeLanguage==="html"?"selected":""}>HTML</option>
                <option value="css" ${b.codeLanguage==="css"?"selected":""}>CSS</option>
                <option value="js" ${b.codeLanguage==="js"?"selected":""}>JS</option>
                <option value="json" ${b.codeLanguage==="json"?"selected":""}>JSON</option>
            </select>`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="data-comment (مثال: .html)" value="${modweebEscapeAttr(b.codeComment||"")}" onchange="updateBlock('${t}','codeComment',this.value)">`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="data-source (مثال: src/index.html)" value="${modweebEscapeAttr(b.codeSource||"")}" onchange="updateBlock('${t}','codeSource',this.value)">`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="data-lines (مثال: 2,4)" value="${modweebEscapeAttr(b.codeLines||"")}" onchange="updateBlock('${t}','codeLines',this.value)">`;
            h += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:4px">`;
            h += `<label style="font-size:.7rem;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" ${b.codeCopy!==false?"checked":""} onchange="updateBlock('${t}','codeCopy',this.checked)"> نسخ</label>`;
            h += `<label style="font-size:.7rem;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" ${b.codeHighlight!==false?"checked":""} onchange="updateBlock('${t}','codeHighlight',this.checked)"> تلوين</label>`;
            h += `<label style="font-size:.7rem;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" ${b.codeSyntax!==false?"checked":""} onchange="updateBlock('${t}','codeSyntax',this.checked)"> Syntax</label>`;
            h += `</div>`;
            h += `<textarea class="modweeb-gen-textarea" placeholder="الكود (سيتم escaping تلقائياً)" onchange="updateBlock('${t}','codeContent',this.value)">${b.codeContent||""}</textarea>`;
            return h;
        }

        /* ─── CodeTabs (multi-tabs) ─── */
        case "codeTabs": {
            let h = `<p style="font-size:.72rem;color:var(--notifC);margin:0">تبويبات متعددة (HTML / CSS / JS / JSON)</p>`;
            h += `<p style="font-size:.68rem;color:var(--linkC);margin:4px 0 0;font-weight:600">HTML</p>`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="HTML source" value="${modweebEscapeAttr(b.tabHtmlSource||'src/index.html')}" onchange="updateBlock('${t}','tabHtmlSource',this.value)">`;
            h += `<textarea class="modweeb-gen-textarea" placeholder="HTML code" onchange="updateBlock('${t}','tabHtml',this.value)">${b.tabHtml||''}</textarea>`;
            h += `<p style="font-size:.68rem;color:var(--linkC);margin:4px 0 0;font-weight:600">CSS</p>`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="CSS source" value="${modweebEscapeAttr(b.tabCssSource||'src/style.css')}" onchange="updateBlock('${t}','tabCssSource',this.value)">`;
            h += `<textarea class="modweeb-gen-textarea" placeholder="CSS code" onchange="updateBlock('${t}','tabCss',this.value)">${b.tabCss||''}</textarea>`;
            h += `<p style="font-size:.68rem;color:var(--linkC);margin:4px 0 0;font-weight:600">JS</p>`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="JS source" value="${modweebEscapeAttr(b.tabJsSource||'src/main.js')}" onchange="updateBlock('${t}','tabJsSource',this.value)">`;
            h += `<textarea class="modweeb-gen-textarea" placeholder="JS code" onchange="updateBlock('${t}','tabJs',this.value)">${b.tabJs||''}</textarea>`;
            h += `<p style="font-size:.68rem;color:var(--linkC);margin:4px 0 0;font-weight:600">JSON</p>`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="JSON source" value="${modweebEscapeAttr(b.tabJsonSource||'src/rules.json')}" onchange="updateBlock('${t}','tabJsonSource',this.value)">`;
            h += `<textarea class="modweeb-gen-textarea" placeholder="JSON code" onchange="updateBlock('${t}','tabJson',this.value)">${b.tabJson||''}</textarea>`;
            return h;
        }

        /* ─── Accordion / Spoiler / Group / Blur ─── */
        case "accordion":
        case "spoiler":
        case "accordionGroup": {
            if (!b.accordionType) b.accordionType = "ac";
            if (!b.accordions) b.accordions = [{summary: "", content: "", alt: false}];
            let h = `<select class="modweeb-gen-select" onchange="updateBlock('${t}','accordionType',this.value);modweebScheduleRender();">
                <option value="sp" ${b.accordionType==="sp"?"selected":""}>Spoiler (details.sp)</option>
                <option value="ac" ${b.accordionType==="ac"?"selected":""}>Accordion</option>
                <option value="ac alt" ${b.accordionType==="ac alt"?"selected":""}>Accordion Alt</option>
                <option value="group" ${b.accordionType==="group"?"selected":""}>مجمع (showH)</option>
                <option value="blur" ${b.accordionType==="blur"?"selected":""}>Blur Text Spoiler (span.spoiler)</option>
            </select>`;
            if (b.accordionType === "blur") {
                h += `<input class="modweeb-gen-input" type="text" placeholder="النص المخفي (Blur)" value="${modweebEscapeAttr(b.spoilerBlurText||"")}" onchange="updateBlock('${t}','spoilerBlurText',this.value)">`;
                return h;
            }
            if (b.accordionType === "group") {
                h += `<div class="modweeb-list-items">`;
                for (let i = 0; i < b.accordions.length; i++) {
                    const it = b.accordions[i];
                    h += `<div style="border:1px dashed var(--contentL);padding:.5rem;margin-bottom:.5rem;">`;
                    h += `<input class="modweeb-gen-input" type="text" placeholder="العنوان" value="${modweebEscapeAttr(it.summary||"")}" onchange="updateAccordionItem('${t}',${i},'summary',this.value)">`;
                    h += `<textarea class="modweeb-gen-textarea" placeholder="المحتوى" onchange="updateAccordionItem('${t}',${i},'content',this.value)">${it.content||""}</textarea>`;
                    h += `<label style="font-size:.7rem;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" ${it.alt?"checked":""} onchange="updateAccordionItem('${t}',${i},'alt',this.checked)"> نمط alt</label>`;
                    if (b.accordions.length > 1)
                        h += `<button class="modweeb-gen-btn icon-only sm danger" onclick="removeAccordionItem('${t}',${i})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>`;
                    h += `</div>`;
                }
                h += `</div><button class="modweeb-gen-btn secondary sm" onclick="addAccordionItem('${t}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14"/></svg>إضافة عنصر</button>`;
            } else {
                h += `<input class="modweeb-gen-input" type="text" placeholder="العنوان" value="${modweebEscapeAttr(b.summary||"")}" onchange="updateBlock('${t}','summary',this.value)">`;
                h += `<textarea class="modweeb-gen-textarea" placeholder="المحتوى" onchange="updateBlock('${t}','content',this.value)">${b.content||""}</textarea>`;
            }
            return h;
        }

        /* ─── TOC ─── */
        case "toc": {
            let h = `<select class="modweeb-gen-select" onchange="updateBlock('${t}','tocStyle',this.value);modweebScheduleRender();">
                <option value="automatic" ${b.tocStyle==="automatic"?"selected":""}>تلقائي (aToc)</option>
                <option value="manual" ${b.tocStyle==="manual"?"selected":""}>يدوي</option>
            </select>`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="العنوان" value="${modweebEscapeAttr(b.tocLabel||"جدول المحتويات")}" onchange="updateBlock('${t}','tocLabel',this.value)">`;
            if (b.tocStyle === 'manual') {
                if (!Array.isArray(b.tocManualItems)) b.tocManualItems = [{text:"", id:""}];
                h += `<div class="modweeb-list-items">`;
                for (let i = 0; i < b.tocManualItems.length; i++) {
                    const it = b.tocManualItems[i];
                    h += `<div class="modweeb-flex">
                        <input class="modweeb-gen-input" type="text" placeholder="نص الرابط" value="${modweebEscapeAttr(it.text||"")}" onchange="updateTocItem('${t}',${i},'text',this.value)">
                        <input class="modweeb-gen-input" type="text" placeholder="ID (#section)" value="${modweebEscapeAttr(it.id||"")}" onchange="updateTocItem('${t}',${i},'id',this.value)">`;
                    if (b.tocManualItems.length > 1)
                        h += `<button class="modweeb-gen-btn icon-only sm danger" onclick="removeTocItem('${t}',${i})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>`;
                    h += `</div>`;
                }
                h += `</div><button class="modweeb-gen-btn secondary sm" onclick="addTocItem('${t}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14"/></svg>إضافة رابط</button>`;
            }
            return h;
        }

        /* ─── Related Manual ─── */
        case "relatedManual": {
            if (!b.relatedLinks) b.relatedLinks = [{text: "", url: ""}];
            let h = `<input class="modweeb-gen-input" type="text" placeholder="العنوان" value="${modweebEscapeAttr(b.relatedTitle||"قد ترغب في قراءة هذا المنشور:")}" onchange="updateBlock('${t}','relatedTitle',this.value)">`;
            h += `<div class="modweeb-list-items">`;
            for (let i = 0; i < b.relatedLinks.length; i++) {
                const it = b.relatedLinks[i];
                h += `<div style="border:1px dashed var(--contentL);padding:.5rem;margin-bottom:.5rem;">`;
                h += `<input class="modweeb-gen-input" type="text" placeholder="نص الرابط" value="${modweebEscapeAttr(it.text||"")}" onchange="updateRelatedLink('${t}',${i},'text',this.value)">`;
                h += `<input class="modweeb-gen-input" type="url" placeholder="الرابط" value="${modweebEscapeAttr(it.url||"")}" onchange="updateRelatedLink('${t}',${i},'url',this.value)">`;
                if (b.relatedLinks.length > 1)
                    h += `<button class="modweeb-gen-btn icon-only sm danger" onclick="removeRelatedLink('${t}',${i})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>`;
                h += `</div>`;
            }
            h += `</div><button class="modweeb-gen-btn secondary sm" onclick="addRelatedLink('${t}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14"/></svg>إضافة رابط</button>`;
            return h;
        }

        /* ─── Related Auto ─── */
        case "relatedAuto": {
            let h = `<input class="modweeb-gen-input" type="text" placeholder="العنوان" value="${modweebEscapeAttr(b.relatedAutoLabel||"منشورات ذات صلة")}" onchange="updateBlock('${t}','relatedAutoLabel',this.value)">`;
            h += `<input class="modweeb-gen-input" type="number" placeholder="الحد الأقصى (data-max-results)" value="${b.relatedMax||6}" onchange="updateBlock('${t}','relatedMax',parseInt(this.value)||6)">`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="data-label (تصنيف)" value="${modweebEscapeAttr(b.relatedDataLabel||"")}" onchange="updateBlock('${t}','relatedDataLabel',this.value)">`;
            h += `<select class="modweeb-gen-select" onchange="updateBlock('${t}','relatedSortBy',this.value)">
                <option value="updated" ${b.relatedSortBy==="updated"?"selected":""}>data-sort-by: updated</option>
                <option value="published" ${b.relatedSortBy==="published"?"selected":""}>data-sort-by: published</option>
            </select>`;
            h += `<label style="display:flex;align-items:center;gap:6px;font-size:.75rem;margin-top:4px;cursor:pointer">
                <input type="checkbox" ${b.relatedRandom?"checked":""} onchange="updateBlock('${t}','relatedRandom',this.checked)"> data-random (عشوائي)
            </label>`;
            return h;
        }

        /* ─── Lazy YouTube (lazy / defer) ─── */
        case "lazyYt": {
            let h = `<select class="modweeb-gen-select" onchange="updateBlock('${t}','youtubeMode',this.value)">
                <option value="lazy" ${b.youtubeMode==="lazy"?"selected":""}>Lazy (صورة مصغرة)</option>
                <option value="defer" ${b.youtubeMode==="defer"?"selected":""}>Defer (iframe مؤجل)</option>
            </select>`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="معرف الفيديو (video_id)" value="${modweebEscapeAttr(b.youtubeId||"")}" onchange="updateBlock('${t}','youtubeId',this.value)">`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="النسبة (4/3 أو 16/9)" value="${modweebEscapeAttr(b.ratio||"4/3")}" onchange="updateBlock('${t}','ratio',this.value)">`;
            return h;
        }

        /* ─── Audio Player ─── */
        case "audioPlayer": {
            let h = `<input class="modweeb-gen-input" type="url" placeholder="رابط ملف الصوت (MP3)" dir="ltr" value="${modweebEscapeAttr(b.audioUrl||"")}" onchange="updateBlock('${t}','audioUrl',this.value)">`;
            h += `<select class="modweeb-gen-select" onchange="updateBlock('${t}','audioPreload',this.value)">
                <option value="metadata" ${b.audioPreload==="metadata"?"selected":""}>preload: metadata (موصى به)</option>
                <option value="none" ${b.audioPreload==="none"?"selected":""}>preload: none</option>
                <option value="auto" ${b.audioPreload==="auto"?"selected":""}>preload: auto</option>
            </select>`;
            return h;
        }

        /* ─── Video Player ─── */
        case "videoPlayer": {
            let h = `<input class="modweeb-gen-input" type="url" placeholder="رابط الفيديو (MP4)" dir="ltr" value="${modweebEscapeAttr(b.videoUrl||"")}" onchange="updateBlock('${t}','videoUrl',this.value)">`;
            h += `<input class="modweeb-gen-input" type="url" placeholder="رابط Poster (اختياري)" dir="ltr" value="${modweebEscapeAttr(b.videoPoster||"")}" onchange="updateBlock('${t}','videoPoster',this.value)">`;
            h += `<select class="modweeb-gen-select" onchange="updateBlock('${t}','videoPreload',this.value)">
                <option value="metadata" ${b.videoPreload==="metadata"?"selected":""}>preload: metadata</option>
                <option value="none" ${b.videoPreload==="none"?"selected":""}>preload: none</option>
                <option value="auto" ${b.videoPreload==="auto"?"selected":""}>preload: auto</option>
            </select>`;
            return h;
        }

        /* ─── Basics ─── */
        case "basics":
            return `<p class="note" style="font-size:.75rem;color:var(--notifC)">وصف مقتطف المقال (Post Snippet)</p>
                <textarea class="modweeb-gen-textarea" placeholder="الوصف" onchange="updateBlock('${t}','metaDescription',this.value)">${b.metaDescription||""}</textarea>
                <p class="note" style="font-size:.75rem;color:var(--notifC);margin-top:6px">رابط الصورة المصغرة (اتركه فارغاً لاستخدام الافتراضية)</p>
                <input class="modweeb-gen-input" type="url" placeholder="https://..." dir="ltr" value="${modweebEscapeAttr(b.thumbnailUrl||"")}" onchange="updateBlock('${t}','thumbnailUrl',this.value)">
                <button class="modweeb-gen-btn secondary sm" style="margin-top:4px" onclick="modweebUploadThumbnail('${t}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    رفع صورة
                </button>
                <p class="note" style="font-size:.75rem;color:var(--notifC);margin-top:6px">العنوان الفرعي (Header Subtitle)</p>
                <input class="modweeb-gen-input" type="text" placeholder="العنوان الفرعي" value="${modweebEscapeAttr(b.subtitle||"")}" onchange="updateBlock('${t}','subtitle',this.value)">`;

        /* ─── Mark (highlight) ─── */
        case "mark": {
            let h = `<select class="modweeb-gen-select" onchange="updateBlock('${t}','markClass',this.value)">
                <option value="" ${!b.markClass?"selected":""}>عادي (أصفر)</option>
                <option value="block" ${b.markClass==="block"?"selected":""}>كتلة (block)</option>
                <option value="red" ${b.markClass==="red"?"selected":""}>أحمر (red)</option>
                <option value="gray" ${b.markClass==="gray"?"selected":""}>رمادي (gray)</option>
                <option value="orange" ${b.markClass==="orange"?"selected":""}>برتقالي (orange)</option>
                <option value="blue" ${b.markClass==="blue"?"selected":""}>أزرق (blue)</option>
                <option value="green" ${b.markClass==="green"?"selected":""}>أخضر (green)</option>
                <option value="gold" ${b.markClass==="gold"?"selected":""}>ذهبي (gold)</option>
                <option value="purple" ${b.markClass==="purple"?"selected":""}>بنفسجي (purple)</option>
            </select>`;
            h += `<input class="modweeb-gen-input" type="text" placeholder="النص" value="${modweebEscapeAttr(b.markText||"")}" onchange="updateBlock('${t}','markText',this.value)">`;
            return h;
        }

        /* ─── Kbd ─── */
        case "kbd":
            return `<input class="modweeb-gen-input" type="text" placeholder="اختصار لوحة المفاتيح (مثال: Ctrl+A)" value="${modweebEscapeAttr(b.kbdText||"")}" onchange="updateBlock('${t}','kbdText',this.value)">`;

        /* ─── Inline Code ─── */
        case "inlineCode":
            return `<input class="modweeb-gen-input" type="text" placeholder="الكود المضمن" value="${modweebEscapeAttr(b.inlineCode||"")}" onchange="updateBlock('${t}','inlineCode',this.value)">`;

        /* ─── KeyPoints ─── */
        case "keyPoints": {
            if (!b.steps) b.steps = [""];
            let h = `<p style="font-size:.75rem;color:var(--notifC);margin:0 0 8px">كل سطر = نقطة تظهر في المقال</p><div class="modweeb-list-items">`;
            for (let i = 0; i < b.steps.length; i++) {
                h += `<div class="modweeb-flex">
                    <input class="modweeb-gen-input" type="text" value="${modweebEscapeAttr(b.steps[i]||"")}" onchange="updateStep('${t}',${i},this.value)" placeholder="النقطة ${i+1}">`;
                if (b.steps.length > 1)
                    h += `<button class="modweeb-gen-btn icon-only sm danger" onclick="removeStep('${t}',${i})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>`;
                h += `</div>`;
            }
            h += `</div><button class="modweeb-gen-btn secondary sm" style="margin-top:6px" onclick="addStep('${t}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14"/></svg> إضافة نقطة</button>`;
            return h;
        }

        default: return "";
    }
}

/* ============================================================
   8. Render Preview HTML for each block
   ============================================================ */
function modweebRenderPreviewItem(b){
    if (!b) return "";
    if (b.content) b.content = modweebNormalizeMoreTag(b.content);

    switch(b.type){

        /* ─── Heading (h1-h6 + data-before/after) ─── */
        case "heading": {
            const tag = b.headingLevel || "h2";
            const before = b.headingBefore ? ` data-before="${modweebEscapeAttr(b.headingBefore)}"` : '';
            const after  = b.headingAfter  ? ` data-after="${modweebEscapeAttr(b.headingAfter)}"`  : '';
            return `<${tag}${before}${after}>${modweebEscapeHtml(b.content||"")}</${tag}>`;
        }

        /* ─── Paragraph (normal / indent / dropcap / ref) ─── */
        case "paragraph": {
            const _p = modweebNormalizeMoreTag(b.content||"");
            if (b.paragraphStyle === "indent") return `<p class="pIndent">${_p}</p>`;
            if (b.paragraphStyle === "dropcap") {
                const cap = b.dropCapChar || _p.charAt(0) || "T";
                const rest = b.dropCapChar ? _p : _p.slice(1);
                return `<p><span class="dropCap">${modweebEscapeHtml(cap)}</span>${rest}</p>`;
            }
            if (b.paragraphStyle === "ref") {
                return `<p class="pRef">${_p || "Source:"}<br>${b.refSource||"www.example.com"}</p>`;
            }
            const trimmed = _p.trimStart();
            if (/^(<img|<div|<p[\s>]|<figure|<details|<table|<ul|<ol|<blockquote|<!--|<pre|<hr|<h[1-6]|<audio|<video|<iframe|<span)/.test(trimmed)) return trimmed;
            return `<p>${_p}</p>`;
        }

        /* ─── Mark (highlight) — BUG FIXED ─── */
        case "mark": {
            if (!b.markText) return "";
            const cls = b.markClass ? ` class="${modweebEscapeAttr(b.markClass)}"` : '';
            return `<mark${cls}>${b.markText}</mark>`;
        }

        /* ─── Image (all styles + lightbox) ─── */
        case "image": {
            const wrapLightbox = (imgHtml, altText) => {
                if (!b.imageLightbox) return imgHtml;
                const safeAlt = modweebEscapeAttr(altText || '');
                return `<div class="zmImg" data-text="${safeAlt}">${imgHtml}</div>`;
            };
            const lightboxAttr = b.imageLightbox ? '' : ' data-lightbox="false"';
            const captionAttr = b.imageDisableCaption ? ' data-caption="false"' : '';
            const commonAttrs = `alt="${modweebEscapeAttr(b.imageAlt||"")}" width="${b.imageWidth||1280}" height="${b.imageHeight||720}" loading="lazy"${lightboxAttr}${captionAttr}`;

            if (b.imageStyle === "full") {
                return wrapLightbox(`<img class="full" ${commonAttrs} src="${modweebEscapeAttr(b.imageUrl||"#")}">`, b.imageAlt);
            }
            if (b.imageStyle === "figure") {
                const style = b.imageCaptionStyle || 'figure';
                if (style === 'table') {
                    return `<table class="tr-caption-container"><tbody><tr><td>${wrapLightbox(`<img ${commonAttrs} src="${modweebEscapeAttr(b.imageUrl||"#")}">`, b.imageAlt)}</td></tr><tr><td class="tr-caption">${b.caption||""}</td></tr></tbody></table>`;
                }
                return `<figure>${wrapLightbox(`<img ${commonAttrs} src="${modweebEscapeAttr(b.imageUrl||"#")}">`, b.imageAlt)}<figcaption>${b.caption||""}</figcaption></figure>`;
            }
            if (b.imageStyle === "grid") {
                const urls = (b.gridUrls||"").split("\n").filter(x => x.trim());
                if (!urls.length) urls.push(b.imageUrl||"#");
                return `<div class="psImg grImg">${urls.map(u => wrapLightbox(`<img alt="${modweebEscapeAttr(b.imageAlt||"")}" height="720" loading="lazy" src="${modweebEscapeAttr(u)}" width="1280">`, b.imageAlt)).join("")}</div>`;
            }
            if (b.imageStyle === "scroll") {
                const urls = (b.gridUrls||"").split("\n").filter(x => x.trim());
                if (!urls.length) urls.push(b.imageUrl||"#");
                return `<div class="glImg ${b.scrollHeight||"h150"}">${urls.map(u => wrapLightbox(`<img alt="${modweebEscapeAttr(b.imageAlt||"")}" height="720" loading="lazy" src="${modweebEscapeAttr(u)}" width="1280">`, b.imageAlt)).join("")}</div>`;
            }
            if (b.imageStyle === "lazyload") {
                return `<img class="lazyload" alt="${modweebEscapeAttr(b.imageAlt||"")}" data-src="${modweebEscapeAttr(b.imageUrl||"#")}" src="data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=">`;
            }
            if (b.imageStyle === "showall") {
                const urls = (b.gridUrls||"").split("\n").filter(x => x.trim());
                if (!urls.length) urls.push(b.imageUrl||"#");
                const id = "hideImg" + b.id.replace(/[^a-z0-9]/gi, "");
                const wrapAll = (html) => b.imageLightbox ? `<div class="zmImg" data-text="${modweebEscapeAttr(b.imageAlt||'')}">${html}</div>` : html;
                const visible = urls.slice(0, 3);
                const btnImg  = urls[3] || urls[0];
                const hidden  = urls.slice(3).length ? urls.slice(3) : urls;
                return `<input class="inImg hidden" id="${id}" type="checkbox"><div class="psImg hdImg">${visible.map(u => wrapAll(`<img alt="${modweebEscapeAttr(b.imageAlt||"")}" height="720" loading="lazy" src="${modweebEscapeAttr(u)}" width="1280">`)).join("")}<div class="btImg">${wrapAll(`<img alt="${modweebEscapeAttr(b.imageAlt||"")}" height="720" loading="lazy" src="${modweebEscapeAttr(btnImg)}" width="1280">`)}<label for="${id}" aria-label="Show all image">Show All</label></div><div class="psImg shImg">${hidden.map(u => wrapAll(`<img alt="${modweebEscapeAttr(b.imageAlt||"")}" height="720" loading="lazy" src="${modweebEscapeAttr(u)}" width="1280">`)).join("")}</div></div>`;
            }
            return wrapLightbox(`<img ${commonAttrs} src="${modweebEscapeAttr(b.imageUrl||"#")}">`, b.imageAlt);
        }

        /* ─── Link (extL / extL.alt / extL.sec / button / button.ln) ─── */
        case "link": {
            const url = modweebEscapeAttr(b.linkUrl||"#");
            const txt = b.linkText||"رابط";
            if (b.linkStyle === "button") return `<a class="button" href="${url}" target="_blank" rel="noopener">${txt}</a>`;
            if (b.linkStyle === "buttonLn") return `<a class="button ln" href="${url}" target="_blank" rel="noopener">${txt}</a>`;
            let cls = "extL";
            if (b.linkStyle === "alt") cls += " alt";
            if (b.linkStyle === "sec") cls += " sec";
            return `<a class="${cls}" href="${url}" rel="nofollow noreferrer noopener" target="_blank">${txt}</a>`;
        }

        /* ─── Button (basic / ln / with icon) ─── */
        case "button": {
            const ic = b.buttonIcon ? `<i class="icon ${b.buttonIcon}"></i>` : "";
            const cls = "button" + (b.buttonOutlined ? " ln" : "");
            return `<a class="${cls}" href="${modweebEscapeAttr(b.buttonUrl||"#")}" target="_blank" rel="noopener">${ic}${b.buttonText||"زر"}</a>`;
        }

        /* ─── Download Box ─── */
        case "downloadBox": {
            const fname = b.fileName || "file.zip";
            const ext = fname.split(".").pop();
            return `<div class="dlBox"><span class="fT" data-text="${modweebEscapeAttr(ext)}"></span><div class="fN"><span>${fname}</span><span class="fS">${b.fileSize||"0B"}</span></div><a class="button" href="${modweebEscapeAttr(b.downloadFile||"#")}" rel="nofollow noreferrer noopener" target="_blank" aria-label="Download"><i class="icon dl"></i></a></div>`;
        }

        /* ─── Blockquote (normal / s1 / s2) ─── */
        case "blockquote": {
            const clsAttr = b.quoteStyle && b.quoteStyle !== "normal" ? ` class="${b.quoteStyle}"` : '';
            return `<blockquote${clsAttr}><p>${b.content||""}</p>${b.quoteAuthor?`<span>${b.quoteAuthor}</span>`:''}</blockquote>`;
        }

        /* ─── Note (info / warning / question) ─── */
        case "note": {
            let cls = "note";
            const labels = {info:"Info!",warning:"Warning!",question:"Did you know?"};
            if (b.noteStyle === "warning") cls += " wr";
            else if (b.noteStyle === "question") cls += " qs";
            const label = modweebEscapeHtml(b.noteTitle || labels[b.noteStyle] || labels.info);
            return `<p class="${cls}"><b>${label}</b><br>\n  ${b.content||""}\n</p>`;
        }

        /* ─── Alert (all variants + outline) ─── */
        case "alert": {
            const st = b.alertStyle || "info";
            const labels = {
                info: 'Info!', warning: 'Warning!', success: 'Success!', error: 'Error!',
                tip: 'Tip!', question: 'Question'
            };
            const base = st.split(' ')[0];
            const outlined = b.alertOutlined || st.includes('outline');
            const cls = 'alert ' + base + (outlined ? ' outline' : '');
            const lbl = modweebEscapeHtml(b.alertTitle || labels[base] || 'Info!');
            return `<div class="${cls}"><b>${lbl}</b>\n  ${b.content||""}\n</div>`;
        }

        /* ─── Table (with extended classes) ─── */
        case "table": {
            modweebUpdateTableData(b);
            const classes = b.tableClasses || "bordered stripped hovered";
            let h = `<div class="table ${classes}"><table><thead><tr>`;
            for (let c = 0; c < (b.tableCols||2); c++)
                h += `<th>${b.tableData[0] && b.tableData[0][c] || ""}</th>`;
            h += `</tr></thead><tbody>`;
            for (let r = 1; r < (b.tableRows||2); r++) {
                h += `<tr>`;
                for (let c = 0; c < (b.tableCols||2); c++)
                    h += `<td>${b.tableData[r] && b.tableData[r][c] || ""}</td>`;
                h += `</tr>`;
            }
            return h + `</tbody></table></div>`;
        }

        /* ─── List (ul / ul.s1) ─── */
        case "list": {
            const items = Array.isArray(b.listItems) ? b.listItems.filter(x => x.trim()) : [];
            if (!items.length) return `<ul><li>عنصر فارغ</li></ul>`;
            const cls = b.listStyle === "s1" ? ` class="s1"` : '';
            return `<ul${cls}>${items.map(it => `<li>${it}</li>`).join("")}</ul>`;
        }

        /* ─── Steps ─── */
        case "steps": {
            const items = Array.isArray(b.steps) ? b.steps.filter(x => x.trim()) : [];
            if (!items.length) return "";
            return `<ol class="steps">${items.map(s => `<li>${s}</li>`).join("")}</ol>`;
        }

        /* ─── KeyPoints (pills) ─── */
        case "keyPoints": {
            const items = Array.isArray(b.steps) ? b.steps.filter(Boolean) : [];
            if (!items.length) return `<div class="kp-wrap"><span class="kp-item">أضف نقاط من المحرر</span></div>`;
            return `<div class="kp-wrap">${items.map(it => `<span class="kp-item">${modweebEscapeHtml(it)}</span>`).join("")}</div>`;
        }

        /* ─── Code (single block with data-*) ─── */
        case "code": {
            let attrs = '';
            if (b.codeComment) attrs += ` data-comment="${modweebEscapeAttr(b.codeComment)}"`;
            if (b.codeSource)  attrs += ` data-source="${modweebEscapeAttr(b.codeSource)}"`;
            if (b.codeLines)   attrs += ` data-lines="${modweebEscapeAttr(b.codeLines)}"`;
            if (b.codeCopy === false)      attrs += ` data-copy="false"`;
            if (b.codeHighlight === false) attrs += ` data-highlight="false"`;
            if (b.codeSyntax === false)    attrs += ` data-syntax="false"`;
            return `<pre${attrs}><code class="language-${b.codeLanguage||"html"}">${modweebEscapeHtml(b.codeContent||"")}</code></pre>`;
        }

        /* ─── CodeTabs (multi-tabs) — NEW ─── */
        case "codeTabs": {
            const items = [
                {id:'1', lang:'HTML', pre:'preC1-1', src:b.tabHtmlSource||'src/index.html', code:b.tabHtml||''},
                {id:'2', lang:'CSS',  pre:'preC1-2', src:b.tabCssSource||'src/style.css',   code:b.tabCss||''},
                {id:'3', lang:'JS',   pre:'preC1-3', src:b.tabJsSource||'src/main.js',      code:b.tabJs||''},
                {id:'4', lang:'JSON', pre:'preC1-4', src:b.tabJsonSource||'src/rules.json', code:b.tabJson||''}
            ];
            const tabsId = 'preT' + b.id.replace(/[^a-z0-9]/gi,'').slice(0,8);
            let h = `<div class="pre tabs" data-js-tabs="">`;
            items.forEach((it,i) => {
                h += `<input id="${tabsId}-${it.id}" type="radio" name="${tabsId}"${i===0?' checked':''}>`;
            });
            h += `<div>`;
            items.forEach((it,i) => {
                h += `<label for="${tabsId}-${it.id}" data-text="${it.lang}"${i===0?' data-tab-active':''}></label>`;
            });
            h += `</div>`;
            items.forEach((it,i) => {
                h += `<pre class="${it.pre}" data-source="${modweebEscapeAttr(it.src)}" style="display:${i===0?'block':'none'}"><code>${modweebEscapeHtml(it.code)}</code></pre>`;
            });
            return h + `</div>`;
        }

        /* ─── Kbd / Inline Code ─── */
        case "kbd": return b.kbdText ? `<kbd>${modweebEscapeHtml(b.kbdText)}</kbd>` : "";
        case "inlineCode": return b.inlineCode ? `<code>${modweebEscapeHtml(b.inlineCode)}</code>` : "";

        /* ─── Spoiler / Accordion / Group / Blur ─── */
        case "spoiler":
        case "accordion":
        case "accordionGroup": {
            /* Blur Text Spoiler (span.spoiler) */
            if (b.accordionType === "blur") {
                return b.spoilerBlurText
                    ? `<span class="spoiler" role="button" tabindex="0" aria-expanded="false">${modweebEscapeHtml(b.spoilerBlurText)}</span>`
                    : '';
            }
            /* Details.sp */
            if (b.accordionType === "sp") {
                return `<details class="sp"><summary data-show="Show all" data-hide="Hide all">Spoiler:</summary><div><p>${b.content||""}</p></div></details>`;
            }
            /* Accordion (ac / ac alt) */
            if (b.accordionType === "ac" || b.accordionType === "ac alt") {
                const alt = b.accordionType === "ac alt" ? " alt" : "";
                return `<details class="ac${alt}"><summary>${b.summary||"العنوان"}</summary><div><p>${b.content||""}</p></div></details>`;
            }
            /* Grouped (showH) */
            if (b.accordionType === "group") {
                let h = `<div class="showH">`;
                for (const it of (b.accordions||[])) {
                    h += `<details class="ac${it.alt?" alt":""}"><summary>${it.summary||""}</summary><div><p>${it.content||""}</p></div></details>`;
                }
                return h + `</div>`;
            }
            return "";
        }

        /* ─── FAQ (with FAQPage microdata — kept for structural completeness) ─── */
        case "faq": {
            let h = `<div class="showH" itemscope itemtype="https://schema.org/FAQPage">`;
            for (const it of (b.faqItems||[])) {
                h += `<details class="ac" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question"><summary itemprop="name">${it.question||""}</summary><div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer"><p itemprop="text">${it.answer||""}</p></div></details>`;
            }
            return h + `</div>`;
        }

        /* ─── TOC (auto / manual) ─── */
        case "toc": {
            const label = b.tocLabel || "جدول المحتويات";
            if (b.tocStyle === 'manual' && Array.isArray(b.tocManualItems) && b.tocManualItems.some(i => i.text && i.id)) {
                let h = `<details class="sp toc" open><summary data-show="Show all" data-hide="Hide all">${label}</summary><div class="aToc"><ol>`;
                b.tocManualItems.forEach(it => {
                    if (it.text && it.id) h += `<li><a href="#${modweebEscapeAttr(it.id)}">${it.text}</a></li>`;
                });
                return h + `</ol></div></details>`;
            }
            return `<details class="sp toc" open><summary data-show="Show all" data-hide="Hide all">${label}</summary><div class="aToc"></div></details>`;
        }

        /* ─── Related Manual ─── */
        case "relatedManual": {
            if (!b.relatedLinks || !b.relatedLinks.length) return "";
            let h = `<div class="pRelate"><b>${b.relatedTitle||"قد ترغب في قراءة هذا المنشور:"}</b><ul>`;
            for (const l of b.relatedLinks) {
                if (!l.text) continue;
                h += `<li><a href="${modweebEscapeAttr(l.url||"#")}">${l.text}</a></li>`;
            }
            return h + `</ul></div>`;
        }

        /* ─── Related Auto ─── */
        case "relatedAuto": {
            const attrs = [];
            if (b.relatedDataLabel) attrs.push(`data-label="${modweebEscapeAttr(b.relatedDataLabel)}"`);
            attrs.push(`data-max-results="${b.relatedMax||6}"`);
            attrs.push(`data-max-posts="${b.relatedMax||6}"`);
            if (b.relatedSortBy) attrs.push(`data-sort-by="${modweebEscapeAttr(b.relatedSortBy)}"`);
            if (b.relatedRandom) attrs.push(`data-random="true"`);
            const max = parseInt(b.relatedMax)||6;
            const placeholders = Array(max).fill('<li></li>').join('');
            return `<details class="sp arp" open><summary data-show="Show all" data-hide="Hide all">${b.relatedAutoLabel||"منشورات ذات صلة"}</summary><div class="aRel loading lazyload" ${attrs.join(' ')}><ol>${placeholders}</ol></div></details>`;
        }

        /* ─── Lazy YouTube (lazy / defer) ─── */
        case "lazyYt": {
            const vid = (b.youtubeId||"").trim();
            if (!vid) return `<div style="background:#111;padding:2rem;text-align:center;color:#aaa;border-radius:8px;font-size:.85rem">يوتيوب: أدخل معرّف الفيديو</div>`;
            const ratioStyle = b.ratio && b.ratio !== '4/3' ? ` style="--ratio: ${(b.ratio||'').replace('/', ' / ')}"` : '';
            if (b.youtubeMode === 'defer') {
                return `<div class="videoYt"${ratioStyle}><iframe class="lazyload" title="YouTube video player" data-src="https://www.youtube.com/embed/${modweebEscapeAttr(vid)}" referrerpolicy="strict-origin-when-cross-origin" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
            }
            const thumb = `https://img.youtube.com/vi/${modweebEscapeAttr(vid)}/maxresdefault.jpg`;
            return `<div class="lazyYt"${ratioStyle} data-embed="${modweebEscapeAttr(vid)}"><div class="play" title="Play"><svg viewBox="0 0 213.7 213.7"><polygon class="a" points="73.5,62.5 148.5,105.8 73.5,149.1"></polygon><circle class="b" cx="106.8" cy="106.8" r="103.3"></circle></svg></div><img class="lazyload" src="data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="YouTube video thumbnail" data-src="${thumb}"></div>`;
        }

        /* ─── Audio Player ─── */
        case "audioPlayer": {
            if (!b.audioUrl) return `<div style="padding:1rem;text-align:center;color:var(--notifC);border:1px dashed var(--contentL);border-radius:8px;font-size:.85rem">مشغل صوت: أدخل رابط الملف</div>`;
            return `<audio controls preload="${modweebEscapeAttr(b.audioPreload||'metadata')}"><source src="${modweebEscapeAttr(b.audioUrl)}" type="audio/mpeg">Your browser does not support HTML5 audio.</audio>`;
        }

        /* ─── Video Player ─── */
        case "videoPlayer": {
            if (!b.videoUrl) return `<div style="padding:1rem;text-align:center;color:var(--notifC);border:1px dashed var(--contentL);border-radius:8px;font-size:.85rem">مشغل فيديو: أدخل رابط الملف</div>`;
            const poster = b.videoPoster ? ` poster="${modweebEscapeAttr(b.videoPoster)}"` : '';
            return `<video controls preload="${modweebEscapeAttr(b.videoPreload||'metadata')}" playsinline width="${modweebEscapeAttr(b.videoWidth||'100%')}"${poster}><source src="${modweebEscapeAttr(b.videoUrl)}" type="${modweebEscapeAttr(b.videoType||'video/mp4')}">Your browser does not support HTML5 video.</video>`;
        }

        /* ─── Basics (snippet + thumbnail + subtitle) ─── */
        case "basics": {
            let s = "";
            if (b.metaDescription) {
                s += `<!--[ Explicitly sets post snippet ]-->\n<div hidden aria-hidden="true">${modweebEscapeHtml(b.metaDescription)}</div>\n\n`;
            }
            const defaultThumb = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjiqVg3Qyh-Y547iBeyBfYuNMi9aPKNJcRwTb6LAIbEfWzgb60s1CquIJWpvR-wNub1ZwTiB2Ru_5jssRujk5Xl0nPJwnfjwU79o1RUMnYvk6ReWxCiDWD-Z1qln2R8UY4Y9zOXK91-_yqSt_8WH0peehqiMzcq5sphV4yEKlazglzkhx7LWCBbLW81ZwQ/s1920/modweb-articles-ai.webp";
            const thumbUrl = (b.thumbnailUrl && b.thumbnailUrl.trim()) ? b.thumbnailUrl.trim() : defaultThumb;
            s += `<!--[ Explicitly sets post thumbnail ]-->\n`;
            s += `<!--[\n  <div class='separator'><img src='${thumbUrl}'/></div>\n]-->\n\n`;
            s += `<!--more-->\n`;
            if (b.subtitle) {
                s += `<style>.headH::after{content:'${modweebEscapeAttr(b.subtitle)}';}</style>\n`;
            }
            return s;
        }

        default: return "";
    }
}

/* ============================================================
   9. Render Blocks into container (legacy UI)
   ============================================================ */
function modweebRenderBlocks(){
    const container = document.getElementById("blocksContainer");
    if (!container) return;
    if (modweebBlocks.length === 0) {
        container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--fotC)">ابدأ بإضافة عناصر من شريط الأدوات</div>';
        modweebUpdateStats();
        return;
    }
    let html = "";
    for (const b of modweebBlocks) {
        html += `<div class="modweeb-gen-block" data-id="${b.id}">
            <div class="modweeb-gen-block-header">
                <span class="modweeb-gen-block-type">${modweebGetBlockLabel(b.type)}</span>
                <div class="modweeb-gen-block-actions">
                    <button class="modweeb-gen-btn icon-only sm" onclick="moveBlock('${b.id}','up')" title="تحريك لأعلى"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V4M12 4L6 10M12 4L18 10"/></svg></button>
                    <button class="modweeb-gen-btn icon-only sm" onclick="moveBlock('${b.id}','down')" title="تحريك لأسفل"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4V20M12 20L6 14M12 20L18 14"/></svg></button>
                    <button class="modweeb-gen-btn icon-only sm danger" onclick="deleteBlock('${b.id}')" title="حذف"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>
                </div>
            </div>
            <div class="modweeb-gen-block-content">${modweebRenderEditor(b)}</div>
        </div>`;
    }
    container.innerHTML = html;
    modweebUpdatePreview();
    modweebUpdateStats();
}

/* ============================================================
   10. Update Preview (legacy — writes to #previewContent)
   ============================================================ */
function modweebUpdatePreview(){
    const el = document.getElementById("previewContent");
    if (el) {
        let html = "";
        for (const b of modweebBlocks) html += modweebRenderPreviewItem(b);
        el.innerHTML = `<div class="modweeb-preview-content">${html}</div>`;
    }
}

/* ============================================================
   11. Update Stats (word count, chars, read time)
   ============================================================ */
function modweebUpdateStats(){
    let words = 0, chars = 0;
    for (const b of modweebBlocks) {
        if (b.content) {
            words += b.content.split(/\s+/).filter(w => w.length > 0).length;
            chars += b.content.length;
        }
        if (Array.isArray(b.faqItems)) {
            for (const it of b.faqItems) {
                if (it.question) { words += it.question.split(/\s+/).filter(w => w.length>0).length; chars += it.question.length; }
                if (it.answer)   { words += it.answer.split(/\s+/).filter(w => w.length>0).length;   chars += it.answer.length; }
            }
        }
        if (Array.isArray(b.steps)) {
            for (const s of b.steps) { if (s) { words += s.split(/\s+/).filter(w=>w.length>0).length; chars += s.length; } }
        }
        if (Array.isArray(b.listItems)) {
            for (const s of b.listItems) { if (s) { words += s.split(/\s+/).filter(w=>w.length>0).length; chars += s.length; } }
        }
    }
    const w = document.getElementById("wordCount"); if (w) w.textContent = words;
    const c = document.getElementById("charCount"); if (c) c.textContent = chars;
    const r = document.getElementById("readTime"); if (r) r.textContent = Math.ceil(words/200) + " دقيقة";
    const uw = document.getElementById("unifiedStatsWords"); if (uw) uw.textContent = words;
    const uc = document.getElementById("unifiedStatsChars"); if (uc) uc.textContent = chars;
    const ur = document.getElementById("unifiedStatsReadTime"); if (ur) ur.textContent = Math.ceil(words/200) + " دقيقة";
}

/* ============================================================
   12. Generate Full HTML (final output)
   ============================================================ */
function generateFullHTML(){
    modweebArticleHTML = "";
    const parts = [];
    for (const b of modweebBlocks) {
        const piece = modweebRenderPreviewItem(b);
        if (piece && piece.trim()) parts.push(piece.trim());
    }
    modweebArticleHTML = parts.join("\n\n");
    const area = document.getElementById("codeArea");
    if (area) area.textContent = modweebArticleHTML;
    modweebShowStatus("تم توليد الكود");
    return modweebArticleHTML;
}
function generateHeaderHTML(){ return generateFullHTML(); }

/* ============================================================
   13. Copy helpers
   ============================================================ */
function copyCode(){
    if (!modweebArticleHTML) generateFullHTML();
    navigator.clipboard.writeText(modweebArticleHTML)
        .then(() => modweebShowStatus("تم نسخ الكود"))
        .catch(() => modweebShowStatus("فشل النسخ"));
}
function copyFullArticle(){ generateFullHTML(); copyCode(); }

function decodeHtmlEntities(str){
    if (!str) return "";
    const t = document.createElement("textarea");
    t.innerHTML = str;
    return t.value;
}

/* ============================================================
   14. Status Notifications (unified status bar + sheet notif)
   ============================================================ */
let _mwStTmr = null;
function modweebShowStatus(msg, dur){
    if (dur === undefined) dur = 1800;
    const decoded = decodeHtmlEntities(String(msg || ''));
    const persistent = dur <= 0;
    const isErr = /فشل|خطأ|تعذر|غير متاح|غير صالح/i.test(decoded);

    if (_mwStTmr) { clearTimeout(_mwStTmr); _mwStTmr = null; }

    const openSheetEl = document.querySelector('.ai-bottom-sheet.show');
    if (openSheetEl) {
        let n = openSheetEl.querySelector('.mw-sheet-notif');
        if (!n) {
            n = document.createElement('div');
            n.className = 'mw-sheet-notif';
            n.setAttribute('role', 'status');
            n.setAttribute('aria-live', 'polite');
            const hdr = openSheetEl.querySelector('.sheet-header');
            if (hdr) hdr.insertAdjacentElement('afterend', n);
            else openSheetEl.insertBefore(n, openSheetEl.firstChild);
        }
        n.textContent = decoded;
        n.classList.toggle('error', isErr);
        n.classList.remove('show');
        void n.offsetWidth;
        n.classList.add('show');
        if (!persistent) {
            _mwStTmr = setTimeout(() => n.classList.remove('show'), dur);
        }
        return;
    }
    const bar = document.getElementById('modweebGenStatus');
    if (bar) {
        bar.textContent = decoded;
        bar.classList.toggle('error', isErr);
        bar.classList.remove('show');
        void bar.offsetWidth;
        bar.classList.add('show');
        if (!persistent) {
            _mwStTmr = setTimeout(() => bar.classList.remove('show'), dur);
        }
    }
}

/* ============================================================
   15. Sheets Management
   ============================================================ */
window.openSheet = function(id){
    closeAllSheets();
    const el = document.getElementById(id);
    if (el) {
        el.querySelectorAll('.mw-sheet-notif').forEach(function(n){
            n.classList.remove('show', 'error');
            n.textContent = '';
        });
        el.classList.add('show');
    }
    const ov = document.getElementById('aiOverlay') || document.getElementById('genericOverlay');
    if (ov) ov.classList.add('active');
    document.body.style.overflow = 'hidden';
    try { window.dispatchEvent(new Event('modweebSheetOpened')); } catch(e){}
    setTimeout(function(){
        if (typeof window._modweebDecodeArabic === 'function') {
            document.querySelectorAll('.ai-bottom-sheet.show').forEach(function(sheet){
                sheet.querySelectorAll('*').forEach(function(node){
                    for (let i = 0; i < node.childNodes.length; i++) {
                        const n = node.childNodes[i];
                        if (n.nodeType === 3 && /&#\d+;|&#x[0-9a-f]+;/i.test(n.nodeValue)) {
                            n.nodeValue = window._modweebDecodeArabic(n.nodeValue);
                        }
                    }
                });
            });
        }
    }, 250);
};

window.closeAllSheets = function(){
    document.querySelectorAll('.ai-bottom-sheet').forEach(s => s.classList.remove('show'));
    document.querySelectorAll('.ai-overlay').forEach(ov => ov.classList.remove('active'));
    document.body.style.overflow = '';
};

function closeSheet(id){
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
    document.querySelectorAll('.ai-overlay').forEach(ov => ov.classList.remove('active'));
    document.body.style.overflow = '';
}

/* ============================================================
   16. Confirm Popup
   ============================================================ */
let confirmCallback = null, cancelCallback = null;

function showConfirmPopup(msg, okCb, cancelCb, okText, cancelText){
    if (okText === undefined) okText = 'موافق';
    if (cancelText === undefined) cancelText = 'إلغاء';
    document.getElementById('confirmSheetMessage').textContent = msg;
    document.getElementById('confirmOkBtn').textContent = okText;
    document.getElementById('confirmCancelBtn').textContent = cancelText;
    confirmCallback = okCb || (()=>{});
    cancelCallback = cancelCb || (()=>{});
    openSheet('confirmSheet');
}

function closeConfirmSheet(confirmed){
    if (confirmed === undefined) confirmed = false;
    closeSheet('confirmSheet');
    if (confirmed && confirmCallback) confirmCallback();
    else if (!confirmed && cancelCallback) cancelCallback();
    confirmCallback = null; cancelCallback = null;
}

/* ============================================================
   15. AI: Suggest Titles
   ============================================================ */
async function aiGenerateArticle(){
    const mainKw = (document.getElementById('aiMainKeyword')||{}).value || '';
    const topic  = (document.getElementById('aiTopic')||{}).value || '';
    const effectiveTopic = topic.trim() || mainKw.trim();
    if (!effectiveTopic) { modweebShowStatus('أدخل الكلمة الرئيسية أو موضوع المقال أولاً'); return; }
    if (!window.modweebPrompts || typeof window.modweebPrompts.article !== 'function' || !window.modweebAI) {
        modweebShowStatus('تعذّر تهيئة وحدة الذكاء الاصطناعي؛ أعد تحميل الأداة', 4000);
        return;
    }
    const generationMode = window.modweebAI.getGenerationMode();
    const noKeyMode = generationMode === 'puter' || generationMode === 'worker';
    const activeProvider = window.modweebAI.getActiveProvider();
    if (!noKeyMode && window.modweebAgent && !window.modweebAgent.hasKey(activeProvider)) {
        modweebShowStatus('أضف مفتاح API للمزود المختار أولاً؛ فتح الإعدادات…', 2500);
        setTimeout(() => { if (typeof window.openAgent === 'function') window.openAgent(); }, 450);
        return;
    }

    const chk = id => { const el = document.getElementById(id); return el ? el.checked : true; };
    const btn = document.getElementById('aiGenerateBtn');
    const bar = document.getElementById('aiProgressBar');
    const txt = document.getElementById('aiProgressText');
    if (btn) { btn.disabled = true; btn.style.opacity = '.55'; }
    if (bar) bar.style.display = 'block';
    if (txt) txt.textContent = 'جاري توليد المقال...';

    const params = {
        topic: effectiveTopic,
        mainKeyword: mainKw.trim(),
        keywords: (document.getElementById('aiKeywords')||{}).value || '',
        customRequest: (document.getElementById('aiCustomRequest')||{}).value || '',
        writingMode: window._aiWritingMode || 'default',
        tone: (document.getElementById('aiTone')||{}).value || 'professional',
        size: (document.getElementById('aiSize')||{}).value || 'md',
        language: (document.getElementById('aiLanguage')||{}).value || 'ar',
        country: (document.getElementById('aiCountry')||{}).value || 'ar',
        pov: (document.getElementById('aiPov')||{}).value || 'neutral',
        readingEase: (document.getElementById('aiReadingEase')||{}).value || 'easy',
        articleType: (document.getElementById('aiArticleType')||{}).value || 'guide',
        opening: (document.getElementById('aiOpening')||{}).value || 'brief',
        hasConclusion:   chk('aiHasConclusion'),
        hasTables:       chk('aiHasTables'),
        hasH3:           chk('aiHasH3'),
        hasLists:        chk('aiHasLists'),
        hasItalics:      chk('aiHasItalics'),
        hasQuotes:       chk('aiHasQuotes'),
        hasKeyPoints:    chk('aiHasKeyPoints'),
        hasInstructions: chk('aiHasInstructions'),
        hasBold:         chk('aiHasBold'),
        hasNotes:        chk('aiHasNotes'),
        hasAlerts:       chk('aiHasAlerts'),
        hasBlur:         chk('aiHasBlur'),
        hasMark:         chk('aiHasMark'),
        hasAccordionVariants: chk('aiHasAccordionVariants'),
        hasCode:         chk('aiHasCode'),
        hasImages:       chk('aiHasImages'),
        hasYoutube:      chk('aiHasYoutube'),
        youtubeReference: (document.getElementById('aiYoutubeReference')||{}).value || ''
    };

    const { systemPrompt, userPrompt } = window.modweebPrompts.article(params);

    try {
        /* محاولة المزود المختار أولاً */
        const raw = await window.modweebAI.call({
            systemPrompt, userPrompt,
            maxTokens: 16000,
            temperature: 0.7,
            jsonMode: true
        });

        const parsedData = window.modweebAI.parseJSON(raw);
        if (typeof window.modweebNormalizeArticleSections !== 'function') throw new Error('تعذر تحميل سياسة التحقق من عناصر المقال؛ أعد تحميل الصفحة.');
        const data = window.modweebNormalizeArticleSections(parsedData, params);
        if (!data || !Array.isArray(data.sections) || data.sections.length === 0) throw new Error('لم يُرجع المزود أقسام مقال صالحة؛ جرّب نموذجاً آخر أو قلّل حجم المقال');
        data.mainKeyword = params.mainKeyword;
        const videoId = params.hasYoutube && typeof window.modweebExtractYoutubeId === 'function'
            ? window.modweebExtractYoutubeId(params.youtubeReference) : '';
        /* لا نثق بأي معرّف فيديو أنشأه النموذج؛ يُقبل فقط رابط/معرّف أدخله المستخدم. */
        data.sections = data.sections.filter(section => section && section.type !== 'lazyYt');
        if (videoId) {
            const nextH2 = data.sections.findIndex((section, index) => index > 0 && section.type === 'heading' && /^h2$/i.test(section.headingLevel || ''));
            const insertAt = nextH2 > 0 ? nextH2 : Math.min(3, data.sections.length);
            data.sections.splice(insertAt, 0, {type:'lazyYt', youtubeId:videoId, youtubeMode:'lazy', ratio:'16/9'});
        }
        closeAIPopup();
        aiApplySections(data);
        if (params.hasYoutube && !videoId) modweebShowStatus('تم توليد المقال. ابحث عن فيديو مناسب والصق رابطه قبل إعادة التوليد لإدراجه.', 5000);
    } catch(e) {
        if (e.message === 'no_key'){
            modweebShowStatus('لا يوجد مفتاح API محفوظ للمزود المختار؛ افتح إعدادات المزود وأضف المفتاح', 4500);
            setTimeout(() => { if (typeof window.openAgent === 'function') window.openAgent(); }, 500);
        } else if (e.message === 'agent_locked'){
            modweebShowStatus('مفتاح المزود محفوظ لكن الخزنة مقفلة؛ افتحها بكلمة المرور ثم أعد التوليد', 4500);
            setTimeout(() => { if (typeof window.openAgent === 'function') window.openAgent(); }, 500);
        } else if (String(e.message || '') === 'puter_sdk_unavailable'){
            modweebShowStatus('تعذر تحميل مكتبة Puter؛ تحقق من الإنترنت ثم أعد تحميل الصفحة', 6000);
        } else if (String(e.message || '').startsWith('puter_error:')){
            modweebShowStatus('تعذر التوليد عبر Puter: ' + String(e.message).replace('puter_error:','').trim(), 7000);
        } else if (e.message === 'rate_limit'){
            aiShowRateLimit(() => aiGenerateArticle());
            return;
        } else {
            modweebShowStatus('حدث خطأ: ' + e.message, 4000);
        }
        if (bar) bar.style.display = 'none';
    } finally {
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    }
}

function aiSelectTitle(t){
    const inp = document.getElementById('aiTopic');
    if (inp) inp.value = t.trim();
    const titleInput = document.getElementById('bloggerPostTitle');
    if (titleInput) { titleInput.value = t.trim(); modweebAutoSlug(t.trim()); }
    const box = document.getElementById('titleSuggestions');
    if (box) box.style.display = 'none';
    modweebShowStatus(' تم اختيار العنوان، جاري توليد الكلمات المفتاحية...', 2500);

    // توليد الكلمات المفتاحية تلقائياً من العنوان المختار
    setTimeout(() => {
        if (typeof aiGenerateKeywords === 'function') {
            aiGenerateKeywords();
        }
    }, 300);
}

async function aiGenerateFromKeyword(){
    const kw = ((document.getElementById('aiMainKeyword')||{}).value || '').trim();
    if (!kw) { modweebShowStatus('أدخل الكلمة المفتاحية الرئيسية أولاً'); return; }
    const inp = document.getElementById('aiTopic');
    if (inp && !inp.value.trim()) inp.value = kw;
    await aiSuggestTitles();
}

/* ============================================================
   16. AI: Generate Keywords
   ============================================================ */
async function aiSuggestTitles(){
    const topic = ((document.getElementById('aiTopic')||{}).value || (document.getElementById('aiMainKeyword')||{}).value || '').trim();
    if (!topic) { modweebShowStatus('أدخل موضوع أو كلمة مفتاحية أولاً'); return; }
    const btn = document.getElementById('enhanceTitleBtn');
    const lang = (document.getElementById('aiLanguage')||{}).value || 'ar';
    const box = document.getElementById('titleSuggestions');
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }
    box.innerHTML = '<div style="padding:10px 12px;color:var(--notifC);font-size:0.8rem">جاري توليد 10 اقتراحات...</div>';
    box.style.display = 'block';

    const { systemPrompt, userPrompt } = window.modweebPrompts.suggestTitles({ title: topic, language: lang, count: 10 });

    try {
        const raw = await window.modweebAI.call({ systemPrompt, userPrompt, maxTokens: 800, jsonMode: true });
        const data = window.modweebAI.parseJSON(raw) || {};
        const list = Array.isArray(data.suggestions) ? data.suggestions.filter(Boolean) : [];
        if (!list.length){ box.innerHTML = '<div style="padding:10px 12px;color:var(--notifC)">لم تُولَّد اقتراحات</div>'; return; }

        box.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'title-suggestions-grid';
        list.forEach((s, i) => {
            const row = document.createElement('div');
            row.className = 'title-suggestion-item';
            const num = document.createElement('span'); num.className = 'tsug-num'; num.textContent = i + 1;
            const text = document.createElement('span'); text.className = 'tsug-text'; text.textContent = s;
            const arrow = document.createElement('span'); arrow.className = 'tsug-arrow'; arrow.textContent = '←';
            row.appendChild(num); row.appendChild(text); row.appendChild(arrow);
            row.addEventListener('click', () => aiSelectTitle(s));
            grid.appendChild(row);
        });
        box.appendChild(grid);
    } catch(e){
        const errorBox = document.createElement('div');
        errorBox.style.cssText = 'padding:10px 12px;color:#d32f2f;font-size:0.8rem';
        errorBox.textContent = 'فشل التوليد: ' + (e && e.message ? e.message : 'تحقق من إعداد النموذج');
        box.replaceChildren(errorBox);
    } finally { if (btn){ btn.disabled = false; btn.classList.remove('loading'); } }
}

/* ============================================================
   17. AI: Generate Keywords
   ============================================================ */
async function aiGenerateKeywords(){
    const topic = ((document.getElementById('aiTopic')||{}).value || (document.getElementById('aiMainKeyword')||{}).value || '').trim();
    if (!topic) { modweebShowStatus('أدخل الكلمة الرئيسية أولاً'); return; }
    const btn = document.getElementById('genKeywordsBtn');
    const lang = (document.getElementById('aiLanguage')||{}).value || 'ar';
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }

    const { systemPrompt, userPrompt } = window.modweebPrompts.keywords({ topic, language: lang });

    try {
        const raw = await window.modweebAI.call({ systemPrompt, userPrompt, maxTokens: 600, jsonMode: true });
        const data = window.modweebAI.parseJSON(raw) || {};
        const inp = document.getElementById('aiKeywords');
        if (inp && data.keywords){
            inp.value = Array.isArray(data.keywords) ? data.keywords.join(', ') : data.keywords;
            const labels = document.getElementById('bloggerPostLabels');
            if (labels) labels.value = inp.value;
        }
        modweebShowStatus('تم توليد الكلمات المفتاحية');
    } catch(e) { modweebShowStatus('فشل التوليد: ' + e.message); }
    finally { if (btn){ btn.disabled = false; btn.classList.remove('loading'); } }
}
/* ============================================================
   AI: Apply Sections → Blocks (يدعم جميع الأنواع الـ 28)
   ============================================================ */
function aiApplySections(data){
    modweebBlocks = [];
    const sections = data.sections || [];
    for (const sec of sections) {
        if (!sec.type) continue;
        modweebAddBlock(sec.type);
        const b = modweebBlocks[modweebBlocks.length - 1];
        if (!b) continue;
        switch(sec.type){

            /* ─── basics ─── */
            case 'basics':
                b.metaDescription = sec.metaDescription || '';
                b.thumbnailUrl    = sec.thumbnailUrl || '';
                b.subtitle        = sec.subtitle || '';
                break;

            /* ─── heading ─── */
            case 'heading':
                b.content       = sec.content || '';
                b.headingLevel  = sec.headingLevel || 'h2';
                b.headingBefore = sec.headingBefore || '';
                b.headingAfter  = sec.headingAfter || '';
                break;

            /* ─── paragraph ─── */
            case 'paragraph':
                b.content        = sec.content || '';
                b.paragraphStyle = sec.paragraphStyle || 'normal';
                if (sec.paragraphStyle === 'dropcap' && sec.content) {
                    b.dropCapChar = sec.content.charAt(0);
                }
                if (sec.paragraphStyle === 'ref') {
                    b.refSource = sec.refSource || '';
                }
                break;

            /* ─── toc ─── */
            case 'toc':
                b.tocLabel      = sec.tocLabel || 'جدول المحتويات';
                b.tocStyle      = sec.tocStyle || 'automatic';
                b.tocManualItems = Array.isArray(sec.tocManualItems) && sec.tocManualItems.length
                    ? sec.tocManualItems : [{text:'', id:''}];
                break;

            /* ─── note ─── */
            case 'note':
                b.content  = sec.content || '';
                b.noteStyle = sec.noteStyle || 'info';
                b.noteTitle = sec.noteTitle || '';
                break;

            /* ─── alert ─── */
            case 'alert':
                b.content      = sec.content || '';
                b.alertStyle   = sec.alertStyle || 'info';
                b.alertOutlined = !!sec.alertOutlined;
                b.alertTitle = sec.alertTitle || '';
                break;

            /* ─── blockquote ─── */
            case 'blockquote':
                b.content    = sec.content || '';
                b.quoteAuthor = sec.quoteAuthor || '';
                b.quoteStyle  = sec.quoteStyle || 'normal';
                break;

            /* ─── steps ─── */
            case 'steps':
                b.steps = Array.isArray(sec.steps) && sec.steps.length ? sec.steps : [''];
                break;

            /* ─── list (ul/ul.s1) ─── */
            case 'list':
                b.listItems = Array.isArray(sec.listItems) && sec.listItems.length ? sec.listItems : [''];
                b.listStyle = sec.listStyle || 'default';
                break;

            /* ─── accordion / spoiler / accordionGroup ─── */
            case 'accordion':
            case 'spoiler':
            case 'accordionGroup':
                b.summary       = sec.summary || '';
                b.content       = sec.content || '';
                b.accordionType = sec.accordionType || 'ac';
                b.spoilerBlurText = sec.spoilerBlurText || '';
                if (Array.isArray(sec.accordions) && sec.accordions.length) {
                    b.accordions = sec.accordions;
                }
                break;

            /* ─── faq ─── */
            case 'faq':
                b.faqItems = Array.isArray(sec.faqItems) && sec.faqItems.length
                    ? sec.faqItems : [{question:'', answer:''}];
                break;

            /* ─── downloadBox ─── */
            case 'downloadBox':
                b.fileName     = sec.fileName || '';
                b.fileSize     = sec.fileSize || '';
                b.downloadFile = sec.downloadFile || '';
                break;

            /* ─── table ─── */
            case 'table':
                if (sec.tableData && Array.isArray(sec.tableData) && sec.tableData.length) {
                    b.tableRows = sec.tableData.length;
                    b.tableCols = sec.tableData[0] ? sec.tableData[0].length : 2;
                    b.tableData = sec.tableData;
                    modweebUpdateTableData(b);
                }
                b.tableClasses = sec.tableClasses || 'bordered stripped hovered';
                break;

            /* ─── keyPoints ─── */
            case 'keyPoints':
                b.steps = Array.isArray(sec.items) && sec.items.length ? sec.items : [''];
                break;

            /* ─── image ─── */
            case 'image':
                b.imageUrl             = sec.imageUrl || '';
                b.imageAlt             = sec.imageAlt || sec.content || '';
                b.imageStyle           = sec.imageStyle || 'standard';
                b.imageWidth           = sec.imageWidth || '1280';
                b.imageHeight          = sec.imageHeight || '720';
                b.imageLightbox        = sec.imageLightbox === true;
                b.imageCaptionStyle    = sec.imageCaptionStyle || 'figure';
                b.imageDisableCaption  = sec.imageDisableCaption === true;
                b.caption              = sec.caption || '';
                b.gridUrls             = sec.gridUrls || '';
                b.scrollHeight         = sec.scrollHeight || 'h150';
                break;

            /* ─── link ─── */
            case 'link':
                b.linkUrl   = sec.linkUrl || '';
                b.linkText  = sec.linkText || '';
                b.linkStyle = sec.linkStyle || 'extL';
                break;

            /* ─── button ─── */
            case 'button':
                b.buttonText     = sec.buttonText || '';
                b.buttonUrl      = sec.buttonUrl || '';
                b.buttonIcon     = sec.buttonIcon || '';
                b.buttonOutlined = !!sec.buttonOutlined;
                break;

            /* ─── code (single) ─── */
            case 'code':
                b.codeContent   = sec.codeContent || '';
                b.codeLanguage  = sec.codeLanguage || 'html';
                b.codeComment   = sec.codeComment || '';
                b.codeSource    = sec.codeSource || '';
                b.codeLines     = sec.codeLines || '';
                b.codeCopy      = sec.codeCopy !== false;
                b.codeHighlight = sec.codeHighlight !== false;
                b.codeSyntax    = sec.codeSyntax !== false;
                break;

            /* ─── codeTabs (multi-tabs) ─── */
            case 'codeTabs':
                b.tabHtml       = sec.tabHtml || '';
                b.tabCss        = sec.tabCss || '';
                b.tabJs         = sec.tabJs || '';
                b.tabJson       = sec.tabJson || '';
                b.tabHtmlSource = sec.tabHtmlSource || 'src/index.html';
                b.tabCssSource  = sec.tabCssSource  || 'src/style.css';
                b.tabJsSource   = sec.tabJsSource   || 'src/main.js';
                b.tabJsonSource = sec.tabJsonSource || 'src/rules.json';
                break;

            /* ─── mark ─── */
            case 'mark':
                b.markText  = sec.markText || sec.content || '';
                b.markClass = sec.markClass || '';
                break;

            /* ─── kbd ─── */
            case 'kbd':
                b.kbdText = sec.kbdText || sec.content || '';
                break;

            /* ─── inlineCode ─── */
            case 'inlineCode':
                b.inlineCode = sec.inlineCode || sec.content || '';
                break;

            /* ─── lazyYt (YouTube) ─── */
            case 'lazyYt':
                b.youtubeId   = sec.youtubeId || '';
                b.youtubeMode = sec.youtubeMode || 'lazy';
                b.ratio       = sec.ratio || '4/3';
                break;

            /* ─── audioPlayer ─── */
            case 'audioPlayer':
                b.audioUrl     = sec.audioUrl || '';
                b.audioTitle   = sec.audioTitle || '';
                b.audioPreload = sec.audioPreload || 'metadata';
                break;

            /* ─── videoPlayer ─── */
            case 'videoPlayer':
                b.videoUrl     = sec.videoUrl || '';
                b.videoPoster  = sec.videoPoster || '';
                b.videoType    = sec.videoType || 'video/mp4';
                b.videoWidth   = sec.videoWidth || '100%';
                b.videoPreload = sec.videoPreload || 'metadata';
                break;

            /* ─── relatedManual ─── */
            case 'relatedManual':
                b.relatedTitle = sec.relatedTitle || 'قد ترغب في قراءة هذا المنشور:';
                b.relatedLinks = Array.isArray(sec.relatedLinks) && sec.relatedLinks.length
                    ? sec.relatedLinks : [{text:'', url:''}];
                break;

            /* ─── relatedAuto ─── */
            case 'relatedAuto':
                b.relatedAutoLabel = sec.relatedAutoLabel || 'منشورات ذات صلة';
                b.relatedMax       = sec.relatedMax || 6;
                b.relatedDataLabel = sec.relatedDataLabel || '';
                b.relatedSortBy    = sec.relatedSortBy || 'updated';
                b.relatedRandom    = sec.relatedRandom !== false;
                break;
        }
    }

    /* ─── بيانات المستند (العنوان/Meta/الوسوم) ─── */
    if (data.title) {
        const ti = document.getElementById('bloggerPostTitle');
        if (ti) { ti.value = data.title; modweebAutoSlug(data.title); }
        const aiTopic = document.getElementById('aiTopic');
        if (aiTopic && !aiTopic.value.trim()) aiTopic.value = data.title;
    }
    if (data.metaDescription) {
        const mi = document.getElementById('bloggerMetaDescription');
        if (mi) mi.value = data.metaDescription;
    }
    if (data.tags && Array.isArray(data.tags)) {
        const li = document.getElementById('bloggerPostLabels');
        if (li) li.value = data.tags.join(', ');
    }

    modweebSaveToHistory();
    const htmlReady = typeof window.generateFullHTML === 'function' ? window.generateFullHTML() : modweebArticleHTML;
    const title = data.title || (document.getElementById('bloggerPostTitle')||{}).value || '';
    const metaDescription = data.metaDescription || (document.getElementById('bloggerMetaDescription')||{}).value || '';
    const outputAnalysis = typeof window.modweebAnalyzeArticleHtml === 'function'
        ? window.modweebAnalyzeArticleHtml(htmlReady || '', {
            keyword: data.mainKeyword || (document.getElementById('aiMainKeyword')||{}).value || '',
            title,
            metaDescription
        })
        : { articleStats: data.articleStats || {}, seoReport: data.seoReport || {} };
    data.htmlReady = htmlReady || '';
    data.articleStats = outputAnalysis.articleStats;
    data.seoReport = outputAnalysis.seoReport;
    window.modweebLastArticleOutput = {
        title,
        metaDescription,
        tags: Array.isArray(data.tags) ? data.tags : [],
        articleStats: data.articleStats,
        seoReport: data.seoReport,
        htmlReady: data.htmlReady,
        focusKeyword: data.mainKeyword || ''
    };
    modweebShowStatus('تم توليد المقال (' + sections.length + ' قسم)');
}

/* ============================================================
   18. AI Popup controls
   ============================================================ */
window._aiWritingMode = 'default';
function setWritingMode(mode, el){
    window._aiWritingMode = mode;
    document.querySelectorAll('.writing-mode-btn').forEach(x => x.classList.remove('active'));
    if (el) el.classList.add('active');
}
function openAIPopup(){ closeAllSheets(); const p = document.getElementById('aiPopup'); if (p) p.classList.add('show'); const ov = document.getElementById('aiOverlay'); if (ov) ov.classList.add('active'); document.body.style.overflow = 'hidden'; if (typeof window.setAIPopupTab === 'function') window.setAIPopupTab('generate'); }
function closeAIPopup(){ const p = document.getElementById('aiPopup'); if (p) p.classList.remove('show'); const ov = document.getElementById('aiOverlay'); if (ov) ov.classList.remove('active'); document.body.style.overflow = ''; const s = document.getElementById('titleSuggestions'); if (s) s.style.display = 'none'; const b = document.getElementById('aiProgressBar'); if (b) b.style.display = 'none'; const btn = document.getElementById('aiGenerateBtn'); if (btn){btn.disabled=false;btn.style.opacity='1';} }

/* ============================================================
   19. Improve Text
   ============================================================ */
window._improveAction = 'rewrite';
function openImproveTextSheet(){
    openSheet('improveTextSheet');
    document.getElementById('improveResultSection').style.display = 'none';
    document.getElementById('improveProgressBar').style.display = 'none';
    document.getElementById('copyImproveBtn').style.display = 'none';
}
function setImproveAction(action, el){
    window._improveAction = action;
    document.querySelectorAll('.improve-action-btn').forEach(x => x.classList.remove('active'));
    if (el) el.classList.add('active');
}
async function runImproveText(){
    const textInput = document.getElementById('improveTextInput');
    const hasCustom = !!(textInput && textInput.value.trim());
    let text = hasCustom ? textInput.value.trim() : '';
    if (!text) { generateFullHTML(); text = (modweebArticleHTML||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,7000); }
    if (!text) { modweebShowStatus('لا يوجد نص للتحسين'); return; }
    const runBtn = document.getElementById('improveRunBtn');
    const progress = document.getElementById('improveProgressBar');
    const resultSection = document.getElementById('improveResultSection');
    const resultBox = document.getElementById('improveResultBox');
    const resultLabel = document.getElementById('improveResultLabel');
    const copyBtn = document.getElementById('copyImproveBtn');
    const applyBtn = document.getElementById('applyImproveBtn');
    if (runBtn) { runBtn.disabled = true; runBtn.textContent = 'جاري التحسين...'; }
    if (progress) progress.style.display = 'block';
    if (resultSection) resultSection.style.display = 'none';
    if (copyBtn) copyBtn.style.display = 'none';
    if (applyBtn) applyBtn.style.display = 'none';
    const labels = {rewrite:'إعادة صياغة', summarize:'تلخيص', expand:'توسيع', simplify:'تبسيط', shorten:'اختصار', fix:'تصحيح'};
    try {
        const lang = (document.getElementById('aiLanguage')||{}).value || 'ar';
        const { systemPrompt, userPrompt } = window.modweebPrompts.improveText({
            text, action: window._improveAction || 'rewrite', language: lang
        });
        const raw = await window.modweebAI.call({ systemPrompt, userPrompt, maxTokens: 4000 });
        if (resultLabel) resultLabel.textContent = 'النتيجة — ' + (labels[window._improveAction] || '');
        if (resultBox) resultBox.textContent = raw;
        if (resultSection) resultSection.style.display = 'block';
        if (copyBtn) copyBtn.style.display = 'inline-flex';
        window._improveLastResult = raw;
        if (applyBtn) applyBtn.style.display = 'inline-flex';
        if (!hasCustom && window._improveLastResult.trim()) applyImproveResult(true);
        modweebShowStatus('تم التحسين');
    } catch(e) { modweebShowStatus('فشل التحسين: ' + (e.message || ''), 3000); }
    finally { if (progress) progress.style.display = 'none'; if (runBtn) { runBtn.disabled = false; runBtn.textContent = 'تحسين'; } }
}
function applyImproveResult(silent){
    const result = String(window._improveLastResult || '').trim();
    if (!result) { if (!silent) modweebShowStatus('لا توجد نتيجة'); return; }
    const html = '<p>' + modweebEscapeHtml(result).replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>') + '</p>';
    if (typeof window.modweebCommitHTML === 'function') window.modweebCommitHTML(html, { save: true });
    else { modweebArticleHTML = html; generateFullHTML(); }
    if (!silent) { closeSheet('improveTextSheet'); modweebShowStatus('تم التطبيق'); }
}
function copyImproveResult(){
    const box = document.getElementById('improveResultBox');
    if (!box) return;
    navigator.clipboard.writeText(box.textContent || '').then(() => modweebShowStatus('تم النسخ', 1500)).catch(() => modweebShowStatus('فشل النسخ'));
}

/* ============================================================
   20. SEO Assistant
   ============================================================ */
function seoSwitchTab(tab, el){
    const activeButton = document.querySelector(`.seo-tab-btn[data-tab="${tab}"]`) || el;
    document.querySelectorAll('.seo-tab-btn').forEach(x => {
        const active = x === activeButton;
        x.classList.toggle('active', active);
        x.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.seo-tab-panel').forEach(x => x.classList.toggle('active', x.id === 'seoTab-' + tab));
    const footer = document.getElementById('seoFooter');
    if (footer) footer.dataset.tab = tab;
    const generate = document.getElementById('seoGenerateMetaBtn');
    if (generate) generate.hidden = tab !== 'meta';
    if (tab === 'meta') {
        const titleField = document.getElementById('seoMetaTitle');
        const descField = document.getElementById('seoMetaDesc');
        if (titleField) seoMetaFieldUpdate('title', titleField);
        if (descField) seoMetaFieldUpdate('desc', descField);
    }
}
function seoParseArticleDocument(){
    generateFullHTML();
    const parser = new DOMParser();
    const parsed = parser.parseFromString(String(modweebArticleHTML || ''), 'text/html');
    parsed.querySelectorAll('script, style, noscript, template').forEach(node => node.remove());
    return parsed;
}
function seoGetArticleText(){
    return seoParseArticleDocument().body.textContent || '';
}
function seoCountWords(text){
    return String(text || '').trim().split(/\s+/).filter(word => word.length > 1).length;
}
function seoCountPhrase(text, phrase){
    const value = String(phrase || '').trim();
    if (!value) return 0;
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return (String(text || '').match(new RegExp(escaped, 'gi')) || []).length;
}
function seoAddCheck(checks, type, text, scoreable){
    checks.push({type, text, scoreable: !!scoreable});
}
function seoAnalyzeArticle(){
    const btn = document.getElementById('seoAnalyzeBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري التحليل...'; }
    setTimeout(() => {
        try {
            const doc = seoParseArticleDocument();
            const text = doc.body.textContent || '';
            const wordCount = seoCountWords(text);
            const headings = Array.from(doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6'));
            const h2s = doc.body.querySelectorAll('h2').length;
            const imgs = doc.body.querySelectorAll('img').length;
            const imagesWithoutAlt = Array.from(doc.body.querySelectorAll('img')).filter(img => !img.hasAttribute('alt')).length;
            const titleEl = document.getElementById('bloggerPostTitle');
            const articleTitle = String(titleEl ? titleEl.value : '').trim();
            const titleInArticle = Array.from(doc.body.querySelectorAll('h1')).some(h => h.textContent.trim());
            const firstPara = doc.body.querySelector('p');
            const hasIntro = !!(firstPara && firstPara.textContent.trim());
            const checks = [];

            if (articleTitle || titleInArticle) seoAddCheck(checks, 'pass', 'عنوان المقال موجود', true);
            else seoAddCheck(checks, 'fail', 'أضف عنواناً واضحاً يصف موضوع المقال', true);
            if (hasIntro) seoAddCheck(checks, 'pass', 'توجد فقرة تمهيدية', true);
            else seoAddCheck(checks, 'fail', 'أضف مقدمة موجزة تساعد القارئ على فهم موضوع المقال', true);

            if (headings.length) {
                seoAddCheck(checks, 'pass', 'توجد عناوين فرعية لتقسيم المحتوى (' + headings.length + ')');
                let previousLevel = 0;
                let skippedLevel = false;
                headings.forEach(heading => {
                    const level = Number(heading.tagName.slice(1));
                    if (previousLevel && level > previousLevel + 1) skippedLevel = true;
                    if (!heading.textContent.trim()) seoAddCheck(checks, 'warn', 'يوجد عنوان فرعي بلا نص؛ راجع تسلسل العناوين');
                    previousLevel = level;
                });
                if (skippedLevel) seoAddCheck(checks, 'warn', 'راجع تسلسل مستويات العناوين؛ يظهر انتقال يتجاوز مستوىً فرعياً');
                else seoAddCheck(checks, 'pass', 'تسلسل مستويات العناوين يبدو متدرجاً');
            } else {
                seoAddCheck(checks, 'warn', 'لا توجد عناوين فرعية؛ أضفها إذا ساعدت على تنظيم المحتوى للقارئ');
            }
            if (imagesWithoutAlt) seoAddCheck(checks, 'warn', 'أضف نصاً بديلاً وصفياً للصور التي تنقل معنى (' + imagesWithoutAlt + ' بلا سمة alt)');
            else if (imgs) seoAddCheck(checks, 'pass', 'للصور سمة alt؛ تحقّق من دقة الوصف أو اترك الزخرفية فارغة');
            else seoAddCheck(checks, 'warn', 'لا توجد صور؛ أضف صوراً فقط إن أفادت القارئ');

            const descriptionEl = document.getElementById('seoMetaDesc') || document.getElementById('bloggerMetaDescription');
            const description = String(descriptionEl ? descriptionEl.value : '').trim();
            const metaTitleEl = document.getElementById('seoMetaTitle');
            const comparisonTitle = String(metaTitleEl && metaTitleEl.value.trim() ? metaTitleEl.value : articleTitle).trim();
            const normalizedDesc = description.toLocaleLowerCase().replace(/\s+/g, ' ');
            const normalizedTitle = comparisonTitle.toLocaleLowerCase().replace(/\s+/g, ' ');
            if (!description) seoAddCheck(checks, 'fail', 'اكتب وصفاً موجزاً وذا معنى يلخص هذه الصفحة', true);
            else if (normalizedDesc === normalizedTitle) {
                seoAddCheck(checks, 'warn', 'راجع الوصف ليكون محدداً وذا معنى، لا مجرد تكرار للعنوان', true);
            } else seoAddCheck(checks, 'pass', 'الوصف موجود ويختلف عن العنوان؛ تحقّق يدوياً من دقته وتفرّده', true);
            seoAddCheck(checks, 'warn', 'لا يمكن لهذا الفحص التحقق من تفرد الوصف مقارنةً بصفحات الموقع الأخرى');

            const kwInput = document.getElementById('seoFocusKw') || document.getElementById('aiMainKeyword');
            const focusKw = String(kwInput ? kwInput.value : '').trim();
            const kwCount = seoCountPhrase(text, focusKw);
            const density = wordCount ? parseFloat(((kwCount / wordCount) * 100).toFixed(1)) : 0;
            const loweredKw = focusKw.toLocaleLowerCase();
            const kwInTitle = !!(loweredKw && (articleTitle.toLocaleLowerCase().includes(loweredKw) || Array.from(doc.body.querySelectorAll('h1')).some(h => h.textContent.toLocaleLowerCase().includes(loweredKw))));
            const kwInIntro = !!(loweredKw && firstPara && firstPara.textContent.toLocaleLowerCase().includes(loweredKw));
            const kwInHeading = !!(loweredKw && headings.some(h => h.textContent.toLocaleLowerCase().includes(loweredKw)));
            if (focusKw) {
                if (kwCount > 1) seoAddCheck(checks, 'warn', 'تكرر المصطلح المحوري ' + kwCount + ' مرة؛ راجع طبيعية الأسلوب وتجنب الحشو، ولا تستهدف نسبة بعينها');
                else if (!kwCount) seoAddCheck(checks, 'warn', 'لم يظهر المصطلح المحوري في نص المقال؛ تحقّق من صلة المحتوى بموضوعه دون فرض تكراره');
                else seoAddCheck(checks, 'pass', 'المصطلح المحوري ظاهر مرة؛ عدد التكرارات ملاحظة وصفية لا هدفاً');
                if (!kwInTitle) seoAddCheck(checks, 'warn', 'المصطلح غير ظاهر في العنوان؛ استخدمه فقط إذا صاغ عنواناً طبيعياً ودقيقاً');
                if (!kwInIntro) seoAddCheck(checks, 'warn', 'المصطلح غير ظاهر في المقدمة؛ لا تضفه إن لم يكن مناسباً للسياق');
                if (headings.length && !kwInHeading) seoAddCheck(checks, 'warn', 'المصطلح غير ظاهر في العناوين الفرعية؛ لا تدرجه قسراً');
                const focusEl = document.getElementById('seoFocusKw');
                if (focusEl) focusEl.value = focusKw;
                seoUpdateKwStats(focusKw, kwCount, density, kwInTitle, kwInIntro, kwInHeading);
            } else {
                seoAddCheck(checks, 'warn', 'أدخل مصطلحاً لتحليل مرات ظهوره فقط؛ لا تتوفر هنا بيانات حجم بحث');
                seoUpdateKwStats('', 0, 0, false, false, false);
            }
            const scoreable = checks.filter(check => check.scoreable);
            const score = scoreable.length ? Math.round(scoreable.filter(check => check.type === 'pass').length / scoreable.length * 100) : 0;
            seoUpdateScoreUI(score, wordCount, h2s, imgs, checks);
            seoUpdateTips(checks);
            const titleCountEl = document.getElementById('seoMetaTitle');
            const descCountEl = document.getElementById('seoMetaDesc');
            if (titleCountEl) seoMetaFieldUpdate('title', titleCountEl);
            if (descCountEl) seoMetaFieldUpdate('desc', descCountEl);
            modweebShowStatus('اكتمل التقييم التحريري المحلي؛ ليس توقعاً لترتيب البحث', 3000);
        } catch(e) { modweebShowStatus('خطأ في التحليل: ' + (e.message || ''), 3000); }
        finally { if (btn) { btn.disabled = false; btn.textContent = 'تحليل المقال'; } }
    }, 100);
}
function seoUpdateScoreUI(score, wc, h2, imgs, checks){
    const num = document.getElementById('seoScoreNum'); if (num) num.textContent = score;
    const arc = document.getElementById('seoScoreArc');
    if (arc) { const c = 213.6; arc.style.strokeDashoffset = c - (score/100)*c; arc.setAttribute('stroke', '#3b82f6'); }
    const st = document.getElementById('seoStatWords'); if (st) st.textContent = wc;
    const sh = document.getElementById('seoStatH2'); if (sh) sh.textContent = h2;
    const si = document.getElementById('seoStatImgs'); if (si) si.textContent = imgs;
    const t = document.getElementById('seoScoreTitle');
    if (t) t.textContent = 'تقييم تحريري داخلي: ' + score + '/100 (ليس توقعاً للترتيب)';
    const sub = document.getElementById('seoScoreSubtitle');
    if (sub) sub.textContent = checks.filter(c=>c.type==='pass').length + ' ملاحظات مستوفاة، ' + checks.filter(c=>c.type==='fail').length + ' نقاط أساسية للمراجعة؛ التحذيرات لا تعني مخالفة';
    const cc = document.getElementById('seoChecksContainer');
    if (cc) {
        cc.replaceChildren();
        const icons = {pass:'✓', warn:'!', fail:'×'};
        checks.forEach(check => {
            const row = document.createElement('div');
            row.className = 'seo-check-item ' + (icons[check.type] ? check.type : 'warn');
            const icon = document.createElement('span'); icon.className = 'seo-check-icon'; icon.textContent = icons[check.type] || '!';
            const message = document.createElement('span'); message.textContent = check.text;
            row.append(icon, message); cc.appendChild(row);
        });
    }
    const ab = document.getElementById('seoApplyBtn');
    if (ab) ab.style.display = 'inline-flex';
}
function seoUpdateKwStats(kw, count, density, inTitle, inIntro, inHeading){
    const ks = document.getElementById('seoKwStats'); if (ks) ks.style.display = kw ? 'block' : 'none';
    const label = ks && ks.querySelector('.seo-kw-stat-label');
    if (label) label.textContent = 'التكرار والنسبة الوصفية، بلا هدف';
    const c = document.getElementById('seoKwCount'); if (c) c.textContent = count;
    const d = document.getElementById('seoKwDensity'); if (d) d.textContent = (Number.isFinite(density) ? density : 0) + '%';
    const bar = document.getElementById('seoKwDensityBar');
    if (bar) { bar.style.width = '0%'; bar.style.background = '#3b82f6'; bar.setAttribute('aria-hidden', 'true'); if (bar.parentNode) bar.parentNode.style.display = 'none'; const caption = bar.parentNode && bar.parentNode.previousElementSibling; if (caption) caption.textContent = 'النسبة الوصفية (ليست هدفاً)'; }
    const kc = document.getElementById('seoKwChecks');
    if (kc) {
        kc.replaceChildren();
        const items = [
            {ok:inTitle,text:'المصطلح في العنوان: ' + (inTitle?'ظاهر':'غير ظاهر؛ ملاحظة فقط')},
            {ok:inIntro,text:'المصطلح في المقدمة: ' + (inIntro?'ظاهر':'غير ظاهر؛ ملاحظة فقط')},
            {ok:inHeading,text:'المصطلح في عنوان فرعي: ' + (inHeading?'ظاهر':'غير ظاهر؛ ملاحظة فقط')}
        ];
        items.forEach(item => {
            const row = document.createElement('div'); row.className = 'seo-check-item ' + (item.ok?'pass':'warn');
            const icon = document.createElement('span'); icon.className = 'seo-check-icon'; icon.textContent = item.ok ? '✓' : '!';
            const message = document.createElement('span'); message.textContent = item.text;
            row.append(icon, message); kc.appendChild(row);
        });
    }
}
function seoAnalyzeKeyword(){
    const kwIn = document.getElementById('seoFocusKw');
    if (!kwIn || !kwIn.value.trim()) return;
    const kw = kwIn.value.trim();
    const doc = seoParseArticleDocument();
    const text = doc.body.textContent || '';
    const words = seoCountWords(text);
    const count = seoCountPhrase(text, kw);
    const density = words ? parseFloat(((count/words)*100).toFixed(1)) : 0;
    const titleEl = document.getElementById('bloggerPostTitle');
    const titleText = String(titleEl ? titleEl.value : '').toLocaleLowerCase();
    const fp = doc.body.querySelector('p');
    const inIntro = !!(fp && fp.textContent.toLocaleLowerCase().includes(kw.toLocaleLowerCase()));
    const headings = Array.from(doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    const inHeading = headings.some(h => h.textContent.toLocaleLowerCase().includes(kw.toLocaleLowerCase()));
    seoUpdateKwStats(kw, count, density, titleText.includes(kw.toLocaleLowerCase()), inIntro, inHeading);
}
function seoUpdateTips(checks){
    const c = document.getElementById('seoTipsContainer');
    if (!c) return;
    const tips = checks.filter(check => check.type !== 'pass');
    c.replaceChildren();
    if (!tips.length) {
        const row = document.createElement('div'); row.className = 'seo-check-item pass';
        const icon = document.createElement('span'); icon.className = 'seo-check-icon'; icon.textContent = '✓';
        const message = document.createElement('span'); message.textContent = 'لا تظهر ملاحظات تحريرية إضافية؛ راجع ملاءمة المحتوى لجمهورك';
        row.append(icon, message); c.appendChild(row); return;
    }
    const heading = document.createElement('div');
    heading.style.cssText = 'font-size:0.75rem;font-weight:600;margin-bottom:8px;color:var(--notifC)';
    heading.textContent = tips.length + ' ملاحظة تحريرية للمراجعة'; c.appendChild(heading);
    tips.forEach(check => {
        const row = document.createElement('div'); row.className = 'seo-check-item';
        row.style.borderRight = '3px solid ' + (check.type === 'fail' ? '#ef4444' : '#f59e0b');
        const badge = document.createElement('span');
        badge.style.cssText = 'font-size:0.65rem;background:' + (check.type === 'fail' ? '#ef4444' : '#f59e0b') + ';color:#fff;padding:1px 5px;border-radius:3px;white-space:nowrap';
        badge.textContent = check.type === 'fail' ? 'أساسي' : 'للمراجعة';
        const message = document.createElement('span'); message.style.flex = '1'; message.textContent = check.text;
        row.append(badge, message); c.appendChild(row);
    });
}
function seoMetaFieldUpdate(field, el){
    const len = String(el.value || '').length;
    const countId = field === 'title' ? 'seoMetaTitleLen' : field === 'desc' ? 'seoMetaDescLen' : null;
    if (countId) {
        const counter = document.getElementById(countId);
        if (counter) {
            counter.textContent = len + ' حرف';
            const label = counter.parentNode;
            if (label) Array.from(label.childNodes).filter(node => node.nodeType === 3).forEach(node => { node.nodeValue = field === 'title' ? 'عنوان Meta ' : 'وصف Meta '; });
        }
        const bar = document.getElementById(field === 'title' ? 'seoMetaTitleBar' : 'seoMetaDescBar');
        if (bar) { bar.style.width = '0%'; bar.style.background = '#3b82f6'; bar.setAttribute('aria-hidden', 'true'); if (bar.parentNode) bar.parentNode.style.display = 'none'; }
        const fieldEl = document.getElementById(field === 'title' ? 'seoMetaTitle' : 'seoMetaDesc');
        if (fieldEl) fieldEl.placeholder = field === 'title' ? 'عنوان واضح ودقيق للصفحة' : 'وصف فريد وموجز يلخص الصفحة بدقة';
    } else if (field === 'slug') {
        const c = document.getElementById('seoSlugLen'); if (c) c.textContent = len + ' حرف';
    }
}
async function seoGenerateMeta(){
    const topic = String((document.getElementById('aiTopic')||{}).value || (document.getElementById('aiMainKeyword')||{}).value || '').trim();
    if (!topic) { modweebShowStatus('أدخل موضوع المقال أو الكلمة أولاً'); return; }
    const progress = document.getElementById('seoMetaProgressBar');
    if (progress) progress.style.display = 'block';
    seoSwitchTab('meta');
    const lang = (document.getElementById('aiLanguage')||{}).value || 'ar';
    try {
        const articleText = seoGetArticleText().slice(0, 2000);
        const { systemPrompt, userPrompt } = window.modweebPrompts.seoMeta({ topic, mainKeyword: topic, language: lang, articleText });
        const raw = await window.modweebAI.call({ systemPrompt, userPrompt, maxTokens: 800, jsonMode: true });
        const data = window.modweebAI.parseJSON(raw) || {};
        const tf = document.getElementById('seoMetaTitle');
        const df = document.getElementById('seoMetaDesc');
        const sf = document.getElementById('seoSlugField');
        if (tf && data.metaTitle) { tf.value = data.metaTitle; seoMetaFieldUpdate('title', tf); }
        if (df && data.metaDescription) { df.value = data.metaDescription; seoMetaFieldUpdate('desc', df); }
        if (MW_SLUG_ENABLED && sf && data.slug) { sf.value = data.slug; seoMetaFieldUpdate('slug', sf); }
        const tags = document.getElementById('seoKwTagsContainer');
        if (tags && Array.isArray(data.keywords)){
            tags.replaceChildren();
            data.keywords.filter(k => typeof k === 'string').forEach(k => {
                const keyword = k.trim(); if (!keyword) return;
                const tag = document.createElement('span');
                tag.className = 'seo-kw-tag';
                tag.textContent = keyword;
                tag.addEventListener('click', () => seoAddKwToField(keyword));
                tags.appendChild(tag);
            });
        }
        modweebShowStatus('تم توليد بيانات SEO؛ راجع دقتها وتفرّد الوصف يدوياً');
        const ab = document.getElementById('seoApplyBtn');
        if (ab) ab.style.display = 'inline-flex';
    } catch(e) { modweebShowStatus('فشل: ' + (e.message || ''), 3000); }
    finally { if (progress) progress.style.display = 'none'; }
}
function seoAddKwToField(kw){
    const k = document.getElementById('aiKeywords'); if (!k) return;
    k.value = k.value.trim() ? k.value + ', ' + kw : kw;
    modweebShowStatus('تمت الإضافة: ' + kw, 1500);
}
function seoApplyToArticle(){
    const t = (document.getElementById('seoMetaTitle')||{}).value?.trim() || '';
    const d = (document.getElementById('seoMetaDesc')||{}).value?.trim() || '';
    const s = (document.getElementById('seoSlugField')||{}).value?.trim() || '';
    if (!t && !d && !s) { modweebShowStatus('لا توجد بيانات لتطبيقها'); return; }
    let n = 0;
    if (t) { const f = document.getElementById('bloggerPostTitle'); if (f) { f.value = t; n++; } }
    if (d) { const f = document.getElementById('bloggerMetaDescription'); if (f) { f.value = d; n++; } }
    if (MW_SLUG_ENABLED && s) { const f = document.getElementById('bloggerPostSlug'); if (f) { f.value = s; n++; } }
    modweebShowStatus('تم تطبيق ' + n + ' عنصر');
    closeSheet('seoAssistantSheet');
}
/* ============================================================
   21. Templates
   ============================================================ */
const MODWEEB_TEMPLATES = {
    guide: { name: 'دليل شامل', blocks: [
        {type:'paragraph', content:'في هذا الدليل الشامل، سنتعرف على كل ما تحتاج معرفته حول هذا الموضوع.', paragraphStyle:'normal'},
        {type:'heading', headingLevel:'h2', content:'ما هو الموضوع؟'},
        {type:'paragraph', content:'اكتب هنا مقدمة توضح الموضوع الرئيسي...'},
        {type:'heading', headingLevel:'h2', content:'المميزات الرئيسية'},
        {type:'paragraph', content:'اكتب هنا المميزات والفوائد...'},
        {type:'heading', headingLevel:'h3', content:'أولاً: النقطة الأولى'},
        {type:'paragraph', content:'اكتب تفاصيل النقطة الأولى...'},
        {type:'heading', headingLevel:'h2', content:'كيفية الاستخدام'},
        {type:'steps', steps:['الخطوة الأولى: ابدأ من هنا','الخطوة الثانية: ثم انتقل لهذا','الخطوة الثالثة: أخيراً افعل ذلك']},
        {type:'heading', headingLevel:'h2', content:'الأسئلة الشائعة'},
        {type:'faq', faqItems:[{question:'السؤال الأول؟', answer:'الإجابة الأولى.'},{question:'السؤال الثاني؟', answer:'الإجابة الثانية.'}]},
        {type:'heading', headingLevel:'h2', content:'الخلاصة'},
        {type:'paragraph', content:'في نهاية هذا الدليل الشامل، نكون قد تعرفنا على أهم الجوانب.'},
        {type:'relatedAuto', relatedAutoLabel:'منشورات ذات صلة', relatedMax:6}
    ]},
    // إضافة داخل MODWEEB_TEMPLATES
blurQuiz: { name: 'اختبار مع Blur', blocks: [
    {type:'paragraph', content:'حاول الإجابة قبل كشف الإجابة النهائية.', paragraphStyle:'normal'},
    {type:'heading', headingLevel:'h2', content:'السؤال الأول'},
    {type:'paragraph', content:'ما هو العنصر الأكثر استخداماً في القوالب؟ الإجابة: <span class="spoiler" role="button" tabindex="0" aria-expanded="false">div</span>', paragraphStyle:'normal'},
    {type:'accordion', accordionType:'blur', spoilerBlurText:'الإجابة المخفية هنا'},
    {type:'note', noteStyle:'question', content:'هل تعلم أن هذا النمط متاح فقط في القالب v3.3+؟'},
    {type:'alert', alertStyle:'tip', content:'استخدم النمط المخطط (outline) لتنبيهات أكثر هدوءاً.'}
]},
    review: { name: 'مراجعة تطبيق', blocks: [
        {type:'paragraph', content:'في هذه المراجعة الشاملة، نقدم لك تقييماً دقيقاً بناءً على التجربة الفعلية.'},
        {type:'heading', headingLevel:'h2', content:'نظرة عامة'},
        {type:'paragraph', content:'اكتب نظرة عامة عن المنتج أو التطبيق...'},
        {type:'heading', headingLevel:'h2', content:'المواصفات'},
        {type:'table', tableRows:4, tableCols:2, tableData:[['الخاصية','التفاصيل'],['المواصفة 1','القيمة 1'],['المواصفة 2','القيمة 2'],['المواصفة 3','القيمة 3']], tableClasses:'bordered stripped hovered'},
        {type:'heading', headingLevel:'h2', content:'المميزات'},
        {type:'paragraph', content:'اكتب أبرز المميزات هنا...'},
        {type:'heading', headingLevel:'h2', content:'العيوب'},
        {type:'paragraph', content:'اكتب العيوب هنا...'},
        {type:'heading', headingLevel:'h2', content:'التقييم النهائي'},
        {type:'blockquote', quoteStyle:'s1', content:'التقييم: 8/10 , منتج ممتاز.'}
    ]},
    comparison: { name: 'مقارنة', blocks: [
        {type:'paragraph', content:'نقارن اليوم بين خيارين رئيسيين لمساعدتك على اتخاذ القرار.'},
        {type:'heading', headingLevel:'h2', content:'جدول المقارنة'},
        {type:'table', tableRows:5, tableCols:3, tableData:[['الميزة','الأول','الثاني'],['السعر','اكتب','اكتب'],['الجودة','اكتب','اكتب'],['سهولة','اكتب','اكتب'],['الدعم','اكتب','اكتب']], tableClasses:'bordered stripped hovered'},
        {type:'heading', headingLevel:'h2', content:'الحكم النهائي'},
        {type:'note', noteStyle:'info', content:'التوصية: المنتج الأول أفضل لـ... بينما الثاني أفضل لـ...'},
        {type:'faq', faqItems:[{question:'أيهما أوصي به؟', answer:'اكتب توصيتك هنا...'}]}
    ]},
    faq: { name: 'FAQ', blocks: [
        {type:'paragraph', content:'نجيب في هذا المقال على أكثر الأسئلة شيوعاً حول هذا الموضوع.'},
        {type:'toc', tocLabel:'جدول المحتويات'},
        {type:'heading', headingLevel:'h2', content:'الأسئلة الشائعة'},
        {type:'faq', faqItems:[
            {question:'السؤال الأول؟', answer:'الإجابة الأولى المفصلة.'},
            {question:'السؤال الثاني؟', answer:'الإجابة الثانية المفصلة.'},
            {question:'السؤال الثالث؟', answer:'الإجابة الثالثة المفصلة.'},
            {question:'السؤال الرابع؟', answer:'الإجابة الرابعة المفصلة.'},
            {question:'السؤال الخامس؟', answer:'الإجابة الخامسة المفصلة.'}
        ]},
        {type:'heading', headingLevel:'h2', content:'الخلاصة'},
        {type:'paragraph', content:'نأمل أن نكون قد أجبنا على تساؤلاتك.'}
    ]},
    tutorial: { name: 'خطوات تعليمية', blocks: [
        {type:'paragraph', content:'سنشرح في هذا المقال كيفية إتمام المهمة خطوة بخطوة.'},
        {type:'note', noteStyle:'info', content:'قبل البدء: تأكد من توفر المتطلبات.'},
        {type:'heading', headingLevel:'h2', content:'المتطلبات'},
        {type:'paragraph', content:'اكتب المتطلبات...'},
        {type:'heading', headingLevel:'h2', content:'الخطوات التفصيلية'},
        {type:'steps', steps:['الخطوة الأولى: افعل كذا','الخطوة الثانية: ثم انتقل','الخطوة الثالثة: نفّذ','الخطوة الرابعة: تحقق','الخطوة الخامسة: أتمم']},
        {type:'heading', headingLevel:'h2', content:'نصائح'},
        {type:'note', noteStyle:'warning', content:'تنبيه: تجنب هذا الخطأ الشائع.'},
        {type:'heading', headingLevel:'h2', content:'الخلاصة'},
        {type:'paragraph', content:'باتباع هذه الخطوات ستتمكن من إتمام المهمة بنجاح.'}
    ]},
    adsense: { name: 'مقال Adsense', blocks: [
        {type:'paragraph', content:'نقدم لك في هذا المقال معلومات قيمة ومفصلة.'},
        {type:'heading', headingLevel:'h2', content:'ما الذي يجب أن تعرفه؟'},
        {type:'paragraph', content:'اكتب المعلومات الأساسية...'},
        {type:'heading', headingLevel:'h2', content:'الأسباب الرئيسية'},
        {type:'paragraph', content:'اكتب التفاصيل...'},
        {type:'heading', headingLevel:'h2', content:'مقارنة الخيارات'},
        {type:'table', tableRows:4, tableCols:3, tableData:[['الخيار','المميزات','السعر'],['الأول','اكتب','مجاني'],['الثاني','اكتب','مدفوع'],['الثالث','اكتب','متغير']], tableClasses:'bordered stripped hovered'},
        {type:'heading', headingLevel:'h2', content:'أسئلة وأجوبة'},
        {type:'faq', faqItems:[{question:'السؤال الأول؟', answer:'الإجابة...'},{question:'السؤال الثاني؟', answer:'الإجابة...'}]},
        {type:'heading', headingLevel:'h2', content:'الخاتمة'},
        {type:'paragraph', content:'خلاصة القول، هذا الموضوع مهم لأن...'},
        {type:'relatedAuto', relatedAutoLabel:'اقرأ أيضاً', relatedMax:6}
    ]},
    news: { name: 'مقال إخباري', blocks: [
        {type:'paragraph', content:'اكتب هنا الـ Lead , الخبر الرئيسي في سطرين.'},
        {type:'heading', headingLevel:'h2', content:'تفاصيل الخبر'},
        {type:'paragraph', content:'اكتب التفاصيل الكاملة...'},
        {type:'blockquote', quoteStyle:'s2', content:'اكتب اقتباساً من مصدر رسمي.', quoteAuthor:'اسم المصدر'},
        {type:'heading', headingLevel:'h2', content:'الخلفية'},
        {type:'paragraph', content:'اكتب الخلفية...'},
        {type:'heading', headingLevel:'h2', content:'التداعيات'},
        {type:'paragraph', content:'اكتب التحليل...'},
        {type:'note', noteStyle:'info', content:'تحديث: سيتم تحديث المقال فور توفر معلومات جديدة.'}
    ]},
    affiliate: { name: 'مقال Affiliate', blocks: [
        {type:'paragraph', content:'نقدم لك في هذا المقال مراجعة صادقة ومفصلة.'},
        {type:'heading', headingLevel:'h2', content:'لماذا هذا المنتج؟'},
        {type:'paragraph', content:'اكتب أسباب الاختيار...'},
        {type:'heading', headingLevel:'h2', content:'أبرز المميزات'},
        {type:'steps', steps:['الميزة الأولى','الميزة الثانية','الميزة الثالثة','الميزة الرابعة']},
        {type:'heading', headingLevel:'h2', content:'هل يستحق الشراء؟'},
        {type:'paragraph', content:'بعد التجربة، يمكننا القول...'},
        {type:'link', linkStyle:'button', linkText:'اشتر الآن بأفضل سعر', linkUrl:'#'},
        {type:'heading', headingLevel:'h2', content:'العيوب'},
        {type:'paragraph', content:'إليك بعض السلبيات...'},
        {type:'heading', headingLevel:'h2', content:'أسئلة المشترين'},
        {type:'faq', faqItems:[{question:'هل هناك ضمان؟', answer:'نعم، يوفر المنتج...'},{question:'ما الفرق عن البديل؟', answer:'اكتب هنا...'}]}
    ]}
};

function modweebTemplateDefaultBlock(overrides){
    return Object.assign({
        id: Date.now() + '-' + Math.random().toString(36).substr(2,6),
        paragraphStyle: 'normal', headingLevel: 'h2', content: '',
        imageUrl: '', imageAlt: '', imageWidth: '1280', imageHeight: '720', imageStyle: 'standard',
        gridUrls: '', scrollHeight: 'h150', caption: '',
        linkUrl: '', linkText: '', linkStyle: 'extL',
        buttonText: '', buttonUrl: '', buttonIcon: '',
        downloadFile: '', fileName: '', fileSize: '',
        quoteStyle: 'normal', quoteAuthor: '',
        noteStyle: 'info', alertStyle: 'info', noteTitle: '', alertTitle: '',
        tableRows: 2, tableCols: 2, tableData: [['',''],['','']], tableClasses: 'bordered stripped hovered',
        steps: [''], codeContent: '', codeLanguage: 'html', codeComment: '', codeSource: '',
        tabHtml: '', tabCss: '', tabJs: '', tabJson: '',
        tabHtmlSource: 'src/index.html', tabCssSource: 'src/style.css',
        tabJsSource: 'src/main.js', tabJsonSource: 'src/rules.json',
        summary: '', accordionType: 'ac', accordions: [{summary:'',content:'',alt:false}],
        faqItems: [{question:'',answer:''}], tocLabel: 'جدول المحتويات',
        relatedTitle: 'قد ترغب في قراءة هذا المنشور:', relatedLinks: [{text:'',url:''}],
        relatedAutoLabel: 'منشورات ذات صلة', relatedMax: 6, relatedDataLabel: '',
        youtubeId: '', ratio: '4/3', metaDescription: '', thumbnailUrl: '', subtitle: '',
        markText: '', markClass: '', kbdText: '', inlineCode: '',
        dropCapChar: '', refSource: ''
    }, overrides || {});
}

function openTemplateSetup(id){
    window._pendingTemplateId = id;
    const tmpl = MODWEEB_TEMPLATES[id];
    if (!tmpl) return;
    const titleEl = document.getElementById('templateSetupTitle');
    if (titleEl) titleEl.textContent = 'إعداد: ' + tmpl.name;
    const topicVal = (document.getElementById('aiTopic')||{}).value || '';
    const titleInput = document.getElementById('tmplSetupTitle');
    if (titleInput && !titleInput.value && topicVal) titleInput.value = topicVal;
    openSheet('templateSetupSheet');
}
async function templateImproveTitle(){
    const titleEl = document.getElementById('tmplSetupTitle');
    const val = titleEl ? titleEl.value.trim() : '';
    if (!val) { modweebShowStatus('أدخل عنواناً أولاً'); return; }
    const prog = document.getElementById('tmplSetupProgress');
    if (prog) prog.style.display = 'block';
    try {
        const request = window.modweebPrompts.suggestTitles({ title: val, language: (document.getElementById('aiLanguage')||{}).value || 'ar', count: 1 });
        const raw = await window.modweebAI.call({ systemPrompt: request.systemPrompt, userPrompt: request.userPrompt, maxTokens: 500, jsonMode: true });
        const data = window.modweebAI.parseJSON(raw) || {};
        const suggestion = Array.isArray(data.suggestions) ? String(data.suggestions[0] || '').trim() : '';
        if (!suggestion) throw new Error('لم يُرجع النموذج عنواناً مناسباً');
        if (titleEl) titleEl.value = suggestion;
    } catch(e) { modweebShowStatus('فشل تحسين العنوان: ' + (e.message || 'تحقق من إعداد النموذج')); }
    finally { if (prog) prog.style.display = 'none'; }
}
async function templateGenerateKeywords(){
    const title = (document.getElementById('tmplSetupTitle')||{}).value?.trim() || '';
    if (!title) { modweebShowStatus('أدخل العنوان أولاً'); return; }
    const prog = document.getElementById('tmplSetupProgress');
    if (prog) prog.style.display = 'block';
    try {
        const request = window.modweebPrompts.keywords({ topic: title, language: (document.getElementById('aiLanguage')||{}).value || 'ar' });
        const raw = await window.modweebAI.call({ systemPrompt: request.systemPrompt, userPrompt: request.userPrompt, maxTokens: 700, jsonMode: true });
        const data = window.modweebAI.parseJSON(raw) || {};
        const el = document.getElementById('tmplSetupKeywords');
        if (el && Array.isArray(data.keywords)) el.value = data.keywords.filter(k => typeof k === 'string').join('، ');
        else throw new Error('لم يُرجع النموذج قائمة كلمات');
    } catch(e) { modweebShowStatus('فشل اقتراح الكلمات: ' + (e.message || 'تحقق من إعداد النموذج')); }
    finally { if (prog) prog.style.display = 'none'; }
}
async function templateGenerateAndInsert(){
    const id = window._pendingTemplateId;
    const tmpl = MODWEEB_TEMPLATES[id];
    if (!tmpl) return;
    const title = ((document.getElementById('tmplSetupTitle')||{}).value || '').trim();
    const desc = ((document.getElementById('tmplSetupDesc')||{}).value || '').trim();
    const keywords = ((document.getElementById('tmplSetupKeywords')||{}).value || '').trim();
    const focusKw = ((document.getElementById('tmplSetupFocusKw')||{}).value || '').trim();
    const lang = (document.getElementById('aiLanguage')||{}).value || 'ar';
    const prog = document.getElementById('tmplSetupProgress');
    const btn = document.getElementById('tmplSetupGenBtn');
    if (!title && !focusKw) { modweebShowStatus('أدخل عنوان المقال أو كلمته المحورية أولاً'); return; }
    if (prog) prog.style.display = 'block';
    if (btn) { btn.disabled = true; btn.textContent = 'جاري التوليد...'; }
    try {
        const mode = window.modweebAI.getGenerationMode();
        const provider = window.modweebAI.getActiveProvider();
        if (mode !== 'puter' && mode !== 'worker' && window.modweebAgent && !window.modweebAgent.hasKey(provider)) {
            throw new Error('أضف مفتاح المزود المحدد أولاً من تبويب النموذج والمفاتيح.');
        }
        const templateTypes = (tmpl.blocks || []).map(block => block.type).filter(Boolean).join('، ');
        const articleType = ({guide:'guide', review:'review', comparison:'comparison', faq:'faq', tutorial:'tutorial', adsense:'guide', news:'news', affiliate:'review'})[id] || 'guide';
        const customRequest = [
            `هيّئ المقال وفق قالب «${tmpl.name}»، واجعل أنواع العناصر المقترحة (${templateTypes}) إرشادية تتكيف مع فائدة القارئ؛ لا تدرج عناصر شكلية بلا حاجة.`,
            desc ? `وصف المحرر: ${desc}` : '',
            focusKw ? `المصطلح المحوري: ${focusKw}؛ استخدمه طبيعياً في المواضع الملائمة دون تكرار قسري.` : '',
            keywords ? `عبارات مساعدة: ${keywords}؛ استعمل ما يلائم الموضوع فقط.` : ''
        ].filter(Boolean).join('\n');
        const params = {
            topic: title || focusKw, mainKeyword: focusKw, keywords, customRequest,
            writingMode: window._aiWritingMode || 'default',
            tone: (document.getElementById('aiTone')||{}).value || 'professional',
            size: (document.getElementById('aiSize')||{}).value || 'md', language: lang,
            country: (document.getElementById('aiCountry')||{}).value || 'ar',
            pov: (document.getElementById('aiPov')||{}).value || 'neutral',
            readingEase: (document.getElementById('aiReadingEase')||{}).value || 'easy',
            articleType, opening: (document.getElementById('aiOpening')||{}).value || 'brief',
            hasConclusion: true, hasTables: id === 'comparison', hasH3: true, hasLists: true,
            hasItalics: false, hasQuotes: false, hasKeyPoints: true, hasInstructions: id === 'tutorial',
            hasBold: true, hasNotes: ['guide','tutorial'].includes(id), hasAlerts: false,
            hasBlur: false, hasMark: true, hasAccordionVariants: false, hasCode: false, hasImages: false, hasYoutube: false
        };
        const request = window.modweebPrompts.article(params);
        const raw = await window.modweebAI.call({ systemPrompt: request.systemPrompt, userPrompt: request.userPrompt, maxTokens: 16000, temperature: 0.7, jsonMode: true });
        const parsedData = window.modweebAI.parseJSON(raw);
        if (typeof window.modweebNormalizeArticleSections !== 'function') throw new Error('تعذر تحميل سياسة التحقق من عناصر المقال؛ أعد تحميل الصفحة.');
        const data = window.modweebNormalizeArticleSections(parsedData, params);
        if (!data || !Array.isArray(data.sections) || !data.sections.length) throw new Error('لم يُرجع النموذج أقساماً صالحة.');
        data.mainKeyword = focusKw;
        aiApplySections(data);
        const t = document.getElementById('bloggerPostTitle');
        if (title && t) { t.value = title; modweebAutoSlug(title); }
        const l = document.getElementById('bloggerPostLabels');
        if (keywords && l) l.value = keywords;
        const meta = document.getElementById('bloggerMetaDescription');
        if (desc && meta) meta.value = desc;
        closeSheet('templateSetupSheet');
        modweebShowStatus('تم توليد قالب «' + tmpl.name + '» مع ' + modweebBlocks.length + ' عنصر');
    } catch(e) {
        modweebShowStatus('تعذر توليد القالب: ' + (e.message || 'تحقق من إعداد النموذج'), 5000);
    } finally {
        if (prog) prog.style.display = 'none';
        if (btn) { btn.disabled = false; btn.textContent = 'توليد وإدراج'; }
    }
}

/* ============================================================
   22. Export
   ============================================================ */
async function exportArticle(format){
    generateFullHTML();
    const title = (document.getElementById('aiTopic')||{}).value || 'article';
    if (format === 'html') {
        const cssLink = document.querySelector('link[data-export-css]') || document.querySelector('link[rel="stylesheet"][href$=".css"]');
        let appCss = '';
        if (cssLink) {
            try {
                const response = await fetch(cssLink.href);
                if (!response.ok) throw new Error('تعذر تحميل أنماط التصدير');
                appCss = await response.text();
            } catch (error) {
                modweebShowStatus('تعذر تضمين الأنماط في HTML؛ تحقق من اتصال الصفحة ثم أعد المحاولة', 4000);
                return;
            }
        }
        const inlineCss = [...document.querySelectorAll('style')].map(el => el.textContent || '').join('\n');
        const safeTitle = String(title).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
        const full = '<!DOCTYPE html>\n<html dir="rtl" lang="ar">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + safeTitle + '</title>\n<style>\n' + inlineCss + '\n' + appCss + '\n</style>\n</head>\n<body>\n' + modweebArticleHTML + '\n</body>\n</html>';
        modweebDownloadText(full, title + '.html', 'text/html');
    } else if (format === 'snippet') {
        modweebDownloadText(modweebArticleHTML, title + '-snippet.html', 'text/html');
    } else if (format === 'markdown') {
        modweebDownloadText(htmlToMarkdown(modweebArticleHTML), title + '.md', 'text/markdown');
    } else if (format === 'txt') {
        const t = document.createElement('div');
        t.innerHTML = modweebArticleHTML;
        modweebDownloadText(t.textContent || '', title + '.txt', 'text/plain');
    } else if (format === 'json') {
        const articleTitle = (document.getElementById('bloggerPostTitle')||{}).value || title;
        const metaDescription = (document.getElementById('bloggerMetaDescription')||{}).value || '';
        const outputMeta = window.modweebLastArticleOutput || {};
        const outputAnalysis = typeof window.modweebAnalyzeArticleHtml === 'function'
            ? window.modweebAnalyzeArticleHtml(modweebArticleHTML, {
                keyword: outputMeta.focusKeyword || (document.getElementById('aiMainKeyword')||{}).value || '',
                title: articleTitle,
                metaDescription
            })
            : { articleStats: outputMeta.articleStats || {}, seoReport: outputMeta.seoReport || {} };
        modweebDownloadText(JSON.stringify({
            title: articleTitle,
            metaDescription,
            tags: (document.getElementById('bloggerPostLabels')||{}).value?.split(/[,،]/).map(tag => tag.trim()).filter(Boolean) || [],
            articleType: (document.getElementById('aiArticleType')||{}).value || 'guide',
            articleStats: outputAnalysis.articleStats,
            seoReport: outputAnalysis.seoReport,
            htmlReady: modweebArticleHTML,
            blocks: modweebBlocks,
            version: 3,
            exported: new Date().toISOString()
        }, null, 2), title + '.json', 'application/json');
    } else if (format === 'copy-snippet') {
        navigator.clipboard.writeText(modweebArticleHTML).then(() => { modweebShowStatus('تم النسخ', 2500); closeSheet('exportSheet'); });
        return;
    }
    closeSheet('exportSheet');
    modweebShowStatus('تم التصدير: ' + format.toUpperCase(), 2500);
}
function modweebDownloadText(content, filename, mime){
    const blob = new Blob([content], {type: mime + ';charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}
function htmlToMarkdown(html){
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    let md = '';
    function walk(node){
        if (node.nodeType === 3) { md += node.textContent; return; }
        if (node.nodeType !== 1) return;
        const tag = node.tagName.toLowerCase();
        const inner = () => Array.from(node.childNodes).forEach(walk);
        if (tag === 'h1') { md += '\n# '; inner(); md += '\n\n'; }
        else if (tag === 'h2') { md += '\n## '; inner(); md += '\n\n'; }
        else if (tag === 'h3') { md += '\n### '; inner(); md += '\n\n'; }
        else if (['h4','h5','h6'].includes(tag)) { md += '\n#### '; inner(); md += '\n\n'; }
        else if (tag === 'p') { md += '\n'; inner(); md += '\n\n'; }
        else if (tag === 'strong' || tag === 'b') { md += '**'; inner(); md += '**'; }
        else if (tag === 'em' || tag === 'i') { md += '_'; inner(); md += '_'; }
        else if (tag === 'a') { md += '['; inner(); md += '](' + (node.getAttribute('href')||'#') + ')'; }
        else if (tag === 'img') { md += '![](' + (node.getAttribute('src')||'') + ')'; }
        else if (tag === 'li') { md += '\n- '; inner(); }
        else if (tag === 'ul' || tag === 'ol') { inner(); md += '\n'; }
        else if (tag === 'blockquote') { md += '\n> '; inner(); md += '\n\n'; }
        else if (tag === 'br') { md += '\n'; }
        else if (tag === 'hr') { md += '\n---\n'; }
        else if (tag === 'table') {
            const rows = Array.from(node.querySelectorAll('tr'));
            rows.forEach((row, ri) => {
                const cells = Array.from(row.querySelectorAll('td,th')).map(c => c.textContent.trim());
                md += '| ' + cells.join(' | ') + ' |\n';
                if (ri === 0) md += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
            });
            md += '\n';
        }
        else if (tag === 'code') { md += '`'; inner(); md += '`'; }
        else if (tag === 'pre') { md += '\n```\n'; inner(); md += '\n```\n\n'; }
        else { inner(); }
    }
    Array.from(tmp.childNodes).forEach(walk);
    return md.replace(/\n{3,}/g, '\n\n').trim();
}

/* ============================================================
   23. Smart Assistant
   ============================================================ */
function openSmartAssistant(){
    const topic = (document.getElementById('aiTopic')||{}).value || (document.getElementById('aiMainKeyword')||{}).value || '';
    const ctx = document.getElementById('smartContextTopic');
    if (ctx && topic && !ctx.value) ctx.value = topic;
    const prev = document.getElementById('smartResultPreview');
    if (prev) prev.style.display = 'none';
    window._smartLastHTML = '';
    openSheet('smartAssistantSheet');
}
function smartSetPrompt(txt){ const i = document.getElementById('smartPromptInput'); if (i) { i.value = txt; i.focus(); } }
window._smartFormat = 'html';
function smartSetFormat(fmt){
    window._smartFormat = fmt;
    document.getElementById('smartFormatHtmlBtn').classList.toggle('active', fmt === 'html');
    document.getElementById('smartFormatPlainBtn').classList.toggle('active', fmt === 'plain');
    const c = document.getElementById('smartResultContent');
    const last = window._smartLastResult || {};
    if (c && last.html !== undefined) c.textContent = fmt === 'html' ? (last.html||'') : (last.result || last.html || '');
}
function smartCopyResult(){
    const fmt = window._smartFormat || 'html';
    const last = window._smartLastResult || {};
    const text = fmt === 'html' ? (last.html||'') : (last.result || last.html || '');
    if (!text.trim()) { modweebShowStatus('لا يوجد محتوى'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => modweebShowStatus('تم النسخ', 2000));
    else { const ta = document.createElement('textarea'); ta.value = text; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); modweebShowStatus('تم النسخ', 2000); }
}
async function smartGenerate(){
    const prompt = (document.getElementById('smartPromptInput')||{}).value || '';
    if (!prompt.trim()) { modweebShowStatus('اكتب أمراً أولاً'); return; }
    const topic = (document.getElementById('smartContextTopic')||{}).value || '';
    const lang  = (document.getElementById('aiLanguage')||{}).value || 'ar';
    const fmt   = window._smartFormat || 'html';
    const btn = document.getElementById('smartGenBtn');
    const prog = document.getElementById('smartProgressBar');
    const prev = document.getElementById('smartResultPreview');
    const content = document.getElementById('smartResultContent');
    const copyBtn = document.getElementById('smartCopyBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري التوليد...'; }
    if (prog) prog.style.display = 'block';
    if (prev) prev.style.display = 'none';
    if (copyBtn) copyBtn.style.display = 'none';

    const { systemPrompt, userPrompt } = window.modweebPrompts.smartAssistant({ prompt: prompt.trim(), topic, language: lang, format: fmt });

    try {
        const raw = await window.modweebAI.call({ systemPrompt, userPrompt, maxTokens: 2000 });
        const cleaned = String(raw)
            .replace(/^\s*```html[\r\n]*/im, '')
            .replace(/^\s*```[\r\n]*/im, '')
            .replace(/[\r\n]*```\s*$/im, '')
            .trim();
        window._smartLastResult = { html: cleaned };
        window._smartLastHTML = cleaned;
        if (content) content.textContent = cleaned || '(لا نتيجة)';
        if (prev) prev.style.display = 'block';
        if (copyBtn) copyBtn.style.display = 'inline-flex';
        modweebShowStatus('تم التوليد');
    } catch(e) { modweebShowStatus('فشل: ' + (e.message || '')); }
    finally { if (btn) { btn.disabled = false; btn.textContent = 'توليد'; } if (prog) prog.style.display = 'none'; }
}
function smartInsertResult(){
    const html = window._smartLastHTML || '';
    if (!html.trim()) { modweebShowStatus('لا يوجد محتوى'); return; }
    try {
        const existing = JSON.parse(JSON.stringify(modweebBlocks || []));
        modweebBlocks = [];
        if (typeof convertHTMLToBlocks === 'function') convertHTMLToBlocks(html);
        let generated = JSON.parse(JSON.stringify(modweebBlocks || []));
        if (!generated.length) generated = [{id: Date.now() + '-smart', type: 'paragraph', content: html, paragraphStyle: 'normal'}];
        if (typeof window.modweebCommitBlocks === 'function') {
            window.modweebCommitBlocks(existing.concat(generated), { save: true });
        } else {
            modweebBlocks = existing.concat(generated);
            modweebSaveToHistory();
        }
        modweebShowStatus('تمت إضافة ' + generated.length + ' عنصر');
    } catch(e) { modweebShowStatus('فشلت الإضافة: ' + e.message); }
    closeSheet('smartAssistantSheet');
}

/* ============================================================
   24. Blogger Publish
   ============================================================ */
let currentAccessToken = null, tokenExpiryTime = 0;
const BLOGGER_CONFIG = {
    BLOG_ID: "",
    API_KEY: "",
    CLIENT_ID: ".",
    CLIENT_SECRET: "",
    REFRESH_TOKEN: ""
};

async function refreshAccessToken(){
    // Avoid an invalid OAuth request during startup before Blogger settings load.
    if (!String(BLOGGER_CONFIG.REFRESH_TOKEN || '').trim()) return false;
    modweebShowStatus("جاري تجديد الصلاحية", 2000);
    const p = new URLSearchParams();
    p.append("client_id", BLOGGER_CONFIG.CLIENT_ID);
    p.append("client_secret", BLOGGER_CONFIG.CLIENT_SECRET);
    p.append("refresh_token", BLOGGER_CONFIG.REFRESH_TOKEN);
    p.append("grant_type", "refresh_token");
    try {
        const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded"}, body: p });
        const d = await r.json();
        if (d.access_token) {
            currentAccessToken = d.access_token;
            tokenExpiryTime = Date.now() + (d.expires_in - 30) * 1000;
            modweebShowStatus("الصلاحية جاهزة", 1000);
            return true;
        }
        modweebShowStatus("فشل التجديد: " + (d.error_description || ""), 4000);
        return false;
    } catch(e) { modweebShowStatus("خطأ في الاتصال", 3000); return false; }
}
async function getValidAccessToken(){
    if (currentAccessToken && Date.now() < tokenExpiryTime) return currentAccessToken;
    return (await refreshAccessToken()) ? currentAccessToken : null;
}

function modweebToSlug(title){
    const map = [['لأ','la'],['لإ','li'],['لآ','laa'],['لا','la'],['أ','a'],['إ','i'],['آ','aa'],['ا','a'],['ب','b'],['ت','t'],['ث','th'],['ج','j'],['ح','h'],['خ','kh'],['د','d'],['ذ','dh'],['ر','r'],['ز','z'],['س','s'],['ش','sh'],['ص','s'],['ض','d'],['ط','t'],['ظ','z'],['ع','a'],['غ','gh'],['ف','f'],['ق','q'],['ك','k'],['ل','l'],['م','m'],['ن','n'],['ه','h'],['و','w'],['ي','y'],['ى','a'],['ة','a'],['ء',''],['ئ','y'],['ؤ','w'],['ٱ','a']];
    let r = (title || '').trim();
    r = r.replace(/[\u064B-\u065F\u0670]/g, '');
    for (const [ar, en] of map) r = r.split(ar).join(en);
    return r.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').toLowerCase();
}
function modweebAutoSlug(title, force){
    /* 🔒 معطّل: يُنشئ Blogger الرابط تلقائياً من العنوان */
    if (!MW_SLUG_ENABLED) return;
    const s = document.getElementById('bloggerPostSlug');
    if (!s) return;
    if (force || !s.value.trim()) s.value = modweebToSlug(title);
}

function toggleBloggerSection(){ openSheet('bloggerPublishSheet'); }
function showFailurePopup(msg){ document.getElementById('failureMessage').textContent = msg; openSheet('failureSheet'); }
function showSuccessPopup(url, type){
    const m = document.getElementById('successMessage');
    const i = document.getElementById('publishedUrlInput');
    if (m) m.textContent = type === 'page' ? 'تم نشر الصفحة بنجاح!' : 'تم نشر المقال بنجاح!';
    if (i) i.value = url;
    openSheet('successSheet');
}
function closeSuccessPopup(){ closeSheet('successSheet'); }
async function copyPublishedUrl(){
    const i = document.getElementById('publishedUrlInput');
    if (!i || !i.value) { modweebShowStatus('لا يوجد رابط لنسخه'); return; }
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(i.value);
        } else {
            i.select(); i.setSelectionRange(0, i.value.length);
            if (!document.execCommand('copy')) throw new Error('Clipboard unavailable');
        }
        modweebShowStatus('تم نسخ الرابط', 1500);
    } catch (error) {
        i.select();
        modweebShowStatus('تعذر النسخ التلقائي؛ انسخ الرابط المحدد يدوياً', 3000);
    }
}
function openPublishedUrl(){
    const i = document.getElementById('publishedUrlInput');
    try {
        const url = new URL(i ? i.value : '');
        if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Invalid URL');
        window.open(url.href, '_blank', 'noopener,noreferrer');
    } catch (error) {
        modweebShowStatus('رابط المنشور غير صالح');
    }
}

function sanitizeSlugEnglish(raw){
    if (!raw) return '';
    return raw.toString().trim().toLowerCase().replace(/[^a-z0-9\-\s]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

async function publishToBlogger(retry){
    if (retry === undefined) retry = 0;
    const blogId = (document.getElementById('bloggerBlogId')||{}).value?.trim() || BLOGGER_CONFIG.BLOG_ID;
    const postType = (document.getElementById('bloggerPostType')||{}).value || 'post';
    const title = (document.getElementById('bloggerPostTitle')||{}).value?.trim() || '';
    const labels = (document.getElementById('bloggerPostLabels')||{}).value?.trim() || '';
    const slug = (document.getElementById('bloggerPostSlug')||{}).value?.trim() || '';
    if (!title) { showFailurePopup('يرجى إدخال عنوان المقال'); return; }
    if (!modweebArticleHTML || !modweebArticleHTML.trim()) generateFullHTML();
    if (!modweebArticleHTML || !modweebArticleHTML.trim()) { showFailurePopup('لا يوجد محتوى'); return; }
    const publishBtn = document.querySelector('#bloggerPublishSheet .action-btn.primary');
    const origHTML = publishBtn ? publishBtn.innerHTML : '';
    if (publishBtn) { publishBtn.disabled = true; publishBtn.innerHTML = 'جاري النشر...'; }
    try {
        const token = await getValidAccessToken();
        if (!token) throw new Error('تعذر الحصول على صلاحية صالحة.');
        const cleanLabels = labels.split(',').map(l => l.trim()).filter(l => l.length > 0);
        const postData = { kind: 'blogger#' + postType, blog: {id: blogId}, title, content: modweebArticleHTML.includes('<!--more-->') ? modweebArticleHTML : '<!--more-->\n' + modweebArticleHTML };
        if (cleanLabels.length) postData.labels = cleanLabels;
        /* 🔒 Slug معطّل: لا نرسل customMetaData — Blogger يولّد الرابط من العنوان */
if (MW_SLUG_ENABLED && slug) {
    const cs = sanitizeSlugEnglish(slug);
    if (cs) postData.customMetaData = JSON.stringify({desiredSlug: cs});
}
        const apiUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/${postType === 'page' ? 'pages' : 'posts'}/?key=${BLOGGER_CONFIG.API_KEY}`;
        const r = await fetch(apiUrl, { method: 'POST', headers: {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}, body: JSON.stringify(postData) });
        if (r.status === 401 && retry === 0) {
            if (await refreshAccessToken()) { if (publishBtn){publishBtn.innerHTML=origHTML;publishBtn.disabled=false;} return await publishToBlogger(1); }
            throw new Error('فشل تجديد الصلاحية.');
        }
        const result = await r.json();
        if (!r.ok) throw new Error(result.error?.message || 'خطأ ' + r.status);
        closeSheet('bloggerPublishSheet');
        showSuccessPopup(result.url, postType);
        modweebShowStatus('تم النشر بنجاح', 5000);
    } catch(e) {
        showFailurePopup('فشل النشر: ' + e.message);
        modweebShowStatus('فشل النشر: ' + e.message, 5000);
    } finally {
        if (publishBtn) { publishBtn.innerHTML = origHTML; publishBtn.disabled = false; }
    }
}

/* ============================================================
   25. Keyboard Shortcuts + Initialize
   ============================================================ */
function modweebHandleKeyboard(e){
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    else if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveToLocalStorage(); }
}
function modweebUpdateDragButton(){
    const b = document.getElementById('dragToggleBtn');
    if (b) b.classList.toggle('active', modweebDragEnabled);
}
function toggleDrag(){
    modweebDragEnabled = !modweebDragEnabled;
    modweebUpdateDragButton();
}
function modweebInitializeSortable(){}

document.addEventListener("DOMContentLoaded", function(){
    modweebLoadFromLocalStorage();
    if (modweebBlocks.length === 0) modweebAddBlock("paragraph");
    document.addEventListener("keydown", modweebHandleKeyboard);
    const ok = document.getElementById('confirmOkBtn');
    const cancel = document.getElementById('confirmCancelBtn');
    if (ok) ok.addEventListener('click', () => closeConfirmSheet(true));
    if (cancel) cancel.addEventListener('click', () => closeConfirmSheet(false));
    const ov = document.getElementById('genericOverlay');
    if (ov) ov.addEventListener('click', closeAllSheets);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

// تعليمات افتراضية لحقل "تعليمات إضافية" في نافذة AI
const cr = document.getElementById('aiCustomRequest');
if (cr && !cr.value.trim()) {
    cr.value =
"";
}
});

(async function(){
    try { await getValidAccessToken(); } catch(e){}
})();
