export interface ArticleOutlineSection {
  heading: string;
  purpose: string;
  subheadings: string[];
}

export interface ArticleOutline {
  topic: string;
  title: string;
  mainKeyword: string;
  sections: ArticleOutlineSection[];
  faqQuestions: string[];
}

function cleanLine(value: unknown, limit = 240): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

export function normalizeArticleOutline(input: unknown, topic: string, mainKeyword = ''): ArticleOutline {
  if (!input || typeof input !== 'object') throw new Error('صيغة مخطط المقال غير صالحة.');
  const source = input as Record<string, unknown>;
  const sections = Array.isArray(source.sections)
    ? source.sections.slice(0, 18).map((item) => {
      const section = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      return {
        heading: cleanLine(section.heading, 140),
        purpose: cleanLine(section.purpose, 320),
        subheadings: Array.isArray(section.subheadings)
          ? section.subheadings.map((heading) => cleanLine(heading, 140)).filter(Boolean).slice(0, 5)
          : [],
      };
    }).filter((section) => section.heading)
    : [];
  const faqQuestions = Array.isArray(source.faqQuestions)
    ? source.faqQuestions.map((question) => cleanLine(question, 220)).filter(Boolean).slice(0, 5)
    : [];

  if (sections.length < 3) throw new Error('لم يُرجع النموذج ثلاثة أقسام رئيسية صالحة على الأقل.');
  if (faqQuestions.length < 4) throw new Error('يجب أن يتضمن المخطط أربعة أسئلة شائعة على الأقل.');

  return {
    topic: cleanLine(topic, 500),
    title: cleanLine(source.title, 180) || cleanLine(topic, 180),
    mainKeyword: cleanLine(mainKeyword, 180),
    sections,
    faqQuestions,
  };
}

export function formatArticleOutlineInstruction(outline: ArticleOutline, hasH3 = true, language = 'ar'): string {
  const english = language !== 'ar';
  const sections = outline.sections.map((section, index) => [
    `${index + 1}. H2: ${section.heading}`,
    section.purpose ? `   ${english ? 'Section purpose' : 'وظيفة القسم'}: ${section.purpose}` : '',
    hasH3 && section.subheadings.length
      ? `   ${english ? 'Suggested H3 headings' : 'عناوين H3 المقترحة'}:\n${section.subheadings.map((heading) => `   - ${heading}`).join('\n')}`
      : '',
  ].filter(Boolean).join('\n')).join('\n');
  const faq = outline.faqQuestions.map((question, index) => `${index + 1}. ${question}`).join('\n');
  return [
    english
      ? 'User-approved article outline: preserve the H2 wording and order. Do not remove a section or add an unrelated topical section unless accuracy requires it.'
      : 'مخطط المقال الذي اعتمده المستخدم؛ التزم بترتيب عناوين H2 ونصوصها كما هي، ولا تحذف قسماً ولا تضف قسماً موضوعياً خارجها إلا إذا تطلبت الدقة ذلك.',
    `${english ? 'Approved H1 title (use verbatim)' : 'عنوان H1 المعتمد (استخدمه حرفياً)'}: ${outline.title}`,
    outline.mainKeyword ? `${english ? 'Focus keyword' : 'الكلمة المفتاحية المحورية'}: ${outline.mainKeyword}` : '',
    english ? 'Main sections:' : 'الأقسام الموضوعية:',
    sections,
    english
      ? 'Place the following questions inside the required FAQ section at its designated position. Do not repeat them as standalone H2 sections:'
      : 'أدرج الأسئلة التالية داخل قسم الأسئلة الشائعة الإلزامي في الموضع المحدد في هيكل المقال، ولا تكررها كأقسام H2 مستقلة:',
    faq,
    english
      ? 'Expand each section according to the selected article length. Stay accurate; do not invent facts, URLs, or sources.'
      : 'وسّع كل قسم بما يناسب حجم المقال المختار، وحافظ على الدقة ولا تخترع حقائق أو روابط أو مصادر.',
  ].filter(Boolean).join('\n');
}

export function articleOutlineMarkdown(outline: ArticleOutline, language = 'ar'): string {
  const sections = outline.sections.map((section) => [
    `## ${section.heading}`,
    section.purpose ? section.purpose : '',
    ...section.subheadings.map((heading) => `### ${heading}`),
  ].filter(Boolean).join('\n')).join('\n\n');
  return [
    `# ${outline.title}`,
    sections,
    `## ${language === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}`,
    ...outline.faqQuestions.map((question) => `- ${question}`),
  ].join('\n\n');
}
