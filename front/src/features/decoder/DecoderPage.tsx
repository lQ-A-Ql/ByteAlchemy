import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AssistPanel } from '@/features/decoder/components/AssistPanel';
import { EncodingChain } from '@/features/decoder/components/EncodingChain';
import { EncodingTypesList, type OperationType, operationDefaults } from '@/features/decoder/components/EncodingTypesList';
import { OperationArea } from '@/features/decoder/components/OperationArea';
import { RecipeLibraryPanel } from '@/features/decoder/components/RecipeLibraryPanel';
import { useRecipeLibrary } from '@/features/decoder/hooks/useRecipeLibrary';
import type {
  DecoderInputPreprocess,
  DecoderInputSlice,
  EncodingOperation,
} from '@/features/decoder/types';
import { createEncodingOperation } from '@/features/decoder/types';
import { getSBoxNames, runPipeline } from '@/services/api';

const defaultInputPreprocess: DecoderInputPreprocess = {
  stripHexPrefix: true,
  stripHexEscape: true,
  removeSeparators: true,
  autoPadOdd: true,
};

const defaultInputSlice: DecoderInputSlice = {
  enabled: false,
  offset: '0',
  length: '',
};

export function DecoderPage() {
  const [chain, setChain] = useState<EncodingOperation[]>([]);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [inputFormat, setInputFormat] = useState('UTF-8');
  const [outputFormat, setOutputFormat] = useState('UTF-8');
  const [recipeName, setRecipeName] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [sboxNames, setSboxNames] = useState<string[]>(['Standard AES', 'Standard SM4']);
  const [inputPreprocess, setInputPreprocess] = useState<DecoderInputPreprocess>(defaultInputPreprocess);
  const [inputSlice, setInputSlice] = useState<DecoderInputSlice>(defaultInputSlice);
  const [assistCollapsed, setAssistCollapsed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    recipes,
    recentRuns,
    saveRecipe,
    deleteRecipe,
    restoreRecipe,
    exportRecipe,
    importRecipe,
    recordRun,
  } = useRecipeLibrary();

  useEffect(() => {
    const loadSboxNames = async () => {
      try {
        const names = await getSBoxNames();
        setSboxNames(names);
      } catch (loadError) {
        console.error('Failed to load S-Box names:', loadError);
      }
    };

    loadSboxNames();
  }, []);

  const addToChain = useCallback((type: OperationType, defaultParams?: Record<string, any>) => {
    setChain((currentChain) => [...currentChain, createEncodingOperation(type, defaultParams)]);
  }, []);

  const removeFromChain = useCallback((id: string) => {
    setChain((currentChain) => currentChain.filter((operation) => operation.id !== id));
  }, []);

  const updateParams = useCallback((id: string, params: Record<string, any>) => {
    setChain((currentChain) => currentChain.map((operation) => (
      operation.id === id ? { ...operation, params } : operation
    )));
  }, []);

  const toggleOperation = useCallback((id: string) => {
    setChain((currentChain) => currentChain.map((operation) => (
      operation.id === id ? { ...operation, enabled: !operation.enabled } : operation
    )));
  }, []);

  const moveOperation = useCallback((dragIndex: number, hoverIndex: number) => {
    setChain((currentChain) => {
      const nextChain = [...currentChain];
      const [removedOperation] = nextChain.splice(dragIndex, 1);
      nextChain.splice(hoverIndex, 0, removedOperation);
      return nextChain;
    });
  }, []);

  const detectInputFormat = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'UTF-8';
    }

    const cleaned = trimmed
      .replace(/0x/gi, '')
      .replace(/\\x/gi, '')
      .replace(/[^0-9a-fA-F]/g, '');

    if (cleaned.length >= 2 && /^[0-9a-fA-F]+$/.test(cleaned)) {
      return 'HEX';
    }

    return 'UTF-8';
  }, []);

  const normalizeHexInput = useCallback((value: string) => {
    let result = value;
    if (inputPreprocess.stripHexPrefix) {
      result = result.replace(/0x/gi, '');
    }
    if (inputPreprocess.stripHexEscape) {
      result = result.replace(/\\x/gi, '');
    }
    if (inputPreprocess.removeSeparators) {
      result = result.replace(/[^0-9a-fA-F]/g, '');
    }
    if (inputPreprocess.autoPadOdd && result.length % 2 !== 0) {
      result = `0${result}`;
    }
    return result;
  }, [inputPreprocess]);

  const sliceHexInput = useCallback((value: string) => {
    if (!inputSlice.enabled) {
      return value;
    }

    const offset = Math.max(0, Number.parseInt(inputSlice.offset || '0', 10) || 0);
    const length = Math.max(0, Number.parseInt(inputSlice.length || '0', 10) || 0);
    const start = offset * 2;
    const end = length > 0 ? start + (length * 2) : value.length;
    return value.slice(start, end);
  }, [inputSlice]);

  const normalizePipelineFormat = useCallback((value: string) => {
    switch (value) {
      case 'HEX':
        return 'hex';
      case 'ASCII':
        return 'ascii';
      case 'AUTO':
        return 'auto';
      case 'UTF-8':
      default:
        return 'utf-8';
    }
  }, []);

  const upsertXorKey = useCallback((keyHex: string) => {
    if (!keyHex) {
      return;
    }

    setChain((currentChain) => {
      const reverseIndex = [...currentChain].reverse().findIndex((operation) => operation.type === 'xor_bytes');
      if (reverseIndex !== -1) {
        const chainIndex = currentChain.length - 1 - reverseIndex;
        return currentChain.map((operation, index) => (
          index === chainIndex
            ? {
              ...operation,
              params: {
                ...operation.params,
                key: keyHex,
                key_type: 'hex',
                data_type: 'hex',
                output_format: 'hex',
              },
            }
            : operation
        ));
      }

      return [...currentChain, createEncodingOperation('xor_bytes', {
        key: keyHex,
        key_type: 'hex',
        data_type: 'hex',
        output_format: 'hex',
      })];
    });
  }, []);

  const buildRecipeDraft = useCallback(() => ({
    name: recipeName.trim() || '未命名链路',
    description: recipeDescription.trim(),
    chain,
    inputFormat,
    outputFormat,
    inputPreprocess,
    inputSlice,
  }), [chain, inputFormat, inputPreprocess, inputSlice, outputFormat, recipeDescription, recipeName]);

  const executeRecipe = useCallback(async () => {
    if (chain.length === 0) {
      setError('请先添加至少一个操作。');
      return;
    }

    const activeOperations = chain.filter((operation) => operation.enabled);
    if (activeOperations.length === 0) {
      setError('请至少启用一个操作后再执行。');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let currentInput = input;
      let resolvedInputFormat = inputFormat;

      if (inputFormat === 'AUTO') {
        resolvedInputFormat = detectInputFormat(input);
      }

      if (resolvedInputFormat === 'HEX') {
        currentInput = sliceHexInput(normalizeHexInput(currentInput));
      }

      const operations = activeOperations.map((operation) => ({
        name: operation.type,
        params: { ...operation.params },
      }));

      const result = await runPipeline(
        currentInput,
        operations,
        normalizePipelineFormat(resolvedInputFormat),
        normalizePipelineFormat(outputFormat),
      );

      setOutput(result);
      recordRun({
        label: recipeName.trim() || '未命名链路',
        chain,
        input,
        inputFormat,
        outputFormat,
        outputPreview: result,
      });
    } catch (runError: any) {
      const message = runError?.message || '执行失败，请检查操作参数。';
      console.error('Execute recipe error:', runError);
      setOutput(`[错误] ${message}`);
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [
    chain,
    detectInputFormat,
    input,
    inputFormat,
    normalizeHexInput,
    normalizePipelineFormat,
    outputFormat,
    recordRun,
    recipeName,
    sliceHexInput,
  ]);

  const suggestions = useMemo(() => {
    const text = input.trim();
    if (!text) {
      return [] as Array<{ label: string; ops: OperationType[]; score: number; reason: string }>;
    }

    const normalize = (value: string) => value.replace(/0x/gi, '').replace(/\\x/gi, '').replace(/[^0-9a-fA-F]/g, '');
    const isHexLike = normalize(text).length >= 8 && /^[0-9a-fA-F]+$/.test(normalize(text));
    const compactText = text.replace(/\s+/g, '');
    const isBase64Like = /^[A-Za-z0-9+/]+={0,2}$/.test(compactText) && compactText.length % 4 === 0;
    const isUrlEncoded = /%[0-9a-fA-F]{2}/.test(text);
    const hasHtmlEntities = /&[a-zA-Z]+;/.test(text);
    const hasUnicodeEscape = /\\u[0-9a-fA-F]{4}/.test(text);

    const items: Array<{ label: string; ops: OperationType[]; score: number; reason: string }> = [];

    if (isUrlEncoded) {
      items.push({ label: 'URL 解码', ops: ['url_decode'], score: 0.7, reason: '检测到 %xx 编码片段' });
    }
    if (hasHtmlEntities) {
      items.push({ label: 'HTML 解码', ops: ['html_decode'], score: 0.6, reason: '检测到 HTML 实体符号' });
    }
    if (hasUnicodeEscape) {
      items.push({ label: 'Unicode 解码', ops: ['unicode_decode'], score: 0.6, reason: '检测到 \\uXXXX 转义' });
    }
    if (isBase64Like) {
      items.push({ label: 'Base64 解码', ops: ['base64_decode'], score: 0.7, reason: '内容看起来像 Base64' });
    }
    if (isHexLike) {
      items.push({ label: 'Base16 解码', ops: ['base16_decode'], score: 0.6, reason: '内容看起来像十六进制数据' });
    }
    if (isUrlEncoded && isBase64Like) {
      items.push({ label: 'URL -> Base64', ops: ['url_decode', 'base64_decode'], score: 0.75, reason: '像是嵌套过的网页安全编码' });
    }
    if (isBase64Like && compactText.length > 64) {
      items.push({ label: '双重 Base64', ops: ['base64_decode', 'base64_decode'], score: 0.55, reason: '载荷较长，可能存在二次编码' });
    }

    return items.sort((left, right) => right.score - left.score).slice(0, 6);
  }, [input]);

  const activeOperationCount = useMemo(
    () => chain.filter((operation) => operation.enabled).length,
    [chain],
  );

  const clearRecipe = useCallback(() => {
    setChain([]);
    setOutput('');
    setError(null);
  }, []);

  const applySuggestion = useCallback((operations: OperationType[]) => {
    setChain((currentChain) => [
      ...currentChain,
      ...operations.map((type) => createEncodingOperation(type, operationDefaults[type] ?? {})),
    ]);
  }, []);

  const handleSaveRecipe = useCallback(() => {
    const savedRecipe = saveRecipe(buildRecipeDraft());
    setRecipeName(savedRecipe.name);
    setRecipeDescription(savedRecipe.description);
  }, [buildRecipeDraft, saveRecipe]);

  const applyRestoredState = useCallback((state: ReturnType<typeof restoreRecipe>) => {
    setChain(state.chain);
    setInput(state.input);
    setInputFormat(state.inputFormat);
    setOutputFormat(state.outputFormat);
    setInputPreprocess(state.inputPreprocess);
    setInputSlice(state.inputSlice);
    setOutput('');
    setError(null);
  }, []);

  const handleLoadRecipe = useCallback((recipeId: string) => {
    const recipe = recipes.find((item) => item.id === recipeId);
    if (!recipe) {
      return;
    }

    applyRestoredState(restoreRecipe(recipe));
    setRecipeName(recipe.name);
    setRecipeDescription(recipe.description);
  }, [applyRestoredState, recipes, restoreRecipe]);

  const handleRestoreRun = useCallback((historyId: string) => {
    const historyItem = recentRuns.find((item) => item.id === historyId);
    if (!historyItem) {
      return;
    }

    applyRestoredState(restoreRecipe(historyItem));
  }, [applyRestoredState, recentRuns, restoreRecipe]);

  const handleExportRecipe = useCallback(() => {
    const draft = buildRecipeDraft();
    const jsonContent = exportRecipe(draft);
    const download = document.createElement('a');
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const safeName = draft.name
      .trim()
      .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || '解码配方';

    download.href = objectUrl;
    download.download = `${safeName}.json`;
    download.click();

    URL.revokeObjectURL(objectUrl);
  }, [buildRecipeDraft, exportRecipe]);

  const handleImportRecipe = useCallback(async (file: File) => {
    try {
      const content = await file.text();
      const imported = importRecipe(content);
      applyRestoredState(restoreRecipe(imported));
      setRecipeName(imported.name);
      setRecipeDescription(imported.description);
      setError(null);
    } catch (importError: any) {
      setError(importError?.message || '导入配方失败。');
    }
  }, [applyRestoredState, importRecipe, restoreRecipe]);

  const currentPipelineLabel = recipeName.trim() || '未命名链路';
  const statCards = [
    { label: '当前配方', value: currentPipelineLabel, hint: '正在编辑的工作草稿', tone: 'from-orange-500 to-amber-400' },
    { label: '步骤数', value: String(chain.length), hint: '链路中的全部操作', tone: 'from-rose-500 to-orange-400' },
    { label: '已启用', value: String(activeOperationCount), hint: '当前会参与执行的步骤', tone: 'from-sky-500 to-cyan-400' },
    { label: '智能建议', value: String(suggestions.length), hint: '根据输入自动推荐', tone: 'from-violet-500 to-fuchsia-400' },
    { label: '已保存', value: String(recipes.length), hint: '可复用的历史配方', tone: 'from-emerald-500 to-teal-400' },
    { label: '最近记录', value: String(recentRuns.length), hint: '最近运行恢复点', tone: 'from-slate-500 to-slate-400' },
  ];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 p-4 xl:p-6">
        <section className="rounded-[32px] border border-white/70 bg-white/70 p-5 shadow-lg backdrop-blur-md xl:p-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-3 rounded-full border border-orange-200/70 bg-gradient-to-r from-orange-100 via-amber-50 to-white px-5 py-2.5 shadow-sm">
                <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-orange-500" />
                <span className="text-xs font-semibold uppercase tracking-[0.26em] text-orange-600">阶段二 / 三</span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">解码工作台</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  把常用链路沉淀成配方，保留最近运行记录，并在一个页面里完成输入、输出和辅助分析。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <button
                onClick={executeRecipe}
                disabled={isProcessing || activeOperationCount === 0}
                className="rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? '执行中…' : '执行链路'}
              </button>
              <button
                onClick={() => setAssistCollapsed((collapsed) => !collapsed)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
              >
                {assistCollapsed ? '展开辅助区' : '收起辅助区'}
              </button>
              <button
                onClick={clearRecipe}
                disabled={chain.length === 0}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                清空链路
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {statCards.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm">
                <div className={`inline-flex rounded-full bg-gradient-to-r ${item.tone} px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] text-white`}>
                  {item.label}
                </div>
                <div className="mt-3 truncate text-xl font-semibold text-slate-900">{item.value}</div>
                <div className="mt-1 text-xs text-slate-500">{item.hint}</div>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
            {error}
          </div>
        )}

        <div className="grid flex-1 min-h-0 min-w-0 gap-4 xl:grid-cols-[minmax(14rem,18rem)_minmax(17rem,23rem)_minmax(0,1fr)]">
          <div className="min-h-[20rem] min-w-0 xl:min-h-0">
            <EncodingTypesList onAddToChain={addToChain} />
          </div>

          <div className="min-h-[20rem] min-w-0 xl:min-h-0">
            <EncodingChain
              chain={chain}
              onRemove={removeFromChain}
              onUpdateParams={updateParams}
              onMove={moveOperation}
              onToggle={toggleOperation}
              onClear={clearRecipe}
              sboxNames={sboxNames}
              input={input}
              inputFormat={inputFormat}
              inputPreprocess={inputPreprocess}
              onUpsertXorKey={upsertXorKey}
            />
          </div>

          <div className="grid min-h-[30rem] min-w-0 gap-4 xl:min-h-0 xl:grid-rows-[minmax(18rem,1.25fr)_minmax(16rem,0.95fr)]">
            <div className="min-h-[28rem] min-w-0 xl:min-h-0">
              <OperationArea
                input={input}
                output={output}
                inputFormat={inputFormat}
                outputFormat={outputFormat}
                onInputChange={setInput}
                onInputFormatChange={setInputFormat}
                onOutputFormatChange={setOutputFormat}
              />
            </div>

            <div className={`grid min-h-[22rem] min-w-0 gap-4 ${assistCollapsed ? '' : 'xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]'}`}>
              <div className="min-h-[22rem] min-w-0 xl:min-h-0">
                <RecipeLibraryPanel
                  recipeName={recipeName}
                  recipeDescription={recipeDescription}
                  recipes={recipes}
                  recentRuns={recentRuns}
                  canSave={chain.length > 0}
                  onRecipeNameChange={setRecipeName}
                  onRecipeDescriptionChange={setRecipeDescription}
                  onSaveRecipe={handleSaveRecipe}
                  onLoadRecipe={handleLoadRecipe}
                  onDeleteRecipe={deleteRecipe}
                  onRestoreRun={handleRestoreRun}
                  onExportRecipe={handleExportRecipe}
                  onImportRecipe={handleImportRecipe}
                />
              </div>

              <AnimatePresence initial={false}>
                {!assistCollapsed && (
                  <motion.div
                    key="decoder-assist-panel"
                    initial={{ opacity: 0, x: 20, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="min-h-[20rem] min-w-0 xl:min-h-0"
                  >
                    <AssistPanel
                      inputPreprocess={inputPreprocess}
                      onInputPreprocessChange={setInputPreprocess}
                      inputSlice={inputSlice}
                      onInputSliceChange={setInputSlice}
                      suggestions={suggestions}
                      onApplySuggestion={applySuggestion}
                      output={output}
                      outputFormat={outputFormat}
                      isProcessing={isProcessing}
                      onExecute={executeRecipe}
                      collapsed={assistCollapsed}
                      onToggleCollapsed={() => setAssistCollapsed(!assistCollapsed)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
