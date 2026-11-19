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

  it('does not allow images or media without valid user-provided URLs/references', () => {
    const result = normalizeArticleSections({
      sections: [
        { type: 'image', imageUrl: 'https://example.com/model-invented.jpg' },
        { type: 'lazyYt', youtubeId: 'abcdefghijk' },
      ],
    }, { hasImages: true, hasYoutube: true });
    expect(result?.sections).toEqual([]);
  });

  it('returns null for a malformed top-level response', () => {
    expect(normalizeArticleSections(null)).toBeNull();
    expect(normalizeArticleSections({ sections: 'not-an-array' })).toBeNull();
  });
});
