export interface ArticleSectionPolicyOptions {
  topic?: string;
  customRequest?: string;
  articleType?: string;
  hasTables?: boolean;
  hasLists?: boolean;
  hasInstructions?: boolean;
  hasQuotes?: boolean;
  hasKeyPoints?: boolean;
  hasNotes?: boolean;
  hasAlerts?: boolean;
  hasBlur?: boolean;
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
  basics: ['type', 'metaDescription'],
  heading: ['type', 'content', 'headingLevel', 'headingBefore', 'headingAfter'],
  paragraph: ['type', 'content', 'paragraphStyle', 'refSource'],
  toc: ['type', 'tocLabel', 'tocStyle', 'tocManualItems'],
  note: ['type', 'content', 'noteStyle', 'noteTitle'],
  alert: ['type', 'content', 'alertStyle', 'alertOutlined', 'alertTitle'],
  blockquote: ['type', 'content', 'quoteAuthor', 'quoteStyle'],
  steps: ['type', 'steps'],
  list: ['type', 'listItems', 'listStyle'],
  keyPoints: ['type', 'items'],
  table: ['type', 'tableRows', 'tableCols', 'tableData', 'tableClasses'],
  accordion: ['type', 'summary', 'content', 'accordionType', 'accordions'],
  faq: ['type', 'faqItems'],
  spoiler: ['type', 'content', 'accordionType', 'spoilerBlurText'],
  code: ['type', 'codeContent', 'codeLanguage', 'codeComment', 'codeSource', 'codeLines', 'codeCopy', 'codeHighlight', 'codeSyntax'],
  mark: ['type', 'markText', 'markClass'],
  image: ['type', 'imageStyle', 'imageUrl', 'imageAlt', 'imageLightbox', 'imageCaptionStyle', 'imageDisableCaption', 'caption', 'gridUrls'],
  lazyYt: ['type', 'youtubeId', 'youtubeMode', 'ratio'],
};

function isRecord(value: unknown): value is RecordValue {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function userUrls(options: ArticleSectionPolicyOptions): Set<string> {
  const source = [options.topic, options.customRequest, options.mainKeyword, options.keywords].filter(Boolean).join('\n');
  const candidates = source.match(/https?:\/\/[^\s<>"']+/gi) || [];
  return new Set(candidates.map((url) => url.replace(/[),.;!?،؛]+$/g, '')));
}

function validUrl(value: unknown, allowed: Set<string>): string | undefined {
  const candidate = text(value)?.replace(/[),.;!?،؛]+$/g, '');
  if (!candidate || !allowed.has(candidate)) return undefined;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function positiveRequest(customRequest: string, english: RegExp, arabic: RegExp): boolean {
  return english.test(customRequest) || arabic.test(customRequest);
}

function allowedSectionTypes(options: ArticleSectionPolicyOptions, urls: Set<string>): Set<string> {
  const custom = options.customRequest || '';
  const types = new Set(['basics', 'heading', 'paragraph', 'toc']);
  if (options.hasNotes) types.add('note');
  if (options.hasAlerts) types.add('alert');
  if (options.hasQuotes) types.add('blockquote');
  if (options.hasLists) types.add('list');
  if (options.hasInstructions) types.add('steps');
  if (options.hasKeyPoints) types.add('keyPoints');
  if (options.hasTables || positiveRequest(custom, /\b(?:add|include|create|insert)\b.{0,40}\btable\b/i, /(?:أضف|اضف|أدرج|ادرج|أنشئ|انشئ|استخدم).{0,40}(?:جدول)/i)) types.add('table');
  if (options.hasBlur || positiveRequest(custom, /\b(?:add|include|create|insert)\b.{0,40}\b(?:spoiler|blur)\b/i, /(?:أضف|اضف|أدرج|ادرج|أنشئ|انشئ).{0,40}(?:إخفاء|تمويه|حرق)/i)) types.add('spoiler');
  if (options.hasCode || positiveRequest(custom, /\b(?:add|include|create|show)\b.{0,40}\bcode\b/i, /(?:أضف|اضف|أدرج|ادرج|اكتب|أنشئ|انشئ).{0,40}(?:كود|شفرة|مثال برمجي)/i)) types.add('code');
  if (options.hasImages && urls.size > 0) types.add('image');
  if (options.hasYoutube && !!text(options.youtubeReference)) types.add('lazyYt');

  const faqDenied = /(?:لا\s*(?:تضف|تدرج|تنشئ|تكتب)|بدون|دون|تجنب|استبعد).{0,35}(?:faq|الأسئلة?\s*(?:الشائعة|وأجوبة)|اسئلة\s*(?:شائعة|واجوبة))/i.test(custom);
  const faqRequested = options.articleType === 'faq' || options.articleType === 'faqpage'
    || positiveRequest(custom, /\b(?:add|include|create|write|make)\b.{0,45}\bfaq\b/i, /(?:أضف|اضف|أدرج|ادرج|أنشئ|انشئ|اكتب|اجعل).{0,45}(?:faq|الأسئلة?\s*(?:الشائعة|وأجوبة)|اسئلة\s*(?:شائعة|واجوبة))/i);
  if (faqRequested && !faqDenied) types.add('faq');

  if (positiveRequest(custom, /\b(?:add|include|create|use)\b.{0,40}\baccordion\b/i, /(?:أضف|اضف|أدرج|ادرج|أنشئ|انشئ|استخدم).{0,40}(?:قسم مطوي|أكورديون|قائمة قابلة للطي)/i)) types.add('accordion');
  if (positiveRequest(custom, /\b(?:add|include|create|highlight)\b.{0,40}\bmark\b/i, /(?:أضف|اضف|أبرز|استخدم).{0,40}(?:تمييز|نص مميز|تظليل)/i)) types.add('mark');
  if (positiveRequest(custom, /\b(?:add|include|create)\b.{0,40}\b(?:key points|keypoints)\b/i, /(?:أضف|اضف|أدرج|ادرج).{0,40}(?:نقاط رئيسية|أهم النقاط)/i)) types.add('keyPoints');
  return types;
}

function copyKnownFields(section: RecordValue, type: string, urls: Set<string>): RecordValue | null {
  const result: RecordValue = { type };
  for (const key of SECTION_FIELDS[type]) {
    if (key === 'type' || section[key] === undefined) continue;
    const value = section[key];
    if (['headingLevel', 'paragraphStyle', 'tocStyle', 'noteStyle', 'alertStyle', 'quoteStyle', 'listStyle', 'accordionType', 'codeLanguage', 'imageStyle', 'imageCaptionStyle', 'markClass', 'youtubeMode', 'ratio'].includes(key)) {
      const validValues: Record<string, string[]> = {
        headingLevel: ['h1','h2','h3','h4','h5','h6'], paragraphStyle: ['normal','indent','dropcap','ref'], tocStyle: ['automatic','manual'],
        noteStyle: ['info','warning','question'], alertStyle: ['info','warning','success','error','tip','question'], quoteStyle: ['normal','s1','s2'],
        listStyle: ['default','s1'], accordionType: ['ac','ac alt','sp','group','blur'], codeLanguage: ['html','css','js','json'],
        imageStyle: ['standard','full','figure','grid','scroll','lazyload','showall'], imageCaptionStyle: ['figure','table'],
        markClass: ['','block','red','gray','orange','blue','green','gold','purple'], youtubeMode: ['lazy','defer'], ratio: ['16/9','4/3'],
      };
      if (typeof value === 'string' && validValues[key].includes(value)) result[key] = value;
      continue;
    }
    if (['content','metaDescription','headingBefore','headingAfter','refSource','tocLabel','noteTitle','alertTitle','quoteAuthor','summary','spoilerBlurText','codeContent','codeComment','codeSource','codeLines','markText','imageAlt','caption','tableClasses'].includes(key)) {
      if (typeof value === 'string') result[key] = value;
      continue;
    }
    if (['alertOutlined','codeCopy','codeHighlight','codeSyntax','imageLightbox','imageDisableCaption'].includes(key)) {
      if (typeof value === 'boolean') result[key] = value;
      continue;
    }
    if (['steps','listItems','items'].includes(key)) {
      if (Array.isArray(value)) result[key] = value.map(text).filter((item): item is string => !!item);
      continue;
    }
    if (key === 'faqItems' && Array.isArray(value)) {
      result[key] = value.filter(isRecord).map((item) => ({ question: text(item.question) || '', answer: text(item.answer) || '' })).filter((item) => item.question && item.answer);
      continue;
    }
    if (key === 'tocManualItems' && Array.isArray(value)) {
      result[key] = value.filter(isRecord).map((item) => ({ text: text(item.text) || '', id: text(item.id) || '' })).filter((item) => item.text);
      continue;
    }
    if (key === 'accordions' && Array.isArray(value)) {
      result[key] = value.filter(isRecord).map((item) => ({ summary: text(item.summary) || '', content: text(item.content) || '', alt: item.alt === true })).filter((item) => item.summary && item.content);
      continue;
    }
    if (key === 'tableRows' || key === 'tableCols') {
      if (typeof value === 'number' && Number.isFinite(value)) result[key] = Math.max(0, Math.min(30, Math.floor(value)));
      continue;
    }
    if (key === 'tableData' && Array.isArray(value)) {
      result[key] = value.slice(0, 30).filter(Array.isArray).map((row) => (row as unknown[]).slice(0, 12).map((cell) => String(cell ?? '').slice(0, 500)));
      continue;
    }
    if (key === 'imageUrl') {
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

  if (type === 'faq' && (!Array.isArray(result.faqItems) || result.faqItems.length === 0)) return null;
  if (type === 'image' && !result.imageUrl && !result.gridUrls) return null;
  if (type === 'table' && (!Array.isArray(result.tableData) || result.tableData.length === 0)) return null;
  if (type === 'heading' && !text(result.content)) return null;
  if (type === 'paragraph' && !text(result.content)) return null;
  if (type === 'list' && (!Array.isArray(result.listItems) || result.listItems.length === 0)) return null;
  if (type === 'steps' && (!Array.isArray(result.steps) || result.steps.length === 0)) return null;
  if (type === 'keyPoints' && (!Array.isArray(result.items) || result.items.length === 0)) return null;
  if (type === 'accordion' && !text(result.summary) && (!Array.isArray(result.accordions) || result.accordions.length === 0)) return null;
  if (type === 'code' && !text(result.codeContent)) return null;
  if (type === 'mark' && !text(result.markText)) return null;
  return result;
}

/** Strip unrequested or unsupported article blocks after any provider returns JSON. */
export function normalizeArticleSections(data: unknown, options: ArticleSectionPolicyOptions = {}): NormalizedArticleOutput | null {
  if (!isRecord(data) || !Array.isArray(data.sections)) return null;
  const urls = userUrls(options);
  const allowed = allowedSectionTypes(options, urls);
  const sections = data.sections.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.type !== 'string' || !allowed.has(candidate.type) || !SECTION_FIELDS[candidate.type]) return [];
    const section = copyKnownFields(candidate, candidate.type, urls);
    return section ? [section] : [];
  });
  return { ...data, sections };
}
