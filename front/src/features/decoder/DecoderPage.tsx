import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { EncodingTypesList, OperationType, operationDefaults } from './components/EncodingTypesList';
import { EncodingChain, EncodingOperation } from './components/EncodingChain';
import { OperationArea } from './components/OperationArea';
import { AssistPanel } from './components/AssistPanel';
import { runPipeline, getSBoxNames } from '@/services/api';

export function DecoderPage() {
  const [chain, setChain] = useState<EncodingOperation[]>([]);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [inputFormat, setInputFormat] = useState('UTF-8');
  const [outputFormat, setOutputFormat] = useState('UTF-8');
  const [sboxNames, setSboxNames] = useState<string[]>(['Standard AES', 'Standard SM4']);
  const [inputPreprocess, setInputPreprocess] = useState({
    stripHexPrefix: true,
    stripHexEscape: true,
    removeSeparators: true,
    autoPadOdd: true,
  });
  const [inputSlice, setInputSlice] = useState({
    enabled: false,
    offset: '0',
    length: '',
  });
  const [assistCollapsed, setAssistCollapsed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load S-Box names on mount
  useEffect(() => {
    const loadSboxNames = async () => {
      try {
        const names = await getSBoxNames();
        setSboxNames(names);
      } catch (e) {
        console.error('Failed to load S-Box names:', e);
      }
    };
    loadSboxNames();
  }, []);

  const addToChain = (type: OperationType, defaultParams?: Record<string, any>) => {
    const newOp: EncodingOperation = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      params: defaultParams ? { ...defaultParams } : {},
      enabled: true,
    };
    setChain([...chain, newOp]);
  };

  const removeFromChain = (id: string) => {
    setChain(chain.filter(op => op.id !== id));
  };

  const updateParams = (id: string, params: Record<string, any>) => {
    setChain(chain.map(op => op.id === id ? { ...op, params } : op));
  };

  const upsertXorKey = (keyHex: string) => {
    if (!keyHex) return;
    setChain((prev) => {
      const existingIndex = [...prev].reverse().findIndex((op) => op.type === 'xor_bytes');
      if (existingIndex !== -1) {
        const index = prev.length - 1 - existingIndex;
        return prev.map((op, i) => i === index
          ? { ...op, params: { ...op.params, key: keyHex, key_type: 'hex', data_type: 'hex', output_format: 'hex' } }
          : op
        );
      }
      const newOp: EncodingOperation = {
        id: `xor_bytes-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'xor_bytes',
        params: { key: keyHex, key_type: 'hex', data_type: 'hex', output_format: 'hex' },
        enabled: true,
      };
      return [...prev, newOp];
    });
  };

  const toggleOperation = (id: string) => {
    setChain(chain.map(op => op.id === id ? { ...op, enabled: !op.enabled } : op));
  };

  const moveOperation = (dragIndex: number, hoverIndex: number) => {
    const newChain = [...chain];
    const [removed] = newChain.splice(dragIndex, 1);
    newChain.splice(hoverIndex, 0, removed);
    setChain(newChain);
  };

  const detectInputFormat = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 'UTF-8';
    const cleaned = trimmed
      .replace(/0x/gi, '')
      .replace(/\\x/gi, '')
      .replace(/[^0-9a-fA-F]/g, '');
    if (cleaned.length >= 2 && /^[0-9a-fA-F]+$/.test(cleaned)) return 'HEX';
    return 'UTF-8';
  };

  const normalizeHexInput = (value: string) => {
    let result = value;
    if (inputPreprocess.stripHexPrefix) result = result.replace(/0x/gi, '');
    if (inputPreprocess.stripHexEscape) result = result.replace(/\\x/gi, '');
    if (inputPreprocess.removeSeparators) result = result.replace(/[^0-9a-fA-F]/g, '');
    if (inputPreprocess.autoPadOdd && result.length % 2 !== 0) result = `0${result}`;
    return result;
  };

  const sliceHexInput = (value: string) => {
    if (!inputSlice.enabled) return value;
    const offset = Math.max(0, parseInt(inputSlice.offset || '0', 10) || 0);
    const length = Math.max(0, parseInt(inputSlice.length || '0', 10) || 0);
    const start = offset * 2;
    const end = length > 0 ? start + length * 2 : value.length;
    return value.slice(start, end);
  };

  const normalizePipelineFormat = (value: string) => {
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
  };

  const executeRecipe = useCallback(async () => {
    if (chain.length === 0) {
      setError('请先添加操作到编码链');
      return;
    }

    const activeRecipe = chain.filter(op => op.enabled);
    if (activeRecipe.length === 0) {
      setError('请至少启用一个操作');
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

      // Build operations array
      const operations = activeRecipe.map((op) => ({
        name: op.type,
        params: { ...op.params },
      }));

      // Run pipeline
      const result = await runPipeline(
        currentInput,
        operations,
        normalizePipelineFormat(resolvedInputFormat),
        normalizePipelineFormat(outputFormat)
      );

      setOutput(result);
    } catch (e: any) {
      console.error('Execute Recipe Error:', e);
      setOutput(`[错误] ${e.message}`);
      setError(e.message);
    } finally {
      setIsProcessing(false);
    }
  }, [chain, input, inputFormat, outputFormat, inputPreprocess, inputSlice]);

  const suggestions = useMemo(() => {
    const text = input.trim();
    if (!text) return [] as Array<{ label: string; ops: OperationType[]; score: number; reason: string }>;
    const normalize = (value: string) => value.replace(/0x/gi, '').replace(/\\x/gi, '').replace(/[^0-9a-fA-F]/g, '');
    const isHexLike = normalize(text).length >= 8 && /^[0-9a-fA-F]+$/.test(normalize(text));
    const isBase64Like = /^[A-Za-z0-9+/]+={0,2}$/.test(text.replace(/\s+/g, '')) && text.replace(/\s+/g, '').length % 4 === 0;
    const isUrlEncoded = /%[0-9a-fA-F]{2}/.test(text);
    const hasHtmlEntities = /&[a-zA-Z]+;/.test(text);
    const hasUnicodeEsc = /\\u[0-9a-fA-F]{4}/.test(text);

    const items: Array<{ label: string; ops: OperationType[]; score: number; reason: string }> = [];

    if (isUrlEncoded) items.push({ label: 'URL 解码', ops: ['url_decode'], score: 0.7, reason: '包含 %xx' });
    if (hasHtmlEntities) items.push({ label: 'HTML 解码', ops: ['html_decode'], score: 0.6, reason: '包含实体' });
    if (hasUnicodeEsc) items.push({ label: 'Unicode 解码', ops: ['unicode_decode'], score: 0.6, reason: '包含 \\u' });
    if (isBase64Like) items.push({ label: 'Base64 解码', ops: ['base64_decode'], score: 0.7, reason: '疑似 Base64' });
    if (isHexLike) items.push({ label: 'Base16 解码', ops: ['base16_decode'], score: 0.6, reason: '疑似 HEX' });

    if (isUrlEncoded && isBase64Like) {
      items.push({ label: 'URL → Base64 解码', ops: ['url_decode', 'base64_decode'], score: 0.75, reason: '编码嵌套' });
    }
    if (isBase64Like && text.replace(/\s+/g, '').length > 64) {
      items.push({ label: 'Base64 双重解码', ops: ['base64_decode', 'base64_decode'], score: 0.55, reason: '可疑长度' });
    }

    return items.sort((a, b) => b.score - a.score).slice(0, 6);
  }, [input]);

  const activeOperationCount = useMemo(
    () => chain.filter((op) => op.enabled).length,
    [chain]
  );

  const clearRecipe = useCallback(() => {
    setChain([]);
    setOutput('');
    setError(null);
  }, []);

  const applySuggestion = (ops: OperationType[]) => {
    setChain((prev) => {
      const newOps: EncodingOperation[] = ops.map((type) => ({
        id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type,
        params: operationDefaults[type] ? { ...operationDefaults[type] } : {},
        enabled: true,
      }));
      return [...prev, ...newOps];
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full min-h-0 min-w-0 overflow-auto flex flex-col gap-4 p-4 xl:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-3 rounded-full border border-pink-200/50 bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-pink-500/10 px-5 py-2.5 backdrop-blur-sm">
              <div className="h-2 w-2 rounded-full bg-pink-500 animate-pulse"></div>
              <h1 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-rose-600">解码器</h1>
            </div>
            <p className="text-sm text-gray-500">
              优化后的工作区会在大屏下并排显示输入、输出与辅助面板，小屏下自动折叠为纵向流式布局。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <button
              onClick={executeRecipe}
              disabled={isProcessing || activeOperationCount === 0}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? '处理中...' : '执行链路'}
            </button>
            <button
              onClick={() => setAssistCollapsed((prev) => !prev)}
              className="rounded-xl bg-white/80 px-4 py-2 text-sm font-medium text-blue-600 ring-1 ring-blue-200 transition-all hover:bg-blue-50"
            >
              {assistCollapsed ? '展开辅助面板' : '收起辅助面板'}
            </button>
            <button
              onClick={clearRecipe}
              disabled={chain.length === 0}
              className="rounded-xl bg-white/80 px-4 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-200 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              清空链路
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-600 shadow-sm">
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-pink-100 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-pink-400">链路</div>
            <div className="mt-2 text-2xl font-semibold text-gray-800">{chain.length}</div>
            <div className="mt-1 text-xs text-gray-500">总操作数</div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-blue-400">启用</div>
            <div className="mt-2 text-2xl font-semibold text-gray-800">{activeOperationCount}</div>
            <div className="mt-1 text-xs text-gray-500">当前会参与执行</div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-amber-400">建议</div>
            <div className="mt-2 text-2xl font-semibold text-gray-800">{suggestions.length}</div>
            <div className="mt-1 text-xs text-gray-500">基于输入自动推测</div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-400">输出</div>
            <div className="mt-2 text-2xl font-semibold text-gray-800">{output.length}</div>
            <div className="mt-1 text-xs text-gray-500">结果字符数</div>
          </div>
        </div>

        <div className="grid flex-1 min-h-0 min-w-0 gap-4 xl:grid-cols-[minmax(14rem,19rem)_minmax(16rem,25rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(14rem,19rem)_minmax(16rem,25rem)_minmax(0,1fr)_minmax(16rem,22rem)]">
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

          <AnimatePresence initial={false}>
            {!assistCollapsed && (
              <motion.div
                key="assist-panel"
                initial={{ opacity: 0, x: 28, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 28, y: 8, scale: 0.97 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="min-h-[18rem] min-w-0 xl:col-span-3 2xl:col-span-1 2xl:min-h-0"
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
    </DndProvider>
  );
}
