import { describe, expect, it } from 'vitest';
import { articleOutlineMarkdown, formatArticleOutlineInstruction, normalizeArticleOutline } from './article-outline';

const valid = {
  title: 'دليل كتابة المحتوى',
  sections: [
    { heading: 'تحديد الجمهور', purpose: 'توضيح من يخاطبه المقال', subheadings: ['تحليل الحاجة'] },
    { heading: 'بناء الهيكل', purpose: 'ترتيب الأقسام', subheadings: [] },
    { heading: 'كتابة المسودة', purpose: 'توسيع المحاور', subheadings: [] },
  ],
  faqQuestions: ['ما هي الفكرة؟', 'كيف أبدأ؟', 'ما الأدوات؟', 'ما الأخطاء الشائعة؟'],
};

describe('article outline', () => {
  it('normalizes a model response into bounded editable fields', () => {
    const outline = normalizeArticleOutline(valid, 'كتابة المحتوى', 'كتابة المحتوى');
    expect(outline.title).toBe('دليل كتابة المحتوى');
    expect(outline.sections).toHaveLength(3);
    expect(outline.faqQuestions).toHaveLength(4);
  });

  it('rejects incomplete section and FAQ plans', () => {
    expect(() => normalizeArticleOutline({ ...valid, sections: valid.sections.slice(0, 2) }, 'topic')).toThrow('ثلاثة أقسام');
    expect(() => normalizeArticleOutline({ ...valid, faqQuestions: valid.faqQuestions.slice(0, 3) }, 'topic')).toThrow('أربعة أسئلة');
  });

  it('creates generation instructions in the edited order and omits H3 when disabled', () => {
    const outline = normalizeArticleOutline(valid, 'كتابة المحتوى');
    const prompt = formatArticleOutlineInstruction(outline, false);
    expect(prompt.indexOf('H2: تحديد الجمهور')).toBeLessThan(prompt.indexOf('H2: بناء الهيكل'));
    expect(prompt).not.toContain('عناوين H3 المقترحة');
    expect(prompt).toContain('أسئلة التالية داخل قسم الأسئلة الشائعة الإلزامي');
  });

  it('formats approved instructions and copied FAQ heading in the selected UI language', () => {
    const outline = normalizeArticleOutline(valid, 'Content writing');
    const prompt = formatArticleOutlineInstruction(outline, true, 'en');
    const markdown = articleOutlineMarkdown(outline, 'en');
    expect(prompt).toContain('User-approved article outline');
    expect(prompt).toContain('Suggested H3 headings');
    expect(markdown).toContain('## FAQ');
    expect(markdown).not.toContain('## الأسئلة الشائعة');
  });

  it('copies the outline as readable Markdown', () => {
    const markdown = articleOutlineMarkdown(normalizeArticleOutline(valid, 'كتابة المحتوى'));
    expect(markdown).toContain('# دليل كتابة المحتوى');
    expect(markdown).toContain('## الأسئلة الشائعة');
    expect(markdown).toContain('- كيف أبدأ؟');
  });
});
