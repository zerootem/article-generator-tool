import { describe, expect, it } from 'vitest';
import { normalizeArticleSections } from './article-section-policy';

describe('normalizeArticleSections', () => {
  it('keeps required core blocks and removes invalid FAQ counts, data, media, and unknown types', () => {
    const result = normalizeArticleSections({
      title: 'عنوان',
      sections: [
        { type: 'basics', metaDescription: 'وصف', randomHtml: '<script>' },
        { type: 'heading', content: 'القسم', headingLevel: 'h2', surprise: 'drop me' },
        { type: 'paragraph', content: 'شرح' },
        { type: 'faq', faqItems: [
          { question: 'كيف؟', answer: 'شرح أول.' }, { question: 'ما هو؟', answer: 'شرح ثان.' },
          { question: 'لماذا؟', answer: 'شرح ثالث.' }, { question: 'متى؟', answer: 'شرح رابع.' },
          { question: 'هل؟', answer: 'شرح خامس.' }, { question: 'زائد؟', answer: 'يجب إسقاطه.' },
        ] },
        { type: 'note', noteStyle: 'warning', content: 'تم إعداد هذا المقال عبر ModWeeb AI باستخدام تقنيات توليد المحتوى الحديثة مع التركيز على الوضوح والدقة.' },
        { type: 'note', noteStyle: 'warning', content: 'ملاحظة إضافية لا يسمح بها الخيار المعطل.' },
        { type: 'steps', steps: ['الخطوة الأولى', 'الخطوة الثانية', 'الخطوة الثالثة'] },
        { type: 'accordion', accordionType: 'blur', summary: 'معلومة', content: 'تفصيل' },
        { type: 'table', tableData: [['أ', 'ب']] },
        { type: 'image', imageUrl: 'https://example.com/fake.jpg' },
        { type: 'lazyYt', youtubeId: 'abcdefghijk' },
        { type: 'videoPlayer', videoUrl: 'https://example.com/video.mp4' },
      ],
    }, { articleType: 'guide' });

    expect(result?.sections.map((section: any) => section.type)).toEqual(['basics', 'heading', 'paragraph', 'faq', 'note', 'steps', 'accordion']);
    expect(result?.sections[0]).not.toHaveProperty('randomHtml');
    expect(result?.sections[1]).not.toHaveProperty('surprise');
    expect(result?.sections[3].faqItems).toHaveLength(5);
    expect(result?.sections[4].noteStyle).toBe('info');
    expect(result?.sections[6].accordionType).toBe('ac');
    expect(result?.title).toBe('عنوان');
  });

  it('allows a four-to-five-item FAQ by default even when custom text conflicts with the required structure', () => {
    const faq = { type: 'faq', faqItems: [
      { question: 'كيف؟', answer: 'شرح أول.' }, { question: 'ما هو؟', answer: 'شرح ثان.' },
      { question: 'لماذا؟', answer: 'شرح ثالث.' }, { question: 'متى؟', answer: 'شرح رابع.' },
      { question: 'هل؟', answer: 'شرح خامس.' },
    ] };
    expect(normalizeArticleSections({ sections: [faq] }, { articleType: 'guide' })?.sections).toHaveLength(1);
    expect(normalizeArticleSections({ sections: [faq] }, { articleType: 'faq' })?.sections).toHaveLength(1);
    expect(normalizeArticleSections({ sections: [faq] }, { articleType: 'guide', customRequest: 'أضف قسم الأسئلة الشائعة' })?.sections).toHaveLength(1);
    expect(normalizeArticleSections({ sections: [faq] }, { articleType: 'faq', customRequest: 'لا تضف الأسئلة الشائعة' })?.sections).toHaveLength(1);
    expect(normalizeArticleSections({ sections: [{ ...faq, faqItems: faq.faqItems.slice(0, 3) }] })?.sections).toHaveLength(0);
  });

  it('respects disabled H3 and H4 heading options', () => {
    const sections = [
      { type: 'heading', content: 'عنوان فرعي 3', headingLevel: 'h3' },
      { type: 'heading', content: 'عنوان فرعي 4', headingLevel: 'h4' },
      { type: 'heading', content: 'عنوان فرعي 5', headingLevel: 'h5' },
      { type: 'heading', content: 'عنوان فرعي 6', headingLevel: 'h6' },
    ];
    const result = normalizeArticleSections({ sections }, { hasH3: false, hasH4: false });
    expect(result?.sections).toEqual([]);
    expect(normalizeArticleSections({ sections }, { hasH3: true, hasH4: false })?.sections.map((item: any) => item.headingLevel)).toEqual(['h3']);
  });

  it('keeps dropcap and spoiler editor fields and enforces key-point and procedural-step ranges', () => {
    const result = normalizeArticleSections({
      sections: [
        { type: 'paragraph', content: 'مقدمة مفيدة.', paragraphStyle: 'dropcap', dropCapChar: 'م' },
        { type: 'keyPoints', items: ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'زيادة'] },
        { type: 'steps', steps: ['١', '٢', '٣', '٤', '٥', '٦', '٧', 'زيادة'] },
        { type: 'spoiler', summary: 'العنوان', content: 'شرح', accordionType: 'sp' },
      ],
    }, { hasKeyPoints: true, hasBlur: true, customRequest: 'أضف عنصر تمويه مناسباً' });

    expect(result?.sections[0].dropCapChar).toBe('م');
    expect(result?.sections[1].items).toHaveLength(7);
    expect(result?.sections[2].steps).toHaveLength(7);
    expect(result?.sections[3].summary).toBe('العنوان');
    expect(normalizeArticleSections({ sections: [{ type: 'steps', steps: ['١', '٢'] }] })?.sections).toEqual([]);
    expect(normalizeArticleSections({ sections: [{ type: 'keyPoints', items: ['١', '٢', '٣', '٤'] }] }, { hasKeyPoints: true })?.sections).toEqual([]);
  });

  it('routes blur to the supported spoiler block and keeps accordion group opt-in', () => {
    const blur = { type: 'spoiler', summary: 'تفصيل', spoilerBlurText: 'اكشف النص', accordionType: 'blur' };
    const accordionBlur = { type: 'accordion', summary: 'عنوان', content: 'شرح', accordionType: 'blur' };
    const group = { type: 'accordionGroup', accordions: [{ summary: 'عنوان', content: 'شرح' }] };
    expect(normalizeArticleSections({ sections: [blur] }, { hasBlur: true })?.sections[0]).toMatchObject({ accordionType: 'blur', spoilerBlurText: 'اكشف النص' });
    expect(normalizeArticleSections({ sections: [accordionBlur] }, { hasAccordionVariants: true })?.sections[0].accordionType).toBe('ac');
    expect(normalizeArticleSections({ sections: [group] }, { hasAccordionVariants: true })?.sections[0].accordionType).toBe('group');
    expect(normalizeArticleSections({ sections: [group] }, { hasAccordionVariants: false })?.sections).toEqual([]);
  });

  it('sanitizes table cells before the legacy renderer interpolates them into HTML', () => {
    const url = 'https://example.com/guide';
    const result = normalizeArticleSections({ sections: [{
      type: 'table',
      tableData: [['<img src=x onerror=alert(1)>خطر</img>', `<a href="${url}" onclick="alert(1)">دليل</a>`, '<script>alert(1)</script>']],
    }] }, { hasTables: true, topic: `رابط الدليل ${url}` });
    expect(result?.sections[0].tableData).toEqual([['خطر', `<a href="${url}" target="_blank" rel="noopener noreferrer">دليل</a>`, '']]);
  });

  it('sanitizes raw HTML in text fields that the legacy renderer inserts directly', () => {
    const url = 'https://example.com/guide';
    const result = normalizeArticleSections({ sections: [
      { type: 'link', linkText: '<img src=x onerror=alert(1)>رابط</img>', linkUrl: url },
      { type: 'button', buttonText: '<script>alert(1)</script>تحميل', buttonUrl: url },
      { type: 'downloadBox', fileName: '<b>guide.pdf</b>', fileSize: '<svg onload=alert(1)>2 MB</svg>', downloadFile: url },
      { type: 'relatedManual', relatedTitle: '<img src=x onerror=alert(1)>المزيد</img>', relatedLinks: [{ text: '<script>alert(1)</script>الدليل', url }] },
      { type: 'toc', tocLabel: '<script>alert(1)</script>الفهرس', tocStyle: 'manual', tocManualItems: [{ text: '<img src=x onerror=alert(1)>قسم</img>', id: 'section' }] },
      { type: 'paragraph', paragraphStyle: 'ref', content: '<p>نص مرجعي</p>', refSource: '<script>alert(1)</script>مصدر' },
    ] }, { customRequest: `أضف رابطاً وزراً وصندوق تحميل للملف guide.pdf بحجم 2 MB وروابط يدوية ذات صلة باسم الدليل ${url}` });
    expect(result?.sections.map((section: any) => section.linkText || section.buttonText || section.fileName || section.relatedTitle || section.tocLabel || section.refSource)).toEqual([
      'رابط', 'تحميل', 'guide.pdf', 'المزيد', 'الفهرس', 'مصدر',
    ]);
    expect((result?.sections[3].relatedLinks as any[])[0].text).toBe('الدليل');
    expect((result?.sections[4].tocManualItems as any[])[0].text).toBe('قسم');
    expect(JSON.stringify(result)).not.toMatch(/<script|onerror=|onload=/i);
  });

  it('preserves the exact terminal Post Reference paragraph required by the legacy structure', () => {
    const content = "<!--[ Post Reference paragraph ]--><p class='pRef'>المصدر: ModWeeb<br>تم إعداد وتنسيق المقال عبر ModWeeb AI</p>";
    const result = normalizeArticleSections({ sections: [{ type: 'paragraph', paragraphStyle: 'normal', content }] });
    expect(result?.sections.at(-1)).toEqual({ type: 'paragraph', paragraphStyle: 'normal', content });
  });

  it('honors explicit feature flags, validates media against user inputs, and strips extra fields', () => {
    const imageUrl = 'https://example.com/article-image.webp';
    const result = normalizeArticleSections({
      sections: [
        { type: 'list', listItems: ['أ', 'ب'], listStyle: 'default', extra: true },
        { type: 'table', tableData: [['المعيار', 'القيمة']], tableRows: 1, tableCols: 2 },
        { type: 'image', imageUrl, imageAlt: 'صورة المقال', random: 'bad' },
        { type: 'image', imageUrl: 'https://other.example/fabricated.jpg', imageAlt: 'لا تقبل' },
        { type: 'lazyYt', youtubeId: 'abcdefghijk' },
      ],
    }, {
      topic: `مقال عن المنتج مع رابط الصورة ${imageUrl}`,
      hasLists: true,
      hasTables: true,
      hasImages: true,
      hasYoutube: true,
      youtubeReference: 'https://youtu.be/abcdefghijk',
    });

    expect(result?.sections.map((section: any) => section.type)).toEqual(['list', 'table', 'image', 'lazyYt']);
    expect(result?.sections[0]).not.toHaveProperty('extra');
    expect(result?.sections[2].imageUrl).toBe(imageUrl);
    expect(result?.sections[2]).not.toHaveProperty('random');
  });

  it('preserves current basics and image fields and constrains table dimensions and classes', () => {
    const imageUrl = 'https://example.com/feature.webp';
    const result = normalizeArticleSections({
      sections: [
        { type: 'basics', metaDescription: 'وصف المقال', thumbnailUrl: imageUrl, subtitle: 'مقدمة موجزة' },
        { type: 'image', imageUrl, imageStyle: 'scroll', scrollHeight: 'h200', imageWidth: 6200, imageHeight: 800 },
        { type: 'table', tableData: [['س', 'ص']], tableRows: 20, tableCols: 0, tableClasses: 'bordered sp10 arbitrary' },
      ],
    }, { topic: `مقال يتضمن الصورة ${imageUrl}`, hasImages: true, hasTables: true });

    expect(result?.sections[0]).toMatchObject({ type: 'basics', metaDescription: 'وصف المقال', thumbnailUrl: imageUrl, subtitle: 'مقدمة موجزة' });
    expect(result?.sections[1]).toMatchObject({ type: 'image', imageStyle: 'scroll', scrollHeight: 'h200', imageWidth: 5000, imageHeight: 800 });
    expect(result?.sections[2]).toMatchObject({ type: 'table', tableRows: 10, tableCols: 1, tableClasses: 'bordered sp10' });
  });

  it('allows link, button, and downloadBox only on explicit request with user-provided URL and file details', () => {
    const url = 'https://example.com/guide.pdf';
    const customRequest = `أضف رابطاً وزراً وصندوق تحميل للملف ${url} باسم guide.pdf وحجم 2 MB`;
    const result = normalizeArticleSections({
      sections: [
        { type: 'link', linkText: 'مصدر الدليل', linkUrl: url, linkStyle: 'extL', ignored: true },
        { type: 'button', buttonText: 'تنزيل الدليل', buttonUrl: url, buttonIcon: 'dl', buttonOutlined: false },
        { type: 'downloadBox', fileName: 'guide.pdf', fileSize: '2 MB', downloadFile: url },
      ],
    }, { customRequest });

    expect(result?.sections.map((section: any) => section.type)).toEqual(['link', 'button', 'downloadBox']);
    expect(result?.sections[0]).not.toHaveProperty('ignored');
    expect(result?.sections[0].linkStyle).toBe('extL');
    expect(result?.sections[1].buttonIcon).toBe('dl');
    expect(result?.sections[2].downloadFile).toBe(url);
  });

  it('rejects invented URLs and download metadata not supplied by the user', () => {
    const providedUrl = 'https://example.com/known.pdf';
    const result = normalizeArticleSections({
      sections: [
        { type: 'link', linkText: 'مصدر', linkUrl: 'https://fake.example/source' },
        { type: 'button', buttonText: 'اضغط', buttonUrl: 'https://fake.example/action' },
        { type: 'downloadBox', fileName: 'fake.pdf', fileSize: '5 MB', downloadFile: providedUrl },
      ],
    }, { customRequest: `أضف رابطاً وزراً وصندوق تحميل: ${providedUrl}` });
    expect(result?.sections).toEqual([]);
  });

  it('does not allow links, buttons, or download boxes without an explicit request and valid user URL', () => {
    const url = 'https://example.com/file.pdf';
    const sections = [
      { type: 'link', linkText: 'رابط', linkUrl: url },
      { type: 'button', buttonText: 'زر', buttonUrl: url },
      { type: 'downloadBox', fileName: 'file.pdf', fileSize: '1 MB', downloadFile: url },
    ];
    expect(normalizeArticleSections({ sections }, { topic: url })?.sections).toEqual([]);
    expect(normalizeArticleSections({ sections }, { customRequest: 'أضف الرابط والزر وصندوق التحميل' })?.sections).toEqual([]);
  });

  it('does not allow images or media without valid user-provided URLs/references', () => {
    const result = normalizeArticleSections({
      sections: [
        { type: 'image', imageUrl: 'https://example.com/model-invented.jpg' },
        { type: 'lazyYt', youtubeId: 'abcdefghijk' },
      ],
    }, { hasImages: true, hasYoutube: true });
    expect(result?.sections).toEqual([]);
  });

  it('allows requested code, keyboard, audio/video, related-post, and accordion group blocks with safe fields', () => {
    const audioUrl = 'https://example.com/intro.mp3';
    const videoUrl = 'https://example.com/demo.mp4';
    const posterUrl = 'https://example.com/demo-cover.jpg';
    const relatedUrl = 'https://example.com/guide';
    const customRequest = `أضف مجموعة أقسام مطوية، كود متعدد، واختصار لوحة المفاتيح. أضف مشغل صوتي ${audioUrl} بعنوان مقدمة صوتية. وأضف مشغل فيديو ${videoUrl} مع غلاف ${posterUrl}. وأضف روابط يدوية ذات صلة باسم دليل الاستخدام ${relatedUrl}. وأضف منشورات تلقائية ذات صلة.`;
    const result = normalizeArticleSections({
      sections: [
        { type: 'accordionGroup', accordionType: 'ac', accordions: [{ summary: 'تفصيل', content: 'شرح', alt: false }] },
        { type: 'codeTabs', tabHtml: '<p>مثال</p>', tabHtmlSource: 'index.html', tabJs: 'console.log(1)', tabJsSource: 'src/main.js' },
        { type: 'inlineCode', inlineCode: 'npm run build' },
        { type: 'kbd', kbdText: 'Ctrl + S' },
        { type: 'audioPlayer', audioUrl, audioTitle: 'مقدمة صوتية', audioPreload: 'auto' },
        { type: 'videoPlayer', videoUrl, videoPoster: posterUrl, videoType: 'video/mp4', videoPreload: 'metadata', videoWidth: '720' },
        { type: 'relatedManual', relatedTitle: 'المزيد', relatedLinks: [{ text: 'دليل الاستخدام', url: relatedUrl }, { text: 'رابط مختلق', url: 'https://fake.example/path' }] },
        { type: 'relatedAuto', relatedAutoLabel: 'منشورات ذات صلة', relatedMax: 99, relatedDataLabel: 'وسم غير مذكور', relatedSortBy: 'published', relatedRandom: true },
      ],
    }, { customRequest });

    expect(result?.sections.map((section: any) => section.type)).toEqual([
      'accordionGroup', 'codeTabs', 'inlineCode', 'kbd', 'audioPlayer', 'videoPlayer', 'relatedManual', 'relatedAuto',
    ]);
    expect(result?.sections[0].accordionType).toBe('group');
    expect(result?.sections[1].tabJs).toBe('console.log(1)');
    expect(result?.sections[1].tabHtmlSource).toBe('index.html');
    expect(result?.sections[1].tabJsSource).toBe('src/main.js');
    expect(result?.sections[4].audioUrl).toBe(audioUrl);
    expect(result?.sections[5].videoPoster).toBe(posterUrl);
    expect(result?.sections[5].videoWidth).toBe('720');
    expect(result?.sections[6].relatedLinks).toEqual([{ text: 'دليل الاستخدام', url: relatedUrl }]);
    expect(result?.sections[7].relatedMax).toBe(10);
    expect(result?.sections[7]).not.toHaveProperty('relatedDataLabel');
    expect(result?.sections[7].relatedSortBy).toBe('published');
  });

  it('rejects unrequested or fabricated media and related links, and unsupported enum values', () => {
    const audioUrl = 'https://example.com/audio.mp3';
    const videoUrl = 'https://example.com/video.mp4';
    const result = normalizeArticleSections({
      sections: [
        { type: 'audioPlayer', audioUrl },
        { type: 'videoPlayer', videoUrl, videoType: 'text/html', videoPoster: 'javascript:alert(1)' },
        { type: 'relatedManual', relatedLinks: [{ text: 'مصدر وهمي', url: 'https://fake.example/source' }] },
        { type: 'relatedAuto', relatedMax: 6 },
      ],
    }, { topic: `مقال عن الصوت والفيديو ${audioUrl} ${videoUrl}` });
    expect(result?.sections).toEqual([]);
  });

  it('keeps unattributed quotations and strips unverified attribution', () => {
    const providedQuote = 'التعلم المستمر يفتح أبواباً جديدة';
    const result = normalizeArticleSections({
      sections: [
        { type: 'blockquote', content: providedQuote, quoteAuthor: 'اسم مختلق', quoteStyle: 'normal' },
        { type: 'blockquote', content: 'اقتباس لم يقدمه المستخدم', quoteAuthor: 'شخص مشهور', quoteStyle: 's1' },
      ],
    }, { hasQuotes: true, customRequest: `استخدم هذا الاقتباس: «${providedQuote}»` });

    expect(result?.sections).toHaveLength(2);
    expect(result?.sections[0].content).toBe(providedQuote);
    expect(result?.sections[0]).not.toHaveProperty('quoteAuthor');
    expect(result?.sections[1].content).toBe('اقتباس لم يقدمه المستخدم');
    expect(result?.sections[1]).not.toHaveProperty('quoteAuthor');
  });

  it('returns null for a malformed top-level response', () => {
    expect(normalizeArticleSections(null)).toBeNull();
    expect(normalizeArticleSections({ sections: 'not-an-array' })).toBeNull();
  });
});
