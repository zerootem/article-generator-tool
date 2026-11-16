import { InstallFlow, type BrowserInstallEvent } from './install-flow';
export function installApplication(): void {
  const button = document.getElementById('installAppBtn') as HTMLButtonElement | null;
  const nativeButton = document.getElementById('pwaNativeInstallBtn') as HTMLButtonElement | null;
  const status = document.getElementById('pwaInstallStatus');
  if (!button || !nativeButton || !status) return;
  const flow = new InstallFlow();
  const media = window.matchMedia('(display-mode: standalone)');
  const standalone = () => media.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  let message = '', updateReady = false;
  const translate = (text: string) => window.modweebI18n?.translate(text) || text;
  const refresh = () => {
    const installed = standalone() || flow.state === 'installed';
    button.hidden = installed;
    button.classList.toggle('pwa-install-ready', flow.available);
    button.title = translate('تثبيت التطبيق');
    button.setAttribute('aria-label', translate('تثبيت التطبيق'));
    nativeButton.hidden = !flow.available;
    nativeButton.disabled = !flow.available;
    status.textContent = translate(message || (standalone() ? 'التطبيق مفتوح في وضع مستقل.' : flow.state === 'installed' ? 'تم قبول طلب التثبيت؛ المتصفح يتولى إكماله.' : updateReady ? 'يتوفر تحديث للغلاف؛ سيُفعّل عند إغلاق نوافذ الأداة وإعادة فتحها بعد حفظ عملك.' : flow.available ? 'جاهز للتثبيت من هذا المتصفح.' : 'التثبيت غير متاح الآن في هذا المتصفح.'));
  };
  const request = async () => {
    if (!flow.available) return;
    message = 'جارٍ فتح طلب التثبيت…';
    const pending = flow.request(); // Preserve native click activation; no timers or awaiting first.
    refresh();
    try {
      const result = await pending;
      message = result === 'accepted' ? 'تم قبول طلب التثبيت؛ المتصفح يتولى إكماله.' : result === 'dismissed' ? 'أُغلق طلب التثبيت دون تثبيت.' : '';
    } catch { message = 'تعذر فتح طلب التثبيت؛ جرّب من قائمة المتصفح.'; }
    refresh();
  };
  window.addEventListener('beforeinstallprompt', event => {
    flow.capture(event as BrowserInstallEvent); message = ''; refresh();
  });
  window.addEventListener('appinstalled', () => { flow.markInstalled(); message = ''; refresh(); });
  window.addEventListener('modweebLanguageChanged', refresh);
  media.addEventListener('change', refresh);
  button.addEventListener('click', () => {
    if (flow.available) void request();
    else {
      const app = window as Window & { closeAllSheets?: () => void; openSheet?: (id: string) => void };
      app.closeAllSheets?.(); app.openSheet?.('pwaInstallSheet'); refresh();
    }
  });
  nativeButton.addEventListener('click', () => void request());
  refresh();
  // Vite dev has no generated SW; production and its local static preview share the contract.
  if (import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext) {
    const base = new URL(import.meta.env.BASE_URL, location.origin);
    void navigator.serviceWorker.register(new URL('sw.js', base), { scope: base.pathname, updateViaCache: 'none' }).then(registration => {
      const watch = () => {
        const installing = registration.installing;
        installing?.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) { updateReady = true; refresh(); }
          if (installing.state === 'redundant' && !registration.active) { message = 'لم يكتمل حفظ الغلاف دون اتصال؛ استخدم الأداة عبر الإنترنت وجرّب إعادة فتحها لاحقاً.'; refresh(); }
        });
      };
      registration.addEventListener('updatefound', watch);
      if (registration.waiting) updateReady = true;
      watch(); refresh();
    }).catch(() => { message = 'لم يكتمل حفظ الغلاف دون اتصال؛ استخدم الأداة عبر الإنترنت وجرّب إعادة فتحها لاحقاً.'; refresh(); });
  }
}
