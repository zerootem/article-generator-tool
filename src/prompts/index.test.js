import { beforeAll, describe, expect, it, vi } from 'vitest';

let prompts;
beforeAll(async () => {
  vi.stubGlobal('window', {});
  await import('./index.js');
  prompts = window.modweebPrompts;
});

describe('article prompt guidance', () => {
  it('preserves the existing public prompt API and return shape', () => {
    expect(Object.keys(prompts)).toEqual([
      'article', 'suggestTitles', 'keywords', 'improveText', 'seoMeta', 'smartAssistant', 'smartArticleEdit'
    ]);
    const result = prompts.article({ topic: 'موضوع تجريبي' });
    expect(Object.keys(result)).toEqual(['systemPrompt', 'userPrompt']);
    expect(result.userPrompt).toContain('موضوع تجريبي');
  });

  it('prioritizes useful, natural, accurate content without invented experience or sources', () => {
    const { systemPrompt } = prompts.article({ topic: 'موضوع' });
    expect(systemPrompt).toContain('نافع للناس');
    expect(systemPrompt).toContain('لا تختلق تجربة أو خبرة شخصية');
    expect(systemPrompt).toContain('إحصاء أو دراسة أو اقتباس أو مصدر أو رابط');
    expect(systemPrompt).toContain('لا تفرض طولاً معيارياً');
    expect(systemPrompt).toContain('دون تكرار قسري');
  });

  it('makes H3/H4 and optional content elements non-mandatory', () => {
    const { systemPrompt } = prompts.article({ topic: 'موضوع' });
    expect(systemPrompt).toContain('ليس مطلوباً في كل H2');
    expect(systemPrompt).toContain('استخدم H4 نادراً');
    expect(systemPrompt).toContain('اختياري تماماً');
    expect(systemPrompt).not.toMatch(/H3 إلزامي|H4 إلزامي|كل قسم H2 يجب أن يحتوي|عدد ثابت من H2/i);
  });

  it('limits generated sections to documented template types and rejects extra HTML fields', () => {
    const { systemPrompt } = prompts.article({ topic: 'موضوع' });
    for (const type of ['note', 'alert', 'table', 'list', 'steps', 'faq', 'blockquote', 'mark', 'accordion', 'code', 'image', 'lazyYt']) {
      expect(systemPrompt).toContain(`- ${type}:`);
    }
    expect(systemPrompt).toContain('لا تضف HTML أو حقولاً جديدة');
    expect(systemPrompt).toContain('استخدم النوع والحقول المدرجة فقط');
    expect(systemPrompt).toContain('لا تختلق');
    expect(systemPrompt).not.toContain('<heading');
  });

  it('supports neutral, direct-address, we, and I points of view', () => {
    const cases = [
      ['neutral', 'محايد'], ['you', 'مخاطبة القارئ مباشرة'],
      ['we', 'ضمير المتكلم الجمع نحن'], ['i', 'ضمير المتكلم المفرد أنا']
    ];
    for (const [pov, expected] of cases) {
      expect(prompts.article({ topic: 'موضوع', pov }).systemPrompt).toContain(expected);
    }
  });

  it('supports the requested article types, including their legacy aliases', () => {
    const cases = [
      ['guide', 'دليل إرشادي'], ['tutorial', 'شرح تعليمي'], ['comparison', 'مقارنة منظمة'],
      ['review', 'مراجعة متوازنة'], ['list', 'قائمة مرتبة'], ['news', 'مقال إخباري'],
      ['faq', 'صفحة أسئلة وأجوبة'], ['opinion', 'مقال رأي']
    ];
    for (const [articleType, expected] of cases) {
      expect(prompts.article({ topic: 'موضوع', articleType }).systemPrompt).toContain(expected);
    }
    expect(prompts.article({ topic: 'موضوع', articleType: 'faqpage' }).systemPrompt).toContain('صفحة أسئلة وأجوبة');
  });

  it('supports direct, question, input-grounded fact, and explicitly fictional openings', () => {
    const cases = [
      ['direct', 'ابدأ مباشرة'], ['question', 'ابدأ بسؤال واضح'],
      ['fact', 'إذا كانت موجودة في المدخلات فقط'], ['fictionalStory', 'مثال خيالي لا واقعة حقيقية']
    ];
    for (const [opening, expected] of cases) {
      expect(prompts.article({ topic: 'موضوع', opening }).systemPrompt).toContain(expected);
    }
  });

  it('supports the requested writing modes without encouraging unsupported claims', () => {
    const cases = [
      ['default', 'أسلوب متوازن'], ['human', 'صوت طبيعي ودافئ'], ['news', 'أسلوب إخباري محايد'],
      ['affiliate', 'مراجعة أو دليلاً شفافاً'], ['adsense', 'متوافقاً مع الإعلانات'],
      ['viral', 'جذابة ومشوقة بلا مبالغة'], ['technical', 'بدقة تقنية']
    ];
    for (const [writingMode, expected] of cases) {
      const { systemPrompt } = prompts.article({ topic: 'موضوع', writingMode });
      expect(systemPrompt).toContain(expected);
      expect(systemPrompt).toContain('لا تختلق');
    }
  });

  it('returns a minimal, exact HTML patch for article edits and replacement HTML for a selection', () => {
    const article = prompts.smartArticleEdit({ prompt: 'حسن المقدمة', scope: 'article', content: '<p>النص</p>' });
    expect(article.systemPrompt).toContain('"findHtml"');
    expect(article.systemPrompt).toContain('لا تعد كامل المقال');
    expect(article.userPrompt).toContain('<p>النص</p>');
    const selection = prompts.smartArticleEdit({ prompt: 'بسّطها', scope: 'selection', content: '<p>مقطع</p>' });
    expect(selection.systemPrompt).toContain('"replacementHtml"');
    expect(selection.userPrompt).toContain('<p>مقطع</p>');
  });
});
