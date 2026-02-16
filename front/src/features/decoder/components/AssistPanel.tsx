import { useMemo } from 'react';
import { Play, ChevronDown } from 'lucide-react';

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
  suggestions: Array<{ label: string; ops: string[]; score: number; reason: string }>;
  onApplySuggestion: (ops: string[]) => void;
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
    if (clean.length % 2 !== 0) return null;
    const bytes: number[] = [];
    for (let i = 0; i < clean.length; i += 2) {
      bytes.push(parseInt(clean.slice(i, i + 2), 16));
    }
    return bytes;
  };
  const bytesToHex = (bytes: number[]) => bytes.map((b) => b.toString(16).padStart(2, '0')).join('');

  const outputAnalysis = useMemo(() => {
    const empty = { bytes: null as number[] | null, entropy: 0, printable: 0, probes: [] as string[] };
    if (!output) return empty;
    let bytes: number[] | null = null;
    if (outputFormat === 'HEX') {
      bytes = hexToBytes(output);
    } else if (outputFormat === 'ASCII' || outputFormat === 'UTF-8' || outputFormat === 'AUTO') {
      bytes = Array.from(new TextEncoder().encode(output));
    }
    if (!bytes) return empty;
    const freq = new Array(256).fill(0);
    bytes.forEach((b) => { freq[b] += 1; });
    const len = bytes.length || 1;
    let entropy = 0;
    let printable = 0;
    for (let i = 0; i < 256; i += 1) {
      if (freq[i]) {
        const p = freq[i] / len;
        entropy -= p * Math.log2(p);
      }
    }
    bytes.forEach((b) => {
      if ((b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13) printable += 1;
    });

    const probes: string[] = [];
    const headHex = bytesToHex(bytes.slice(0, 64));
    const has = (hex: string) => headHex.startsWith(hex);

    if (has('89504e470d0a1a0a')) {
      const ihdrType = bytesToHex(bytes.slice(12, 16));
      const width = bytes.length >= 24 ? (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19] : 0;
      const height = bytes.length >= 24 ? (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23] : 0;
      probes.push(`PNG 签名 OK, IHDR=${ihdrType === '49484452' ? 'OK' : '未知'}, ${width}x${height}`);
    }
    if (has('504b0304')) {
      probes.push('ZIP 本地文件头 (PK\\x03\\x04)');
    } else if (has('504b0506')) {
      probes.push('ZIP 结束目录 (空包)');
    }
    if (has('4d5a')) {
      const peOffset = bytes.length >= 0x40 ? bytes[0x3c] | (bytes[0x3d] << 8) | (bytes[0x3e] << 16) | (bytes[0x3f] << 24) : 0;
      const peSig = peOffset > 0 && bytes.length > peOffset + 4
        ? bytesToHex(bytes.slice(peOffset, peOffset + 4))
        : '';
      probes.push(`PE(MZ) 头, PE 签名: ${peSig === '50450000' ? 'OK' : '未知'}`);
    }
    if (has('7f454c46')) {
      const klass = bytes[4] === 2 ? 'ELF64' : bytes[4] === 1 ? 'ELF32' : '未知';
      const endian = bytes[5] === 1 ? 'LE' : bytes[5] === 2 ? 'BE' : '未知';
      probes.push(`ELF 签名 OK, ${klass} ${endian}`);
    }
    if (has('1f8b08')) probes.push('GZIP 签名');
    if (has('25504446')) probes.push('PDF 头');
    if (has('377abcaf271c')) probes.push('7z 头');

    return { bytes, entropy, printable: printable / len, probes };
  }, [output, outputFormat]);

  return (
    <div className="h-full bg-white/60 backdrop-blur-md rounded-3xl p-4 ring-1 ring-blue-100 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700 font-medium">辅助工具</div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExecute}
            disabled={isProcessing}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${isProcessing ? 'animate-pulse' : ''}`}
          >
            <Play className="w-3.5 h-3.5" fill="currentColor" />
            {isProcessing ? '处理中...' : '执行'}
          </button>
          <button
            onClick={onToggleCollapsed}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/70"
            title={collapsed ? '展开' : '折叠'}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          </button>
        </div>
      </div>
      {!collapsed && (
        <>
          <div className="bg-white/70 border border-blue-100 rounded-xl p-3">
            <div className="text-xs text-gray-600 mb-2">输入预处理（适配魔改 HEX）</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inputPreprocess.stripHexPrefix}
                  onChange={(e) => onInputPreprocessChange({ ...inputPreprocess, stripHexPrefix: e.target.checked })}
                  className="rounded"
                />
                去除 0x 前缀
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inputPreprocess.stripHexEscape}
                  onChange={(e) => onInputPreprocessChange({ ...inputPreprocess, stripHexEscape: e.target.checked })}
                  className="rounded"
                />
                去除 \\x 转义
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inputPreprocess.removeSeparators}
                  onChange={(e) => onInputPreprocessChange({ ...inputPreprocess, removeSeparators: e.target.checked })}
                  className="rounded"
                />
                去除分隔符/空白
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inputPreprocess.autoPadOdd}
                  onChange={(e) => onInputPreprocessChange({ ...inputPreprocess, autoPadOdd: e.target.checked })}
                  className="rounded"
                />
                自动补齐奇数长度
              </label>
            </div>
            <div className="mt-2 text-[10px] text-gray-500">
              AUTO 模式将根据内容自动判断 HEX / UTF-8。
            </div>
            <div className="mt-3 text-xs text-gray-600">截取输入 (HEX 字节偏移)</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
              <button
                onClick={() => onInputSliceChange({ ...inputSlice, enabled: !inputSlice.enabled })}
                className={`px-2.5 py-1 rounded-lg ${inputSlice.enabled ? 'bg-blue-500 text-white' : 'bg-white/70 text-gray-600'}`}
              >
                {inputSlice.enabled ? '启用' : '禁用'}
              </button>
              <input
                value={inputSlice.offset}
                onChange={(e) => onInputSliceChange({ ...inputSlice, offset: e.target.value })}
                placeholder="偏移"
                className="w-20 px-2 py-1.5 text-xs bg-white/80 border border-blue-200 rounded-lg"
              />
              <input
                value={inputSlice.length}
                onChange={(e) => onInputSliceChange({ ...inputSlice, length: e.target.value })}
                placeholder="长度"
                className="w-20 px-2 py-1.5 text-xs bg-white/80 border border-blue-200 rounded-lg"
              />
              <div className="text-[10px] text-gray-500">留空长度表示到结尾</div>
            </div>
          </div>

          <div className="bg-white/70 border border-blue-100 rounded-xl p-3">
            <div className="text-xs text-gray-600 mb-2">链路建议</div>
            {suggestions.length === 0 ? (
              <div className="text-[10px] text-gray-500">暂无建议</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => onApplySuggestion(item.ops)}
                    className="px-2.5 py-1 text-[10px] rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
                    title={`${item.reason} (${Math.round(item.score * 100)}%)`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white/70 border border-blue-100 rounded-xl p-3">
            <div className="text-xs text-gray-600 mb-2">输出验证</div>
            {!output ? (
              <div className="text-[10px] text-gray-500">暂无输出</div>
            ) : (
              <div className="space-y-1 text-[11px] text-gray-600">
                <div>熵: {outputAnalysis.entropy.toFixed(2)}</div>
                <div>可打印率: {Math.round(outputAnalysis.printable * 100)}%</div>
                <div>格式探测: {outputAnalysis.probes.length > 0 ? outputAnalysis.probes.join(' | ') : '未识别'}</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
