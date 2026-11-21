export interface ArticleStats {
  wordCount: number;
  characterCount: number;
  characterCountNoSpaces: number;
  estimatedReadingMinutes: number;
  sectionCount: number;
  headingCount: number;
  paragraphCount: number;
  faqItemCount: number;
  imageCount: number;
  linkCount: number;
}

export interface SeoReport {
  focusKeyword: string;
  keywordDensity: { occurrences: number; percent: number | null };
  repetition: { repeatedInSameSentence: number; topRepeatedTerms: Array<{ term: string; count: number }> };
  recommendations: string[];
  schemaRecommendations: { types: string[]; note: string };
}

const STOP_WORDS = new Set([
  'الذي','التي','الذين','اللاتي','هذا','هذه','ذلك','تلك','هناك','على','إلى','الى','عن','من','في','مع','بين','بعد','قبل','حتى','عند','كما','كان','كانت','يكون','تكون','يمكن','قد','ما','هو','هي','أن','إن','ثم','أو','و','the','and','for','with','from','that','this','are','was','were','you','your','into','about','how','what','when','where','why','will','can','not','but','use','using'
]);

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

export function htmlToPlainText(value: unknown): string {
  return decodeEntities(String(value ?? '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?\s*>|<\/(?:p|div|li|h[1-6]|blockquote|section|tr|td|th|summary)>/gi, ' ')
    .replace(/<[^>]*>/g, ' '))
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function visibleSectionText(section: Record<string, unknown>): string[] {
  const parts: string[] = [];
  const add = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) parts.push(htmlToPlainText(value));
  };
  add(section.content);
  add(section.summary);
  add(section.markText);
  add(section.inlineCode);
  add(section.kbdText);
  add(section.codeContent);
  for (const key of ['steps', 'listItems', 'items']) {
    if (Array.isArray(section[key])) (section[key] as unknown[]).forEach(add);
  }
  for (const key of ['faqItems', 'accordions', 'tocManualItems', 'relatedLinks']) {
    if (!Array.isArray(section[key])) continue;
    for (const entry of section[key] as unknown[]) {
      if (!entry || typeof entry !== 'object') continue;
      const record = entry as Record<string, unknown>;
      add(record.question); add(record.answer); add(record.summary); add(record.content); add(record.text);
    }
  }
  if (Array.isArray(section.tableData)) {
    for (const row of section.tableData) if (Array.isArray(row)) row.forEach(add);
  }
  return parts;
}

function countInlineLinks(section: Record<string, unknown>): number {
  const inlineValues: unknown[] = [section.content, section.summary];
  for (const key of ['steps', 'listItems', 'items']) {
    if (Array.isArray(section[key])) inlineValues.push(...section[key] as unknown[]);
  }
  for (const key of ['faqItems', 'accordions']) {
    if (Array.isArray(section[key])) {
      for (const entry of section[key] as unknown[]) {
        if (!entry || typeof entry !== 'object') continue;
        const record = entry as Record<string, unknown>;
        inlineValues.push(record.question, record.answer, record.summary, record.content);
      }
    }
  }
  return inlineValues.reduce<number>((total, value) => total + (typeof value === 'string' ? (value.match(/<a\b[^>]*\bhref\s*=/gi) || []).length : 0), 0);
}

function makeStats(text: string, sectionCount: number, counts: Partial<ArticleStats> = {}): ArticleStats {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const words = normalized ? normalized.split(' ').filter(Boolean) : [];
  return {
    wordCount: words.length,
    characterCount: normalized.length,
    characterCountNoSpaces: normalized.replace(/\s/g, '').length,
    estimatedReadingMinutes: Math.max(1, Math.ceil(words.length / 200)),
    sectionCount,
    headingCount: counts.headingCount || 0,
    paragraphCount: counts.paragraphCount || 0,
    faqItemCount: counts.faqItemCount || 0,
    imageCount: counts.imageCount || 0,
    linkCount: counts.linkCount || 0,
  };
}

function normalizeForMatch(value: string): string {
  return value.toLocaleLowerCase()
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countOccurrences(text: string, phrase: string): number {
  if (!phrase) return 0;
  let count = 0;
  let from = 0;
  while (from < text.length) {
    const at = text.indexOf(phrase, from);
    if (at < 0) break;
    count += 1;
    from = at + Math.max(phrase.length, 1);
  }
  return count;
}

function buildSeoReport(text: string, keyword: string, title: string, metaDescription: string, stats: ArticleStats): SeoReport {
  const normalizedText = normalizeForMatch(text);
  const normalizedKeyword = normalizeForMatch(keyword);
  const occurrences = countOccurrences(normalizedText, normalizedKeyword);
  const keywordWords = normalizedKeyword ? normalizedKeyword.split(' ').length : 0;
  const density = stats.wordCount && keywordWords
    ? Number(((occurrences * keywordWords / stats.wordCount) * 100).toFixed(2))
    : null;
  const sentences = text.split(/[.!?؟。\n]+/).map(normalizeForMatch).filter(Boolean);
  const repeatedInSameSentence = normalizedKeyword
    ? sentences.filter((sentence) => countOccurrences(sentence, normalizedKeyword) > 1).length
    : 0;

  const counts = new Map<string, number>();
  for (const token of normalizedText.split(' ')) {
    if (token.length < 4 || STOP_WORDS.has(token)) continue;
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  const topRepeatedTerms = [...counts.entries()]
    .filter(([, count]) => count >= 5)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([term, count]) => ({ term, count }));

  const recommendations: string[] = [];
  if (!normalizedKeyword) recommendations.push('أدخل كلمة محورية لقياس ورودها؛ التقرير لا يفترض كلمة من تلقاء نفسه.');
  else {
    if (occurrences === 0) recommendations.push('راجع مدى تطابق النص مع الكلمة المحورية، وأدرجها فقط حيث تكون مفيدة وطبيعية.');
    if (!normalizeForMatch(title).includes(normalizedKeyword)) recommendations.push('تحقق من أن العنوان يوضح موضوع البحث؛ لا تضف الكلمة المحورية إليه قسراً.');
    if (repeatedInSameSentence > 0) recommendations.push('راجع الجمل التي تكرر فيها التعبير المحوري أكثر من مرة لتحسين السلاسة.');
  }
  if (!metaDescription.trim()) recommendations.push('أضف وصفاً تعريفياً دقيقاً يوجز فائدة الصفحة دون وعود أو حشو.');
  if (!stats.headingCount) recommendations.push('قسّم المحتوى بعناوين دلالية واضحة تساعد القارئ ومحركات الإجابة على فهم الموضوع.');
  recommendations.push('أضف روابط داخلية وصفية فقط إلى صفحات حقيقية ذات صلة؛ لا تنشئ عناوين URL تخمينية.');
  recommendations.push('تحقق من الادعاءات والمصادر والحداثة يدوياً قبل النشر؛ هذا التقرير إرشادي وليس ضماناً للترتيب.');

  const types = ['Article'];
  if (stats.faqItemCount > 0) types.push('FAQPage');
  return {
    focusKeyword: keyword.trim(),
    keywordDensity: { occurrences, percent: density },
    repetition: { repeatedInSameSentence, topRepeatedTerms },
    recommendations,
    schemaRecommendations: {
      types,
      note: 'اقتراحات فقط: لا تُنشأ بيانات Schema تلقائياً. أضفها بعد التحقق من مطابقة كل خاصية لمحتوى الصفحة الظاهر وسياسات محرك البحث؛ لا تختلق مؤلفاً أو تقييماً أو تاريخاً أو بيانات منتج.'
    }
  };
}

export function analyzeArticleSections(sections: unknown, options: { keyword?: string; title?: string; metaDescription?: string } = {}): { articleStats: ArticleStats; seoReport: SeoReport } {
  const list = Array.isArray(sections) ? sections.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : [];
  const textParts = list.flatMap(visibleSectionText);
  const text = textParts.join(' ');
  const stats = makeStats(text, list.length, {
    headingCount: list.filter((section) => section.type === 'heading').length,
    paragraphCount: list.filter((section) => section.type === 'paragraph').length,
    faqItemCount: list.reduce((total, section) => total + (section.type === 'faq' && Array.isArray(section.faqItems) ? section.faqItems.length : 0), 0),
    imageCount: list.filter((section) => section.type === 'image').length,
    linkCount: list.reduce((total, section) => total + (section.type === 'link' || section.type === 'button' ? 1 : section.type === 'relatedManual' && Array.isArray(section.relatedLinks) ? section.relatedLinks.length : 0) + countInlineLinks(section), 0),
  });
  return { articleStats: stats, seoReport: buildSeoReport(text, options.keyword || '', options.title || '', options.metaDescription || '', stats) };
}

export function analyzeArticleHtml(html: string, options: { keyword?: string; title?: string; metaDescription?: string } = {}): { articleStats: ArticleStats; seoReport: SeoReport } {
  const text = htmlToPlainText(html);
  const headings = (html.match(/<h[1-6]\b/gi) || []).length;
  const paragraphs = (html.match(/<p\b/gi) || []).length;
  const faqItems = (html.match(/\bitemtype\s*=\s*["']https?:\/\/schema\.org\/Question["']/gi) || []).length;
  const images = (html.match(/<img\b/gi) || []).length;
  const links = (html.match(/<a\b[^>]*\bhref\s*=/gi) || []).length;
  const stats = makeStats(text, (html.match(/<(?:h[1-6]|p|div|ul|ol|table|figure|blockquote|details)\b/gi) || []).length, {
    headingCount: headings, paragraphCount: paragraphs, faqItemCount: faqItems, imageCount: images, linkCount: links,
  });
  return { articleStats: stats, seoReport: buildSeoReport(text, options.keyword || '', options.title || '', options.metaDescription || '', stats) };
}
