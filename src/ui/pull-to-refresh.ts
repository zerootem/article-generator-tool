/* Pull-to-refresh for the article generator tool page (touch devices). */
const THRESHOLD = 72;
const MAX_DISTANCE = 120;

function scrollableAncestor(target: Element | null): HTMLElement | null {
  let node: Element | null = target;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = getComputedStyle(node);
    const scrollable = /(auto|scroll|overlay)/.test(style.overflowY);
    if (scrollable && node.scrollHeight > node.clientHeight + 2) return node as HTMLElement;
    node = node.parentElement;
  }
  return (document.scrollingElement as HTMLElement | null) || document.documentElement;
}

function inEditable(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element?.closest) return false;
  return !!element.closest('input, textarea, select, [contenteditable="true"], .sheet.show, .ai-bottom-sheet.show');
}

export function installPullToRefresh(): void {
  if (!('ontouchstart' in window)) return;
  if ((window as any).__modweebPullToRefresh) return;
  (window as any).__modweebPullToRefresh = true;

  const indicator = document.createElement('div');
  indicator.id = 'mwPtrIndicator';
  indicator.className = 'mw-ptr-indicator';
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-live', 'polite');
  indicator.innerHTML = '<span class="mw-ptr-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg></span><span class="mw-ptr-label">اسحب للتحديث</span>';
  document.body.appendChild(indicator);
  const label = indicator.querySelector('.mw-ptr-label') as HTMLElement | null;

  let startY = 0;
  let pulling = false;
  let distance = 0;
  let container: HTMLElement | null = null;
  let ready = false;

  const setDistance = (value: number) => {
    distance = Math.max(0, Math.min(MAX_DISTANCE, value));
    const progress = Math.min(1, distance / THRESHOLD);
    indicator.style.transform = `translate(-50%, ${distance - 56}px)`;
    indicator.style.opacity = String(Math.min(1, progress * 1.4));
    indicator.classList.toggle('ready', distance >= THRESHOLD);
    indicator.style.setProperty('--ptr-rotate', `${progress * 180}deg`);
    if (label) {
      label.textContent = distance >= THRESHOLD ? 'أفلت للتحديث' : 'اسحب للتحديث';
    }
  };

  const reset = () => {
    pulling = false;
    ready = false;
    distance = 0;
    indicator.classList.remove('ready', 'refreshing');
    indicator.style.transform = 'translate(-50%, -56px)';
    indicator.style.opacity = '0';
  };

  document.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1 || inEditable(event.target)) return;
    container = scrollableAncestor(event.target as Element);
    if (!container || container.scrollTop > 0) return;
    startY = event.touches[0].clientY;
    pulling = true;
    distance = 0;
    ready = false;
  }, { passive: true });

  document.addEventListener('touchmove', (event) => {
    if (!pulling || event.touches.length !== 1) return;
    const dy = event.touches[0].clientY - startY;
    if (dy <= 0 || (container && container.scrollTop > 0)) {
      if (dy < 0) reset();
      return;
    }
    if (event.cancelable) event.preventDefault();
    setDistance(dy * 0.55);
    ready = distance >= THRESHOLD;
  }, { passive: false });

  const finish = () => {
    if (!pulling) return;
    if (ready) {
      if ((window as any).modweebArticleDirty && !window.confirm('لديك تغييرات غير محفوظة في المقال. تحديث الصفحة سيفقدها. هل تريد المتابعة؟')) {
        reset();
        return;
      }
      pulling = false;
      indicator.classList.add('refreshing');
      if (label) label.textContent = 'جارٍ التحديث…';
      indicator.style.transform = 'translate(-50%, 14px)';
      indicator.style.opacity = '1';
      window.setTimeout(() => window.location.reload(), 220);
      return;
    }
    reset();
  };

  document.addEventListener('touchend', finish, { passive: true });
  document.addEventListener('touchcancel', reset, { passive: true });
  reset();
}
