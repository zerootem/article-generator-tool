/* تعليمات توليد المحتوى — تحافظ على واجهة window.modweebPrompts الحالية. */
function buildArticlePrompt(params = {}) {
  const {
    topic = '', mainKeyword = '', keywords = '', customRequest = '',
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
  if (hasH3) preferences.push('يمكن استخدام H3 لتقسيم فكرة فرعية حقيقية أو جزء طويل؛ لا تضع H3 في كل قسم.');
  if (hasH4) preferences.push('يجوز استخدام H4 وما بعده عند وجود تسلسل فرعي واضح فقط؛ H5 وH6 نادران ويستخدمان حصراً للحفاظ على بنية متداخلة مفهومة.');
  if (hasLists) preferences.push('استخدم list عندما تسهّل عرض عناصر متوازية، ولا تكرر القائمة لمجرد التنويع.');
  if (hasBold) preferences.push('استخدم العريض باعتدال لإبراز مصطلح أو خلاصة مفيدة، لا لحشو الكلمات المفتاحية.');
  if (hasItalics) preferences.push('استخدم المائل فقط عند وجود حاجة تحريرية فعلية.');
  if (hasQuotes) preferences.push('لا تدرج اقتباساً منسوباً إلا إذا كان نصه ونسبته موثقين في مدخلات المستخدم؛ لا تنشئ اقتباسات أو أسماء خبراء.');
  if (hasKeyPoints) preferences.push('يمكن إضافة keyPoints موجزة تلخص نتائج المقال عندما تكون نافعة؛ لا تفرض عدداً أو موضعاً ثابتاً ولا تكرر متن المقال.');
  if (hasInstructions) preferences.push('عند شرح إجراء متسلسل حقيقي، أدرج steps عملية مرتبة؛ لا تستخدم steps للموضوعات الوصفية ولا تحوّل هذا الخيار إلى alert.');
  if (hasTables) preferences.push('أدرج table فقط عندما توجد مقارنة أو بيانات مفيدة؛ لا تختلق قيماً لملء خلاياه.');
  if (hasImages) preferences.push('أدرج image منظماً فقط عند وجود رابط صورة HTTP(S) قدمه المستخدم؛ لا تنشئ رابطاً أو عنصراً نائباً.');
  if (hasNotes) preferences.push('أدرج note عند وجود معلومة تفسيرية أو نصيحة مفيدة، واختر noteStyle مناسباً؛ لا تجعله إخلاء مسؤولية مصطنعاً.');
  if (hasAlerts) preferences.push('أدرج alert عند وجود تحذير أو معلومة تستدعي إبرازاً، واختر alertStyle بدقة؛ لا تحوّل كل فقرة إلى تنبيه.');
  if (hasBlur) preferences.push('استخدم spoiler مع accordionType=blur فقط لمعلومة اختيارية مناسبة كإجابة أو حرق؛ لا تخفِ المعلومة الأساسية.');
  if (hasCode) preferences.push('أدرج code أو codeTabs أو inlineCode عند الحاجة التقنية الحقيقية فقط؛ اختر لغة من القائمة المدعومة، واستخدم kbd لاختصار لوحة مفاتيح حقيقي فقط.');
  if (hasYoutube) preferences.push('لا تنشئ lazyYt أو معرّف فيديو؛ التطبيق يضيف الفيديو من مرجع YouTube الذي أدخله المستخدم بعد التوليد.');
  if (hasConclusion) preferences.push('اختم بخلاصة موجزة ذات قيمة تلخص أهم النتائج؛ لا تفرض دعوة تسويقية أو ادعاءً غير مدعوم.');
  if (!hasH3) preferences.push('خيار H3 معطّل: لا تستخدم عناوين h3.');
  if (!hasH4) preferences.push('خيار H4 وما بعده معطّل: لا تستخدم h4 أو h5 أو h6.');
  if (!hasConclusion) preferences.push('خيار الخاتمة معطّل: لا تضف قسم خاتمة مستقلاً.');
  if (!hasTables) preferences.push('خيار الجداول معطّل: لا تستخدم table إلا إذا طلبه المستخدم صراحةً في customRequest.');
  if (!hasLists) preferences.push('خيار القوائم معطّل: لا تستخدم list إلا إذا طلبها المستخدم صراحةً في customRequest.');
  if (!hasQuotes) preferences.push('خيار الاقتباسات معطّل: لا تستخدم blockquote.');
  if (!hasKeyPoints) preferences.push('خيار النقاط الرئيسية معطّل: لا تستخدم keyPoints.');
  if (!hasInstructions) preferences.push('خيار الخطوات معطّل: لا تستخدم steps إلا إذا طلبها المستخدم صراحةً في customRequest.');
  if (!hasBold) preferences.push('خيار الخط العريض معطّل: لا تستخدم strong أو b.');
  if (!hasItalics) preferences.push('خيار الخط المائل معطّل: لا تستخدم em أو i.');
  if (!hasNotes) preferences.push('خيار الملاحظات معطّل: لا تستخدم note.');
  if (!hasAlerts) preferences.push('خيار التنبيهات معطّل: لا تستخدم alert.');
  if (!hasBlur) preferences.push('خيار ضباب النص معطّل: لا تستخدم spoiler.');
  if (!hasCode) preferences.push('خيار الأكواد معطّل: لا تستخدم code أو codeTabs أو inlineCode أو kbd.');
  if (!hasImages) preferences.push('خيار الصور معطّل: لا تستخدم image أو gridUrls.');
  if (!hasYoutube) preferences.push('خيار YouTube معطّل: لا تستخدم lazyYt.');

  const typeCatalog = `مخطط sections الحالي. أخرج الأنواع والحقول المكتوبة هنا فقط، وبأسماء الحقول نفسها:
- basics: {"type":"basics","metaDescription":"وصف دقيق للمقال","thumbnailUrl":"رابط صورة قدمه المستخدم فقط أو اتركه فارغاً","subtitle":"عنوان فرعي دقيق اختياري"}
- heading: {"type":"heading","content":"...","headingLevel":"h1|h2|h3|h4|h5|h6","headingBefore":"اختياري","headingAfter":"اختياري"}
- paragraph: {"type":"paragraph","content":"نص أو تنسيق inline مسموح فقط","paragraphStyle":"normal|indent|dropcap|ref","refSource":"مصدر حقيقي مذكور في المدخلات عند استخدام ref"}
- toc: {"type":"toc","tocLabel":"جدول المحتويات","tocStyle":"automatic|manual","tocManualItems":[{"text":"...","id":"..."}]}
- note: {"type":"note","content":"...","noteStyle":"info|warning|question","noteTitle":"عنوان قصير اختياري"}
- alert: {"type":"alert","content":"...","alertStyle":"info|warning|success|error|tip|question","alertOutlined":false,"alertTitle":"عنوان قصير اختياري"}
- blockquote: {"type":"blockquote","content":"اقتباس موثق فقط","quoteAuthor":"نسبة موثقة فقط","quoteStyle":"normal|s1|s2"}
- steps: {"type":"steps","steps":["خطوة عملية", "خطوة عملية"]}
- list: {"type":"list","listItems":["...", "..."],"listStyle":"default|s1"}
- keyPoints: {"type":"keyPoints","items":["...", "..."]}
- table: {"type":"table","tableRows":2,"tableCols":2,"tableData":[["رأس 1","رأس 2"],["...","..."]],"tableClasses":"bordered stripped hovered"}
- accordion: {"type":"accordion","summary":"...","content":"...","accordionType":"ac|ac alt|sp|group|blur","accordions":[{"summary":"...","content":"...","alt":false}]}
- accordionGroup: {"type":"accordionGroup","summary":"...","content":"...","accordionType":"group","accordions":[{"summary":"...","content":"...","alt":false}]}
- spoiler: {"type":"spoiler","accordionType":"blur","spoilerBlurText":"نص مناسب للإخفاء"}
- faq: {"type":"faq","faqItems":[{"question":"...","answer":"..."}]}
- code: {"type":"code","codeContent":"...","codeLanguage":"html|css|js|json","codeComment":"اختياري","codeSource":"لا تذكره إلا إذا قدم المستخدم المصدر","codeLines":"اختياري","codeCopy":true,"codeHighlight":true,"codeSyntax":true}
- codeTabs: {"type":"codeTabs","tabHtml":"...","tabCss":"...","tabJs":"...","tabJson":"..."}
- inlineCode: {"type":"inlineCode","inlineCode":"مصطلح أو أمر قصير"}
- kbd: {"type":"kbd","kbdText":"اختصار لوحة مفاتيح حقيقي"}
- mark: {"type":"mark","markText":"نص قصير","markClass":"|block|red|gray|orange|blue|green|gold|purple"}
- image: {"type":"image","imageStyle":"standard|full|figure|grid|scroll|lazyload|showall","imageUrl":"رابط HTTP(S) قدمه المستخدم حرفياً","imageAlt":"وصف دقيق","imageWidth":1280,"imageHeight":720,"imageLightbox":true,"imageCaptionStyle":"figure|table","imageDisableCaption":false,"caption":"...","gridUrls":"روابط فعلية قدمها المستخدم، رابط في كل سطر","scrollHeight":"h150|h200|h250"}
- lazyYt: {"type":"lazyYt","youtubeId":"لا تنشئه؛ التطبيق يستخرجه من مرجع المستخدم","youtubeMode":"lazy|defer","ratio":"16/9|4/3"}
- link: {"type":"link","linkText":"...","linkUrl":"رابط HTTP(S) قدمه المستخدم","linkStyle":"extL|alt|sec|button|buttonLn"}
- button: {"type":"button","buttonText":"...","buttonUrl":"رابط HTTP(S) قدمه المستخدم","buttonIcon":"|dl|demo","buttonOutlined":false}
- downloadBox: {"type":"downloadBox","fileName":"اسم ملف قدمه المستخدم","fileSize":"حجم قدمه المستخدم","downloadFile":"رابط HTTP(S) قدمه المستخدم"}
- audioPlayer: {"type":"audioPlayer","audioUrl":"رابط مباشر لملف MP3 قدمه المستخدم","audioTitle":"عنوان ذكره المستخدم فقط","audioPreload":"none|metadata|auto"}
- videoPlayer: {"type":"videoPlayer","videoUrl":"رابط ملف فيديو مباشر قدمه المستخدم","videoPoster":"رابط صورة غلاف قدمه المستخدم حرفياً أو اتركه فارغاً","videoType":"video/mp4|video/webm|video/ogg","videoPreload":"none|metadata|auto","videoWidth":"100%"}
- relatedManual: {"type":"relatedManual","relatedTitle":"عنوان قصير","relatedLinks":[{"text":"عنوان قدمه المستخدم","url":"رابط HTTP(S) قدمه المستخدم"}]}
- relatedAuto: {"type":"relatedAuto","relatedAutoLabel":"منشورات ذات صلة","relatedMax":6,"relatedDataLabel":"وسم يذكره المستخدم فقط","relatedSortBy":"updated|published","relatedRandom":true}

قيم الأنماط للأقسام أعلاه مغلقة؛ لا تخترع قيمة جديدة. لا تخلط الأنواع المتشابهة: note ليس alert، وsteps ليست تنبيهاً، وspoiler هو نمط blur، وlink/button/downloadBox عناصر مختلفة. لا تستخدم link أو button أو downloadBox أو audioPlayer أو videoPlayer أو relatedManual إلا بطلب صريح من المستخدم ومع روابط HTTP(S) أدخلها هو؛ لا تختلق URL أو عنوان صفحة أو اسم ملف أو حجماً. videoPoster وimageUrl وgridUrls يجب أن تكون روابط قدمها المستخدم حرفياً. لا تستخدم relatedAuto أو accordionGroup أو codeTabs أو kbd إلا إذا طلبها المستخدم صراحةً أو كانت مفيدة بوضوح ضمن خيارها المفعّل. يمكن إدراج relatedAuto دون روابط يدوية لأنه يُحمّل منشورات المدونة تلقائياً؛ لا تخترع له data label. استخدم codeTabs فقط عند وجود أمثلة حقيقية متعددة؛ لا تملأ تبويباً بكود وهمي. أخرج هذه الأنواع بمخطط حقولها فقط.`;

  const systemPrompt = [
    `أنت محرر محتوى عربي وخبير في بناء مقالات بلوجر طويلة نافعة، دقيقة، واضحة وسهلة التصفح. ${langInstruction}`,
    `اكتب مقالاً كاملاً يجيب حاجة القارئ من البداية إلى النهاية، لا مسودة قصيرة ولا ملخصاً. استخدم نوع المقال المختار (${articleTypeGuide}) والجمهور (${countryGuide}) والنبرة (${toneGuide}) وسهولة القراءة (${readingGuide}) ومنظور السرد (${povGuide}) كما يناسبها. وضع الكتابة: ${writingModeGuide}`,
    `الطول والعمق: ${sizeGuide}. نطاق الكلمات المختار هدف تحريري تقريبي قوي؛ اكتب في نطاقه ما دام الموضوع يسمح بمحتوى مفيد. لا تتوقف بعد مقدمة أو بضعة أسطر. وسّع كل محور أساسي بشرح وسياق وأمثلة عملية أو مقارنة عند توافر معلوماتها. لا تكرر الفكرة ولا تضف حشواً لمجرد بلوغ عدد الكلمات. أنشئ عدداً من أقسام H2 يكفي لتغطية الموضوع بعمق، من دون حصة ثابتة أو أقسام مصطنعة.`,
    `معايير جودة وSEO: حدّد نية القارئ وأجب عنها مبكراً، واجعل لكل عنوان دلالة دقيقة. استخدم الكلمة الرئيسية (${mainKeyword || 'لا توجد كلمة رئيسية محددة؛ استخدم الموضوع أساساً'}) في العنوان والمقدمة والعناوين الفرعية عندما تلائم السياق، وأدرج المرادفات والكلمات الداعمة (${keywords || 'لا توجد كلمات مساعدة محددة'}) طبيعياً بلا كثافة رقمية أو تكرار قسري. استهدف عنواناً واضحاً وجذاباً بطول تقريبي 55–65 حرفاً ووصفاً ميتا موجزاً نحو 140–160 حرفاً إذا أمكن دون الإخلال بالدقة؛ هذه أهداف تحريرية وليست ضماناً لمعايير Google. أنشئ 5–8 وسوم وثيقة الصلة بلا تكرار أو حشو. لا تعد بالتصدر أو بنتائج SEO مضمونة.`,
    `الافتتاحية: ${openingGuide}. ابدأ بإجابة أو فائدة واضحة، ثم وضّح ما سيغطيه المقال. لا تستخدم إحصاءً أو اقتباساً أو قصة واقعية إلا إذا كانت مدعومة في المدخلات؛ والقصة الافتراضية يجب أن توصف صراحة بأنها مثال تخيلي.`,
    `البنية التحريرية: ابدأ بكتلة basics، ثم عنوان H1 واحد، ثم جدول محتويات آلي toc، ثم مقدمة paragraph مناسبة. نظّم المتن بعناوين H2 واضحة، وفقرات paragraph كافية ومترابطة (عادةً فقرتان إلى أربع فقرات مفيدة لكل محور كبير بحسب الحاجة، لا كعدد آلي). يجوز أن يتبع H2 نص مباشر. استخدم H3 عند وجود فكرة فرعية، وH4–H6 فقط للتدرج الحقيقي وبالترتيب المنطقي؛ لا تقفز بين المستويات ولا تستخدم العنوان لمجرد تكبير الخط. أضف خاتمة بعنوان H2 وفق خيار hasConclusion.`,
    `المحتوى: اشرح المفاهيم بوضوح، وبيّن الشروط والاستثناءات والمزايا والقيود متى كانت معروفة. أضف الخطوات فقط للإجراءات المتسلسلة، والقوائم للمعلومات المتوازية، والجداول للمقارنات التي تتوفر بياناتها. اجعل كل عنصر يخدم الفهم ولا تفرض note أو alert أو quote أو keyPoints أو FAQ أو accordion أو code أو وسائط عشوائياً. تفضيلات العناصر المفعّلة: ${preferences.length ? preferences.join(' ') : 'لا توجد عناصر اختيارية مفعّلة؛ استخدم البنية الأساسية فقط.'}`,
    `الروابط والمصادر: أدرج من 2 إلى 4 مراجع خارجية ذات صلة في فقرة/فقرات أخيرة بعنوان «المصادر والمراجع» عندما تستطيع تحديد مصادر موثوقة وروابطها الدقيقة بثقة. فضّل المصادر الرسمية والأولية، واربط اسم المصدر أو عنوانه داخل paragraph.content باستخدام رابط HTML inline آمن فقط: <a href="URL" target="_blank" rel="noopener noreferrer">اسم المصدر</a>. يمكن أيضاً وضع رابط المصدر بجوار الادعاء الذي يسنده. لا تختلق اسم جهة أو عنوان صفحة أو URL، ولا تدّع أنك فتحت أو تحققت مباشرة من صفحة لم تُتح لك. إذا لم تكن متأكداً من رابط دقيق فلا تنشئه ولا تستبدله برابط وهمي؛ استخدم فقط المعلومات التي يمكن صياغتها بأمان. لا تضع روابط عامة أو placeholders. لا تنشئ روابط داخلية أو CTA أو روابط دعوة تسويقية من تلقاء نفسك. لا تستخدم كتل link/button/downloadBox أو relatedManual إلا بطلب صريح وروابط قدمها المستخدم. لا تنشئ صوتاً أو فيديو أو ملفاً قابلاً للتنزيل دون رابط مباشر قدمه المستخدم.`,
    `الدقة والثقة: لا تختلق تجربة شخصية أو صفة خبير أو إحصائية أو دراسة أو سعرًا أو تاريخاً أو خاصية منتج أو اقتباساً أو مصدراً. لا تعرض الرأي كحقيقة، ولا تخلط بين معلومة عامة ومعلومة حديثة. إذا كانت المعلومة تعتمد على تحديث آني ولا توجد في المدخلات، تجنب الجزم بها ونبّه إلى الحاجة للتحقق بدلاً من اختراعها.`,
    `تنسيق محتوى paragraph: content نص، ويسمح داخله فقط بعناصر inline الآمنة اللازمة مثل <strong>/<b> و<em>/<i> و<code> و<a> للروابط. لا تستخدم وسوماً block أو Markdown أو CSS أو JavaScript أو وسوماً غير مدرجة. اكتب JSON صالحاً مع تهريب علامات الاقتباس داخل النصوص والروابط. لا تضع روابط خاماً غير مفهومة إذا أمكن استخدام اسم وصفي كرابط.`,
    `قيود العناصر الاختيارية: basics وheading وparagraph وtoc هي العناصر الأساسية. FAQ لا يضاف تلقائياً؛ استخدمه فقط لنوع faq/faqpage أو عندما يطلبه المستخدم صراحةً، ما لم يطلب استبعاده. لا تضف accordion أو accordionGroup أو relatedAuto أو relatedManual تلقائياً. الأنواع التي تتحكم بها خانات الاختيار لا تستخدم إلا عند تفعيل خيارها؛ تفضيلات المستخدم المفعّلة والمعطّلة مذكورة أدناه. لا تخرج image أو gridUrls أو videoPoster إلا بروابط صور قدمها المستخدم حرفياً. لا تنشئ lazyYt أو معرّف فيديو؛ التطبيق يدرجه وحده من مرجع YouTube صالح أدخله المستخدم. الأنواع link/button/downloadBox/audioPlayer/videoPlayer/relatedManual لا تستخدم إلا بطلب صريح وبروابط ومدخلات كافية قدمها المستخدم.`,
    `المخطط الدقيق: ${typeCatalog}`,
    `قيم tableClasses المسموح بها هي فقط bordered وnoborder وcborder وstripped وhovered وsticky وvab وfull وmh100 وmhvh وmh200 وmh300 وsp5 وsp10 وsp20 وprimary وwarning وsuccess وerror وclr وclb، وتفصل بينها مسافات. خيارات relatedSortBy هي updated أو published. لا تخترع thumbnailUrl أو videoPoster أو imageUrl أو gridUrls؛ استخدم URL قدمه المستخدم حرفياً.`,
    `الإخراج النهائي: أعد JSON صالحاً فقط، بلا Markdown أو شرح خارجه، بالمفاتيح العليا title وmetaDescription وtags وsections. sections مصفوفة مرتبة من الكتل أعلاه فقط. اجعل title وmetaDescription متوافقين مع محتوى المقال؛ ضع الوصف أيضاً في basics.metaDescription. لا تضف حقولاً علوية أو أنواعاً أو خصائص غير مدرجة. لا تضع فقرة نسبة/إسناد دعائي ثابتة مثل «تم إعداد المقال بواسطة...» إلا إذا طلبها المستخدم.`,
  ].join('\n\n');

  const userPrompt = [
    `اكتب مقالاً كاملاً ومفصلاً ومفيداً حول الموضوع التالي، واستوفِ نطاق الحجم المختار دون حشو: ${topic}`,
    mainKeyword ? `الكلمة المفتاحية الرئيسية: ${mainKeyword}` : '',
    keywords ? `كلمات وعبارات مساعدة (استخدم المناسب فقط): ${keywords}` : '',
    hasYoutube && youtubeReference ? `مرجع YouTube الذي قدمه المستخدم؛ استخدمه كما هو ولا تخترع أو تستبدل معرّفه: ${youtubeReference}` : '',
    customRequest ? `تعليمات المستخدم الإضافية (اتبعها ما دامت لا تتعارض مع الدقة ومخطط الإخراج): ${customRequest}` : '',
    'أكمل جميع أقسام المقال المطلوبة في JSON، ولا تتوقف عند المقدمة.'
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
  xs: 'نطاق تقريبي 600-900 كلمة؛ تغطية موجزة مكتملة للحاجة الأساسية',
  sm: 'نطاق تقريبي 900-1500 كلمة؛ شرح النقاط الضرورية مع أمثلة عند الحاجة',
  md: 'نطاق تقريبي 1500-2400 كلمة؛ تغطية متوازنة ومتعمقة للموضوع',
  lg: 'نطاق تقريبي 2400-3600 كلمة؛ تغطية موسعة للمحاور ذات القيمة فقط'
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
