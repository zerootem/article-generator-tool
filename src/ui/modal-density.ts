/** UI-only enhancements; never persist data or inspect credential values. */
export function boundedFieldHeight(contentHeight: number, minHeight: number, viewportHeight: number): number {
  const cap = Math.max(minHeight, Math.min(192, viewportHeight * 0.24));
  return Math.ceil(Math.max(minHeight, Math.min(contentHeight, cap)));
}

const shortLabels: Record<string, string> = {
  'رجوع للتوليد': 'رجوع',
  'العودة للنشر': 'رجوع',
  'قفل الجلسة': 'قفل',
  'اختبار الاتصال': 'اختبار',
  'حفظ مشفَّر': 'حفظ',
  'حفظ مشفّر': 'حفظ',
  'تحديث كتالوج النماذج': 'تحديث النماذج',
  'التحقق من إعداد الخادم': 'فحص الخادم',
  'تطبيق المحدد كتصنيفات': 'تطبيق التصنيفات',
  'إنشاء كلمة المرور': 'إنشاء القفل',
};

export function installModalDensity(): void {
  let scheduled = false;
  const resizeField = (field: HTMLTextAreaElement) => {
    if (!field.getClientRects().length || field.closest('[hidden]') || field.id === 'unifiedRawHTML') return;
    if (!field.classList.contains('modal-autogrow')) field.classList.add('modal-autogrow');
    const min = Number.parseFloat(getComputedStyle(field).minHeight) || 54;
    field.style.height = 'auto';
    const measured = field.scrollHeight + 2;
    const height = boundedFieldHeight(measured, min, window.innerHeight);
    field.style.height = `${height}px`;
    field.style.overflowY = measured > height ? 'auto' : 'hidden';
  };
  const refresh = () => {
    scheduled = false;
    document.querySelectorAll<HTMLElement>('.ai-bottom-sheet').forEach(sheet => {
      const title = sheet.querySelector<HTMLElement>('.sheet-header h3');
      if (title && !title.id) title.id = `${sheet.id}Title`;
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.setAttribute('aria-hidden', String(!sheet.classList.contains('show')));
      if (title) sheet.setAttribute('aria-labelledby', title.id);
      sheet.querySelectorAll<HTMLButtonElement>('button').forEach(button => {
        if (button.classList.contains('sheet-close-btn')) {
          button.setAttribute('aria-label', 'إغلاق النافذة');
          button.title = 'إغلاق';
        }
        const label = button.textContent?.trim() || '';
        const replacement = shortLabels[label];
        if (replacement) {
          if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', label);
          if (!button.title) button.title = label;
          const span = button.querySelector('span');
          if (span) span.textContent = replacement;
          else if (!button.querySelector('svg')) button.textContent = replacement;
        }
        if (!button.hasAttribute('aria-label') && !button.textContent?.trim() && button.querySelector('svg')) {
          button.setAttribute('aria-label', button.title || (button.classList.contains('danger') ? 'حذف العنصر' : 'إجراء'));
        }
        button.querySelectorAll('svg').forEach(svg => svg.setAttribute('aria-hidden', 'true'));
      });
      if (sheet.classList.contains('show')) sheet.querySelectorAll<HTMLTextAreaElement>('textarea').forEach(resizeField);
      sheet.querySelectorAll<HTMLElement>('.tmpl-card, .export-card').forEach(card => {
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
      });
    });
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  };
  document.addEventListener('input', event => {
    const target = event.target;
    if (target instanceof HTMLTextAreaElement && target.closest('.ai-bottom-sheet')) resizeField(target);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches('.tmpl-card, .export-card')) return;
    event.preventDefault();
    target.click();
  });
  new MutationObserver(schedule).observe(document.body, {
    subtree: true, childList: true, attributes: true,
    attributeFilter: ['class', 'hidden', 'open'],
  });
  window.addEventListener('resize', schedule);
  window.addEventListener('modweebSheetOpened', schedule);
  refresh();
}
