import { useMemo } from 'react';
import { ChevronDown, Play } from 'lucide-react';
import type { OperationType } from './EncodingTypesList';


interface AssistPanelProps {
  inputPreprocess: {
    stripHexPrefix: boolean;
    stripHexEscape: boolean;
    removeSeparators: boolean;
    autoPadOdd: boolean;
  };
  onInputPreprocessChange: (value: {
    stripHexPrefix: boolean;
    stripHexEscape: boolean;
    removeSeparators: boolean;
    autoPadOdd: boolean;
  }) => void;
  inputSlice: {
    enabled: boolean;
    offset: string;
    length: string;
  };
  onInputSliceChange: (value: {
    enabled: boolean;
    offset: string;
    length: string;
  }) => void;
  suggestions: Array<{ label: string; ops: OperationType[]; score: number; reason: string }>;
  onApplySuggestion: (ops: OperationType[]) => void;
  output: string;
  outputFormat: string;
  isProcessing: boolean;
  onExecute: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}


export function AssistPanel({
  inputPreprocess,
  onInputPreprocessChange,
  inputSlice,
  onInputSliceChange,
  suggestions,
  onApplySuggestion,
  output,
  outputFormat,
  isProcessing,
  onExecute,
  collapsed,
  onToggleCollapsed,
}: AssistPanelProps) {
  const cleanHex = (value: string) => value.replace(/0x/gi, '').replace(/\\x/gi, '').replace(/[^0-9a-fA-F]/g, '').toLowerCase();
  const hexToBytes = (hex: string) => {
    const clean = cleanHex(hex);
    if (clean.length % 2 !== 0) {
      return null;
    }

    const bytes: number[] = [];
    for (let index = 0; index < clean.length; index += 2) {
      bytes.push(Number.parseInt(clean.slice(index, index + 2), 16));
    }
    return bytes;
  };

  const bytesToHex = (bytes: number[]) => bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');

  const outputAnalysis = useMemo(() => {
    const empty = { bytes: null as number[] | null, entropy: 0, printable: 0, probes: [] as string[] };
    if (!output) {
      return empty;
    }

    let bytes: number[] | null = null;
    if (outputFormat === 'HEX') {
      bytes = hexToBytes(output);
    } else if (outputFormat === 'ASCII' || outputFormat === 'UTF-8' || outputFormat === 'AUTO') {
      bytes = Array.from(new TextEncoder().encode(output));
    }

    if (!bytes) {
      return empty;
    }

    const freq = new Array(256).fill(0);
    bytes.forEach((byte) => { freq[byte] += 1; });
    const len = bytes.length || 1;
    let entropy = 0;
    let printable = 0;

    for (let index = 0; index < 256; index += 1) {
      if (freq[index]) {
        const p = freq[index] / len;
        entropy -= p * Math.log2(p);
      }
    }

    bytes.forEach((byte) => {
      if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
        printable += 1;
      }
    });

    const probes: string[] = [];
    const headHex = bytesToHex(bytes.slice(0, 64));
    const has = (hex: string) => headHex.startsWith(hex);

    if (has('89504e470d0a1a0a')) {
      const ihdrType = bytesToHex(bytes.slice(12, 16));
      const width = bytes.length >= 24 ? (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19] : 0;
      const height = bytes.length >= 24 ? (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23] : 0;
      probes.push(`PNG 头部，IHDR=${ihdrType === '49484452' ? '正常' : '未知'}，尺寸 ${width}x${height}`);
    }
    if (has('504b0304')) {
      probes.push('ZIP 本地文件头 (PK\\x03\\x04)');
    } else if (has('504b0506')) {
      probes.push('ZIP 结束目录头');
    }
    if (has('4d5a')) {
      const peOffset = bytes.length >= 0x40 ? bytes[0x3c] | (bytes[0x3d] << 8) | (bytes[0x3e] << 16) | (bytes[0x3f] << 24) : 0;
      const peSig = peOffset > 0 && bytes.length > peOffset + 4
        ? bytesToHex(bytes.slice(peOffset, peOffset + 4))
        : '';
      probes.push(`PE 文件头，签名 ${peSig === '50450000' ? '正常' : '未知'}`);
    }
    if (has('7f454c46')) {
      const klass = bytes[4] === 2 ? 'ELF64' : bytes[4] === 1 ? 'ELF32' : '未知';
      const endian = bytes[5] === 1 ? '小端' : bytes[5] === 2 ? '大端' : '未知';
      probes.push(`ELF 文件头，${klass}，${endian}`);
    }
    if (has('1f8b08')) {
      probes.push('GZIP 头部');
    }
    if (has('25504446')) {
      probes.push('PDF 头部');
    }
    if (has('377abcaf271c')) {
      probes.push('7z 头部');
    }

    return { bytes, entropy, printable: printable / len, probes };
  }, [output, outputFormat]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden rounded-[28px] border border-blue-100 bg-white/70 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-800">辅助面板</div>
          <div className="mt-1 text-xs text-slate-500">预处理输入、套用建议并快速判断输出内容。</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExecute}
            disabled={isProcessing}
            className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 ${isProcessing ? 'animate-pulse' : ''}`}
          >
            <Play className="h-3.5 w-3.5" fill="currentColor" />
            {isProcessing ? '处理中…' : '执行'}
          </button>
          <button
            onClick={onToggleCollapsed}
            className="rounded-lg p-1.5 text-slate-500 transition-all hover:bg-white/70 hover:text-slate-700"
            title={collapsed ? '展开' : '收起'}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
          <section className="rounded-2xl border border-blue-100 bg-white/80 p-3">
            <div className="mb-2 text-xs font-semibold text-slate-600">输入预处理</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inputPreprocess.stripHexPrefix}
                  onChange={(event) => onInputPreprocessChange({ ...inputPreprocess, stripHexPrefix: event.target.checked })}
                  className="rounded"
                />
                去除 0x 前缀
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inputPreprocess.stripHexEscape}
                  onChange={(event) => onInputPreprocessChange({ ...inputPreprocess, stripHexEscape: event.target.checked })}
                  className="rounded"
                />
                去除 \x 转义
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inputPreprocess.removeSeparators}
                  onChange={(event) => onInputPreprocessChange({ ...inputPreprocess, removeSeparators: event.target.checked })}
                  className="rounded"
                />
                移除分隔符和空白
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inputPreprocess.autoPadOdd}
                  onChange={(event) => onInputPreprocessChange({ ...inputPreprocess, autoPadOdd: event.target.checked })}
                  className="rounded"
                />
                奇数字节自动补齐
              </label>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              AUTO 模式会根据内容自动判断 HEX / UTF-8。
            </div>

            <div className="mt-3 text-xs font-semibold text-slate-600">HEX 截取</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <button
                onClick={() => onInputSliceChange({ ...inputSlice, enabled: !inputSlice.enabled })}
                className={`rounded-lg px-2.5 py-1 ${inputSlice.enabled ? 'bg-blue-500 text-white' : 'bg-white/70 text-slate-600'}`}
              >
                {inputSlice.enabled ? '已启用' : '未启用'}
              </button>
              <input
                value={inputSlice.offset}
                onChange={(event) => onInputSliceChange({ ...inputSlice, offset: event.target.value })}
                placeholder="偏移"
                className="w-20 rounded-lg border border-blue-200 bg-white/80 px-2 py-1.5 text-xs"
              />
              <input
                value={inputSlice.length}
                onChange={(event) => onInputSliceChange({ ...inputSlice, length: event.target.value })}
                placeholder="长度"
                className="w-20 rounded-lg border border-blue-200 bg-white/80 px-2 py-1.5 text-xs"
              />
              <div className="text-[10px] text-slate-500">长度留空表示截取到末尾。</div>
            </div>
          </section>

          <section className="rounded-2xl border border-blue-100 bg-white/80 p-3">
            <div className="mb-2 text-xs font-semibold text-slate-600">链路建议</div>
            {suggestions.length === 0 ? (
              <div className="text-[10px] text-slate-500">暂时没有可用建议。</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => onApplySuggestion(item.ops)}
                    className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] text-blue-700 ring-1 ring-blue-200 transition-all hover:bg-blue-100"
                    title={`${item.reason} (${Math.round(item.score * 100)}%)`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-blue-100 bg-white/80 p-3">
            <div className="mb-2 text-xs font-semibold text-slate-600">输出分析</div>
            {!output ? (
              <div className="text-[10px] text-slate-500">暂无输出结果。</div>
            ) : (
              <div className="space-y-1 text-[11px] text-slate-600">
                <div>熵值：{outputAnalysis.entropy.toFixed(2)}</div>
                <div>可打印占比：{Math.round(outputAnalysis.printable * 100)}%</div>
                <div>格式探测：{outputAnalysis.probes.length > 0 ? outputAnalysis.probes.join(' | ') : '未识别明显头部'}</div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
