/* Persistent generation log + progress/stage notifications for the AI article generator. */
type GenStatus = 'idle' | 'running' | 'success' | 'fail';
interface GenStage { label: string; hint?: string }
interface GenState {
  status: GenStatus;
  topic: string;
  stages: GenStage[];
  stageIndex: number;
  percent: number;
  startedAt: number;
  endedAt?: number;
  message?: string;
  hint?: string;
  detail?: string;
  unread?: boolean;
  entryId?: string;
}
interface GenEntry {
  id: string;
  topic: string;
  status: 'success' | 'fail';
  startedAt: number;
  endedAt: number;
  stageIndex: number;
  stageLabel: string;
  percent: number;
  message: string;
  hint: string;
  detail: string;
  stats?: Record<string, unknown>;
}

const STATE_KEY = 'modweebGenerationState';
const LOG_KEY = 'modweebGenerationLog';
const MAX_ENTRIES = 60;

const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key: string, value: unknown): void => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
};
const byId = (id: string): HTMLElement | null => document.getElementById(id);
const fmtDate = (time: number): string => {
  try { return new Date(time).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' }); } catch { return new Date(time).toISOString(); }
};

let state: GenState = readJSON<GenState>(STATE_KEY, { status: 'idle', topic: '', stages: [], stageIndex: 0, percent: 0, startedAt: 0 });
let entries: GenEntry[] = readJSON<GenEntry[]>(LOG_KEY, []);
let ticker: number | undefined;

function saveState(): void { writeJSON(STATE_KEY, state); }
function saveEntries(): void {
  entries = entries.slice(0, MAX_ENTRIES);
  writeJSON(LOG_KEY, entries);
}

export function explainGenerationError(error: unknown): { message: string; hint: string } {
  const raw = error instanceof Error ? error.message : String(error || '');
  const text = raw.trim();
  const lower = text.toLowerCase();
  const map: Array<[RegExp, string, string]> = [
    [/^no_key$|no key|missing api key/i, 'لا يوجد مفتاح API محفوظ للمزود المختار.', 'افتح تبويب المفاتيح من زر الإعدادات، أضف مفتاح المزود، ثم أعد التوليد.'],
    [/agent_locked|vault/i, 'مفتاح المزود محفوظ لكن الخزنة مقفلة.', 'افتح الخزنة بكلمة المرور من إعدادات AI ثم أعد المحاولة.'],
    [/rate_limit|429|too many requests/i, 'تم تجاوز حد الطلبات لدى المزود (429).', 'انتظر قليلاً أو بدّل النموذج، ثم أعد التوليد.'],
    [/puter_sdk_unavailable/i, 'تعذر تحميل مكتبة Puter.', 'تحقق من اتصال الإنترنت وأعد تحميل الصفحة.'],
    [/^puter_error:/i, 'رفض مزود Puter الطلب.', 'راجع رسالة المزود أدناه، أو سجّل الدخول إلى Puter ثم أعد المحاولة.'],
    [/401|unauthorized|invalid api key|invalid_api_key/i, 'المفتاح غير صالح أو منتهي (401).', 'راجع المفتاح في تبويب المفاتيح واحفظ مفتاحاً صحيحاً.'],
    [/403|forbidden/i, 'المزود رفض الصلاحية (403).', 'تحقق من صلاحيات المفتاح وحدود الحساب.'],
    [/5\d\d|server error|bad gateway|service unavailable/i, 'خطأ مؤقت في خادم المزود (5xx).', 'أعد المحاولة بعد قليل أو اختر مزوداً آخر.'],
    [/failed to fetch|networkerror|network error|load failed/i, 'تعذر الاتصال بالشبكة.', 'تحقق من الإنترنت أو من إعدادات المزود ثم أعد المحاولة.'],
    [/timeout|timed out/i, 'انتهت مهلة الطلب.', 'جرّب حجم مقال أصغر أو نموذجاً أسرع ثم أعد التوليد.'],
    [/json|unexpected token|parse/i, 'استجابة النموذج ليست JSON صالحاً.', 'أعد التوليد؛ إن تكرر فاختر نموذجاً يدعم JSON أو قلّل حجم المقال.'],
    [/لم يُرجع.*أقسام|empty sections|أقسام مقال صالحة/i, 'لم يُرجع النموذج أقسام مقال صالحة.', 'أعد التوليد أو بدّل النموذج، وتأكد من صحة موضوع المقال.'],
    [/سياسة التحقق|normalize/i, 'تعذر التحقق من عناصر المقال.', 'أعد تحميل الصفحة ثم أعد التوليد.'],
    [/لم يُرجع|no content/i, 'لم يُرجع النموذج محتوى.', 'أعد صياغة الموضوع أو جرّب نموذجاً آخر.'],
  ];
  for (const [pattern, message, hint] of map) {
    if (pattern.test(lower) || pattern.test(text)) return { message, hint };
  }
  return { message: text || 'حدث خطأ غير معروف أثناء التوليد.', hint: 'راجع تفاصيل الخطأ أدناه، ثم أعد المحاولة أو بدّل النموذج من تبويب المفاتيح.' };
}

function ensureSheet(): void {
  if (byId('generationLogSheet')) return;
  const sheet = document.createElement('div');
  sheet.id = 'generationLogSheet';
  sheet.className = 'ai-bottom-sheet';
  sheet.setAttribute('aria-label', 'سجل عمليات التوليد');
  sheet.innerHTML = `
    <div class="sheet-header">
      <h3>سجل عمليات التوليد</h3>
      <div class="sheet-head-actions">
        <button type="button" class="sheet-icon-button" id="generationLogClear" aria-label="مسح السجل" title="مسح السجل"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m6 6 1 14h10l1-14"/></svg></button>
        <button type="button" class="sheet-close-btn" onclick="closeSheet('generationLogSheet')" aria-label="إغلاق"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      </div>
    </div>
    <div class="sheet-body" id="generationLogBody"></div>
    <div class="sheet-footer"><button type="button" class="modweeb-gen-btn" onclick="closeSheet('generationLogSheet')">إغلاق</button></div>`;
  document.body.appendChild(sheet);
  sheet.querySelector('#generationLogClear')?.addEventListener('click', () => clearLog());
}

function renderLog(): void {
  const body = byId('generationLogBody');
  if (!body) return;
  body.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'gen-log-empty';
    empty.textContent = 'لا توجد عمليات توليد مسجّلة بعد. ابدأ توليد مقال من نافذة الذكاء الاصطناعي.';
    body.appendChild(empty);
    return;
  }
  entries.forEach((entry) => {
    const item = document.createElement('details');
    item.className = `gen-log-item ${entry.status}`;
    const summary = document.createElement('summary');
    const badge = document.createElement('span');
    badge.className = 'gen-log-badge';
    badge.textContent = entry.status === 'success' ? 'ناجح' : 'فاشل';
    const title = document.createElement('span');
    title.className = 'gen-log-title';
    title.textContent = entry.topic || 'بدون موضوع';
    const meta = document.createElement('span');
    meta.className = 'gen-log-meta';
    meta.textContent = `${fmtDate(entry.startedAt)} · توقف عند: ${entry.stageLabel || 'بداية التوليد'} (${entry.percent}%)`;
    summary.append(badge, title, meta);
    const details = document.createElement('div');
    details.className = 'gen-log-details';
    const rows: Array<[string, string]> = [
      ['الحالة', entry.status === 'success' ? 'اكتمل التوليد بنجاح' : 'فشل التوليد'],
      ['الوقت', fmtDate(entry.startedAt)],
      ['المرحلة', `${entry.stageLabel || '—'} (${entry.percent}%)`],
      ['السبب', entry.message || '—'],
      ['المعالجة', entry.hint || '—'],
    ];
    if (entry.detail) rows.push(['تفاصيل تقنية', entry.detail]);
    if (entry.stats) rows.push(['ملخص', Object.entries(entry.stats).map(([k, v]) => `${k}: ${v}`).join(' · ')]);
    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'gen-log-row';
      const key = document.createElement('span');
      key.textContent = label;
      const val = document.createElement('span');
      val.textContent = value;
      row.append(key, val);
      details.appendChild(row);
    });
    item.append(summary, details);
    body.appendChild(item);
  });
}

function ensureChip(): HTMLElement | null {
  let chip = byId('mwGenStatusChip');
  if (chip) return chip;
  const host = document.querySelector('#aiPopup .sheet-head-actions');
  if (!host) return null;
  const btn = document.createElement('button');
  btn.type = 'button';
  chip = btn;
  chip.id = 'mwGenStatusChip';
  chip.className = 'mw-gen-chip';
  chip.setAttribute('aria-live', 'polite');
  chip.addEventListener('click', () => openLog());
  host.prepend(chip);
  return chip;
}

function ensureFloat(): HTMLButtonElement {
  let pill = byId('mwGenFloat') as HTMLButtonElement | null;
  if (pill) return pill;
  pill = document.createElement('button');
  pill.type = 'button';
  pill.id = 'mwGenFloat';
  pill.className = 'mw-gen-float';
  pill.hidden = true;
  pill.addEventListener('click', () => {
    const opener = (window as any).openAIPopup || (window as any).openSmartAssistant;
    if (typeof opener === 'function') opener();
    else document.querySelector<HTMLElement>('[data-open="aiPopup"]')?.click();
  });
  document.body.appendChild(pill);
  return pill;
}

function renderFloat(): void {
  const pill = ensureFloat();
  const popup = byId('aiPopup');
  const popupOpen = !!popup && popup.classList.contains('show');
  if (state.status !== 'running' || popupOpen) { pill.hidden = true; return; }
  pill.hidden = false;
  const stage = state.stages[state.stageIndex]?.label || 'جارٍ التوليد';
  pill.innerHTML = `<span class="mw-gen-spin" aria-hidden="true"></span><span class="mw-gen-float-text">توليد المقال ${state.percent}% · ${stage}</span>`;
  pill.setAttribute('aria-label', `توليد المقال جارٍ: ${state.percent}%، ${stage}. اضغط لفتح نافذة الذكاء الاصطناعي`);
}

function renderChip(): void {
  renderFloat();
  const chip = ensureChip();
  if (!chip) return;
  if (state.status === 'idle') { chip.hidden = true; return; }
  chip.hidden = false;
  chip.dataset.status = state.status;
  chip.classList.toggle('unread', !!state.unread);
  const icon = state.status === 'running' ? '<span class="mw-gen-spin" aria-hidden="true"></span>' : state.status === 'success' ? '✓' : '!';
  const label = state.status === 'running'
    ? `${state.percent}% · ${state.stages[state.stageIndex]?.label || 'جارٍ التوليد'}`
    : state.status === 'success' ? 'اكتمل التوليد' : 'فشل التوليد';
  chip.innerHTML = `<span class="mw-gen-chip-icon">${icon}</span><span class="mw-gen-chip-label">${label}</span>`;
  chip.title = state.status === 'fail' ? `${state.message || ''} — اضغط لعرض السجل` : 'فتح سجل التوليد';
}

function renderProgress(): void {
  const bar = byId('aiProgressBar');
  if (!bar) return;
  if (state.status !== 'running') { bar.style.display = 'none'; return; }
  bar.style.display = 'block';
  const pct = byId('aiProgressPercent');
  if (pct) pct.textContent = `${state.percent}%`;
  const text = byId('aiProgressText');
  if (text) text.textContent = `المرحلة ${state.stageIndex + 1} من ${state.stages.length}: ${state.stages[state.stageIndex]?.label || 'جارٍ التوليد'}`;
  const fill = byId('aiProgressFill');
  if (fill) { fill.style.width = `${state.percent}%`; fill.classList.remove('indeterminate'); }
  const stages = byId('aiProgressStages');
  if (stages) {
    stages.replaceChildren();
    state.stages.forEach((stage, index) => {
      const row = document.createElement('span');
      row.className = 'ai-progress-stage' + (index < state.stageIndex ? ' done' : index === state.stageIndex ? ' active' : '');
      row.textContent = `${index < state.stageIndex ? '✓' : index + 1}. ${stage.label}`;
      stages.appendChild(row);
    });
  }
  const detail = byId('aiProgressDetail');
  if (detail) detail.textContent = state.detail || state.stages[state.stageIndex]?.hint || 'قد يستغرق التوليد بعض الوقت';
}

function renderAll(): void { renderChip(); renderProgress(); }

function stopTicker(): void { if (ticker) { window.clearInterval(ticker); ticker = undefined; } }

function toast(kind: 'success' | 'fail'): void {
  let host = byId('mwGenToastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'mwGenToastHost';
    host.className = 'mw-gen-toast-host';
    document.body.appendChild(host);
  }
  const toast = document.createElement('div');
  toast.className = `mw-gen-toast ${kind}`;
  const title = document.createElement('strong');
  title.textContent = kind === 'success' ? 'اكتمل توليد المقال' : 'تعذر إكمال التوليد';
  const msg = document.createElement('p');
  msg.textContent = kind === 'success' ? `${state.topic || 'المقال'} جاهز الآن في المحرر.` : (state.message || '');
  const actions = document.createElement('div');
  actions.className = 'mw-gen-toast-actions';
  const logBtn = document.createElement('button');
  logBtn.type = 'button';
  logBtn.className = 'modweeb-gen-btn secondary sm';
  logBtn.textContent = 'عرض السجل';
  logBtn.addEventListener('click', () => { toast.remove(); openLog(); });
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'modweeb-gen-btn sm';
  closeBtn.textContent = 'إغلاق';
  closeBtn.addEventListener('click', () => toast.remove());
  actions.append(logBtn, closeBtn);
  toast.append(title, msg, actions);
  host.appendChild(toast);
  window.setTimeout(() => toast.remove(), kind === 'success' ? 9000 : 15000);
}

export function installGenerationLog(): void {
  ensureSheet();
  const api = {
    start(topic: string, stages?: GenStage[]) {
      stopTicker();
      state = {
        status: 'running',
        topic,
        stages: stages || [],
        stageIndex: 0,
        percent: 5,
        startedAt: Date.now(),
        unread: false,
      };
      saveState();
      renderAll();
      ticker = window.setInterval(() => {
        if (state.status !== 'running') { stopTicker(); return; }
        const cap = Math.min(55, Math.round(((state.stageIndex + 1) / Math.max(1, state.stages.length)) * 90));
        if (state.percent < cap) {
          state.percent += 1;
          saveState();
          renderProgress();
          renderChip();
        }
      }, 900);
    },
    stage(index: number, detail?: string) {
      state.stageIndex = Math.max(0, Math.min(index, state.stages.length - 1));
      state.percent = Math.max(state.percent, Math.round(((index + 1) / Math.max(1, state.stages.length)) * 90));
      state.detail = detail || '';
      saveState();
      renderAll();
    },
    detail(text: string) { state.detail = text; saveState(); renderProgress(); },
    success(details: { stats?: Record<string, unknown> } = {}) {
      stopTicker();
      state.status = 'success';
      state.percent = 100;
      state.endedAt = Date.now();
      state.unread = true;
      state.detail = '';
      state.entryId = `gen_${Date.now()}`;
      entries.unshift({
        id: state.entryId, topic: state.topic, status: 'success', startedAt: state.startedAt, endedAt: state.endedAt,
        stageIndex: state.stages.length - 1, stageLabel: 'اكتمال التوليد', percent: 100,
        message: 'تم توليد المقال وتطبيقه على المحرر.', hint: 'راجع المقال وبيانات SEO قبل النشر.',
        detail: '', stats: details.stats,
      });
      saveEntries(); saveState(); renderAll(); renderLog(); toast('success');
    },
    fail(error: unknown, detail?: string) {
      stopTicker();
      const info = explainGenerationError(error);
      state.status = 'fail';
      state.endedAt = Date.now();
      state.unread = true;
      state.message = info.message;
      state.hint = info.hint;
      state.detail = detail || '';
      state.entryId = `gen_${Date.now()}`;
      entries.unshift({
        id: state.entryId, topic: state.topic, status: 'fail', startedAt: state.startedAt, endedAt: state.endedAt,
        stageIndex: state.stageIndex, stageLabel: state.stages[state.stageIndex]?.label || 'بداية التوليد', percent: state.percent,
        message: info.message, hint: info.hint, detail: state.detail,
      });
      saveEntries(); saveState(); renderAll(); renderLog(); toast('fail');
      return info;
    },
    openLog() { openLog(); },
    clear() { clearLog(); },
    getState() { return { ...state }; },
    getEntries() { return entries.slice(); },
    render() { renderAll(); },
  };
  (window as any).modweebGenLog = api;
  (window as any).modweebOpenGenerationLog = openLog;
  (window as any).modweebGenerationExplain = explainGenerationError;
  // Restore chip/progress on reload so the last result stays visible until reviewed.
  renderAll();
  const popup = byId('aiPopup');
  if (popup && typeof MutationObserver === 'function') {
    new MutationObserver(() => { renderFloat(); renderProgress(); }).observe(popup, { attributes: true, attributeFilter: ['class'] });
  }
}

function openLog(): void {
  ensureSheet();
  if (state.status !== 'idle') { state.unread = false; saveState(); renderChip(); }
  renderLog();
  const sheet = byId('generationLogSheet');
  if (sheet && typeof (window as any).openSheet === 'function') (window as any).openSheet('generationLogSheet');
  else sheet?.classList.add('show');
}

function clearLog(): void {
  entries = [];
  saveEntries();
  if (state.status !== 'running') {
    state = { status: 'idle', topic: '', stages: [], stageIndex: 0, percent: 0, startedAt: 0 };
    saveState();
  }
  renderAll(); renderLog();
}
