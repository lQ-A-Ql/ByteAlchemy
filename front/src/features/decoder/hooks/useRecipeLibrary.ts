import { useCallback, useEffect, useState } from 'react';
import type {
  DecoderInputPreprocess,
  DecoderInputSlice,
  DecoderRecipe,
  DecoderRunHistoryItem,
  EncodingOperation,
  StoredEncodingOperation,
} from '@/features/decoder/types';
import { hydrateEncodingOperation, toStoredEncodingOperation } from '@/features/decoder/types';


const RECIPES_STORAGE_KEY = 'bytealchemy.decoder.recipes.v1';
const HISTORY_STORAGE_KEY = 'bytealchemy.decoder.history.v1';
const MAX_HISTORY_ITEMS = 10;


interface RecipeDraft {
  name: string;
  description?: string;
  chain: EncodingOperation[] | StoredEncodingOperation[];
  inputFormat: string;
  outputFormat: string;
  inputPreprocess: DecoderInputPreprocess;
  inputSlice: DecoderInputSlice;
}


interface RunDraft {
  label?: string;
  chain: EncodingOperation[] | StoredEncodingOperation[];
  input: string;
  inputFormat: string;
  outputFormat: string;
  outputPreview: string;
}


function createRecordId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}


function readStoredArray<T>(storageKey: string): T[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = localStorage.getItem(storageKey);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}


function storeArray(storageKey: string, value: unknown) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(value));
}


function toStoredChain(chain: EncodingOperation[] | StoredEncodingOperation[]) {
  return chain.map((operation) => (
    'id' in operation ? toStoredEncodingOperation(operation) : {
      type: operation.type,
      params: JSON.parse(JSON.stringify(operation.params ?? {})),
      enabled: operation.enabled,
    }
  ));
}


function buildHistoryLabel(chain: StoredEncodingOperation[], fallback: string) {
  if (chain.length === 0) {
    return fallback;
  }

  if (chain.length === 1) {
    return chain[0].type;
  }

  return `${chain[0].type} -> ${chain[chain.length - 1].type}`;
}


export function useRecipeLibrary() {
  const [recipes, setRecipes] = useState<DecoderRecipe[]>(() => readStoredArray<DecoderRecipe>(RECIPES_STORAGE_KEY));
  const [recentRuns, setRecentRuns] = useState<DecoderRunHistoryItem[]>(() => readStoredArray<DecoderRunHistoryItem>(HISTORY_STORAGE_KEY));

  useEffect(() => {
    storeArray(RECIPES_STORAGE_KEY, recipes);
  }, [recipes]);

  useEffect(() => {
    storeArray(HISTORY_STORAGE_KEY, recentRuns);
  }, [recentRuns]);

  const saveRecipe = useCallback((draft: RecipeDraft) => {
    const savedChain = toStoredChain(draft.chain);
    const timestamp = new Date().toISOString();
    const normalizedName = draft.name.trim() || `配方 ${recipes.length + 1}`;
    const existingRecipe = recipes.find((recipe) => recipe.name.toLowerCase() === normalizedName.toLowerCase());
    const nextRecipe: DecoderRecipe = existingRecipe
      ? {
        ...existingRecipe,
        name: normalizedName,
        description: draft.description?.trim() || '',
        chain: savedChain,
        inputFormat: draft.inputFormat,
        outputFormat: draft.outputFormat,
        inputPreprocess: JSON.parse(JSON.stringify(draft.inputPreprocess)),
        inputSlice: JSON.parse(JSON.stringify(draft.inputSlice)),
        updatedAt: timestamp,
      }
      : {
        id: createRecordId(),
        name: normalizedName,
        description: draft.description?.trim() || '',
        chain: savedChain,
        inputFormat: draft.inputFormat,
        outputFormat: draft.outputFormat,
        inputPreprocess: JSON.parse(JSON.stringify(draft.inputPreprocess)),
        inputSlice: JSON.parse(JSON.stringify(draft.inputSlice)),
        createdAt: timestamp,
        updatedAt: timestamp,
      };

    setRecipes((currentRecipes) => [nextRecipe, ...currentRecipes.filter((recipe) => recipe.id !== nextRecipe.id)]);
    return nextRecipe;
  }, [recipes]);

  const deleteRecipe = useCallback((recipeId: string) => {
    setRecipes((currentRecipes) => currentRecipes.filter((recipe) => recipe.id !== recipeId));
  }, []);

  const restoreRecipe = useCallback((recipe: DecoderRecipe | DecoderRunHistoryItem) => ({
    chain: recipe.chain.map(hydrateEncodingOperation),
    input: 'input' in recipe ? recipe.input : '',
    inputFormat: recipe.inputFormat,
    outputFormat: recipe.outputFormat,
    inputPreprocess: 'inputPreprocess' in recipe
      ? JSON.parse(JSON.stringify(recipe.inputPreprocess))
      : {
        stripHexPrefix: true,
        stripHexEscape: true,
        removeSeparators: true,
        autoPadOdd: true,
      },
    inputSlice: 'inputSlice' in recipe
      ? JSON.parse(JSON.stringify(recipe.inputSlice))
      : {
        enabled: false,
        offset: '0',
        length: '',
      },
  }), []);

  const exportRecipe = useCallback((draft: RecipeDraft) => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      recipe: {
        name: draft.name.trim() || '未命名配方',
        description: draft.description?.trim() || '',
        chain: toStoredChain(draft.chain),
        inputFormat: draft.inputFormat,
        outputFormat: draft.outputFormat,
        inputPreprocess: draft.inputPreprocess,
        inputSlice: draft.inputSlice,
      },
    };

    return JSON.stringify(payload, null, 2);
  }, []);

  const importRecipe = useCallback((content: string) => {
    let parsed: any;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('导入文件不是有效的 JSON。');
    }

    const recipePayload = parsed?.recipe ?? parsed;
    if (!recipePayload || !Array.isArray(recipePayload.chain)) {
      throw new Error('导入文件缺少链路定义。');
    }

    return saveRecipe({
      name: recipePayload.name || '导入的配方',
      description: recipePayload.description || '',
      chain: recipePayload.chain,
      inputFormat: recipePayload.inputFormat || 'UTF-8',
      outputFormat: recipePayload.outputFormat || 'UTF-8',
      inputPreprocess: recipePayload.inputPreprocess || {
        stripHexPrefix: true,
        stripHexEscape: true,
        removeSeparators: true,
        autoPadOdd: true,
      },
      inputSlice: recipePayload.inputSlice || {
        enabled: false,
        offset: '0',
        length: '',
      },
    });
  }, [saveRecipe]);

  const recordRun = useCallback((draft: RunDraft) => {
    const savedChain = toStoredChain(draft.chain);
    const item: DecoderRunHistoryItem = {
      id: createRecordId(),
      label: draft.label?.trim() || buildHistoryLabel(savedChain, '最近运行'),
      chain: savedChain,
      input: draft.input,
      inputFormat: draft.inputFormat,
      outputFormat: draft.outputFormat,
      outputPreview: draft.outputPreview.slice(0, 400),
      createdAt: new Date().toISOString(),
      operationCount: savedChain.length,
    };

    setRecentRuns((currentHistory) => [item, ...currentHistory.filter((historyItem) => historyItem.label !== item.label || historyItem.outputPreview !== item.outputPreview)].slice(0, MAX_HISTORY_ITEMS));
  }, []);

  return {
    recipes,
    recentRuns,
    saveRecipe,
    deleteRecipe,
    restoreRecipe,
    exportRecipe,
    importRecipe,
    recordRun,
  };
}
