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

  it('prioritizes useful, natural, accurate content and guards against fabricated facts', () => {
    const { systemPrompt } = prompts.article({ topic: 'موضوع' });
    expect(systemPrompt).toContain('مقالات بلوجر طويلة نافعة');
    expect(systemPrompt).toContain('لا تختلق تجربة شخصية');
    expect(systemPrompt).toContain('إحصائية أو دراسة أو سعرًا أو تاريخاً أو خاصية منتج أو اقتباساً أو مصدراً');
    expect(systemPrompt).toContain('نطاق الكلمات المختار هدف تحريري تقريبي قوي');
    expect(systemPrompt).toContain('تكرار قسري');
  });

  it('uses all six heading levels without forcing fixed heading counts', () => {
    const { systemPrompt } = prompts.article({ topic: 'موضوع' });
    expect(systemPrompt).toContain('H1');
    expect(systemPrompt).toContain('H2');
    expect(systemPrompt).toContain('H5 وH6 نادران');
    expect(systemPrompt).toContain('من دون حصة ثابتة');
    expect(systemPrompt).not.toMatch(/H3 إلزامي|H4 إلزامي|كل قسم H2 يجب أن يحتوي|عدد ثابت من H2/i);
  });

  it('uses the selected UI word range and asks for the complete article, not a short outline', () => {
    const { systemPrompt, userPrompt } = prompts.article({ topic: 'موضوع', size: 'md' });
    expect(systemPrompt).toContain('1500-2400 كلمة');
    expect(systemPrompt).toContain('فقرتان إلى أربع فقرات مفيدة');
    expect(systemPrompt).toContain('لا تتوقف بعد مقدمة أو بضعة أسطر');
    expect(userPrompt).toContain('لا تتوقف عند المقدمة');
    expect(prompts.article({ topic: 'موضوع', size: 'xs' }).systemPrompt).toContain('600-900 كلمة');
    expect(prompts.article({ topic: 'موضوع', size: 'sm' }).systemPrompt).toContain('900-1500 كلمة');
    expect(prompts.article({ topic: 'موضوع', size: 'lg' }).systemPrompt).toContain('2400-3600 كلمة');
  });

  it('makes H3/H4 and optional content elements conditional', () => {
    const { systemPrompt } = prompts.article({ topic: 'موضوع' });
    expect(systemPrompt).toContain('يمكن استخدام H3');
    expect(systemPrompt).toContain('قيود العناصر الاختيارية');
    expect(systemPrompt).not.toMatch(/H3 إلزامي|H4 إلزامي|كل قسم H2 يجب أن يحتوي|عدد ثابت من H2/i);
  });

  it('forbids unrequested FAQ and makes optional types depend on user choices', () => {
    const prompt = prompts.article({ topic: 'موضوع', articleType: 'guide' }).systemPrompt;
    expect(prompt).toContain('FAQ لا يضاف تلقائياً');
    expect(prompt).toContain('خانات الاختيار');
    expect(prompts.article({ topic: 'موضوع', articleType: 'faq' }).systemPrompt).toContain('صفحة أسئلة وأجوبة مفيدة');
  });

  it('documents current section types, fields, and safe inline links', () => {
    const { systemPrompt } = prompts.article({ topic: 'موضوع' });
    for (const type of ['note', 'alert', 'table', 'list', 'steps', 'faq', 'blockquote', 'mark', 'accordion', 'accordionGroup', 'spoiler', 'code', 'codeTabs', 'inlineCode', 'kbd', 'image', 'lazyYt', 'link', 'button', 'downloadBox', 'audioPlayer', 'videoPlayer', 'relatedManual', 'relatedAuto']) {
      expect(systemPrompt).toContain(`- ${type}:`);
    }
    expect(systemPrompt).toContain('headingLevel":"h1|h2|h3|h4|h5|h6');
    expect(systemPrompt).toContain('paragraphStyle":"normal|indent|dropcap|ref');
    expect(systemPrompt).toContain('linkStyle":"extL|alt|sec|button|buttonLn');
    expect(systemPrompt).toContain('audioPreload":"none|metadata|auto');
    expect(systemPrompt).toContain('videoType":"video/mp4|video/webm|video/ogg');
    expect(systemPrompt).toContain('relatedSortBy":"updated');
    expect(systemPrompt).toContain('accordionGroup');
    expect(systemPrompt).toContain('لا تضف حقولاً علوية أو أنواعاً أو خصائص غير مدرجة');
    expect(systemPrompt).toContain('عناصر inline الآمنة');
    expect(systemPrompt).not.toContain('<heading');
  });

  it('requests source references without permitting fabricated URLs', () => {
    const { systemPrompt } = prompts.article({ topic: 'موضوع' });
    expect(systemPrompt).toContain('من 2 إلى 4 مراجع خارجية');
    expect(systemPrompt).toContain('لا تختلق اسم جهة أو عنوان صفحة أو URL');
    expect(systemPrompt).toContain('rel="noopener noreferrer"');
    expect(systemPrompt).toContain('لا تستخدم كتل link/button/downloadBox أو relatedManual إلا بطلب صريح');
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
