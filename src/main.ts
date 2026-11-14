import { adjustRangesAfterEdit, findActiveRange, type EditorRange } from './editor/ranges';
import { workerAI } from './ai/worker-client';
import './prompts/index.js';
import { installArticleAssistant } from './ai/article-assistant';
import { installMediaTools } from './ai/media-tools';

export interface WorkerAIRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  providerId?: string;
  jsonMode?: boolean;
}

declare global {
  interface Window {
    ModweebEditorRanges: {
      adjustAfterEdit: typeof adjustRangesAfterEdit;
      findActive: typeof findActiveRange;
    };
    modweebWorkerAI?: {
      configured: boolean;
      generate: (request: WorkerAIRequest) => Promise<string>;
      adminStatus: () => Promise<unknown>;
      saveModel: (model: string) => Promise<void>;
    };
    modweebPrompts?: Record<string, unknown>;
  }
}

// Compatibility bridge: the editor is still being migrated from classic scripts;
// pure selection logic lives in a typed, independently tested module.
window.ModweebEditorRanges = {
  adjustAfterEdit: adjustRangesAfterEdit,
  findActive: findActiveRange,
};
window.modweebWorkerAI = workerAI;

document.getElementById('aiWorkerStatusButton')?.addEventListener('click', async () => {
  const status = document.getElementById('aiWorkerStatus');
  const button = document.getElementById('aiWorkerStatusButton') as HTMLButtonElement | null;
  const modelSelect = document.getElementById('aiWorkerModelSelect') as HTMLSelectElement | null;
  const saveButton = document.getElementById('aiWorkerSaveModelButton') as HTMLButtonElement | null;
  if (!status || !button) return;
  if (!workerAI.configured) {
    status.textContent = 'غير مضبوط — لم يُحدد عنوان Worker عبر VITE_WORKER_URL.';
    return;
  }
  button.disabled = true;
  status.textContent = 'جارٍ التحقق من جلسة Cloudflare Access وإعدادات الخادم…';
  try {
    const result = await workerAI.adminStatus() as {
      authenticated?: boolean;
      email?: string;
      providerConfigured?: boolean;
      modelConfigured?: boolean;
      settingsReady?: boolean;
      allowedModels?: string[];
      currentModel?: string;
    };
    if (modelSelect && Array.isArray(result.allowedModels)) {
      modelSelect.replaceChildren();
      for (const model of result.allowedModels) {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
      }
      modelSelect.value = result.currentModel || result.allowedModels[0] || '';
      modelSelect.disabled = result.allowedModels.length === 0;
      if (saveButton) saveButton.disabled = result.allowedModels.length === 0;
    }
    status.textContent = result.authenticated
      ? `تم التحقق من ${result.email || 'الحساب'} — المزوّد ${result.providerConfigured ? 'مهيأ' : 'غير مهيأ'}، النموذج ${result.modelConfigured ? 'مهيأ' : 'غير مهيأ'}.`
      : 'لم يؤكد الخادم صلاحية الحساب.';
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'تعذر التحقق من الخادم.';
  } finally {
    button.disabled = false;
  }
});

document.getElementById('aiWorkerSaveModelButton')?.addEventListener('click', async () => {
  const status = document.getElementById('aiWorkerStatus');
  const select = document.getElementById('aiWorkerModelSelect') as HTMLSelectElement | null;
  const button = document.getElementById('aiWorkerSaveModelButton') as HTMLButtonElement | null;
  if (!status || !select || !button || !select.value) return;
  button.disabled = true;
  status.textContent = 'جارٍ حفظ النموذج الافتراضي…';
  try {
    await workerAI.saveModel(select.value);
    status.textContent = 'تم حفظ النموذج الافتراضي على الخادم.';
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'تعذر حفظ النموذج.';
  } finally {
    button.disabled = false;
  }
});

const requiredLegacyScripts = [
  './assets/js/legacy/10-app-core.js',
  './assets/js/legacy/20-editor-and-integrations.js',
];

window.addEventListener('DOMContentLoaded', () => {
  const missing = requiredLegacyScripts.filter((path) => {
    const absolute = new URL(path, document.baseURI).href;
    return ![...document.scripts].some((script) => script.src === absolute);
  });
  if (missing.length > 0) {
    console.error('Article Generator failed to load required modules:', missing);
  }
});

export type { EditorRange };


// Consolidate related workflows into their owning sheets while preserving
// the existing credential widgets and event handlers (no duplicate controls).
const byId = (id: string) => document.getElementById(id);
const movePanel = (sourceSelector: string, target: HTMLElement | null) => {
  const source = document.querySelector<HTMLElement>(sourceSelector);
  if (source && target) target.appendChild(source);
  return source;
};

const aiSettingsPanel = byId('aiSettingsPanel');
movePanel('#aiAgentSheet > .sheet-body', aiSettingsPanel);
movePanel('#aiAgentSheet > .sheet-footer', aiSettingsPanel);

const bloggerSettingsPanel = byId('bloggerSettingsPanel');
movePanel('#bloggerSettingsSheet > .sheet-body', bloggerSettingsPanel);
movePanel('#bloggerSettingsSheet > .sheet-footer', bloggerSettingsPanel);

const smartImprovePanel = byId('smartImprovePanel');
movePanel('#improveTextSheet > .sheet-body', smartImprovePanel);
movePanel('#improveTextSheet > .sheet-footer', smartImprovePanel);

const keywordPanel = byId('seoKeywordPanel');
const keywordHost = byId('seoKeywordHost');
if (keywordPanel && keywordHost) keywordHost.appendChild(keywordPanel);

function selectTab(buttonSelector: string, activeButton: HTMLElement | null, panelSelector: string, activePanel: HTMLElement | null): void {
  document.querySelectorAll<HTMLElement>(buttonSelector).forEach((button) => {
    const active = button === activeButton;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll<HTMLElement>(panelSelector).forEach((panel) => {
    panel.classList.toggle('active', panel === activePanel);
    if (panel === activePanel) panel.removeAttribute('hidden');
    else panel.setAttribute('hidden', '');
  });
}

function syncProviderSettings(): void {
  const mode = (byId('aiGenerationMode') as HTMLSelectElement | null)?.value || 'puter';
  const isCloud = mode === 'cloud';
  const isWorker = mode === 'worker';
  const isPuter = mode === 'puter';
  const visible = (id: string, show: boolean) => {
    const el = byId(id);
    if (el) {
      el.hidden = !show;
      if (show && el instanceof HTMLDetailsElement) el.open = true;
    }
  };
  visible('aiCloudProviderPanel', isCloud);
  visible('aiPuterPanel', isPuter);
  visible('aiWorkerPanel', isWorker);
  ['aiCloudKeysAccordion', 'aiagentTabs', 'aiagentProvider', 'aiAgentLockScreen', 'aiagentStatus'].forEach((id) => visible(id, isCloud));
  ['aiagentSaveBtn', 'aiagentTestBtn', 'aiagentClearBtn'].forEach((id) => visible(id, isCloud));
  const title = byId('aiGenerationSettingsTitle');
  if (title) title.textContent = isCloud ? 'مزود API وإدارة المفتاح' : isWorker ? 'النموذج الآمن على الخادم' : 'نموذج Puter';
}

(window as any).setAIPopupTab = (name: 'generate' | 'settings') => {
  const button = byId(name === 'settings' ? 'aiSettingsTab' : 'aiGenerateTab');
  const panel = byId(name === 'settings' ? 'aiSettingsPanel' : 'aiGeneratePanel');
  selectTab('.ai-popup-tab', button, '.ai-popup-panel', panel);
  const footer = byId('aiGenerateFooter');
  if (footer) footer.hidden = name !== 'generate';
  const back = byId('aiHeaderBack');
  if (back) back.hidden = name !== 'settings';
  if (name === 'settings') syncProviderSettings();
  (window as any)._aiPopupTab = name;
};
(window as any).aiHeaderBack = () => (window as any).setAIPopupTab('generate');

(window as any).openAgent = () => {
  (window as any).openAIPopup?.();
  (window as any).setAIPopupTab('settings');
};
(window as any).openBloggerSettingsFromPublish = () => {
  if (!byId('bloggerPublishSheet')?.classList.contains('show')) (window as any).openSheet?.('bloggerPublishSheet');
  (window as any).setBloggerPublishTab('settings');
};
(window as any).setBloggerPublishTab = (name: 'compose' | 'settings', activeButton?: HTMLElement | null) => {
  const button = activeButton || document.querySelector<HTMLElement>(`.blogger-publish-tab[onclick*="'${name}'"]`);
  const panel = byId(name === 'settings' ? 'bloggerSettingsPanel' : 'bloggerComposePanel');
  selectTab('.blogger-publish-tab', button, '.blogger-publish-panel', panel);
  const footer = byId('bloggerComposeFooter');
  if (footer) footer.hidden = name !== 'compose';
  const settingsTab = byId('bloggerSettingsTab');
  if (settingsTab) settingsTab.hidden = name !== 'settings';
  const back = byId('bloggerHeaderBack');
  if (back) back.hidden = name !== 'settings';
};
(window as any).bloggerHeaderBack = () => (window as any).setBloggerPublishTab('compose');

(window as any).setSmartAssistantTab = (name: 'assistant' | 'edit' | 'improve', activeButton?: HTMLElement | null) => {
  const panels: Record<string, string> = { assistant: 'smartGeneratePanel', edit: 'smartEditPanel', improve: 'smartImprovePanel' };
  const button = activeButton || document.querySelector<HTMLElement>(`.smart-assistant-tab[onclick*="'${name}'"]`);
  const panel = byId(panels[name]);
  selectTab('.smart-assistant-tab', button, '.smart-assistant-panel', panel);
  const improveMode = name === 'improve';
  const back = byId('smartHeaderBack');
  if (back) back.hidden = name === 'assistant';
  const footer = byId('smartGenerateFooter');
  if (footer) footer.hidden = improveMode;
  const insertMode = byId('smartInsertMode');
  const insertLabel = document.querySelector<HTMLElement>('.smart-insert-mode-label');
  if (insertMode) insertMode.hidden = name !== 'assistant';
  if (insertLabel) insertLabel.hidden = name !== 'assistant';
  const generateButton = byId('smartGenBtn');
  if (generateButton) generateButton.textContent = name === 'edit' ? 'إنشاء التعديل' : 'توليد';
  const insertButton = byId('smartInsertBtn');
  if (insertButton) {
    insertButton.textContent = name === 'edit' ? 'تطبيق التعديل' : 'إدراج في المحرر';
    insertButton.style.display = name !== 'improve' && (window as any)._smartLastHTML ? 'inline-flex' : 'none';
  }
  const copyButton = byId('smartCopyBtn');
  if (copyButton && name === 'improve') copyButton.style.display = 'none';
  // Keep the one result/progress component visible in the active work panel.
  if (panel) {
    const progress = byId('smartProgressBar');
    const result = byId('smartResultPreview');
    if (progress) panel.appendChild(progress);
    if (result) panel.appendChild(result);
  }
  (window as any)._smartAssistantMode = name;
};
(window as any).smartHeaderBack = () => (window as any).setSmartAssistantTab('assistant');
(window as any).openSmartAssistant = (name: 'assistant' | 'edit' | 'improve' = 'assistant') => {
  (window as any).openSheet?.('smartAssistantSheet');
  (window as any).setSmartAssistantTab(name);
  const topic = (byId('aiTopic') as HTMLInputElement | null)?.value || (byId('aiMainKeyword') as HTMLInputElement | null)?.value || '';
  const context = byId('smartContextTopic') as HTMLInputElement | null;
  if (context && !context.value) context.value = topic;
  if (name === 'edit') {
    const instruction = byId('smartEditPrompt') as HTMLTextAreaElement | null;
    const editor = byId('unifiedCodeEditor') as HTMLTextAreaElement | null;
    if (instruction && !instruction.value && editor?.selectionStart !== editor?.selectionEnd) instruction.value = 'عدّل الجزء المحدد مع الحفاظ على معناه وتنسيقه.';
  }
};
(window as any).openImproveTextSheet = () => (window as any).openSmartAssistant('improve');

(window as any).setSmartAssistantTab('assistant');
(byId('aiGenerationMode') as HTMLSelectElement | null)?.addEventListener('change', syncProviderSettings);
syncProviderSettings();

(window as any).seoSwitchInnerTab = (name: 'recommendations' | 'keyword', activeButton?: HTMLElement | null) => {
  const buttons = document.querySelectorAll<HTMLElement>('.seo-inner-tab');
  const button = activeButton || document.querySelector<HTMLElement>(`.seo-inner-tab[onclick*="'${name}'"]`);
  buttons.forEach((item) => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
  });
  const recommendations = byId('seoRecommendationsPanel');
  const keyword = byId('seoKeywordHost');
  if (recommendations) {
    recommendations.hidden = name !== 'recommendations';
    recommendations.classList.toggle('active', name === 'recommendations');
  }
  if (keyword) {
    keyword.hidden = name !== 'keyword';
    keyword.classList.toggle('active', name === 'keyword');
  }
};

(window as any).seoDiscoverKeyword = async () => {
  const ai = (window as any).modweebAI;
  const prompts = (window as any).modweebPrompts;
  const field = byId('seoFocusKw') as HTMLInputElement | null;
  const topic = (byId('aiTopic') as HTMLInputElement | null)?.value.trim()
    || (byId('aiMainKeyword') as HTMLInputElement | null)?.value.trim()
    || field?.value.trim() || '';
  if (!topic) { (window as any).modweebShowStatus?.('أدخل موضوعاً أو كلمة أساسية أولاً'); return; }
  if (!ai || !prompts?.keywords) { (window as any).modweebShowStatus?.('تعذّر تهيئة اقتراح الكلمات'); return; }
  const button = document.querySelector<HTMLButtonElement>('.seo-discover-btn');
  if (button) { button.disabled = true; button.textContent = '…'; }
  try {
    const language = (byId('aiLanguage') as HTMLSelectElement | null)?.value || 'ar';
    const { systemPrompt, userPrompt } = prompts.keywords({ topic, language });
    const raw = await ai.call({ systemPrompt, userPrompt, maxTokens: 600, jsonMode: true });
    const data = ai.parseJSON(raw) || {};
    const suggestions: string[] = Array.isArray(data.keywords)
      ? [...new Set<string>(data.keywords.map((value: unknown): string => String(value ?? '').trim()).filter((value: string) => Boolean(value)))]
      : [];
    const suggestion = suggestions[0] || '';
    if (!suggestion) throw new Error('لم يُرجع النموذج اقتراحاً');
    if (field) field.value = suggestion;
    const main = byId('aiMainKeyword') as HTMLInputElement | null;
    if (main) main.value = suggestion;
    const secondary = byId('aiKeywords') as HTMLInputElement | HTMLTextAreaElement | null;
    if (secondary) {
      const combined = [...new Set([...(secondary.value.split(/[,،\n]/).map((item) => item.trim()).filter(Boolean)), ...suggestions.slice(1)])];
      secondary.value = combined.join('، ');
    }
    (window as any).seoAnalyzeKeyword?.();
    (window as any).modweebShowStatus?.('تم تعيين المحورية والعبارات المساعدة. اقتراح لغوي فقط؛ لا يتضمن بيانات حجم بحث من Google');
  } catch (error) {
    (window as any).modweebShowStatus?.(error instanceof Error ? `تعذر الاقتراح: ${error.message}` : 'تعذر الاقتراح');
  } finally {
    if (button) { button.disabled = false; button.textContent = '✦'; }
  }
};


installArticleAssistant();
installMediaTools();
