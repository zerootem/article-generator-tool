/* ═══════════════════════════════════════════════════════════
     البرومبت الرئيسي — توليد المقال الكامل (نسخة v3.3 مع H3/H4 إلزامية)
     ═══════════════════════════════════════════════════════════ */
  function buildArticlePrompt(params){
    const {
      topic, mainKeyword = '', keywords = '', customRequest = '',
      writingMode = 'default',
      tone = 'professional', size = 'md', language = 'ar', country = 'ar',
      pov = 'we', readingEase = 'easy',
      articleType = 'guide', opening = 'brief',
      hasConclusion = true, hasTables = false, hasH3 = true, hasH4 = true, hasLists = true,
      hasItalics = false, hasQuotes = true, hasKeyPoints = true,
      hasInstructions = false, hasBold = true,
      hasImages = false, hasYoutube = false
    } = params;

    const writingModeGuide  = WRITING_MODE_MAP[writingMode] || '';
    const langInstruction   = language === 'ar'
      ? 'اكتب جميع المحتويات باللغة العربية الفصحى المعاصرة'
      : 'Write all content in fluent, natural English';

    const sizeMap          = SIZE_MAP[size] || SIZE_MAP.md;
    const toneGuide        = TONE_MAP[tone] || TONE_MAP.professional;
    const readingGuide     = READING_MAP[readingEase] || READING_MAP.easy;
    const povGuide         = POV_MAP[pov] || POV_MAP.we;
    const countryGuide     = COUNTRY_MAP[country] || COUNTRY_MAP.ar;
    const articleTypeGuide = ARTICLE_TYPE_MAP[articleType] || ARTICLE_TYPE_MAP.guide;
    const openingGuide     = OPENING_MAP[opening] || OPENING_MAP.brief;

    /* ── بناء قائمة العناصر المطلوبة ── */
    const elements = [];

    /* 🔴 قواعد العناوين — إلزامية */
    if (hasH3) elements.push('🔴 H3 إلزامي 100%: كل قسم H2 يجب أن يحتوي على <heading h3> واحد على الأقل (لا استثناءات). ضعه مباشرة بعد فقرة التمهيد الأولى داخل القسم، قبل أي محتوى آخر.');
    if (hasH4) elements.push('🔴 H4 إلزامي 80%: كل h3 يحتوي 3 فقرات أو أكثر يجب أن يحتوي على <heading h4> واحد على الأقل لتفصيل النقاط الفرعية.');
    if (hasH3 && hasH4) elements.push('🔴 تسلسل العناوين إلزامي: H1 → H2 → H3 → H4 دون تخطي أي مستوى. ممنوع وضع H4 مباشرة بعد H2 بدون H3 بينهما.');

    if (hasLists)        elements.push('أضف قوائم نقطية (list type) أو مرقمة (steps type) لعرض المعلومات المتعددة');
    if (hasBold)         elements.push('استخدم <b>النص العريض</b> لإبراز الكلمات والعبارات المهمة');
    if (hasItalics)      elements.push('استخدم <em>النص المائل</em> للتأكيد والاقتباسات القصيرة');
    if (hasQuotes)       elements.push('أضف blockquote لاقتباس من خبير أو مصدر موثوق');
    if (hasKeyPoints)    elements.push('أضف عنصر keyPoints بعد فقرة المقدمة مباشرةً يحتوي 5-7 نقاط ملخصة');
    if (hasInstructions) elements.push('أضف تنبيهات warning للتعليمات والأخطاء الشائعة');
    if (hasTables)       elements.push('أضف جدولاً مقارناً (table type) عند المقارنة بين خيارات');
    if (hasImages)       elements.push("أضف صوراً HTML مضمنة في paragraph.content بعد كل 2-3 أقسام H2 (استخدم src='ai-placeholder')");
    if (hasYoutube)      elements.push('أضف فيديو يوتيوب HTML مضمن في paragraph.content في منتصف المقال');
    if (hasConclusion)   elements.push('اختم المقال بخاتمة قوية تلخص أبرز النقاط وتدعو القارئ لاتخاذ إجراء');

    const typeCatalog = "أنواع الأقسام المتاحة (27 نوعاً — JSON sections)\n══════════════════════════════════════════\n\n━━━ 1) الهيكل والأساسيات ━━━\n\n1. basics\n   { \"type\":\"basics\", \"metaDescription\":\"140-160 حرف\" }\n\n2. heading\n   { \"type\":\"heading\", \"content\":\"...\", \"headingLevel\":\"h1\"|\"h2\"|\"h3\"|\"h4\"|\"h5\"|\"h6\", \n     \"headingBefore\":\"(اختياري) ★ \", \"headingAfter\":\"(اختياري) ✓\" }\n\n   ⚠️ قواعد استخدام كل مستوى:\n   • h1: واحد فقط — العنوان الرئيسي في بداية المقال\n   • h2: 5-15 عنواناً حسب الحجم — الأقسام الرئيسية\n   • h3: إلزامي داخل كل H2 — عنوان واحد على الأقل يفصّل محتواه\n   • h4: إلزامي داخل كل H3 يحتوي 3 فقرات أو أكثر\n   • h5/h6: نادراً ما تُستخدم (فقط في المقالات lg مع تسلسل عميق)\n\n3. paragraph\n   { \"type\":\"paragraph\", \"content\":\"...\", \n     \"paragraphStyle\":\"normal\"|\"indent\"|\"dropcap\"|\"ref\",\n     \"refSource\":\"(عند paragraphStyle=ref فقط)\" }\n\n4. toc\n   { \"type\":\"toc\", \"tocLabel\":\"جدول المحتويات\", \n     \"tocStyle\":\"automatic\"|\"manual\",\n     \"tocManualItems\":[{\"text\":\"...\",\"id\":\"...\"}] }\n\n━━━ 2) الملاحظات والتنبيهات ━━━\n\n5. note\n   { \"type\":\"note\", \"content\":\"...\", \n     \"noteStyle\":\"info\"|\"warning\"|\"question\" }\n\n6. alert\n   { \"type\":\"alert\", \"content\":\"...\", \n     \"alertStyle\":\"info\"|\"warning\"|\"success\"|\"error\"|\"tip\"|\"question\",\n     \"alertOutlined\":false }\n\n7. blockquote\n   { \"type\":\"blockquote\", \"content\":\"...\", \"quoteAuthor\":\"...\", \n     \"quoteStyle\":\"normal\"|\"s1\"|\"s2\" }\n\n━━━ 3) القوائم والمحتوى المنظم ━━━\n\n8. steps\n   { \"type\":\"steps\", \"steps\":[\"الخطوة 1\",\"الخطوة 2\",\"الخطوة 3\"] }\n\n9. list\n   { \"type\":\"list\", \"listItems\":[\"عنصر 1\",\"عنصر 2\",\"عنصر 3\"], \n     \"listStyle\":\"default\"|\"s1\" }\n\n10. keyPoints\n    { \"type\":\"keyPoints\", \"items\":[\"نقطة 1\",\"نقطة 2\",\"نقطة 3\"] }\n\n━━━ 4) الجداول ━━━\n\n11. table\n    { \"type\":\"table\", \"tableRows\":N, \"tableCols\":N, \"tableData\":[[...]], \n      \"tableClasses\":\"bordered stripped hovered sticky\" }\n\n━━━ 5) الأكورديون والإخفاء ━━━\n\n12. accordion\n    { \"type\":\"accordion\", \"summary\":\"...\", \"content\":\"...\", \n      \"accordionType\":\"ac\"|\"ac alt\"|\"sp\"|\"group\",\n      \"accordions\":[{\"summary\":\"\",\"content\":\"\",\"alt\":false}],\n      \"spoilerBlurText\":\"(عند accordionType=blur فقط)\" }\n\n13. faq\n    { \"type\":\"faq\", \"faqItems\":[{\"question\":\"...\",\"answer\":\"...\"}] }\n\n━━━ 6) الأزرار والروابط ━━━\n\n14. button\n    { \"type\":\"button\", \"buttonText\":\"...\", \"buttonUrl\":\"...\", \n      \"buttonOutlined\":false, \"buttonIcon\":\"\"|\"dl\"|\"demo\" }\n\n15. link\n    { \"type\":\"link\", \"linkText\":\"...\", \"linkUrl\":\"...\", \n      \"linkStyle\":\"extL\"|\"alt\"|\"sec\"|\"button\"|\"buttonLn\" }\n\n16. downloadBox\n    { \"type\":\"downloadBox\", \"fileName\":\"file.zip\", \"fileSize\":\"200KB\", \n      \"downloadFile\":\"...\" }\n\n━━━ 7) الأكواد ━━━\n\n17. code\n    { \"type\":\"code\", \"codeContent\":\"...\", \n      \"codeLanguage\":\"html\"|\"css\"|\"js\"|\"json\",\n      \"codeComment\":\".html\", \"codeSource\":\"src/index.html\",\n      \"codeLines\":\"2,4\", \"codeCopy\":true, \n      \"codeHighlight\":true, \"codeSyntax\":true }\n\n18. codeTabs\n    { \"type\":\"codeTabs\", \n      \"tabHtml\":\"<div>...</div>\", \"tabCss\":\"body{...}\", \n      \"tabJs\":\"console.log()\", \"tabJson\":\"{}\" }\n\n19. inlineCode\n    { \"type\":\"inlineCode\", \"inlineCode\":\"console.log()\" }\n\n20. kbd\n    { \"type\":\"kbd\", \"kbdText\":\"Ctrl+A\" }\n\n━━━ 8) التمييز ━━━\n\n21. mark\n    { \"type\":\"mark\", \"markText\":\"...\", \n      \"markClass\":\"\"|\"block\"|\"red\"|\"gray\"|\"orange\"|\"blue\"|\"green\"|\"gold\"|\"purple\" }\n\n━━━ 9) الصور والوسائط ━━━\n\n22. image\n    { \"type\":\"image\", \n      \"imageStyle\":\"standard\"|\"full\"|\"figure\"|\"grid\"|\"scroll\"|\"lazyload\"|\"showall\",\n      \"imageUrl\":\"...\", \"imageAlt\":\"...\", \n      \"imageLightbox\":true, \"imageCaptionStyle\":\"figure\"|\"table\",\n      \"imageDisableCaption\":false,\n      \"caption\":\"(عند figure)\", \"gridUrls\":\"(عند grid/scroll/showall — كل رابط في سطر)\" }\n\n23. lazyYt\n    { \"type\":\"lazyYt\", \"youtubeId\":\"...\", \n      \"youtubeMode\":\"lazy\"|\"defer\", \"ratio\":\"16/9\"|\"4/3\" }\n\n24. audioPlayer\n    { \"type\":\"audioPlayer\", \"audioUrl\":\"...\", \n      \"audioPreload\":\"metadata\"|\"none\"|\"auto\" }\n\n25. videoPlayer\n    { \"type\":\"videoPlayer\", \"videoUrl\":\"...\", \n      \"videoPoster\":\"(اختياري)\", \n      \"videoPreload\":\"metadata\"|\"none\"|\"auto\" }\n\n━━━ 10) المنشورات ذات الصلة ━━━\n\n26. relatedManual\n    { \"type\":\"relatedManual\", \"relatedTitle\":\"...\", \n      \"relatedLinks\":[{\"text\":\"...\",\"url\":\"...\"}] }\n\n27. relatedAuto\n    { \"type\":\"relatedAuto\", \"relatedAutoLabel\":\"منشورات ذات صلة\", \n      \"relatedMax\":6, \"relatedDataLabel\":\"(اختياري)\",\n      \"relatedSortBy\":\"updated\"|\"published\", \n      \"relatedRandom\":true }\n\n══════════════════════════════════════════";
    const systemPrompt = [
      'أنت محرر محتوى دقيق ومفيد. اكتب باللغة ' + (language === 'ar' ? 'العربية الفصحى المعاصرة' : 'الإنجليزية الطبيعية') + '.',
      'أنشئ محتوى أصلياً يجيب عن حاجة القارئ بوضوح، ولا تعد بترتيب أو نتيجة SEO. اعتبر المقاس المحدد تقديراً مرناً لا حداً إلزامياً.',
      'الجمهور: ' + countryGuide + '. نوع المقال: ' + articleTypeGuide + '. النبرة: ' + toneGuide + '. سهولة القراءة: ' + readingGuide + '. منظور السرد: ' + povGuide + '.',
      'إرشادات التحرير: ابدأ مباشرة بما يفيد القارئ، استخدم عناوين وصفية وتسلسلاً منطقياً، وضمّن الكلمات المفتاحية طبيعياً عند صلتها بالموضوع. لا تكررها لتحقيق كثافة رقمية ولا تضف مقدمة أو FAQ أو جدولاً لمجرد استيفاء قالب.',
      'الدقة والثقة: لا تختلق خبرة أو تجربة شخصية أو إحصائية أو دراسة أو اقتباس أو مصدر أو رابط أو ميزة منتج. ميّز الحقائق عن الرأي، واطلب/اذكر التحقق عندما تعتمد الإجابة على معلومة حديثة أو غير متاحة. لا تنسب تجربة مباشرة للكاتب.',
      mainKeyword ? 'الكلمة/العبارة الأساسية التي ينبغي استعمالها طبيعياً عند الملاءمة: ' + mainKeyword : '',
      keywords ? 'مصطلحات مساعدة (استخدم المناسب منها دون حشو): ' + keywords : '',
      openingGuide ? 'اقتراح الافتتاح: ' + openingGuide + '، إذا كان ملائماً للسياق.' : '',
      writingModeGuide ? 'توجيه أسلوب إضافي: ' + writingModeGuide : '',
      elements.length ? 'عناصر تنسيق مفضلة عند فائدتها فقط: ' + elements.join('؛ ') : '',
      'العناوين: استخدم عنواناً رئيسياً واحداً، ثم H2 للأقسام، وأضف H3/H4 فقط حين تساعد على تنظيم الفكرة. لا تفرض عدداً ثابتاً للعناوين أو فقرات متكررة.',
      'مخطط الأنواع والخصائص التي يقبلها قالب المقال:', typeCatalog,
      'الإخراج: أعد JSON صالحاً فقط بالمفاتيح title وmetaDescription وtags وsections. يجب أن تكون sections مصفوفة عناصر من الأنواع الموثقة أعلاه. اجعل العنوان والوصف دقيقين وغير مضللين، واجعل tags ذات صلة من دون حشو. لا تضف إشعاراً ترويجياً عن الأداة أو فقرة مصادر افتراضية. إذا كانت معلومات مطلوبة غير متاحة، لا تعوّضها باختلاقها.'
    ].filter(Boolean).join('\n\n');
    const userPrompt = [
      `اكتب مقالاً مفيداً وأصيلاً يجيب عن نية القارئ حول: ${topic}`,
      mainKeyword ? `الكلمة المفتاحية الرئيسية: ${mainKeyword}` : '',
      keywords    ? `الكلمات المفتاحية الداعمة: ${keywords}` : '',
      customRequest ? `تعليمات إضافية: ${customRequest}` : ''
    ].filter(Boolean).join('\n');

    return { systemPrompt, userPrompt };
  }

  /* خرائط إعدادات المقال التي يعتمد عليها buildArticlePrompt */
  const WRITING_MODE_MAP = {
    default: 'اكتب بأسلوب متوازن وواضح، مع تقديم قيمة عملية للقارئ.',
    seo: 'اكتب بخبرة SEO مع نية بحث واضحة، عناوين دقيقة، وتوزيع طبيعي للكلمات المفتاحية دون حشو.',
    human: 'اكتب بصوت بشري طبيعي ودافئ، بجمل متنوعة وأمثلة واقعية، وتجنب العبارات الآلية المتكررة.',
    news: 'اكتب بأسلوب صحفي محايد، افصل الحقائق عن التوقعات، ولا تختلق تواريخ أو تصريحات.',
    affiliate: 'اكتب مراجعة/دليلاً شفافاً يوضح الفوائد والقيود ومعايير الاختيار، دون ادعاءات غير موثقة.',
    adsense: 'اكتب محتوى أصلياً مفيداً للقارئ، منظمًا وسهل القراءة، مع تجنب الحشو أو تكرار الكلمات.',
    viral: 'اكتب عنواناً ومقدمة جذابين مع الحفاظ على الدقة وعدم المبالغة أو التضليل.',
    technical: 'اكتب بدقة تقنية، عرّف المصطلحات، وقدم خطوات وأمثلة قابلة للتحقق.'
  };
  const SIZE_MAP = {
    xs: { words: '600-900', h2: '3-4', sections: '3-4' },
    sm: { words: '900-1500', h2: '4-6', sections: '4-6' },
    md: { words: '1500-2400', h2: '6-8', sections: '6-8' },
    lg: { words: '2400-3600', h2: '8-11', sections: '8-11' }
  };
  const TONE_MAP = {
    professional: 'مهني ورسمي، دقيق ومباشر',
    educational: 'تعليمي توضيحي، يشرح المفاهيم تدريجياً',
    casual: 'سهل وودود، قريب من القارئ دون ابتذال',
    journalistic: 'صحفي تحريري، موضوعي ومتوازن'
  };
  const READING_MAP = {
    simple: 'مبسط جداً، جمل قصيرة ومفردات شائعة',
    easy: 'سهل وواضح، مع شرح المصطلحات',
    moderate: 'متوسط، يجمع بين الدقة والوضوح',
    advanced: 'متقدم، مناسب للقارئ المتخصص'
  };
  const POV_MAP = { we: 'ضمير المتكلم الجمع (نحن)', you: 'مخاطبة القارئ مباشرة (أنت)', i: 'ضمير المتكلم المفرد (أنا)', he: 'ضمير الغائب المذكر (هو)', she: 'ضمير الغائب المؤنث (هي)', they: 'ضمير الغائب الجمع (هم)' };
  const COUNTRY_MAP = { ar: 'جمهور الدول العربية عموماً', sa: 'الجمهور في المملكة العربية السعودية', eg: 'الجمهور في مصر', ae: 'الجمهور في الإمارات العربية المتحدة', ma: 'الجمهور في المغرب', dz: 'الجمهور في الجزائر', iq: 'الجمهور في العراق', global: 'جمهور دولي متنوع' };
  const ARTICLE_TYPE_MAP = {
    none: 'مقال عام', guide: 'دليل إرشادي عملي', listicle: 'قائمة مرتبة ومشروحة', review: 'مراجعة متوازنة لمنتج أو خدمة', news: 'مقال إخباري محايد', comparison: 'مقارنة منظمة بمعايير واضحة', casestudy: 'دراسة حالة موثقة', opinion: 'مقال رأي يميز الرأي عن الحقيقة', tutorial: 'درس تعليمي خطوة بخطوة', summary: 'ملخص مركز ومنظم', faqpage: 'صفحة أسئلة وأجوبة مفصلة'
  };
  const OPENING_MAP = {
    brief: 'مقدمة موجزة تحدد الموضوع والفائدة', question: 'سؤال واضح يعبّر عن حاجة القارئ', statistic: 'إحصائية موثوقة فقط؛ إن لم تتوفر فلا تختلق رقماً واستبدلها بحقيقة عامة', fact: 'حقيقة دقيقة مرتبطة مباشرة بالموضوع', quote: 'اقتباس موثق فقط؛ لا تنسب أقوالاً مختلقة', story: 'حكاية قصيرة توضيحية غير مقدمة على أنها واقعة حقيقية', personal: 'افتتاحية إنسانية متعاطفة دون ادعاء تجربة شخصية غير حقيقية'
  };

  function promptLanguage(language){ return language === 'en' ? 'English' : 'العربية الفصحى'; }
  window.modweebPrompts = {
    article: params => buildArticlePrompt(params || {}),
    suggestTitles: ({title = '', language = 'ar', count = 10} = {}) => ({
      systemPrompt: `أنت محرر عناوين SEO. اقترح عناوين دقيقة وجذابة وغير مضللة باللغة ${promptLanguage(language)}. أعد JSON صالحاً فقط بهذا الشكل: {"suggestions":["..."]}. لا تضف شروحاً.`,
      userPrompt: `اقترح ${Math.max(1, Math.min(20, Number(count) || 10))} عناوين مختلفة للموضوع التالي، مع الحفاظ على معناه وتجنب الادعاءات غير المدعومة:\n${title}`
    }),
    keywords: ({topic = '', language = 'ar'} = {}) => ({
      systemPrompt: `أنت متخصص SEO. أخرج JSON صالحاً فقط بالشكل {"keywords":["..."]}. أدرج كلمات مفتاحية رئيسية وفرعية وعبارات بحث طويلة ذات صلة باللغة ${promptLanguage(language)}، دون تكرار أو حشو.`,
      userPrompt: `أنشئ من 8 إلى 12 كلمة أو عبارة مفتاحية مناسبة لهذا الموضوع:\n${topic}`
    }),
    improveText: ({text = '', action = 'rewrite', language = 'ar'} = {}) => {
      const instructions = { rewrite: 'أعد صياغة النص مع الحفاظ على المعنى', summarize: 'لخّص النص مع إبقاء أهم الأفكار', expand: 'وسّع النص بإضافة شرح مفيد دون اختلاق حقائق', simplify: 'بسّط النص للقارئ العام', shorten: 'اختصر النص مع الحفاظ على النقاط الأساسية', fix: 'صحح الأخطاء اللغوية والإملائية فقط قدر الإمكان' };
      return { systemPrompt: `أنت محرر لغوي محترف. اكتب باللغة ${promptLanguage(language)}. أعد النص الناتج فقط دون مقدمات أو علامات اقتباس، ولا تضف حقائق غير موجودة.`, userPrompt: `${instructions[action] || instructions.rewrite}:\n\n${text}` };
    },
    seoMeta: ({topic = '', mainKeyword = '', language = 'ar', articleText = ''} = {}) => ({
      systemPrompt: `أنت خبير SEO. أعد JSON صالحاً فقط بالحقول metaTitle وmetaDescription وslug وkeywords (مصفوفة). اكتب باللغة ${promptLanguage(language)}، واجعل الوصف دقيقاً ولا تضف ادعاءات غير موجودة في النص.`,
      userPrompt: `الموضوع: ${topic}\nالكلمة المفتاحية: ${mainKeyword}\nالنص المتاح: ${articleText}\nأنشئ عنواناً ووصفاً موجزاً وslug مناسباً وكلمات مفتاحية مرتبطة.`
    }),
    smartAssistant: ({prompt = '', topic = '', language = 'ar', format = 'html'} = {}) => ({
      systemPrompt: `أنت مساعد كتابة محتوى. أجب باللغة ${promptLanguage(language)} ونفّذ طلب المستخدم بدقة. ${format === 'html' ? 'عند الحاجة أخرج HTML دلالياً نظيفاً فقط، دون Markdown أو شروح خارج المحتوى.' : 'أخرج نصاً عادياً فقط، دون Markdown أو شروح إضافية.'} لا تختلق حقائق أو مصادر.`,
      userPrompt: `${topic ? `سياق الموضوع: ${topic}\n` : ''}الطلب: ${prompt}`
    })
  };

export {};
