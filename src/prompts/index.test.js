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
      'article', 'articleOutline', 'suggestTitles', 'keywords', 'improveText', 'seoMeta', 'smartAssistant', 'smartArticleEdit'
    ]);
    const result = prompts.article({ topic: 'موضوع تجريبي' });
    expect(Object.keys(result)).toEqual(['systemPrompt', 'userPrompt']);
    expect(result.userPrompt).toContain('موضوع تجريبي');
  });

  it('builds a structured outline prompt with the selected article context and no invented links', () => {
    const request = prompts.articleOutline({ topic: 'دليل كتابة المحتوى', mainKeyword: 'كتابة المحتوى', articleType: 'guide', size: 'md', language: 'ar', hasH3: false });
    expect(Object.keys(request)).toEqual(['systemPrompt', 'userPrompt']);
    expect(request.systemPrompt).toContain('"sections":[{"heading":"عنوان H2"');
    expect(request.systemPrompt).toContain('لا تقترح H3');
    expect(request.systemPrompt).toContain('لا تخترع أرقاماً أو حقائق أو مصادر أو روابط');
    expect(request.userPrompt).toContain('دليل كتابة المحتوى');
    expect(request.userPrompt).toContain('كتابة المحتوى');
    expect(request.userPrompt).toContain('9–12');
  });

  it('prioritizes useful, natural, accurate content and guards against fabricated facts', () => {
    const { systemPrompt } = prompts.article({ topic: 'موضوع' });
    expect(systemPrompt).toContain('مقالات بلوجر طويلة نافعة');
    expect(systemPrompt).toContain('لا تختلق تجربة شخصية');
    expect(systemPrompt).toContain('إحصائية أو دراسة أو سعرًا أو تاريخاً أو خاصية منتج أو اقتباساً أو مصدراً');
    expect(systemPrompt).toContain('نطاق الكلمات المختار هدف تحريري تقريبي قوي');
    expect(systemPrompt).toContain('لا تحشو التكرار');
  });

  it('documents all six heading levels and the legacy size-based H2 targets', () => {
    const { systemPrompt } = prompts.article({ topic: 'موضوع' });
    expect(systemPrompt).toContain('H1');
    expect(systemPrompt).toContain('H2');
    expect(systemPrompt).toContain('H5 وH6 نادران');
    expect(systemPrompt).toContain('9–12 عناوين H2 موضوعية');
    expect(prompts.article({ topic: 'موضوع', size: 'xs' }).systemPrompt).toContain('4–6 عناوين H2');
    expect(prompts.article({ topic: 'موضوع', size: 'sm' }).systemPrompt).toContain('6–9 عناوين H2');
    expect(prompts.article({ topic: 'موضوع', size: 'lg' }).systemPrompt).toContain('12–16 عناوين H2');
  });

  it('uses the selected UI word range and asks for the complete article, not a short outline', () => {
    const { systemPrompt, userPrompt } = prompts.article({ topic: 'موضوع', size: 'md' });
    expect(systemPrompt).toContain('1500-2400 كلمة');
    expect(systemPrompt).toContain('شرح وافٍ من 4–6 جمل');
    expect(systemPrompt).toContain('لا تتوقف بعد مقدمة أو بضعة أسطر');
    expect(userPrompt).toContain('لا تتوقف عند المقدمة');
    expect(prompts.article({ topic: 'موضوع', size: 'xs' }).systemPrompt).toContain('600-900 كلمة');
    expect(prompts.article({ topic: 'موضوع', size: 'sm' }).systemPrompt).toContain('900-1500 كلمة');
    expect(prompts.article({ topic: 'موضوع', size: 'lg' }).systemPrompt).toContain('2400-3600 كلمة');
  });

  it('keeps H3/H4 and optional content elements conditional while requiring the legacy FAQ/accordion structure', () => {
    const { systemPrompt } = prompts.article({ topic: 'موضوع' });
    expect(systemPrompt).toContain('يسمح بالعناوين H3');
    expect(prompts.article({ topic: 'موضوع', hasH3: false }).systemPrompt).toContain('خيار H3 معطّل');
    expect(systemPrompt).toContain('المحتوى الاختياري');
    expect(systemPrompt).toContain('FAQ إلزامي حسب الهيكل');
    expect(systemPrompt).toContain('accordion واحد إلزامي في نهاية كل H2 موضوعي');
    expect(systemPrompt).toContain('قاعدة steps الإلزامية');
  });

  it('uses the legacy required FAQ even for a guide and preserves optional heading choices', () => {
    const prompt = prompts.article({ topic: 'موضوع', articleType: 'guide', hasH3: false }).systemPrompt;
    expect(prompt).toContain('heading (headingLevel: "h2", content: "الأسئلة الشائعة")');
    expect(prompt).toContain('faq (faqItems فيها 4–5');
    expect(prompt).toContain('خيار H3 معطّل');
    expect(prompts.article({ topic: 'موضوع', articleType: 'faq' }).systemPrompt).toContain('صفحة أسئلة وأجوبة مفيدة');
    const englishPrompt = prompts.article({ topic: 'topic', language: 'en' }).systemPrompt;
    expect(englishPrompt).toContain('تم إعداد هذا المقال عبر ModWeeb AI باستخدام تقنيات توليد المحتوى الحديثة مع التركيز على الوضوح والدقة.');
    expect(englishPrompt).toContain('content: "FAQ"');
  });

  it('preserves the legacy required beginning, per-H2 sequence, and fixed ModWeeb attribution', () => {
    const prompt = prompts.article({ topic: 'موضوع', opening: 'brief', hasKeyPoints: true }).systemPrompt;
    expect(prompt).toContain('1. basics');
    expect(prompt).toContain('2. heading h1');
    expect(prompt).not.toContain('"type":"toc"');
    expect(prompt).toContain('note (noteStyle: "info")');
    expect(prompt).toContain('تم إعداد هذا المقال عبر ModWeeb AI باستخدام تقنيات توليد المحتوى الحديثة مع التركيز على الوضوح والدقة.');
    expect(prompt).toContain('paragraph (paragraphStyle: "dropcap")');
    expect(prompt).toContain('keyPoints بعد المقدمة الموسعة مباشرة');
    expect(prompt).toContain('paragraph (paragraphStyle: "indent")');
    expect(prompt).toContain('accordion (accordionType: "ac") في نهاية كل قسم H2');
    expect(prompt).toContain('3–7 خطوات كاملة قابلة للتنفيذ');
    expect(prompt).toContain('content: "خاتمة"');
    expect(prompt).toContain("<p class='note'><b>ملاحظة!</b><br/>");
    expect(prompt).toContain('المصدر: ModWeeb<br>تم إعداد وتنسيق المقال عبر ModWeeb AI');
    expect(prompt).toContain('<!--[ Post Reference paragraph ]--><p class=\'pRef\'>');
    expect(prompt).toContain('تم إعداد وتنسيق المقال عبر ModWeeb AI');
  });

  it('documents current section types, fields, and safe inline links', () => {
    const { systemPrompt } = prompts.article({ topic: 'موضوع' });
    for (const type of ['note', 'alert', 'table', 'list', 'steps', 'faq', 'blockquote', 'mark', 'accordion', 'accordionGroup', 'spoiler', 'code', 'codeTabs', 'inlineCode', 'kbd', 'image', 'lazyYt', 'link', 'button', 'downloadBox', 'audioPlayer', 'videoPlayer', 'relatedManual', 'relatedAuto']) {
      expect(systemPrompt).toContain(`- ${type}:`);
    }
    expect(systemPrompt).toContain('headingLevel":"h1|h2|h3|h4|h5|h6');
    expect(systemPrompt).toContain('paragraphStyle":"normal|indent|dropcap|ref');
    expect(systemPrompt).toContain('dropCapChar');
    expect(systemPrompt).toContain('spoilerBlurText');
    expect(systemPrompt).toContain('tabHtmlSource');
    expect(systemPrompt).toContain('tabCssSource');
    expect(systemPrompt).toContain('tabJsSource');
    expect(systemPrompt).toContain('tabJsonSource');
    expect(systemPrompt).toContain('linkStyle":"extL|alt|sec|button|buttonLn');
    expect(systemPrompt).toContain('audioPreload":"none|metadata|auto');
    expect(systemPrompt).toContain('videoType":"video/mp4|video/webm|video/ogg');
    expect(systemPrompt).toContain('relatedSortBy":"updated|published');
    expect(systemPrompt).toContain('scrollHeight":"h150|h200|h250');
    expect(systemPrompt).toContain('thumbnailUrl');
    expect(systemPrompt).toContain('tableClasses المسموح بها');
    expect(systemPrompt).toContain('accordionGroup');
    expect(systemPrompt).toContain('لا تضف حقولاً أو أنواع أقسام غير المخطط');
    expect(systemPrompt).toContain('articleStats وseoReport وhtmlReady');
    expect(systemPrompt).toContain('تنسيق inline الآمن');
    expect(systemPrompt).not.toContain('<heading');
  });

  it('requests source references without permitting fabricated URLs', () => {
    const { systemPrompt } = prompts.article({ topic: 'موضوع' });
    expect(systemPrompt).toContain('2–4 روابط خارجية ذات صلة');
    expect(systemPrompt).toContain('لا تختلق اسم جهة أو عنوان صفحة أو URL');
    expect(systemPrompt).toContain("rel='nofollow noreferrer noopener'");
    expect(systemPrompt).toContain('لا تضف accordionGroup أو relatedAuto أو link أو button أو downloadBox');
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
      ['none', 'مقال عام'], ['guide', 'دليل إرشادي'], ['tutorial', 'شرح تعليمي'], ['comparison', 'مقارنة منظمة'],
      ['review', 'مراجعة متوازنة'], ['list', 'قائمة مرتبة'], ['news', 'مقال إخباري'],
      ['listicle', 'قائمة مرتبة'], ['casestudy', 'دراسة حالة'], ['summary', 'ملخص مركز'],
      ['faq', 'صفحة أسئلة وأجوبة'], ['faqpage', 'صفحة أسئلة وأجوبة'], ['opinion', 'مقال رأي']
    ];
    for (const [articleType, expected] of cases) {
      expect(prompts.article({ topic: 'موضوع', articleType }).systemPrompt).toContain(expected);
    }
    expect(prompts.article({ topic: 'موضوع', articleType: 'faqpage' }).systemPrompt).toContain('صفحة أسئلة وأجوبة');
  });

  it('selects an explicit editorial template for every article type in the interface', () => {
    const cases = [
      ['none', 'مقال تفسيري عام:'], ['guide', 'دليل إرشادي:'], ['tutorial', 'درس تعليمي:'],
      ['comparison', 'مقارنة: حدّد البدائل ومعايير المقارنة'], ['review', 'مراجعة: عرّف المنتج'],
      ['listicle', 'قائمة مشروحة: اذكر معيار الإدراج'], ['news', 'خبر/شرح إخباري:'],
      ['casestudy', 'دراسة حالة: استخدم فقط الحالة'], ['opinion', 'مقال رأي: صرّح بالأطروحة'],
      ['summary', 'ملخص منشور: ابدأ بالفكرة'], ['faqpage', 'صفحة أسئلة وأجوبة: اجمع أسئلة']
    ];
    for (const [articleType, template] of cases) {
      expect(prompts.article({ topic: 'موضوع', articleType }).systemPrompt).toContain(`قالب النوع الإلزامي لهذا المقال: ${template}`);
    }
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

  it('supports distinct editorial opening strategies and optional interaction flags', () => {
    const openingPrompts = ['brief', 'question', 'direct', 'definition', 'fact', 'contrast', 'problemSolution', 'scenario', 'benefit', 'myth', 'curiosity'].map(
      (opening) => prompts.article({ topic: 'موضوع', opening }).systemPrompt
    );
    expect(new Set(openingPrompts.map((prompt) => prompt.split('\n').find((line) => line.startsWith('الافتتاحية:')))).size).toBeGreaterThan(8);
    const interactive = prompts.article({ topic: 'موضوع', hasMark: true, hasBlur: true, hasAccordionVariants: true }).systemPrompt;
    expect(interactive).toContain('استخدم mark لإبراز عبارة قصيرة');
    expect(interactive).toContain('استخدم spoiler مع accordionType=blur');
    expect(interactive).toContain('نوّع عناصر التفاعل');
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
