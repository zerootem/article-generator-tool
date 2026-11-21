import { describe, expect, it } from 'vitest';
import { analyzeArticleHtml, analyzeArticleSections, htmlToPlainText } from './article-output';

describe('article output analytics', () => {
  it('computes article statistics and keyword density from visible section content', () => {
    const result = analyzeArticleSections([
      { type: 'heading', headingLevel: 'h2', content: 'دليل آمن' },
      { type: 'paragraph', content: '<p>دليل آمن يشرح الخطوات. يقدم دليل آمن معلومات واضحة.</p>' },
      { type: 'faq', faqItems: [{ question: 'ما هو الدليل؟', answer: 'هذا شرح مناسب.' }] },
      { type: 'image', imageUrl: 'https://example.test/image.webp' },
    ], { keyword: 'دليل آمن', title: 'دليل آمن شامل', metaDescription: 'شرح الدليل' });

    expect(result.articleStats).toMatchObject({
      wordCount: 17,
      sectionCount: 4,
      headingCount: 1,
      paragraphCount: 1,
      faqItemCount: 1,
      imageCount: 1,
    });
    expect(result.seoReport.keywordDensity.occurrences).toBe(3);
    expect(result.seoReport.keywordDensity.percent).toBeGreaterThan(0);
    expect(result.seoReport.schemaRecommendations.types).toEqual(['Article', 'FAQPage']);
    expect(result.seoReport.schemaRecommendations.note).toContain('لا تُنشأ بيانات Schema تلقائياً');
  });

  it('reports missing focus keywords and repeated key phrases without imposing a density target', () => {
    const report = analyzeArticleSections([
      { type: 'paragraph', content: 'مصطلح متكرر، مصطلح متكرر في الجملة.' },
    ], { keyword: 'مصطلح متكرر' }).seoReport;

    expect(report.keywordDensity.occurrences).toBe(2);
    expect(report.repetition.repeatedInSameSentence).toBe(1);
    expect(report.recommendations.some((message) => message.includes('تكرر فيها التعبير المحوري'))).toBe(true);
    expect(report.recommendations.join(' ')).not.toMatch(/كثافة مستهدفة|نسبة مثالية/);
    expect(analyzeArticleSections([{ type: 'paragraph', content: 'نص' }]).seoReport.keywordDensity.percent).toBeNull();
  });

  it('analyzes rendered compatible HTML and removes tags and entities from text counts', () => {
    expect(htmlToPlainText('<p>أهلاً&nbsp;بالعالم</p><!-- ref --><script>x</script>')).toBe('أهلاً بالعالم');
    const result = analyzeArticleHtml('<h1>عنوان</h1><p>نص <a href="/guide">رابط</a></p><img src="x">', {
      keyword: 'عنوان', title: 'عنوان', metaDescription: 'وصف',
    });
    expect(result.articleStats).toMatchObject({ wordCount: 3, headingCount: 1, paragraphCount: 1, imageCount: 1, linkCount: 1 });
    expect(result.seoReport.keywordDensity.occurrences).toBe(1);
  });

  it('counts semantically marked FAQ questions but not ordinary accordion or TOC details', () => {
    const result = analyzeArticleHtml([
      '<details class="ac"><summary>تفصيل عادي</summary><p>محتوى</p></details>',
      '<details class="sp toc"><summary>جدول المحتويات</summary></details>',
      '<div itemscope itemtype="https://schema.org/FAQPage">',
      '<details itemscope itemprop="mainEntity" itemtype="https://schema.org/Question"><summary itemprop="name">سؤال</summary></details>',
      '<details itemscope itemprop="mainEntity" itemtype="https://schema.org/Question"><summary itemprop="name">سؤال آخر</summary></details>',
      '</div>',
    ].join(''));
    expect(result.articleStats.faqItemCount).toBe(2);
    expect(result.seoReport.schemaRecommendations.types).toEqual(['Article', 'FAQPage']);
    const noFaq = analyzeArticleHtml('<details class="ac"><summary>تفصيل</summary></details>');
    expect(noFaq.articleStats.faqItemCount).toBe(0);
    expect(noFaq.seoReport.schemaRecommendations.types).toEqual(['Article']);
  });

  it('counts safe inline anchors inside paragraph and FAQ content', () => {
    const result = analyzeArticleSections([
      { type: 'paragraph', content: '<p>اقرأ <a href="/guide">الدليل</a> للمزيد.</p>' },
      { type: 'faq', faqItems: [{ question: 'أين الدليل؟', answer: 'تجد <a href="https://example.test/help">المساعدة</a> هنا.' }] },
    ]);
    expect(result.articleStats.linkCount).toBe(2);
  });
});
