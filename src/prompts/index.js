/* تعليمات توليد المحتوى — تحافظ على واجهة window.modweebPrompts الحالية. */
function buildArticlePrompt(params) {
  const {
    topic, mainKeyword = '', keywords = '', customRequest = '',
    writingMode = 'default',
    tone = 'professional', size = 'md', language = 'ar', country = 'ar',
    pov = 'neutral', readingEase = 'easy',
    articleType = 'guide', opening = 'brief',
    hasConclusion = true, hasTables = false, hasH3 = true, hasH4 = true, hasLists = true,
    hasItalics = false, hasQuotes = true, hasKeyPoints = true,
    hasInstructions = false, hasBold = true,
    hasNotes = false, hasAlerts = false, hasBlur = false, hasCode = false,
    hasImages = false, hasYoutube = false, youtubeReference = ''
  } = params;

  const writingModeGuide = WRITING_MODE_MAP[writingMode] || WRITING_MODE_MAP.default;
  const langInstruction = language === 'ar'
    ? 'اكتب جميع المحتويات باللغة العربية الفصحى المعاصرة.'
    : 'Write all content in fluent, natural English.';
  const sizeGuide = SIZE_MAP[size] || SIZE_MAP.md;
  const toneGuide = TONE_MAP[tone] || TONE_MAP.professional;
  const readingGuide = READING_MAP[readingEase] || READING_MAP.easy;
  const povGuide = POV_MAP[pov] || POV_MAP.neutral;
  const countryGuide = COUNTRY_MAP[country] || COUNTRY_MAP.ar;
  const articleTypeGuide = ARTICLE_TYPE_MAP[articleType] || ARTICLE_TYPE_MAP.guide;
  const openingGuide = OPENING_MAP[opening] || OPENING_MAP.brief;

  const preferences = [];
  if (hasH3) preferences.push('يمكن استخدام H3 لتقسيم قسم طويل أو فكرة فرعية حقيقية؛ ليس مطلوباً في كل H2.');
  if (hasH4) preferences.push('استخدم H4 نادراً عند وجود تفرعات واضحة داخل H3، ولا تضفه لاستكمال تسلسل شكلي.');
  if (hasLists) preferences.push('القوائم أو الخطوات مناسبة فقط للمعلومات التي تصبح أوضح بهذا الشكل.');
  if (hasBold) preferences.push('أبرز بالمهم من النص عند الحاجة، باعتدال.');
  if (hasItalics) preferences.push('استخدم التمييز المائل عند حاجة تحريرية فعلية.');
  if (hasQuotes) preferences.push('لا تدرج اقتباساً إلا إذا ورد نصه ومصدره في المدخلات أو كانا موثقين فيها؛ لا تنشئ اقتباسات منسوبة.');
  if (hasKeyPoints) preferences.push('يمكن إضافة نقاط موجزة إذا كانت تلخص فائدة حقيقية، لا كعنصر إلزامي.');
  if (hasInstructions) preferences.push('أضف تنبيهاً فقط عند وجود تحذير محدد ومفيد تدعمه المعلومات المتاحة.');
  if (hasTables) preferences.push('الجدول اختياري عند مقارنة بيانات أو خيارات واضحة؛ لا تخترع قيماً لملئه.');
  if (hasImages) preferences.push('أدرج image فقط عند توافر رابط/أصل صورة صالح أو تعليمات صريحة؛ لا تنشئ روابط أو عناصر نائبة.');
  if (hasNotes) preferences.push('أدرج note بنمط وعنوان مناسبين (noteTitle) فقط حيث تضيف ملاحظة أو نصيحة قيمة.');
  if (hasAlerts) preferences.push('أدرج alert عند الحاجة فقط، واختر alertStyle وalertTitle بدقة؛ لا تحول كل فقرة إلى تنبيه.');
  if (hasBlur) preferences.push('استخدم spoiler بنمط blur لإخفاء نص اختياري فقط إذا كان مناسباً (مثلاً إجابة/حرق)، ولا تخفِ معلومات أساسية.');
  if (hasCode) preferences.push('أضف مثال code فقط إذا كان الموضوع تقنياً ويتطلب مثالاً؛ يجب أن يكون سليماً، محدود النطاق، وموسوماً بلغته.');
  if (hasYoutube) preferences.push('لا تخترع روابط أو معرّفات فيديو. سيضيف التطبيق فيديو YouTube بعد التوليد فقط إذا زوّده المستخدم برابط/معرّف صالح.');
  if (hasConclusion) preferences.push('اختم عند الحاجة بخلاصة قصيرة نافعة؛ لا تفرض دعوة تسويقية لاتخاذ إجراء.');

  const typeCatalog = `أنواع sections المدعومة وحقولها. استخدم النوع والحقول المدرجة فقط، ولا تضف مفاتيح HTML أو أنواعاً أخرى:
- basics: {"type":"basics","metaDescription":"وصف دقيق موجز"}
- heading: {"type":"heading","content":"...","headingLevel":"h1|h2|h3|h4|h5|h6","headingBefore":"اختياري","headingAfter":"اختياري"}
- paragraph: {"type":"paragraph","content":"...","paragraphStyle":"normal|indent|dropcap|ref","refSource":"مطلوب فقط عند paragraphStyle=ref"}
- toc: {"type":"toc","tocLabel":"...","tocStyle":"automatic|manual","tocManualItems":[{"text":"...","id":"..."}]}
- note: {"type":"note","content":"...","noteStyle":"info|warning|question","noteTitle":"عنوان قصير اختياري"}
- alert: {"type":"alert","content":"...","alertStyle":"info|warning|success|error|tip|question","alertOutlined":false,"alertTitle":"عنوان قصير اختياري"}
- blockquote: {"type":"blockquote","content":"نص اقتباس موثق في المدخلات فقط","quoteAuthor":"مصدر مذكور فقط","quoteStyle":"normal|s1|s2"}
- steps: {"type":"steps","steps":["...","..."]}
- list: {"type":"list","listItems":["...","..."],"listStyle":"default|s1"}
- keyPoints: {"type":"keyPoints","items":["...","..."]}
- table: {"type":"table","tableRows":N,"tableCols":N,"tableData":[["...","..."]],"tableClasses":"bordered stripped hovered sticky"}
- accordion: {"type":"accordion","summary":"...","content":"...","accordionType":"ac|ac alt|sp|group","accordions":[{"summary":"...","content":"...","alt":false}]}
- spoiler: {"type":"spoiler","content":"نص اختياري مخفي","accordionType":"blur","spoilerBlurText":"عنوان أو تلميح قصير"}
- faq: {"type":"faq","faqItems":[{"question":"...","answer":"..."}]}
- code: {"type":"code","codeContent":"...","codeLanguage":"html|css|js|json","codeComment":"اختياري","codeSource":"اختياري","codeLines":"اختياري","codeCopy":true,"codeHighlight":true,"codeSyntax":true}
- mark: {"type":"mark","markText":"...","markClass":"|block|red|gray|orange|blue|green|gold|purple"}
- image: {"type":"image","imageStyle":"standard|full|figure|grid|scroll|lazyload|showall","imageUrl":"...","imageAlt":"وصف بديل دقيق","imageLightbox":true,"imageCaptionStyle":"figure|table","imageDisableCaption":false,"caption":"عند figure","gridUrls":"روابط فعلية، رابط في كل سطر عند grid/scroll/showall"}
- lazyYt: {"type":"lazyYt","youtubeId":"معرّف فعلي","youtubeMode":"lazy|defer","ratio":"16/9|4/3"}

الهيكل: عنوان h1 واحد، ثم أقسام h2 عند الحاجة. يجوز أن يتبع h2 نص أو عنصر مناسب مباشرة؛ أضف h3/h4 فقط إذا حسّنا الفهم، ولا تُلزم كل قسم بمستويات فرعية أو بعدد ثابت من العناوين. لا تدرج عناصر تنسيق لمجرد التنويع.`;

  const systemPrompt = [
    'أنت محرر محتوى دقيق ونافع للناس. ' + langInstruction,
    'أنشئ محتوى أصلياً موثوقاً يجيب حاجة القارئ، لا نصاً للتلاعب بترتيب البحث. المقاس المطلوب إشارة مرنة إلى عمق التغطية لا حد أدنى للطول أو عدد الأقسام.',
    'الجمهور: ' + countryGuide + '. نوع المقال: ' + articleTypeGuide + '. النبرة: ' + toneGuide + '. سهولة القراءة: ' + readingGuide + '. منظور السرد: ' + povGuide + '. نطاق التغطية: ' + sizeGuide,
    'اكتب بطبيعية ووضوح، بعناوين دقيقة تصف المحتوى. استخدم المصطلحات والكلمات المفتاحية حين تلائم السياق دون تكرار قسري. لا تضف أقساماً أو أسئلة شائعة أو قوائم أو جداول لملء قالب.',
    'الدقة والثقة: لا تختلق تجربة أو خبرة شخصية، أو سيرة/صفة خبير، أو إحصاء أو دراسة أو اقتباس أو مصدر أو رابط أو خاصية منتج. لا تعرض الرأي كحقيقة. اعتمد على المدخلات؛ وإذا لم تتوفر معلومة لازمة فصرّح بحدودها أو تجنب الادعاء، واطلب التحقق من المعلومات الحديثة عند ملاءمة السياق.',
    'الافتتاحية تفضيل تحريري لا قالب إلزامي: ' + openingGuide + '. لا تبدأ بإحصاء أو حقيقة إلا إذا كانت واردة بوضوح في المدخلات، ولا تقدّم قصة توضيحية خيالية على أنها حدث حقيقي أو تجربة الكاتب.',
    'وضع الكتابة: ' + writingModeGuide,
    preferences.length ? 'عناصر اختيارية، أدرج ما يخدم الموضوع والقارئ فقط: ' + preferences.join(' ') : '',
    'قيد العناصر الاختيارية: الأنواع الأساسية هي basics وheading وparagraph وtoc. لا تُدرج أي نوع اختياري إلا إذا فعّل المستخدم خياره أو طلب النوع صراحةً؛ وجود النوع في المخطط لا يعني إضافته. FAQ محظور افتراضياً، ويسمح به فقط إذا اختار المستخدم نوع مقال الأسئلة الشائعة أو طلب FAQ صراحةً. لا تُنشئ table أو image أو lazyYt إلا وفق خياراتها ومدخلاتها الصريحة، ولا تختلق روابط أو بيانات أو وسائط. إضافة بقية الأنواع اختياري تماماً، ولا تُستخدم إلا وفق التفضيلات والفائدة التحريرية.',
    'مخطط الأنواع وحقول القالب المدعومة:', typeCatalog,
    'الإخراج: أعد JSON صالحاً فقط بالمفاتيح title وmetaDescription وtags وsections. يجب أن تكون sections مصفوفة من الأنواع والحقول المدعومة أعلاه. لا تضف HTML أو حقولاً جديدة أو Markdown خارج JSON. اجعل العنوان والوصف دقيقين وغير مضللين، ولا تفرض طولاً معيارياً لهما. اجعل الوسوم وثيقة الصلة بلا حشو. لا تضف فقرة مصادر افتراضية.'
  ].filter(Boolean).join('\n\n');

  const userPrompt = [
    `اكتب مقالاً مفيداً وأصيلاً يجيب عن نية القارئ حول: ${topic}`,
    mainKeyword ? `الكلمة/العبارة الأساسية (استخدمها طبيعياً عند الملاءمة): ${mainKeyword}` : '',
    keywords ? `مصطلحات مساعدة (استخدم المناسب منها بلا حشو): ${keywords}` : '',
    hasYoutube && youtubeReference ? `مرجع فيديو قدّمه المستخدم؛ لا تغير معرّفه أو تستبدله: ${youtubeReference}` : '',
    customRequest ? `تعليمات إضافية: ${customRequest}` : ''
  ].filter(Boolean).join('\n');

  return { systemPrompt, userPrompt };
}

const WRITING_MODE_MAP = {
  default: 'أسلوب متوازن وواضح يقدّم قيمة عملية للقارئ، بلا حشو.',
  seo: 'راعِ نية البحث بعناوين دقيقة واستخدام طبيعي للمصطلحات، دون وعود بالترتيب أو حشو.',
  human: 'اكتب بصوت طبيعي ودافئ وجمل متنوعة؛ لا تدّعِ تجربة بشرية أو شخصية لم يذكرها المستخدم.',
  news: 'اكتب بأسلوب إخباري محايد، ميّز المؤكد من غير المؤكد، ولا تختلق تواريخ أو تصريحات أو وقائع.',
  affiliate: 'قدّم مراجعة أو دليلاً شفافاً يوضح المزايا والقيود ومعايير الاختيار المتاحة؛ لا تختلق استخداماً أو ادعاءات، واذكر الإفصاح التجاري فقط إذا قدمته المدخلات.',
  adsense: 'اكتب محتوى أصلياً نافعاً وسهل القراءة ومتوافقاً مع الإعلانات، دون إطالة أو تكرار مصطنع.',
  viral: 'اجعل الصياغة جذابة ومشوقة بلا مبالغة أو إثارة مضللة أو ادعاءات غير مدعومة.',
  technical: 'اكتب بدقة تقنية، واشرح المصطلحات والخطوات والأمثلة القابلة للتحقق؛ لا تزعم اختباراً لم يُجرَ.'
};
const SIZE_MAP = {
  xs: 'تغطية موجزة تلبي الحاجة الأساسية دون حذف ما يلزم للفهم.',
  sm: 'تغطية قصيرة تشرح النقاط الضرورية للموضوع.',
  md: 'تغطية متوازنة بقدر ما يحتاجه الموضوع.',
  lg: 'تغطية موسعة فقط إذا كانت التفاصيل الإضافية نافعة وذات صلة.'
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
const POV_MAP = {
  neutral: 'محايد؛ تجنب ضمائر المتكلم والمخاطب ما لم تقتضِ الجملة ذلك.',
  you: 'مخاطبة القارئ مباشرة بصيغة أنت عند ملاءمتها، دون افتعال.',
  we: 'ضمير المتكلم الجمع نحن عند ملاءمته، دون ادعاء تجربة مشتركة أو خبرة غير واردة.',
  i: 'ضمير المتكلم المفرد أنا عند ملاءمته، دون ادعاء تجربة شخصية غير واردة.',
  he: 'ضمير الغائب المذكر عند ملاءمته.',
  she: 'ضمير الغائب المؤنث عند ملاءمته.',
  they: 'ضمير الغائب الجمع عند ملاءمته.'
};
const COUNTRY_MAP = {
  ar: 'جمهور الدول العربية عموماً', sa: 'الجمهور في المملكة العربية السعودية',
  eg: 'الجمهور في مصر', ae: 'الجمهور في الإمارات العربية المتحدة',
  ma: 'الجمهور في المغرب', dz: 'الجمهور في الجزائر', iq: 'الجمهور في العراق',
  global: 'جمهور دولي متنوع'
};
const ARTICLE_TYPE_MAP = {
  none: 'مقال عام', guide: 'دليل إرشادي عملي', tutorial: 'شرح تعليمي خطوة بخطوة',
  comparison: 'مقارنة منظمة بمعايير واضحة', review: 'مراجعة متوازنة لمنتج أو خدمة',
  list: 'قائمة مرتبة ومشروحة عند ملاءمتها', listicle: 'قائمة مرتبة ومشروحة عند ملاءمتها',
  news: 'مقال إخباري محايد', faq: 'صفحة أسئلة وأجوبة مفيدة', faqpage: 'صفحة أسئلة وأجوبة مفيدة',
  opinion: 'مقال رأي يميز الرأي عن الحقيقة', casestudy: 'دراسة حالة موثقة بالمدخلات',
  summary: 'ملخص مركز ومنظم'
};
const OPENING_MAP = {
  brief: 'ابدأ مباشرة بتوضيح الموضوع وفائدته للقارئ',
  direct: 'ابدأ مباشرة بالجواب أو الفائدة الأساسية',
  question: 'ابدأ بسؤال واضح يعبر عن حاجة القارئ',
  fact: 'ابدأ بحقيقة دقيقة ذات صلة إذا كانت موجودة في المدخلات فقط',
  inputFact: 'ابدأ بحقيقة دقيقة واردة في المدخلات فقط',
  statistic: 'لا تستخدم إحصاءً إلا إذا ورد موثقاً في المدخلات؛ وإلا فابدأ مباشرة دون رقم',
  quote: 'استخدم اقتباساً موثقاً وارداً في المدخلات فقط، وإلا فلا تفتعل اقتباساً',
  story: 'استخدم قصة افتراضية قصيرة للتوضيح فقط، وصرّح بأنها مثال خيالي لا واقعة حقيقية',
  fictionalStory: 'استخدم قصة افتراضية قصيرة للتوضيح فقط، وصرّح بأنها مثال خيالي لا واقعة حقيقية',
  personal: 'ابدأ بتعاطف إنساني دون ادعاء تجربة شخصية غير حقيقية'
};

function promptLanguage(language) { return language === 'en' ? 'English' : 'العربية الفصحى'; }
window.modweebPrompts = {
  article: params => buildArticlePrompt(params || {}),
  suggestTitles: ({ title = '', language = 'ar', count = 10 } = {}) => ({
    systemPrompt: `أنت محرر عناوين. اقترح عناوين دقيقة وجذابة وغير مضللة باللغة ${promptLanguage(language)}. أعد JSON صالحاً فقط بهذا الشكل: {"suggestions":["..."]}. لا تضف شروحاً.`,
    userPrompt: `اقترح ${Math.max(1, Math.min(20, Number(count) || 10))} عناوين مختلفة للموضوع التالي، مع الحفاظ على معناه وتجنب الادعاءات غير المدعومة:\n${title}`
  }),
  keywords: ({ topic = '', language = 'ar' } = {}) => ({
    systemPrompt: `أنت مساعد بحث كلمات مفتاحية. أخرج JSON صالحاً فقط بالشكل {"keywords":["..."]}. اقترح عبارات بحث ذات صلة باللغة ${promptLanguage(language)} دون تكرار أو حشو، ولا تعرضها كبيانات أو أحجام بحث من Google.`,
    userPrompt: `اقترح عبارات مفتاحية مناسبة لهذا الموضوع دون ادعاء بيانات حجم البحث:\n${topic}`
  }),
  improveText: ({ text = '', action = 'rewrite', language = 'ar' } = {}) => {
    const instructions = {
      rewrite: 'أعد صياغة النص مع الحفاظ على المعنى',
      summarize: 'لخّص النص مع إبقاء أهم الأفكار',
      expand: 'وسّع النص بإضافة شرح مفيد دون اختلاق حقائق',
      simplify: 'بسّط النص للقارئ العام',
      shorten: 'اختصر النص مع الحفاظ على النقاط الأساسية',
      fix: 'صحح الأخطاء اللغوية والإملائية فقط قدر الإمكان'
    };
    return {
      systemPrompt: `أنت محرر لغوي محترف. اكتب باللغة ${promptLanguage(language)}. أعد النص الناتج فقط دون مقدمات أو علامات اقتباس، ولا تضف حقائق أو تجارب أو مصادر غير موجودة.`,
      userPrompt: `${instructions[action] || instructions.rewrite}:\n\n${text}`
    };
  },
  seoMeta: ({ topic = '', mainKeyword = '', language = 'ar', articleText = '' } = {}) => ({
    systemPrompt: `أنت محرر بيانات وصفية. أعد JSON صالحاً فقط بالحقول metaTitle وmetaDescription وslug وkeywords (مصفوفة). اكتب باللغة ${promptLanguage(language)}، واجعل النص دقيقاً وموجزاً ولا تضف ادعاءات غير موجودة في النص. لا توجد أطوال إلزامية من Google.`,
    userPrompt: `الموضوع: ${topic}\nالكلمة المفتاحية: ${mainKeyword}\nالنص المتاح: ${articleText}\nأنشئ عنواناً ووصفاً موجزين وslug مناسباً وكلمات مفتاحية مرتبطة.`
  }),
  smartAssistant: ({ prompt = '', topic = '', language = 'ar', format = 'html' } = {}) => ({
    systemPrompt: `أنت مساعد كتابة محتوى. أجب باللغة ${promptLanguage(language)} ونفّذ طلب المستخدم بدقة. ${format === 'html' ? 'عند الحاجة أخرج HTML دلالياً نظيفاً فقط، دون Markdown أو شروح خارج المحتوى.' : 'أخرج نصاً عادياً فقط، دون Markdown أو شروح إضافية.'} لا تختلق حقائق أو تجارب أو مصادر.`,
    userPrompt: `${topic ? `سياق الموضوع: ${topic}\n` : ''}الطلب: ${prompt}`
  }),
  smartArticleEdit: ({ prompt = '', topic = '', language = 'ar', scope = 'article', content = '' } = {}) => ({
    systemPrompt: `أنت محرر HTML دقيق. اكتب باللغة ${promptLanguage(language)}، وحافظ على المعنى والحقائق والروابط والبنية غير المستهدفة، ولا تضف معلومات أو مصادر غير موجودة. أعد JSON صالحاً فقط بلا Markdown. ${scope === 'selection'
      ? 'المخطط المطلوب: {"replacementHtml":"..."}. حرر المقطع المحدد فقط بصيغة HTML دلالية سليمة.'
      : 'المخطط المطلوب: {"findHtml":"...","replacementHtml":"..."}. findHtml يجب أن يكون مقتطفاً متصلاً وحرفياً من HTML المدخل ومميزاً بوضوح، وreplacementHtml هو النسخة المعدلة لهذا المقتطف فقط. لا تعد كامل المقال ولا تحذف أجزاء أخرى.'}`,
    userPrompt: `${topic ? `سياق الموضوع: ${topic}\n` : ''}الطلب: ${prompt}\n\n${scope === 'selection' ? 'المقطع المحدد:' : 'HTML المقال الحالي (اختر أصغر مقطع متصل يحقق التعديل):'}\n${content}`
  })
};

export {};
