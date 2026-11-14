const byId = (id: string) => document.getElementById(id);

export function extractYouTubeVideoId(value: string): string {
  const input = String(value || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0] || '';
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
    }
    if (!['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)) return '';
    const candidate = url.searchParams.get('v')
      || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] || '';
    return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : '';
  } catch {
    return '';
  }
}

async function optimizeDataImage(source: string): Promise<string> {
  if (!source.startsWith('data:image/') || source.length < 280_000) return source;
  const image = new Image();
  image.src = source;
  await image.decode();
  const maxWidth = 1280;
  const scale = Math.min(1, maxWidth / (image.naturalWidth || maxWidth));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return source;
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

function getArticleTopic(): string {
  return (byId('aiTopic') as HTMLInputElement | null)?.value.trim()
    || (byId('aiMainKeyword') as HTMLInputElement | null)?.value.trim()
    || (byId('bloggerPostTitle') as HTMLInputElement | null)?.value.trim() || '';
}

export function installMediaTools(): void {
  const w = window as any;
  w.modweebExtractYoutubeId = extractYouTubeVideoId;

  w.searchYoutubeForArticle = () => {
    const topic = getArticleTopic();
    if (!topic) { w.modweebShowStatus?.('أدخل موضوع المقال أولاً للبحث عن فيديو'); return; }
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(topic)}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) w.modweebShowStatus?.('تعذر فتح تبويب YouTube؛ اسمح بالنوافذ المنبثقة ثم أعد المحاولة');
    else w.modweebShowStatus?.('اختر فيديو مناسباً وانسخ رابطه إلى حقل YouTube');
  };

  w.generatePuterImageAndInsert = async () => {
    const button = byId('aiGenerateImageBtn') as HTMLButtonElement | null;
    const status = byId('aiImageStatus');
    const promptField = byId('aiImagePrompt') as HTMLTextAreaElement | null;
    const topic = getArticleTopic();
    const imageIdea = promptField?.value.trim() || topic;
    if (!imageIdea) { if (status) status.textContent = 'أدخل موضوع المقال أو وصفاً للصورة أولاً.'; return; }
    const puter = w.puter;
    if (!puter?.ai?.txt2img) { if (status) status.textContent = 'مكتبة Puter غير متاحة؛ تحقق من الاتصال ثم أعد تحميل الصفحة.'; return; }
    const model = (byId('aiImageModel') as HTMLSelectElement | null)?.value || 'gpt-image-2.6-flare';
    const ratio = (byId('aiImageRatio') as HTMLSelectElement | null)?.value || '16:9';
    const language = (byId('aiLanguage') as HTMLSelectElement | null)?.value || 'ar';
    const prompt = `Create an original, clean editorial illustration for an article about: ${imageIdea}. Landscape ${ratio} composition. No text, no logos, no watermarks, no fake UI screenshots, no misleading symbols. Accurate, tasteful, suitable as a blog hero image.`;
    if (button) { button.disabled = true; button.textContent = 'جارٍ إنشاء الصورة…'; }
    if (status) status.textContent = 'قد يستغرق إنشاء الصورة بعض الوقت. تتم المعالجة عبر Puter وقد يتطلب الحساب موافقة أو رصيداً.';
    try {
      const image = await puter.ai.txt2img(prompt, { model, aspect_ratio: ratio });
      let imageUrl = typeof image === 'string' ? image : String(image?.src || image?.toString?.() || '');
      if (!imageUrl || !/^(https:|data:image\/|blob:)/i.test(imageUrl)) throw new Error('لم يُرجع مزود الصور عنوان صورة صالحاً.');
      imageUrl = await optimizeDataImage(imageUrl);
      const alt = language === 'ar' ? `صورة توضيحية عن ${topic || imageIdea}` : `Illustration about ${topic || imageIdea}`;
      const makeBlock = w.modweebTemplateDefaultBlock;
      const block = typeof makeBlock === 'function'
        ? makeBlock({ id: `puter-image-${Date.now()}`, type: 'image', imageUrl, imageAlt: alt, imageStyle: 'figure', caption: alt, imageCaptionStyle: 'figure', imageLightbox: true })
        : { id: `puter-image-${Date.now()}`, type: 'image', imageUrl, imageAlt: alt, imageStyle: 'figure', caption: alt, imageCaptionStyle: 'figure', imageLightbox: true };
      if (typeof w.modweebCommitBlocks !== 'function') throw new Error('محرر المقال غير مهيأ.');
      w.modweebCommitBlocks([block], { mode: 'append', save: true });
      if (status) status.textContent = imageUrl.startsWith('data:image/')
        ? 'تم إدراج الصورة. نُسخت محلياً؛ احتفظ بنسخة احتياطية لأن الصور تزيد حجم بيانات الحفظ.'
        : 'تم إدراج الصورة. قد تكون وصلة النموذج مؤقتة؛ نزّل الصورة وارفعها إلى استضافتك قبل نشر المقال.';
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? `تعذر إنشاء الصورة: ${error.message}` : 'تعذر إنشاء الصورة.';
    } finally {
      if (button) { button.disabled = false; button.textContent = 'توليد صورة وإدراجها'; }
    }
  };

  w.modweebResetArticleContent = () => {
    const keepIds = new Set(['aiGenerationMode', 'aiagentActiveProviderSelect', 'aiPuterModel', 'aiWorkerModelSelect', 'bloggerBlogId']);
    const keepContainers = ['#aiSettingsPanel', '#bloggerSettingsPanel'];
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input,textarea,select').forEach((field) => {
      if (keepIds.has(field.id) || keepContainers.some((selector) => field.closest(selector))) return;
      if (field instanceof HTMLSelectElement) { field.selectedIndex = 0; field.dispatchEvent(new Event('change', { bubbles: true })); return; }
      if (field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio')) { field.checked = false; field.dispatchEvent(new Event('change', { bubbles: true })); return; }
      field.value = '';
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
    ['titleSuggestions','suggestTitle','suggestKeywords','suggestMeta','seoTipsContainer','seoKwTagsContainer','seoKwChecks','smartResultContent','improveResultBox'].forEach((id) => byId(id)?.replaceChildren());
    ['smartResultPreview','improveResultSection','smartCopyBtn','smartInsertBtn'].forEach((id) => { const target = byId(id); if (target) target.style.display = 'none'; });
    ['aiProgressBar','smartProgressBar','improveProgressBar','seoMetaProgressBar','tmplSetupProgress'].forEach((id) => { const target = byId(id); if (target) target.style.display = 'none'; });
    if (byId('aiImageStatus')) byId('aiImageStatus')!.textContent = 'قد يتطلب Puter تسجيل الدخول؛ راجع سياسة الاستخدام والتكلفة. بعض روابط الصور المولّدة مؤقتة.';
    w._pendingTemplateId = null;
    w._smartLastHTML = '';
    w._smartLastResult = null;
    w._improveLastResult = '';
    w._improveTarget = null;
    w._aiWritingMode = 'default';
    document.querySelectorAll<HTMLElement>('.writing-mode-btn').forEach((item) => item.classList.toggle('active', item.dataset.mode === 'default'));
    w.modweebCommitHTML?.('', { save: true });
    w.modweebResetEditorState?.();
    w.saveToLocalStorage?.();
  };
}
