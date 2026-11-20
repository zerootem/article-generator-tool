import { describe, expect, it } from 'vitest';
import { normalizeArticleSections } from './article-section-policy';

describe('normalizeArticleSections', () => {
  it('keeps supported core blocks and removes unrequested FAQ, data, media, and unknown types', () => {
    const result = normalizeArticleSections({
      title: 'عنوان',
      sections: [
        { type: 'basics', metaDescription: 'وصف', randomHtml: '<script>' },
        { type: 'heading', content: 'القسم', headingLevel: 'h2', surprise: 'drop me' },
        { type: 'paragraph', content: 'شرح' },
        { type: 'faq', faqItems: [{ question: 'س؟', answer: 'ج' }] },
        { type: 'table', tableData: [['أ', 'ب']] },
        { type: 'image', imageUrl: 'https://example.com/fake.jpg' },
        { type: 'lazyYt', youtubeId: 'abcdefghijk' },
        { type: 'videoPlayer', videoUrl: 'https://example.com/video.mp4' },
      ],
    }, { articleType: 'guide' });

    expect(result?.sections.map((section: any) => section.type)).toEqual(['basics', 'heading', 'paragraph']);
    expect(result?.sections[0]).not.toHaveProperty('randomHtml');
    expect(result?.sections[1]).not.toHaveProperty('surprise');
    expect(result?.title).toBe('عنوان');
  });

  it('allows FAQ only for a selected FAQ article type or an explicit positive request', () => {
    const faq = { type: 'faq', faqItems: [{ question: 'سؤال مفيد؟', answer: 'إجابة موجزة.' }] };
    expect(normalizeArticleSections({ sections: [faq] }, { articleType: 'guide' })?.sections).toHaveLength(0);
    expect(normalizeArticleSections({ sections: [faq] }, { articleType: 'faq' })?.sections).toHaveLength(1);
    expect(normalizeArticleSections({ sections: [faq] }, { articleType: 'guide', customRequest: 'أضف قسم الأسئلة الشائعة' })?.sections).toHaveLength(1);
    expect(normalizeArticleSections({ sections: [faq] }, { articleType: 'faq', customRequest: 'لا تضف الأسئلة الشائعة' })?.sections).toHaveLength(0);
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
        { type: 'codeTabs', tabHtml: '<p>مثال</p>', tabJs: 'console.log(1)' },
        { type: 'inlineCode', inlineCode: 'npm run build' },
        { type: 'kbd', kbdText: 'Ctrl + S' },
        { type: 'audioPlayer', audioUrl, audioTitle: 'مقدمة صوتية', audioPreload: 'auto' },
        { type: 'videoPlayer', videoUrl, videoPoster: posterUrl, videoType: 'video/mp4', videoPreload: 'metadata', videoWidth: '720' },
        { type: 'relatedManual', relatedTitle: 'المزيد', relatedLinks: [{ text: 'دليل الاستخدام', url: relatedUrl }, { text: 'رابط مختلق', url: 'https://fake.example/path' }] },
        { type: 'relatedAuto', relatedAutoLabel: 'منشورات ذات صلة', relatedMax: 99, relatedDataLabel: 'وسم غير مذكور', relatedSortBy: 'not-supported', relatedRandom: true },
      ],
    }, { customRequest });

    expect(result?.sections.map((section: any) => section.type)).toEqual([
      'accordionGroup', 'codeTabs', 'inlineCode', 'kbd', 'audioPlayer', 'videoPlayer', 'relatedManual', 'relatedAuto',
    ]);
    expect(result?.sections[0].accordionType).toBe('group');
    expect(result?.sections[1].tabJs).toBe('console.log(1)');
    expect(result?.sections[4].audioUrl).toBe(audioUrl);
    expect(result?.sections[5].videoPoster).toBe(posterUrl);
    expect(result?.sections[5].videoWidth).toBe('720');
    expect(result?.sections[6].relatedLinks).toEqual([{ text: 'دليل الاستخدام', url: relatedUrl }]);
    expect(result?.sections[7].relatedMax).toBe(10);
    expect(result?.sections[7]).not.toHaveProperty('relatedDataLabel');
    expect(result?.sections[7]).not.toHaveProperty('relatedSortBy');
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

  it('keeps only user-supplied quotation text and attribution', () => {
    const providedQuote = 'التعلم المستمر يفتح أبواباً جديدة';
    const result = normalizeArticleSections({
      sections: [
        { type: 'blockquote', content: providedQuote, quoteAuthor: 'اسم مختلق', quoteStyle: 'normal' },
        { type: 'blockquote', content: 'اقتباس لم يقدمه المستخدم', quoteAuthor: 'شخص مشهور', quoteStyle: 's1' },
      ],
    }, { hasQuotes: true, customRequest: `استخدم هذا الاقتباس: «${providedQuote}»` });

    expect(result?.sections).toHaveLength(1);
    expect(result?.sections[0].content).toBe(providedQuote);
    expect(result?.sections[0]).not.toHaveProperty('quoteAuthor');
  });

  it('returns null for a malformed top-level response', () => {
    expect(normalizeArticleSections(null)).toBeNull();
    expect(normalizeArticleSections({ sections: 'not-an-array' })).toBeNull();
  });
});
