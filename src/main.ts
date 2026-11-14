import { adjustRangesAfterEdit, findActiveRange, type EditorRange } from './editor/ranges';
import { workerAI } from './ai/worker-client';
import './prompts/index.js';

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
