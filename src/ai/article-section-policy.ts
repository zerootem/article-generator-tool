import { analyzeArticleSections } from './article-output';

export interface ArticleSectionPolicyOptions {
  topic?: string;
  customRequest?: string;
  articleType?: string;
  hasTables?: boolean;
  hasH3?: boolean;
  hasH4?: boolean;
  hasLists?: boolean;
  hasInstructions?: boolean;
  hasQuotes?: boolean;
  hasKeyPoints?: boolean;
  hasNotes?: boolean;
  hasAlerts?: boolean;
  hasBlur?: boolean;
  hasMark?: boolean;
  hasAccordionVariants?: boolean;
  hasCode?: boolean;
  hasImages?: boolean;
  hasYoutube?: boolean;
  youtubeReference?: string;
  mainKeyword?: string;
  keywords?: string;
}

type RecordValue = Record<string, unknown>;
export type NormalizedArticleOutput = RecordValue & { sections: RecordValue[] };

const SECTION_FIELDS: Record<string, string[]> = {
  basics: ['type', 'metaDescription', 'thumbnailUrl', 'subtitle'],
  heading: ['type', 'content', 'headingLevel', 'headingBefore', 'headingAfter'],
  paragraph: ['type', 'content', 'paragraphStyle', 'dropCapChar', 'refSource'],
  toc: ['type', 'tocLabel', 'tocStyle', 'tocManualItems'],
  note: ['type', 'content', 'noteStyle', 'noteTitle'],
  alert: ['type', 'content', 'alertStyle', 'alertOutlined', 'alertTitle'],
  blockquote: ['type', 'content', 'quoteAuthor', 'quoteStyle'],
  steps: ['type', 'steps'],
  list: ['type', 'listItems', 'listStyle'],
  keyPoints: ['type', 'items'],
  table: ['type', 'tableRows', 'tableCols', 'tableData', 'tableClasses'],
  accordion: ['type', 'summary', 'content', 'accordionType', 'accordions'],
  accordionGroup: ['type', 'summary', 'content', 'accordionType', 'accordions'],
  faq: ['type', 'faqItems'],
  spoiler: ['type', 'summary', 'content', 'accordionType', 'spoilerBlurText'],
  code: ['type', 'codeContent', 'codeLanguage', 'codeComment', 'codeSource', 'codeLines', 'codeCopy', 'codeHighlight', 'codeSyntax'],
  codeTabs: ['type', 'tabHtml', 'tabHtmlSource', 'tabCss', 'tabCssSource', 'tabJs', 'tabJsSource', 'tabJson', 'tabJsonSource'],
  inlineCode: ['type', 'inlineCode'],
  kbd: ['type', 'kbdText'],
  mark: ['type', 'markText', 'markClass'],
  image: ['type', 'imageStyle', 'imageUrl', 'imageAlt', 'imageWidth', 'imageHeight', 'imageLightbox', 'imageCaptionStyle', 'imageDisableCaption', 'caption', 'gridUrls', 'scrollHeight'],
  lazyYt: ['type', 'youtubeId', 'youtubeMode', 'ratio'],
  link: ['type', 'linkText', 'linkUrl', 'linkStyle'],
  button: ['type', 'buttonText', 'buttonUrl', 'buttonIcon', 'buttonOutlined'],
  downloadBox: ['type', 'fileName', 'fileSize', 'downloadFile'],
  audioPlayer: ['type', 'audioUrl', 'audioTitle', 'audioPreload'],
  videoPlayer: ['type', 'videoUrl', 'videoPoster', 'videoType', 'videoPreload', 'videoWidth'],
  relatedManual: ['type', 'relatedTitle', 'relatedLinks'],
  relatedAuto: ['type', 'relatedAutoLabel', 'relatedMax', 'relatedDataLabel', 'relatedSortBy', 'relatedRandom'],
};
const REQUIRED_OPENING_NOTE = 'تم إعداد هذا المقال عبر ModWeeb AI باستخدام تقنيات توليد المحتوى الحديثة مع التركيز على الوضوح والدقة.';
const REQUIRED_POST_REFERENCE = "<!--[ Post Reference paragraph ]--><p class='pRef'>المصدر: ModWeeb<br>تم إعداد وتنسيق المقال عبر ModWeeb AI</p>";

function isRecord(value: unknown): value is RecordValue {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function inputText(options: ArticleSectionPolicyOptions): string {
  return [options.topic, options.customRequest, options.mainKeyword, options.keywords].filter(Boolean).join('\n');
}

function userUrls(options: ArticleSectionPolicyOptions): Set<string> {
  const candidates = inputText(options).match(/https?:\/\/[^\s<>"']+/gi) || [];
  const paths = inputText(options).match(/(?:^|\s)\/(?!\/)[A-Za-z0-9_\-./?=&%#\u0600-\u06ff]+/g) || [];
  return new Set([...candidates, ...paths].map((url) => url.trim().replace(/[),.;!?،؛]+$/g, '')));
}

function validUrl(value: unknown, allowed: Set<string>): string | undefined {
  const candidate = text(value)?.replace(/[),.;!?،؛]+$/g, '');
  if (!candidate || !allowed.has(candidate)) return undefined;
  if (candidate.startsWith('/') && !candidate.startsWith('//') && !/[\s<>"'\\]/.test(candidate)
      && !candidate.split(/[/?#]/).some((part) => part === '.' || part === '..')) return candidate;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function sanitizeInlineHtml(value: string, urls: Set<string>): string {
  const input = value.replace(/<(script|style|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  return input.replace(/<!--[\s\S]*?-->|<\/?([a-z][\w-]*)\b([^>]*)>/gi, (tag, name: string, attributes: string) => {
    if (tag.startsWith('<!--')) return tag === '<!--[ Post Reference paragraph ]-->' ? tag : '';
    const type = String(name || '').toLowerCase();
    const closing = /^<\//.test(tag);
    if (['strong','b','em','i','code','br'].includes(type)) return type === 'br' ? '<br>' : closing ? `</${type}>` : `<${type}>`;
    if (type === 'a') {
      if (closing) return '</a>';
      const href = attributes.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2] || '';
      const safeUrl = validUrl(href, urls);
      return safeUrl ? `<a href="${safeUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer">` : '';
    }
    if (type === 'p') {
      if (closing) return '</p>';
      const className = attributes.match(/\bclass\s*=\s*(["'])(note|pRef)\1/i)?.[2];
      return className ? `<p class="${className}">` : '<p>';
    }
    return '';
  });
}

function sanitizePlainText(value: string, urls: Set<string>): string {
  return sanitizeInlineHtml(value, urls).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function positiveRequest(customRequest: string, english: RegExp, arabic: RegExp): boolean {
  return english.test(customRequest) || arabic.test(customRequest);
}

function allowedSectionTypes(options: ArticleSectionPolicyOptions, urls: Set<string>): Set<string> {
  const custom = options.customRequest || '';
  const types = new Set(['basics', 'heading', 'paragraph', 'toc', 'steps', 'accordion', 'faq']);
  if (options.hasAccordionVariants) types.add('accordionGroup');
  if (options.hasNotes || positiveRequest(custom, /\b(?:add|include|create|insert)\b.{0,35}\bnote\b/i, /(?:أضف|اضف|أدرج|ادرج|أنشئ|انشئ).{0,35}(?:ملاحظة|تنويه)/i)) types.add('note');
  if (options.hasAlerts || positiveRequest(custom, /\b(?:add|include|create|insert)\b.{0,35}\balert\b/i, /(?:أضف|اضف|أدرج|ادرج|أنشئ|انشئ).{0,35}(?:تنبيه)/i)) types.add('alert');
  if (options.hasQuotes || positiveRequest(custom, /\b(?:add|include|insert)\b.{0,35}\bquote\b/i, /(?:أضف|اضف|أدرج|ادرج).{0,35}(?:اقتباس)/i)) types.add('blockquote');
  if (options.hasLists || positiveRequest(custom, /\b(?:add|include|create|insert)\b.{0,35}\blist\b/i, /(?:أضف|اضف|أدرج|ادرج|أنشئ|انشئ).{0,35}(?:قائمة)/i)) types.add('list');
  if (options.hasInstructions || positiveRequest(custom, /\b(?:add|include|create|insert)\b.{0,35}\bsteps?\b/i, /(?:أضف|اضف|أدرج|ادرج|أنشئ|انشئ).{0,35}(?:خطوات|خطوة بخطوة)/i)) types.add('steps');
  if (options.hasKeyPoints || positiveRequest(custom, /\b(?:add|include|create)\b.{0,40}\b(?:key points|keypoints)\b/i, /(?:أضف|اضف|أدرج|ادرج).{0,40}(?:نقاط رئيسية|أهم النقاط)/i)) types.add('keyPoints');
  if (options.hasTables || positiveRequest(custom, /\b(?:add|include|create|insert)\b.{0,40}\btable\b/i, /(?:أضف|اضف|أدرج|ادرج|أنشئ|انشئ|استخدم).{0,40}(?:جدول)/i)) types.add('table');
  if (options.hasBlur || positiveRequest(custom, /\b(?:add|include|create|insert)\b.{0,40}\b(?:spoiler|blur)\b/i, /(?:أضف|اضف|أدرج|ادرج|أنشئ|انشئ).{0,40}(?:إخفاء|تمويه|حرق)/i)) types.add('spoiler');
  const codeRequested = options.hasCode || positiveRequest(custom, /\b(?:add|include|create|show)\b.{0,40}\b(?:code|code tabs|inline code)\b/i, /(?:أضف|اضف|أدرج|ادرج|اكتب|أنشئ|انشئ).{0,40}(?:كود|شفرة|مثال برمجي|كود متعدد)/i);
  if (codeRequested) {
    types.add('code');
    types.add('codeTabs');
    types.add('inlineCode');
  }
  if (positiveRequest(custom, /\b(?:add|include|show)\b.{0,40}\b(?:kbd|keyboard shortcut)\b/i, /(?:أضف|اضف|أدرج|ادرج|اعرض).{0,40}(?:اختصار لوحة المفاتيح|مفتاح الاختصار)/i)) types.add('kbd');
  if (options.hasImages && urls.size > 0) types.add('image');
  if (options.hasYoutube && !!text(options.youtubeReference)) types.add('lazyYt');

  if (urls.size > 0 && positiveRequest(custom, /\b(?:add|include|create|insert|use)\b.{0,50}\b(?:links?|sources?|references?)\b/i, /(?:أضف|اضف|أدرج|ادرج|أنشئ|انشئ|استخدم).{0,50}(?:رابط|روابط|مصدر|مصادر|مرجع|مراجع)/i)) types.add('link');
  if (urls.size > 0 && positiveRequest(custom, /\b(?:add|include|create|insert)\b.{0,40}\bbutton\b/i, /(?:أضف|اضف|أدرج|ادرج|أنشئ|انشئ).{0,40}(?:زر)/i)) types.add('button');
  if (urls.size > 0 && positiveRequest(custom, /\b(?:add|include|create|insert)\b.{0,40}\bdownload\s*box\b/i, /(?:أضف|اضف|أدرج|ادرج|أنشئ|انشئ).{0,40}(?:صندوق|مربع|كتلة)\s*(?:ال)?(?:تحميل|تنزيل)/i)) types.add('downloadBox');
  if (urls.size > 0 && positiveRequest(custom, /\b(?:add|include|insert|embed)\b.{0,45}\baudio(?:\s+player)?\b/i, /(?:أضف|اضف|أدرج|ادرج|ضمّن|ضمن).{0,45}(?:مشغل\s*(?:الصوت|صوت)|ملف\s*صوتي)/i)) types.add('audioPlayer');
  if (urls.size > 0 && positiveRequest(custom, /\b(?:add|include|insert|embed)\b.{0,45}\bvideo(?:\s+player)?\b/i, /(?:أضف|اضف|أدرج|ادرج|ضمّن|ضمن).{0,45}(?:مشغل\s*(?:الفيديو|فيديو)|ملف\s*فيديو)/i)) types.add('videoPlayer');
  if (urls.size > 0 && positiveRequest(custom, /\b(?:add|include|create|insert)\b.{0,55}\bmanual related links?\b/i, /(?:أضف|اضف|أدرج|ادرج|أنشئ|انشئ).{0,55}(?:روابط|منشورات)\s*(?:يدوية\s*)?(?:ذات صلة|مشابهة)/i)) types.add('relatedManual');
  if (positiveRequest(custom, /\b(?:add|include|create|insert)\b.{0,55}\b(?:auto(?:matic)? related posts?|related posts?)\b/i, /(?:أضف|اضف|أدرج|ادرج|أنشئ|انشئ).{0,55}(?:منشورات|مقالات)\s*(?:تلقائية\s*)?(?:ذات صلة|مشابهة)/i)) types.add('relatedAuto');

  if (positiveRequest(custom, /\b(?:add|include|create|use)\b.{0,40}\baccordion\b/i, /(?:أضف|اضف|أدرج|ادرج|أنشئ|انشئ|استخدم).{0,40}(?:قسم مطوي|أكورديون|قائمة قابلة للطي)/i)) types.add('accordion');
  if (positiveRequest(custom, /\b(?:add|include|create|use)\b.{0,40}\baccordion group\b/i, /(?:أضف|اضف|أدرج|ادرج|أنشئ|انشئ|استخدم).{0,40}(?:مجموعة أقسام مطوية|مجموعة أكورديون)/i)) types.add('accordionGroup');
  if (positiveRequest(custom, /\b(?:add|include|create|highlight)\b.{0,40}\bmark\b/i, /(?:أضف|اضف|أبرز|استخدم).{0,40}(?:تمييز|نص مميز|تظليل)/i)) types.add('mark');
  if (options.hasMark) types.add('mark');
  return types;
}

function inputContains(value: string, source: string): boolean {
  const normalizedSource = source.toLocaleLowerCase();
  return normalizedSource.includes(value.trim().toLocaleLowerCase());
}

function filenameFromUrl(value: string): string | undefined {
  try {
    const path = new URL(value).pathname.split('/').filter(Boolean).pop();
    return path ? decodeURIComponent(path) : undefined;
  } catch {
    return undefined;
  }
}

function copyKnownFields(section: RecordValue, type: string, urls: Set<string>, options: ArticleSectionPolicyOptions): RecordValue | null {
  const result: RecordValue = { type };
  const sourceText = inputText(options);
  for (const key of SECTION_FIELDS[type]) {
    if (key === 'type' || section[key] === undefined) continue;
    const value = section[key];
    if (['headingLevel', 'paragraphStyle', 'tocStyle', 'noteStyle', 'alertStyle', 'quoteStyle', 'listStyle', 'accordionType', 'codeLanguage', 'imageStyle', 'imageCaptionStyle', 'scrollHeight', 'markClass', 'youtubeMode', 'ratio', 'linkStyle', 'buttonIcon', 'audioPreload', 'videoPreload', 'videoType', 'relatedSortBy'].includes(key)) {
      const validValues: Record<string, string[]> = {
        headingLevel: ['h1','h2','h3','h4','h5','h6'], paragraphStyle: ['normal','indent','dropcap','ref'], tocStyle: ['automatic','manual'],
        noteStyle: ['info','warning','question'], alertStyle: ['info','warning','success','error','tip','question'], quoteStyle: ['normal','s1','s2'],
        listStyle: ['default','s1'], accordionType: ['ac','ac alt','sp','group','blur'], codeLanguage: ['html','css','js','json'],
        imageStyle: ['standard','full','figure','grid','scroll','lazyload','showall'], imageCaptionStyle: ['figure','table'], scrollHeight: ['h150','h200','h250'],
        markClass: ['','block','red','gray','orange','blue','green','gold','purple'], youtubeMode: ['lazy','defer'], ratio: ['16/9','4/3'],
        linkStyle: ['extL','alt','sec','button','buttonLn'], buttonIcon: ['','dl','demo'], audioPreload: ['none','metadata','auto'],
        videoPreload: ['none','metadata','auto'], videoType: ['video/mp4','video/webm','video/ogg'], relatedSortBy: ['updated','published'],
      };
      if (typeof value === 'string' && validValues[key].includes(value) && (key !== 'accordionType' || value !== 'blur' || type === 'spoiler')) result[key] = value;
      continue;
    }
    if (['content','metaDescription','subtitle','headingBefore','headingAfter','dropCapChar','refSource','tocLabel','noteTitle','alertTitle','quoteAuthor','summary','spoilerBlurText','codeContent','codeComment','codeSource','codeLines','tabHtml','tabHtmlSource','tabCss','tabCssSource','tabJs','tabJsSource','tabJson','tabJsonSource','inlineCode','kbdText','markText','imageAlt','caption','linkText','buttonText','fileName','fileSize','audioTitle','relatedTitle','relatedAutoLabel','relatedDataLabel'].includes(key)) {
      if (typeof value === 'string' && ((key !== 'audioTitle' && key !== 'relatedDataLabel') || inputContains(value, sourceText))) {
        result[key] = type === 'paragraph' && key === 'content' && value === REQUIRED_POST_REFERENCE
          ? REQUIRED_POST_REFERENCE
          : ['content','summary','spoilerBlurText'].includes(key) ? sanitizeInlineHtml(value, urls)
            : ['refSource','tocLabel','quoteAuthor','markText','caption','linkText','buttonText','fileName','fileSize','relatedTitle','relatedAutoLabel'].includes(key) ? sanitizePlainText(value, urls) : value;
      }
      continue;
    }
    if (key === 'tableClasses' && typeof value === 'string') {
      const safeClasses = value.split(/\s+/).filter((item) => ['bordered','noborder','cborder','stripped','hovered','sticky','vab','full','mh100','mhvh','mh200','mh300','sp5','sp10','sp20','primary','warning','success','error','clr','clb'].includes(item));
      if (safeClasses.length) result[key] = [...new Set(safeClasses)].join(' ');
      continue;
    }
    if (['alertOutlined','codeCopy','codeHighlight','codeSyntax','imageLightbox','imageDisableCaption','buttonOutlined','relatedRandom'].includes(key)) {
      if (typeof value === 'boolean') result[key] = value;
      continue;
    }
    if (['steps','listItems','items'].includes(key)) {
      if (Array.isArray(value)) result[key] = value.map(text).filter((item): item is string => !!item).map((item) => sanitizeInlineHtml(item, urls));
      continue;
    }
    if (key === 'faqItems' && Array.isArray(value)) {
      result[key] = value.filter(isRecord).map((item) => ({ question: sanitizeInlineHtml(text(item.question) || '', urls), answer: sanitizeInlineHtml(text(item.answer) || '', urls) })).filter((item) => item.question && item.answer).slice(0, 5);
      continue;
    }
    if (key === 'tocManualItems' && Array.isArray(value)) {
      result[key] = value.filter(isRecord).map((item) => ({ text: sanitizePlainText(text(item.text) || '', urls), id: text(item.id) || '' })).filter((item) => item.text);
      continue;
    }
    if (key === 'accordions' && Array.isArray(value)) {
      result[key] = value.filter(isRecord).map((item) => ({ summary: sanitizeInlineHtml(text(item.summary) || '', urls), content: sanitizeInlineHtml(text(item.content) || '', urls), alt: item.alt === true })).filter((item) => item.summary && item.content);
      continue;
    }
    if (key === 'relatedLinks' && Array.isArray(value)) {
      result[key] = value.filter(isRecord).map((item) => ({ text: sanitizePlainText(text(item.text) || '', urls), url: validUrl(item.url, urls) || '' }))
        .filter((item) => item.text && item.url && (inputContains(item.text, sourceText) || item.text === filenameFromUrl(item.url)));
      continue;
    }
    if (key === 'relatedMax') {
      const number = typeof value === 'number' ? value : Number(value);
      if (Number.isFinite(number)) result[key] = Math.max(1, Math.min(10, Math.floor(number)));
      continue;
    }
    if (key === 'videoWidth' && typeof value === 'string' && /^(?:100%|[1-9]\d{0,3})$/.test(value)) {
      result[key] = value;
      continue;
    }
    if (key === 'imageWidth' || key === 'imageHeight') {
      const number = typeof value === 'number' ? value : Number(value);
      if (Number.isFinite(number)) result[key] = Math.max(1, Math.min(5000, Math.floor(number)));
      continue;
    }
    if (key === 'tableRows' || key === 'tableCols') {
      if (typeof value === 'number' && Number.isFinite(value)) result[key] = Math.max(1, Math.min(10, Math.floor(value)));
      continue;
    }
    if (key === 'tableData' && Array.isArray(value)) {
      result[key] = value.slice(0, 10).filter(Array.isArray).map((row) => (row as unknown[]).slice(0, 10).map((cell) => sanitizeInlineHtml(String(cell ?? '').slice(0, 500), urls)));
      continue;
    }
    if (['imageUrl','thumbnailUrl','linkUrl','buttonUrl','downloadFile','audioUrl','videoUrl','videoPoster'].includes(key)) {
      const url = validUrl(value, urls);
      if (url) result[key] = url;
      continue;
    }
    if (key === 'gridUrls' && typeof value === 'string') {
      result[key] = value.split(/\r?\n/).map((url) => validUrl(url, urls)).filter((url): url is string => !!url).join('\n');
      continue;
    }
    if (key === 'youtubeId' && typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value)) result[key] = value;
  }

  if (type === 'faq' && (!Array.isArray(result.faqItems) || result.faqItems.length < 4)) return null;
  if (type === 'note' && result.content === REQUIRED_OPENING_NOTE) result.noteStyle = 'info';
  if (type === 'image' && !result.imageUrl && !result.gridUrls) return null;
  if (type === 'table' && (!Array.isArray(result.tableData) || result.tableData.length === 0)) return null;
  if (type === 'heading' && !text(result.content)) return null;
  if (type === 'heading' && result.headingLevel === 'h3' && options.hasH3 === false) return null;
  if (type === 'heading' && ['h4', 'h5', 'h6'].includes(String(result.headingLevel)) && options.hasH4 === false) return null;
  if (type === 'paragraph' && !text(result.content)) return null;
  if (type === 'blockquote') {
    const quote = text(result.content);
    if (!quote || !inputContains(quote, sourceText)) return null;
    if (text(result.quoteAuthor) && !inputContains(String(result.quoteAuthor), sourceText)) delete result.quoteAuthor;
  }
  if (type === 'list' && (!Array.isArray(result.listItems) || result.listItems.length === 0)) return null;
  if (type === 'steps') {
    if (!Array.isArray(result.steps) || result.steps.length < 3) return null;
    result.steps = result.steps.slice(0, 7);
  }
  if (type === 'keyPoints') {
    if (!Array.isArray(result.items) || result.items.length < 5) return null;
    result.items = result.items.slice(0, 7);
  }
  if (['accordion','accordionGroup'].includes(type) && !text(result.summary) && (!Array.isArray(result.accordions) || result.accordions.length === 0)) return null;
  if (type === 'accordion') {
    const requested = String(result.accordionType || 'ac');
      result.accordionType = options.hasAccordionVariants && ['ac alt','sp','group','blur'].includes(requested) ? requested : 'ac';
  }
  if (type === 'accordionGroup') result.accordionType = 'group';
  if (type === 'code' && !text(result.codeContent)) return null;
  if (type === 'codeTabs' && !['tabHtml','tabCss','tabJs','tabJson'].some((key) => text(result[key]))) return null;
  if (type === 'inlineCode' && !text(result.inlineCode)) return null;
  if (type === 'kbd' && !text(result.kbdText)) return null;
  if (type === 'mark' && !text(result.markText)) return null;
  if (type === 'link' && (!text(result.linkText) || !validUrl(result.linkUrl, urls))) return null;
  if (type === 'button' && (!text(result.buttonText) || !validUrl(result.buttonUrl, urls))) return null;
  if (type === 'downloadBox') {
    const fileUrl = validUrl(result.downloadFile, urls);
    const fileName = text(result.fileName);
    const fileSize = text(result.fileSize);
    const urlFileName = fileUrl ? filenameFromUrl(fileUrl) : undefined;
    const knownName = fileName && (inputContains(fileName, sourceText) || (!!urlFileName && fileName.toLocaleLowerCase() === urlFileName.toLocaleLowerCase()));
    if (!fileUrl || !knownName || !fileSize || !inputContains(fileSize, sourceText)) return null;
  }
  if (type === 'audioPlayer' && !validUrl(result.audioUrl, urls)) return null;
  if (type === 'videoPlayer' && !validUrl(result.videoUrl, urls)) return null;
  if (type === 'relatedManual' && (!Array.isArray(result.relatedLinks) || result.relatedLinks.length === 0)) return null;
  if (type === 'relatedAuto' && !result.relatedMax) result.relatedMax = 6;
  return result;
}

/** Strip unrequested or unsupported article blocks after any provider returns JSON. */
export function normalizeArticleSections(data: unknown, options: ArticleSectionPolicyOptions = {}): NormalizedArticleOutput | null {
  if (!isRecord(data) || !Array.isArray(data.sections)) return null;
  const urls = userUrls(options);
  const allowed = allowedSectionTypes(options, urls);
  const sections = data.sections.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.type !== 'string' || !SECTION_FIELDS[candidate.type]) return [];
    const isRequiredOpeningNote = candidate.type === 'note' && candidate.content === REQUIRED_OPENING_NOTE;
    if (!allowed.has(candidate.type) && !isRequiredOpeningNote) return [];
    const section = copyKnownFields(candidate, candidate.type, urls, options);
    return section ? [section] : [];
  });
  const title = text(data.title) || '';
  const metaDescription = text(data.metaDescription) || sections.find((section) => section.type === 'basics')?.metaDescription as string || '';
  const tags = Array.isArray(data.tags) ? [...new Set(data.tags.map(text).filter((tag): tag is string => !!tag))].slice(0, 12) : [];
  const analysis = analyzeArticleSections(sections, { keyword: options.mainKeyword || '', title, metaDescription });
  return { title, metaDescription, tags, sections, ...analysis, htmlReady: '' };
}
