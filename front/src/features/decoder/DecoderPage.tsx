import { useState, useEffect, useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { EncodingTypesList, OperationType, operationDefaults } from './components/EncodingTypesList';
import { EncodingChain, EncodingOperation } from './components/EncodingChain';
import { OperationArea } from './components/OperationArea';
import { AssistPanel } from './components/AssistPanel';
import { runPipeline, getSBoxNames, convertFormat } from '@/services/api';

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

  const executeRecipe = useCallback(async () => {
    if (chain.length === 0) {
      setError('请先添加操作到编码链');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let currentInput = input;
      let skipConversion = false;
      let resolvedInputFormat = inputFormat;
      if (inputFormat === 'AUTO') {
        resolvedInputFormat = detectInputFormat(input);
      }

      // Smart Input Handling: for crypto ops with HEX input, pass data_type directly
      const activeRecipe = chain.filter(op => op.enabled);
      if (activeRecipe.length > 0 && resolvedInputFormat === 'HEX') {
        const firstOpId = activeRecipe[0].type;
        const cryptoOps = ['aes_encrypt', 'aes_decrypt', 'sm4_encrypt', 'sm4_decrypt',
          'des_encrypt', 'des_decrypt', 'triple_des_encrypt', 'triple_des_decrypt',
          'rc4_encrypt', 'rc4_decrypt', 'chacha20_encrypt', 'chacha20_decrypt',
          'salsa20_encrypt', 'salsa20_decrypt', 'blowfish_encrypt', 'blowfish_decrypt',
          'cast_encrypt', 'cast_decrypt', 'arc2_encrypt', 'arc2_decrypt'];
        if (cryptoOps.includes(firstOpId)) {
          skipConversion = true;
        }
      }

      if (resolvedInputFormat === 'HEX') {
        currentInput = sliceHexInput(normalizeHexInput(currentInput));
      }

      // Convert input format if needed
      if (!skipConversion && resolvedInputFormat !== 'UTF-8') {
        currentInput = await convertFormat(currentInput, resolvedInputFormat, 'UTF-8');
      }

      // Build operations array
      const operations = activeRecipe.map((op, index) => {
        const params = { ...op.params };
        // Inject data_type for first op if using Hex mode with crypto
        if (index === 0 && skipConversion && resolvedInputFormat === 'HEX') {
          params.data_type = 'hex';
        }
        return { name: op.type, params };
      });

      // Run pipeline
      let result = await runPipeline(currentInput, operations);

      // Convert output format if needed
      if (outputFormat !== 'UTF-8' && outputFormat !== 'AUTO') {
        result = await convertFormat(result, 'UTF-8', outputFormat);
      }

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
      <div className="h-full flex flex-col p-6 gap-4">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-pink-500/10 rounded-full border border-pink-200/50 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></div>
            <h1 className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-rose-600 font-semibold">解码器</h1>
          </div>
          {error && (
            <div className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Main Layout */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left: Encoding Types */}
          <div className="w-56 flex-shrink-0">
            <EncodingTypesList onAddToChain={addToChain} />
          </div>

          {/* Middle: Encoding Chain */}
          <div className="w-72 flex-shrink-0">
            <EncodingChain
              chain={chain}
              onRemove={removeFromChain}
              onUpdateParams={updateParams}
              onMove={moveOperation}
              onToggle={toggleOperation}
              sboxNames={sboxNames}
              input={input}
              inputFormat={inputFormat}
              inputPreprocess={inputPreprocess}
              onUpsertXorKey={upsertXorKey}
            />
          </div>

          {/* Right: Operation Area */}
          <div className="flex-1 min-w-0 flex gap-4 relative">
            <div className="flex-1 min-w-0">
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
            <div
              className={`flex-shrink-0 transition-all duration-300 ${assistCollapsed ? 'w-0' : 'w-80'}`}
            >
              <div className={assistCollapsed ? 'hidden' : 'block'}>
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
              </div>
            </div>
            {assistCollapsed && (
              <button
                onClick={() => setAssistCollapsed(false)}
                className="absolute right-0 top-2 px-2 py-1 text-xs rounded-l-lg bg-white/80 ring-1 ring-blue-200 text-blue-600 hover:bg-blue-50"
                title="展开辅助工具"
              >
                辅助工具
              </button>
            )}
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
