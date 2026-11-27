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
    hasNotes = false, hasAlerts = false, hasBlur = false, hasMark = false, hasAccordionVariants = false, hasCode = false,
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
  const articleTemplateGuide = ARTICLE_TEMPLATE_MAP[articleType] || ARTICLE_TEMPLATE_MAP.guide;
  const openingGuide = OPENING_MAP[opening] || OPENING_MAP.brief;
  const h2Target = H2_TARGET_MAP[size] || H2_TARGET_MAP.md;

  const preferences = [];
  if (hasH3) preferences.push('يمكن استخدام H3 لتقسيم فكرة فرعية حقيقية أو جزء طويل؛ لا تضع H3 في كل قسم.');
  if (hasH4) preferences.push('يجوز استخدام H4 وما بعده عند وجود تسلسل فرعي واضح فقط؛ H5 وH6 نادران ويستخدمان حصراً للحفاظ على بنية متداخلة مفهومة.');
  if (hasLists) preferences.push('استخدم list عندما تسهّل عرض عناصر متوازية، ولا تكرر القائمة لمجرد التنويع.');
  if (hasBold) preferences.push('استخدم العريض باعتدال لإبراز مصطلح أو خلاصة مفيدة، لا لحشو الكلمات المفتاحية.');
  if (hasItalics) preferences.push('استخدم المائل فقط عند وجود حاجة تحريرية فعلية.');
  if (hasQuotes) preferences.push('لا تدرج اقتباساً منسوباً إلا إذا كان نصه ونسبته موثقين في مدخلات المستخدم؛ لا تنشئ اقتباسات أو أسماء خبراء.');
  if (hasKeyPoints) preferences.push('أضف keyPoints بعد المقدمة الموسعة مباشرة (بعد فقرتي المقدمة)، في 5–7 محاور موجزة، من دون تكرار متن المقال.');
  if (hasInstructions) preferences.push('عند شرح إجراء متسلسل حقيقي، أدرج steps عملية مرتبة مباشرة بعد الفقرة indent؛ لا تستخدمها للموضوعات الوصفية.');
  if (hasTables) preferences.push('أدرج table فقط عندما توجد مقارنة أو بيانات مفيدة؛ لا تختلق قيماً لملء خلاياه.');
  if (hasImages) preferences.push('أدرج image منظماً فقط عند وجود رابط صورة HTTP(S) قدمه المستخدم؛ لا تنشئ رابطاً أو عنصراً نائباً.');
  if (hasNotes) preferences.push('يمكن إضافة note اختيارية إضافية عند وجود معلومة تفسيرية مفيدة؛ لا تكرر ملاحظة البداية الإلزامية.');
  if (hasAlerts) preferences.push('أدرج alert عند وجود تحذير أو معلومة تستدعي إبرازاً، واختر alertStyle بدقة؛ لا تحوّل كل فقرة إلى تنبيه.');
  if (hasBlur) preferences.push('استخدم spoiler مع accordionType=blur فقط لمعلومة اختيارية مناسبة كإجابة أو حرق؛ لا تخفِ المعلومة الأساسية.');
  if (hasMark) preferences.push('استخدم mark لإبراز عبارة قصيرة ذات قيمة تحريرية فقط، مع اختيار markClass مدعوم؛ لا تميّز فقرات كاملة ولا تكرر التمييز.');
  if (hasAccordionVariants) preferences.push('نوّع عناصر التفاعل بين ac alt أو sp أو blur أو group إذا خدم كل نمط غرضاً مختلفاً؛ أكورديون نهاية كل H2 الإلزامي يبقى accordionType:"ac".');
  if (hasCode) preferences.push('أدرج code أو codeTabs أو inlineCode عند الحاجة التقنية الحقيقية فقط؛ اختر لغة من القائمة المدعومة، واستخدم kbd لاختصار لوحة مفاتيح حقيقي فقط.');
  if (hasYoutube) preferences.push('لا تنشئ lazyYt أو معرّف فيديو؛ التطبيق يضيف الفيديو من مرجع YouTube الذي أدخله المستخدم بعد التوليد.');
  if (hasConclusion) preferences.push('أضف قسم الخاتمة المحدد في الهيكل الإلزامي، بخلاصة مفيدة بلا دعوة تسويقية أو ادعاء غير مدعوم.');
  if (!hasH3) preferences.push('خيار H3 معطّل: لا تستخدم عناوين h3.');
  if (!hasH4) preferences.push('خيار H4 وما بعده معطّل: لا تستخدم h4 أو h5 أو h6.');
  if (!hasConclusion) preferences.push('خيار الخاتمة معطّل: تخطّ قسم الخاتمة وملاحظتها الختامية فقط؛ احتفظ بقسم FAQ ومرجع المقال النهائي.');
  if (!hasTables) preferences.push('خيار الجداول معطّل: لا تستخدم table إلا إذا طلبه المستخدم صراحةً في customRequest.');
  if (!hasLists) preferences.push('خيار القوائم معطّل: لا تستخدم list إلا إذا طلبها المستخدم صراحةً في customRequest.');
  if (!hasQuotes) preferences.push('خيار الاقتباسات معطّل: لا تستخدم blockquote.');
  if (!hasKeyPoints) preferences.push('خيار النقاط الرئيسية معطّل: تخطّ keyPoints فقط؛ المقدمة تبقى فقرتين (dropcap ثم normal).');
  if (!hasInstructions) preferences.push('لا تضف steps لمجرد التنويع؛ لكن إذا شرح قسم H2 إجراءً متسلسلاً حقيقياً، فقاعدة الهيكل الإلزامي للخطوات لها الأولوية.');
  if (!hasBold) preferences.push('خيار الخط العريض معطّل: لا تستخدم strong أو b.');
  if (!hasItalics) preferences.push('خيار الخط المائل معطّل: لا تستخدم em أو i.');
  if (!hasNotes) preferences.push('لا تضف note اختيارية داخل المتن؛ أبقِ ملاحظة info الإلزامية في البداية.');
  if (!hasAlerts) preferences.push('خيار التنبيهات معطّل: لا تستخدم alert.');
  if (!hasBlur) preferences.push('خيار ضباب النص معطّل: لا تستخدم spoiler.');
  if (!hasMark) preferences.push('عنصر mark المنفصل معطّل؛ لكن التمييز السطري <mark>...</mark> داخل الفقرات مسموح باعتدال.');
  if (!hasAccordionVariants) preferences.push('لا تضف أنماط أكورديون اختيارية أو accordionGroup؛ أبقِ أكورديون نهاية H2 الإلزامي بالنمط ac.');
  if (!hasCode) preferences.push('عناصر الأكواد الكتلية معطّلة (code/codeTabs/kbd)؛ لكن <code>...</code> السطري للأرقام والمصطلحات الإنجليزية والأوامر مسموح داخل الفقرات.');
  if (!hasImages) preferences.push('خيار الصور معطّل: لا تستخدم image أو gridUrls.');
  if (!hasYoutube) preferences.push('خيار YouTube معطّل: لا تستخدم lazyYt.');

  const typeCatalog = `مخطط sections الحالي. أخرج الأنواع والحقول المكتوبة هنا فقط، وبأسماء الحقول نفسها:
- basics: {"type":"basics","basicsMode":"all|snippet|thumbnail","metaDescription":"وصف دقيق للمقال","thumbnailUrl":"رابط صورة قدمه المستخدم فقط أو اتركه فارغاً"}
- heading: {"type":"heading","content":"...","headingLevel":"h1|h2|h3|h4|h5|h6","headingBefore":"اختياري","headingAfter":"اختياري"}
- paragraph: {"type":"paragraph","content":"نص أو تنسيق inline مسموح فقط","paragraphStyle":"normal|indent|dropcap|ref","dropCapChar":"اختياري؛ حرف البداية عند dropcap فقط","refSource":"مصدر حقيقي مذكور في المدخلات عند استخدام ref"}
- note: {"type":"note","content":"...","noteStyle":"info|warning|question","noteTitle":"عنوان قصير اختياري"}
- alert: {"type":"alert","content":"...","alertStyle":"default|info|warning|success|error|tip|question","alertOutlined":false,"alertTitle":"عنوان قصير اختياري"}
- blockquote: {"type":"blockquote","content":"اقتباس موثق فقط","quoteAuthor":"نسبة موثقة فقط","quoteStyle":"normal|s1|s2"}
- steps: {"type":"steps","steps":["خطوة عملية", "خطوة عملية"]}
- list: {"type":"list","listItems":["...", "..."],"listStyle":"default|s1"}
- keyPoints: {"type":"keyPoints","items":["...", "..."]}
- table: {"type":"table","tableRows":2,"tableCols":2,"tableData":[["رأس 1","رأس 2"],["...","..."]],"tableClasses":"bordered stripped hovered|noborder|cborder|sticky|vab|full|mh100|mhvh|mh200|mh300|sp5|sp10|sp20|primary|warning|success|error|clr"}
- accordion: {"type":"accordion","summary":"...","content":"...","accordionType":"ac|ac alt|sp|group|blur","accordions":[{"summary":"...","content":"...","alt":false}]}
- accordionGroup: {"type":"accordionGroup","summary":"...","content":"...","accordionType":"group","accordions":[{"summary":"...","content":"...","alt":false}]}
- spoiler: {"type":"spoiler","summary":"عنوان اختياري عند استخدام نمط طي غير blur","content":"...","accordionType":"sp|ac|ac alt|group|blur","spoilerBlurText":"نص مناسب للإخفاء في نمط blur"}
- faq: {"type":"faq","faqItems":[{"question":"...","answer":"..."}]}
- code: {"type":"code","codeContent":"...","codeLanguage":"html|css|js|json","codeComment":"اختياري","codeSource":"لا تذكره إلا إذا قدم المستخدم المصدر","codeLines":"اختياري","codeCopy":true,"codeHighlight":true,"codeSyntax":true}
- codeTabs: {"type":"codeTabs","tabHtml":"...","tabHtmlSource":"مسار اختياري","tabCss":"...","tabCssSource":"مسار اختياري","tabJs":"...","tabJsSource":"مسار اختياري","tabJson":"...","tabJsonSource":"مسار اختياري"}
- inlineCode: {"type":"inlineCode","inlineCode":"مصطلح أو أمر قصير"}
- kbd: {"type":"kbd","kbdText":"اختصار لوحة مفاتيح حقيقي"}
- mark: {"type":"mark","markText":"نص قصير","markClass":"|block|red|gray|orange|blue|green|gold|purple","markBefore":"اختياري","markAfter":"اختياري"}
- image: {"type":"image","imageStyle":"standard|full|figure|grid|scroll|scroll2|lazyload|showall","imageUrl":"رابط HTTP(S) قدمه المستخدم حرفياً","imageAlt":"وصف دقيق","imageWidth":1280,"imageHeight":720,"imageLightbox":true,"imageCaptionStyle":"figure|table","imageDisableCaption":false,"caption":"...","gridUrls":"روابط فعلية قدمها المستخدم، رابط في كل سطر","scrollHeight":"h150|h200|h250"}
- lazyYt: {"type":"lazyYt","youtubeId":"لا تنشئه؛ التطبيق يستخرجه من مرجع المستخدم","youtubeMode":"lazy|defer","ratio":"16/9|4/3|1/1"}
- link: {"type":"link","linkText":"...","linkUrl":"رابط HTTP(S) قدمه المستخدم","linkStyle":"extL|alt|sec|button|buttonLn"}
- button: {"type":"button","buttonText":"...","buttonUrl":"رابط HTTP(S) قدمه المستخدم","buttonIcon":"|dl|demo","buttonOutlined":false}
- downloadBox: {"type":"downloadBox","fileName":"اسم ملف قدمه المستخدم","fileSize":"حجم قدمه المستخدم","downloadFile":"رابط HTTP(S) قدمه المستخدم","downloadType":"zip|rar|pdf|apk|docx|xlsx|mp3|mp4"}
- audioPlayer: {"type":"audioPlayer","audioUrl":"رابط مباشر لملف MP3 قدمه المستخدم","audioTitle":"عنوان ذكره المستخدم فقط","audioPreload":"none|metadata|auto","audioLoop":false,"audioMuted":false}
- videoPlayer: {"type":"videoPlayer","videoUrl":"رابط ملف فيديو مباشر قدمه المستخدم","videoPoster":"رابط صورة غلاف قدمه المستخدم حرفياً أو اتركه فارغاً","videoType":"video/mp4|video/webm|video/ogg","videoPreload":"none|metadata|auto","videoWidth":"100%","videoHeight":"auto","videoLoop":false,"videoMuted":false}
- relatedManual: {"type":"relatedManual","relatedTitle":"عنوان قصير","relatedLinks":[{"text":"عنوان قدمه المستخدم","url":"رابط HTTP(S) قدمه المستخدم"}]}
- relatedAuto: {"type":"relatedAuto","relatedAutoLabel":"منشورات ذات صلة","relatedMax":6,"relatedDataLabel":"وسم يذكره المستخدم فقط","relatedSortBy":"updated|published","relatedRandom":true}

قيم الأنماط للأقسام أعلاه مغلقة؛ لا تخترع قيمة جديدة. لا تخلط الأنواع المتشابهة: note ليس alert، وsteps ليست تنبيهاً، وspoiler هو نمط blur، وlink/button/downloadBox عناصر مختلفة. لا تستخدم link أو button أو downloadBox أو audioPlayer أو videoPlayer أو relatedManual إلا بطلب صريح من المستخدم ومع روابط HTTP(S) أدخلها هو؛ لا تختلق URL أو عنوان صفحة أو اسم ملف أو حجماً. videoPoster وimageUrl وgridUrls يجب أن تكون روابط قدمها المستخدم حرفياً. لا تستخدم relatedAuto أو accordionGroup أو codeTabs أو kbd إلا إذا طلبها المستخدم صراحةً أو كانت مفيدة بوضوح ضمن خيارها المفعّل. يمكن إدراج relatedAuto دون روابط يدوية لأنه يُحمّل منشورات المدونة تلقائياً؛ لا تخترع له data label. استخدم codeTabs فقط عند وجود أمثلة حقيقية متعددة؛ لا تملأ تبويباً بكود وهمي. أخرج هذه الأنواع بمخطط حقولها فقط.`;

  const faqHeading = language === 'ar' ? 'الأسئلة الشائعة' : 'FAQ';
  const openingNote = 'تم إعداد هذا المقال عبر ModWeeb AI باستخدام تقنيات توليد المحتوى الحديثة مع التركيز على الوضوح والدقة.';
  const mandatoryStructure = `الهيكل الإلزامي للمقال — التزم بالترتيب والأنواع والحقول التالية، ولا تحذف عنصراً بنيوياً:

البداية (المقدمة من فقرتين فقط، بلا جدول محتويات وبلا عنوان فرعي):
1. basics: metaDescription دقيق، وthumbnailUrl فقط إذا قدّم المستخدم رابط صورة.
2. heading h1 (العنوان الرئيسي، عنوان واحد فقط).
3. note (noteStyle: "info") — content بهذه الصياغة حرفياً: "${openingNote}".
4. paragraph (paragraphStyle: "dropcap") — مقدمة قوية وفق: ${openingGuide}؛ فقرة مكتملة عادةً من 60–100 كلمة.
5. paragraph (paragraphStyle: "normal") — الفقرة الثانية والأخيرة من المقدمة، توسعة مفيدة عادةً من 60–100 كلمة؛ لا تضف فقرة مقدمة ثالثة.
${hasKeyPoints ? '6. keyPoints (items من 5–7 محاور حقيقية موجزة) بعد فقرتي المقدمة مباشرة، لا تكرر الفقرات.' : ''}
ممنوع إدراج عنصر toc أو title/subtitle أو أي جدول محتويات؛ لا تُخرج toc إطلاقاً.

الجسم الرئيسي — أنشئ ${h2Target} عناوين موضوعية H2 تقريباً وفق حجم المقال المختار، ولكل H2 هذا التسلسل الإلزامي:
→ heading (headingLevel: "h2") — عنوان محدد يضم الكلمة المفتاحية أو مرادفاً طبيعياً متى ناسب.
→ paragraph (paragraphStyle: "normal") — شرح وافٍ من 4–6 جمل، عادةً 60–110 كلمات؛ استخدم <b> و<em> و<mark> و<code> عند الحاجة فقط، واحترم خيارات التنسيق المعطّلة.
→ paragraph (paragraphStyle: "indent") — تكملة أو زاوية عملية من 2–4 جمل، عادةً 30–70 كلمة. نوّع الأنماط في الفقرات الإضافية فقط بين normal وindent، ولا تجعل فقرات متتابعة متطابقة آلياً.
→ عنصر إلزامي واحد في كل قسم H2، وبالتناوب بين هذه الأنماط الثلاثة بحسب طبيعة القسم: note (noteStyle: "info") لمعلومة توضيحية، أو note (noteStyle: "warning" أو "question") لتنبيه أو سؤال يُفتح للقارئ، أو blockquote (quoteStyle: "s2") لفكرة مركزة. إن كان خيار الاقتباسات معطّلاً فاستخدم note بدلاً منه. لا تخترع اقتباساً منسوباً لشخص؛ quoteStyle "s2" يُستخدم لحكمة أو خلاصة عامة دون نسبة.
→ [عنصر اختياري إضافي عند الحاجة فقط: list أو table أو alert أو mark أو image أو غيرها من الأنواع المدعومة؛ لا تضع عنصراً عشوائياً ولا تكرر المحتوى].
→ accordion (accordionType: "ac") في نهاية كل قسم H2؛ summary موجز وcontent يضيف ملاحظة أو معلومة مفيدة مرتبطة فعلاً بالقسم، لا تكرر الفقرات. لا تستخدم accordionGroup بدلاً منه. إذا كان محتوى الأكورديون تعليمات أو خطوات أو ترتيباً، فاكتب content كقائمة مرقمة: <ol><li>خطوة</li><li>خطوة</li></ol>، أو قائمة نقطية <ul><li>...</li></ul> عند عدم وجود ترتيب.

قاعدة steps الإلزامية:
إذا كان قسم H2 يشرح إجراءً متسلسلاً حقيقياً مثل طريقة تنفيذ أو تثبيت أو استخدام، فأضف مباشرة بعد paragraph indent كتلة واحدة من النوع steps، فيها 3–7 خطوات كاملة قابلة للتنفيذ؛ ثم أضف فقرة normal ختامية مفيدة عادةً من 30–60 كلمة (أو note/alert اختيارية ملائمة إذا كانت مفعّلة)، وبعدها العنصر الإلزامي وأكورديون نهاية القسم كالمعتاد. لا تستخدم steps للمقارنة أو تعداد المزايا أو الأسباب أو التوقعات.

الروابط داخل العناصر:
يُسمح بوضع روابط وصفية آمنة داخل الفقرات وبنود steps والقوائم list وأجوبة faq والاقتباسات والملاحظات والتنبيهات، بنفس نمطي الروابط الخارجية:
<a class='extL' href='URL' rel='nofollow noreferrer noopener' target='_blank'>نص وصفي</a> أو <a class='extL alt' href='URL' rel='nofollow noreferrer noopener' target='_blank'>نص وصفي</a>.
استخدم هذه الروابط فقط لروابط HTTP(S) قدمها المستخدم أو مراجع رسمية يمكن تحديدها يقيناً؛ لا تختلق رابطاً ولا تضع نص ارتكاز عاماً مثل «اضغط هنا». لا تضع أكثر من رابطين في العنصر الواحد، ووزّع الروابط على الأقسام ذات الصلة بدل تكديسها.

توزيع العناصر والأنماط:
- لا تكرر النمط نفسه في عنصرين متتاليين (note ثم note، أو blockquote ثم blockquote)؛ نوّع بين note info وnote warning/question وblockquote s2 بحسب دلالة القسم.
- عنصر إضافي واحد كحد أقصى في كل قسم H2 عدا الأكورديون الإلزامي، ووظّفه لخدمة المحتوى لا للزينة.
- استخدم <mark> و<code> باعتدال: 2–4 تمييزات في المقال كله، و<code> عند ورود رقم أو مصطلح إنجليزي أو أمر تقني فعلي فقط.

المراجع والروابط:
أدرج paragraph normal قرب نهاية المتن بعنوان bold "${language === 'ar' ? 'المصادر والمراجع' : 'Sources & References'}" يتبعه 2–4 روابط خارجية ذات صلة، واكتب كل رابط بأحد هذين النمطين حصراً:
النمط 1: <a class='extL' href='URL' rel='nofollow noreferrer noopener' target='_blank'>اسم المصدر</a>
النمط 2: <a class='extL alt' href='URL' rel='nofollow noreferrer noopener' target='_blank'>اسم المصدر</a>
نوّع بين النمطين، وفضّل صفحات رسمية/أولية، ولا تختلق عنواناً أو رابطاً ولا تزعم التحقق الحي؛ إذا تعذر تحديد رابط موثوق بدقة فلا تضع رابطاً وهمياً. يمكن إيراد المراجع نفسها بجوار الادعاءات التي تسندها داخل الفقرة بالنمط نفسه.

قبل الخاتمة (بهذا الترتيب الدقيق):
→ heading (headingLevel: "h2", content: "${faqHeading}").
→ paragraph (paragraphStyle: "normal") — تمهيد موجز يشرح ما ستغطيه الأسئلة، عادةً 35–60 كلمة.
→ faq (faqItems فيها 4–5 أسئلة وأجوبة مناسبة؛ كل إجابة 3–5 جمل مفيدة، عادةً 35–70 كلمة، والأسئلة واقعية غير مكررة من المتن وتبدأ بصيغ بحث طبيعية مثل كيف، ما هو، لماذا، متى، هل، ما الفرق، ما أفضل؛ اكتب باللغة المختارة).
→ paragraph (paragraphStyle: "normal") — جملة أو فقرة ختامية تربط FAQ بالخلاصة، عادةً 25–45 كلمة.
${hasConclusion ? `→ heading (headingLevel: "h2", content: "خاتمة").\n→ paragraph (paragraphStyle: "normal") — خلاصة قوية ومفيدة.\n→ paragraph (paragraphStyle: "normal") — content بالوسم التالي مع ملاحظة ختامية مفيدة غير نائبة: <p class='note'><b>ملاحظة!</b><br/>[نص موجز ملائم]</p>.` : 'خيار الخاتمة معطّل: لا تضف قسم خاتمة أو ملاحظتها، لكن احتفظ بقسم FAQ.'}

في نهاية كل مقال، أضف آخر كتلة paragraph (paragraphStyle: "normal") واجعل content يحتوي فقط على هذا المرجع الثابت، من دون أي نص قبله أو بعده:
<!--[ Post Reference paragraph ]--><p class='pRef'>المصدر: ModWeeb<br>تم إعداد وتنسيق المقال عبر ModWeeb AI</p>`;

  const systemPrompt = [
    `أنت محرر محتوى عربي وخبير في بناء مقالات بلوجر طويلة نافعة، دقيقة، واضحة وسهلة التصفح. ${langInstruction}`,
    `اكتب مقالاً كاملاً يجيب حاجة القارئ من البداية إلى النهاية، لا مسودة قصيرة ولا ملخصاً. استخدم نوع المقال المختار (${articleTypeGuide}) والجمهور (${countryGuide}) والنبرة (${toneGuide}) وسهولة القراءة (${readingGuide}) ومنظور السرد (${povGuide}) كما يناسبها. وضع الكتابة: ${writingModeGuide}`,
    `قالب النوع الإلزامي لهذا المقال: ${articleTemplateGuide} طبّق ترتيب هذا القالب على المتن فقط مع بقاء الهيكل الإلزامي الأساسي وFAQ والخاتمة والمرجع ثابتة؛ لا تُخرج القالب كنص حرفي ولا تخلط بين أنواع المقالات.`,
    `الطول والعمق: ${sizeGuide}. نطاق الكلمات المختار هدف تحريري تقريبي قوي؛ استهدف ${h2Target} عناوين H2 موضوعية كما في الهيكل الأصلي أدناه. اكتب مقالاً مكتملاً قريباً من نطاق الحجم، لا مسودة قصيرة ولا ملخصاً؛ أتمم فقرات كل قسم وعناصره المطلوبة. لا تتوقف بعد مقدمة أو بضعة أسطر، ولا تكرر الأفكار أو تضف حشواً لمجرد بلوغ عدد الكلمات.`,
    `معايير SEO/AEO: حدّد نية الباحث وأجب عن السؤال الأساسي في بداية المقال بإجابة مباشرة قابلة للاقتباس ثم وسّعها. استخدم H1 واحداً وتسلسلاً دلالياً صحيحاً، وعناوين H2/H3 تصف أسئلة أو مهام حقيقية، وفقرات سهلة المسح، وتعريفات وإجابات مكتفية بذاتها، وقوائم أو خطوات عند فائدتها. استخدم الكلمة الرئيسية (${mainKeyword || 'لا توجد كلمة رئيسية محددة؛ استخدم الموضوع أساساً'}) ومرادفاتها والعبارات الداعمة (${keywords || 'لا توجد كلمات مساعدة محددة'}) طبيعياً؛ لا تستهدف نسبة كثافة ثابتة ولا تحشو التكرار. اجعل العنوان والوصف دقيقين وجذابين، وأنشئ 5–8 وسوم وثيقة الصلة. لا تعد بترتيب أو ظهور مقتطفات أو نتائج SEO مضمونة.`,
    `AEO والبيانات المنظمة: صغ إجابات قصيرة وواضحة بجوار الشرح التفصيلي، وعرّف المصطلحات عند أول ورودها، وحافظ على أسماء الكيانات كما في المدخلات. يمكن أن يوصي seoReport بنوع Schema مناسب مثل Article أو FAQPage عند وجود FAQ، لكنه توصية لا JSON-LD. لا تخترع المؤلف أو الناشر أو تاريخ النشر/التحديث أو التقييمات أو الأسعار أو خصائص المنتج، ولا تنشئ بيانات منظمة لمعلومة غير ظاهرة في الصفحة؛ لا تضمن أهلية نتيجة منسّقة.`,
    `الافتتاحية: ${openingGuide}. لا تستخدم إحصاءً أو اقتباساً أو قصة واقعية إلا إذا كانت مدعومة؛ لا تنشئ تجربة شخصية أو نسبة لمصدر من عندك.`,
    `الهيكل الإلزامي المأخوذ من البرومبت القديم (بكل الترتيب والتفاصيل):\n${mandatoryStructure}`,
    `المحتوى الاختياري: استخدم الأنواع الأخرى فقط إذا كانت تخدم الموضوع، وكانت خاناتها مفعّلة أو طلبها المستخدم؛ لا تكدّسها. ${hasH3 ? 'يسمح بالعناوين H3 عند حاجة موضوعية فقط.' : 'خيار H3 معطّل، فلا تستخدمه.'} ${hasH4 ? 'استخدم H4–H6 للتدرج المتداخل فقط؛ لا تتجاوز مستوى ولا تستخدم عنواناً للتكبير.' : 'خيار H4 وما بعده معطّل، فلا تستخدم h4 أو h5 أو h6.'} خيارات المقال الحالية: ${preferences.length ? preferences.join(' ') : 'لا توجد عناصر اختيارية إضافية مفعّلة.'}`,
    `الروابط والمصادر: وزّع الروابط الداخلية الوصفية طبيعياً داخل الفقرات قرب المعلومة ذات الصلة فقط إذا قدّم المستخدم URLs لصفحات موقعه؛ استخدم نص ارتكاز يشرح الصفحة ولا تكدّسها. الروابط الخارجية للمراجع لا تُدرج إلا إذا قدّم المستخدم URL دقيقاً أو زوّدك بمرجع يمكن تحديده يقيناً دون ادعاء تصفح حي؛ لا تختلق اسم جهة أو عنوان صفحة أو URL. عند غياب روابط مقدمة، اكتب عنوان «المصادر والمراجع» ثم لا تدرج روابط وهمية ولا تتظاهر بوجود مراجع متحققة. استخدم inline anchor آمن بأحد نمطي الروابط الخارجية: <a class='extL' href="URL" rel="nofollow noreferrer noopener" target="_blank">اسم وصفي</a> أو <a class='extL alt' href="URL" rel="nofollow noreferrer noopener" target="_blank">اسم وصفي</a>. لا تضع روابط عامة أو placeholders. عناصر link/button/downloadBox/relatedManual المنفصلة تُستخدم فقط إذا طلبها المستخدم وقدّم الرابط وبياناته المطلوبة. لا تنشئ صوتاً أو فيديو أو ملفاً قابلاً للتنزيل دون رابط مباشر قدمه المستخدم.`,
    `الدقة والثقة: لا تختلق تجربة شخصية أو صفة خبير أو إحصائية أو دراسة أو سعرًا أو تاريخاً أو خاصية منتج أو اقتباساً أو مصدراً. لا تعرض الرأي كحقيقة، ولا تخلط بين معلومة عامة ومعلومة حديثة. إذا كانت المعلومة تعتمد على تحديث آني ولا توجد في المدخلات، تجنب الجزم بها ونبّه إلى الحاجة للتحقق بدلاً من اختراعها.`,
    `تنسيق paragraph: يسمح بتنسيق inline الآمن <strong>/<b> و<em>/<i> و<code> و<mark> و<a class='extL' أو class='extL alt' href="URL" rel="nofollow noreferrer noopener" target="_blank"> و<br>. لا تستخدم href إلا لعنوان URL حرفي قدمه المستخدم. استخدم <mark> لتمييز 2–4 عبارات مهمة أو ملفتة في المقال كله، و<code> للأرقام والمصطلحات الإنجليزية والأوامر التقنية عند ورودها. ويسمح بوسمي الكتلتين الثابتتين المحددتين في الهيكل فقط: p.note الختامي وp.pRef الأخير، وكذلك تعليق Post Reference المحدد حرفياً؛ لا تضف وسوماً أو خصائص HTML أخرى. اكتب JSON صالحاً واهرب علامات الاقتباس داخل النصوص والروابط.`,
    `قواعد عدم العشوائية: FAQ إلزامي حسب الهيكل حتى في المقال العام، وaccordion واحد إلزامي في نهاية كل H2 موضوعي؛ note الإفتتاحية إلزامية. steps إلزامية عند شرح إجراء حقيقي فقط. لا تضف accordionGroup أو relatedAuto أو link أو button أو downloadBox أو audioPlayer أو videoPlayer أو relatedManual من تلقاء نفسك. FAQ فقط يمكن تكوينه من معلومات الموضوع، ولا تختلق حقائق/أسعاراً/إحصاءات/اقتباسات. الوسائط وروابط العناصر المنفصلة (غير روابط المصادر داخل paragraph) لا تستخدم إلا عندما قدمها المستخدم حرفياً؛ التطبيق يدرج YouTube فقط من مرجعه الصالح.`,
    `العناصر الأساسية غير قابلة للتعطيل: basics وheading h1 وملاحظة البداية وفقرة dropcap ثم فقرة normal وaccordion نهاية كل H2 وFAQ وpRef النهائي تُخرَج دائماً حتى لو أُغلقت خياراتها الاختيارية؛ الخيارات تتحكم فقط بالعناصر الإضافية وأنماط التنسيق الاختيارية. لا تحذف أي عنصر أساسي مهما كانت الإعدادات.`,
    `المخطط الدقيق: ${typeCatalog}`,
    `قيم tableClasses المسموح بها هي فقط bordered وnoborder وcborder وstripped وhovered وsticky وvab وfull وmh100 وmhvh وmh200 وmh300 وsp5 وsp10 وsp20 وprimary وwarning وsuccess وerror وclr وclb، وتفصل بينها مسافات. خيارات relatedSortBy هي updated أو published. لا تخترع thumbnailUrl أو videoPoster أو imageUrl أو gridUrls؛ استخدم URL قدمه المستخدم حرفياً.`,
    `الإخراج النهائي: أعد JSON صالحاً فقط بلا Markdown أو شرح خارجه، بالمفاتيح العليا title وmetaDescription وtags وsections وarticleStats وseoReport وhtmlReady. اجعل title هو عنوان H1 نفسه، وانسخ الوصف إلى basics.metaDescription، وأخرج 5–8 وسوم دقيقة. articleStats يضم wordCount وcharacterCount وestimatedReadingMinutes وتعداد العناوين والفقرات والأسئلة والصور والروابط؛ seoReport يضم focusKeyword وkeywordDensity (occurrences وpercent) وrepetition وrecommendations وschemaRecommendations. هذه قيم أولية، وسيعيد التطبيق حسابها من المقال المعروض. اجعل htmlReady سلسلة فارغة؛ التطبيق يولّد HTML النهائي من الأقسام المعتمدة بواسطة عارضه لتفادي اختلاف القالب أو تمرير HTML غير موثوق. لا تضف حقولاً أو أنواع أقسام غير المخطط. نفّذ مقاطع ModWeeb الثابتة المطلوبة حرفياً؛ لا تضف إسناداً أو ترويجاً آخر.`,
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
const H2_TARGET_MAP = { xs: '4–6', sm: '6–9', md: '9–12', lg: '12–16' };
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
const ARTICLE_TEMPLATE_MAP = {
  none: 'مقال تفسيري عام: حدّد حاجة القارئ، ثم قدّم خلفية موثقة، شرحاً منظماً، تطبيقاً أو آثاراً عند ملاءمتها، وخلاصة عملية؛ لا تفرض قائمة أو مراجعة على الموضوع.',
  guide: 'دليل إرشادي: ابدأ بالهدف والمتطلبات أو لمن يناسب الدليل، ثم نظّم المعايير/المراحل، وأدرج خطوات عملية فقط للعملية الحقيقية، وتجنب تحويل الشرح إلى خطوات شكلية.',
  tutorial: 'درس تعليمي: وضّح النتيجة والمتطلبات والمستوى المناسب، ثم قسّم التنفيذ إلى مراحل مرتبة، مع خطوات قابلة للتطبيق ونتيجة/تحقق متوقع لكل مرحلة حين تدعمها المعلومات؛ لا تدّع اختباراً لم يحدث.',
  comparison: 'مقارنة: حدّد البدائل ومعايير المقارنة أولاً، ثم ناقش كل معيار بالتوازي وبإنصاف، واستخدم جدولاً فقط للقيم المتاحة أو الفروق التي يمكن إثباتها، ثم لخّص الأنسب لكل حالة دون فائز مطلق غير مسند.',
  review: 'مراجعة: عرّف المنتج/الخدمة وسياق التقييم، ثم تناول المزايا والقيود ومعايير الأداء والاستخدام المناسب والبدائل والخلاصة؛ لا تدّع تجربة شخصية ولا تختلق سعراً أو مواصفات أو نتائج اختبار.',
  list: 'قائمة مشروحة: اذكر معيار الإدراج ومجال القائمة، ثم اعرض عناصر مستقلة مرقمة/مقسمة مع سبب أهمية كل عنصر؛ لا تختلق ترتيباً أو أعداداً أو إحصاءات، ولا تكرر العنصر بصيغ مختلفة.',
  listicle: 'قائمة مشروحة: اذكر معيار الإدراج ومجال القائمة، ثم اعرض عناصر مستقلة مرقمة/مقسمة مع سبب أهمية كل عنصر؛ لا تختلق ترتيباً أو أعداداً أو إحصاءات، ولا تكرر العنصر بصيغ مختلفة.',
  news: 'خبر/شرح إخباري: قدّم المعلومة المؤكدة وما تعنيه للقارئ أولاً، ثم الخلفية والتفاصيل والتصريحات المنقولة فقط إذا وردت، وافصل المؤكد عن غير المؤكد؛ لا تختلق تاريخاً حديثاً أو حدثاً أو مصدراً.',
  faq: 'صفحة أسئلة وأجوبة: اجمع أسئلة مختلفة حول نيات بحث واضحة، وقدّم جواباً مباشراً ثم توضيحاً موجزاً، ورتّبها من الأساسيات إلى الحالات الخاصة؛ احتفظ بقسم FAQ الإلزامي النهائي وفق الهيكل.',
  faqpage: 'صفحة أسئلة وأجوبة: اجمع أسئلة مختلفة حول نيات بحث واضحة، وقدّم جواباً مباشراً ثم توضيحاً موجزاً، ورتّبها من الأساسيات إلى الحالات الخاصة؛ احتفظ بقسم FAQ الإلزامي النهائي وفق الهيكل.',
  opinion: 'مقال رأي: صرّح بالأطروحة بوضوح، ثم ابنِ حججاً منفصلة ومتوازنة، وميّز الرأي والتحليل عن الوقائع، واعرض الاعتراضات والقيود بإنصاف؛ لا تنسب الرأي إلى جهات أو أشخاص.',
  casestudy: 'دراسة حالة: استخدم فقط الحالة والبيانات الواردة في المدخلات، ونظّمها إلى سياق/تحدٍّ، منهج أو قرارات، نتائج معلومة، دروس وحدود؛ إذا غابت البيانات فلا تختلق شركة أو أرقاماً أو نتائج وبيّن ما يحتاج إلى تزويد.',
  summary: 'ملخص منشور: ابدأ بالفكرة والنتيجة المركزية، ثم اجمع المحاور المهمة بترتيب منطقي، واحذف التكرار والتفاصيل الثانوية، وميّز خلاصة المصدر عن إضافاتك؛ لا تختلق محتوى للمصدر غير المقدم.'
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
  personal: 'ابدأ بتعاطف إنساني دون ادعاء تجربة شخصية غير حقيقية',
  definition: 'ابدأ بتعريف موجز ودقيق للمفهوم من المعلومات المتاحة، ثم وضّح أهميته للقارئ',
  contrast: 'ابدأ بتباين واضح بين حالتين أو خيارين موجودين في الموضوع، دون اختلاق مفاضلة',
  scenario: 'ابدأ بمشهد افتراضي قصير ومعلن بوضوح أنه مثال توضيحي، لا قصة واقعية',
  problemSolution: 'ابدأ بمشكلة محددة ثم اذكر بإيجاز نوع الحل الذي سيوضحه المقال، دون ادعاء نتيجة مضمونة',
  benefit: 'ابدأ بالفائدة العملية الرئيسية التي يقدمها المقال، إذا كانت مستندة إلى محتواه',
  myth: 'ابدأ بتصحيح تصور شائع فقط إذا أمكن دحضه من المعرفة الموثوقة أو مدخلات المستخدم، وإلا اختر افتتاحية أخرى',
  curiosity: 'ابدأ بمفارقة أو سؤال فضولي حقيقي يجيب عنه المقال، دون إثارة مضللة أو حجب للجواب الأساسي'
};

function promptLanguage(language) { return language === 'en' ? 'English' : 'العربية الفصحى'; }
window.modweebPrompts = {
  article: params => buildArticlePrompt(params || {}),
  articleOutline: ({ topic = '', mainKeyword = '', articleType = 'guide', size = 'md', language = 'ar', hasH3 = true } = {}) => {
    const sectionTarget = ({ xs: '4–6', sm: '6–9', md: '9–12', lg: '12–16' })[size] || '9–12';
    const typeGuide = ARTICLE_TYPE_MAP[articleType] || ARTICLE_TYPE_MAP.guide;
    return {
      systemPrompt: `أنت مخطط تحريري لمقالات مفيدة وصديقة للبحث. اكتب باللغة ${promptLanguage(language)}. أعد JSON صالحاً فقط بلا Markdown أو شرح خارجه، بالمخطط التالي حصراً: {"title":"...","sections":[{"heading":"عنوان H2","purpose":"وظيفة القسم للقارئ","subheadings":["عنوان H3"]}],"faqQuestions":["سؤال واقعي"]}. أنشئ بين 4 و16 قسماً موضوعياً بحسب الطلب وحجم المقال، مع 4–5 أسئلة شائعة مختلفة. اجعل عناوين الأقسام متسلسلة منطقياً وتغطي نية البحث دون تكرار. ${hasH3 ? 'أضف H3 فقط عندما يوضح فكرة فرعية حقيقية، ويمكن تركها فارغة.' : 'أخرج subheadings كمصفوفة فارغة دائماً ولا تقترح H3.'} لا تضف مقدمة أو خاتمة أو FAQ إلى sections؛ التطبيق يدرج العناصر الإلزامية في مواضعها. لا تخترع أرقاماً أو حقائق أو مصادر أو روابط أو عناوين URLs. اجعل purpose موجزاً يوضح فائدة كل قسم، دون كتابة متن المقال.`,
      userPrompt: `موضوع/عنوان المقال: ${topic}\nالكلمة المفتاحية المحورية: ${mainKeyword || 'غير محددة'}\nنوع المقال: ${typeGuide}\nعدد الأقسام المستهدف لحجم المقال: ${sectionTarget}\nاقترح عنواناً رئيسياً مناسباً ومخططاً متوازناً قابلًا للتنفيذ، واجعل الأسئلة الشائعة مرتبطة مباشرة بموضوع البحث.`
    };
  },
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
  smartArticleEdit: ({ prompt = '', topic = '', language = 'ar', scope = 'article', content = '' } = {}) => {
    const editGuide = /seo|meta|كثافة|كلمة مفتاحية|نية البحث|محركات البحث/i.test(prompt)
      ? 'مهمة فرعية SEO: حسّن الوضوح وملاءمة نية البحث والعناوين والبيانات الوصفية عند استهدافها؛ لا تحشُ كلمة مفتاحية ولا تخترع روابط أو نتائج ترتيب.'
      : /expand|وسّع|أضف شرح|تفصيل/i.test(prompt)
        ? 'مهمة فرعية توسعة: أضف شرحاً وانتقالات مفيدة فقط مما يسنده المحتوى أو السياق، وحافظ على عدد الفقرات المعقول؛ لا تضف حقائق أو مراجع جديدة.'
        : /shorten|اختصر|لخّص|قلّص/i.test(prompt)
          ? 'مهمة فرعية اختصار: احذف التكرار أولاً وحافظ على الفكرة والقيود والأمثلة والروابط الأساسية والبنية غير المستهدفة.'
          : /link|رابط|مصدر|مرجع/i.test(prompt)
            ? 'مهمة فرعية روابط: لا تضف رابطاً إلا إذا كان URL موجوداً حرفياً في HTML الحالي أو تعليمات المستخدم، واجعل نص الارتكاز وصفياً؛ لا تنشئ مساراً داخلياً تخمينياً.'
            : 'مهمة فرعية تحرير عام: نفذ الطلب بأقل تغيير يحقق الغرض، وراجع سلاسة اللغة واتساق الفقرات دون تغيير الحقائق.';
    return {
      systemPrompt: `أنت محرر HTML دقيق. اكتب باللغة ${promptLanguage(language)}. ${editGuide} حافظ على المعنى والحقائق والروابط والبنية غير المستهدفة، ولا تضف معلومات أو مصادر غير موجودة. لا تضع HTML غير آمن أو سكربتات. أعد JSON صالحاً فقط بلا Markdown. ${scope === 'selection'
        ? 'المخطط المطلوب: {"replacementHtml":"..."}. حرر المقطع المحدد فقط بصيغة HTML دلالية سليمة.'
        : 'المخطط المطلوب: {"findHtml":"...","replacementHtml":"..."}. findHtml يجب أن يكون مقتطفاً متصلاً وحرفياً من HTML المدخل ومميزاً بوضوح، وreplacementHtml هو النسخة المعدلة لهذا المقتطف فقط. لا تعد كامل المقال ولا تحذف أجزاء أخرى.'}`,
      userPrompt: `${topic ? `سياق الموضوع: ${topic}\n` : ''}الطلب: ${prompt}\n\n${scope === 'selection' ? 'المقطع المحدد:' : 'HTML المقال الحالي (اختر أصغر مقطع متصل يحقق التعديل):'}\n${content}`
    };
  }
};

export {};
