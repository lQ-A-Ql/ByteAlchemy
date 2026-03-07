import { Copy, Check, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { MiniSelect } from '@/shared/components/CustomSelect';

interface OperationAreaProps {
  input: string;
  output: string;
  inputFormat: string;
  outputFormat: string;
  onInputChange: (value: string) => void;
  onInputFormatChange: (format: string) => void;
  onOutputFormatChange: (format: string) => void;
}

const formatOptions = [
  { value: 'AUTO', label: 'AUTO' },
  { value: 'UTF-8', label: 'UTF-8' },
  { value: 'HEX', label: 'HEX' },
  { value: 'ASCII', label: 'ASCII' },
];

export function OperationArea({
  input,
  output,
  inputFormat,
  outputFormat,
  onInputChange,
  onInputFormatChange,
  onOutputFormatChange,
}: OperationAreaProps) {
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const importHexFromFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    onInputChange(hex);
    onInputFormatChange('HEX');
  };

  return (
    <div className="h-full bg-white/50 backdrop-blur-md rounded-3xl p-5 ring-1 ring-blue-200 flex flex-col overflow-hidden">
      <h2 className="text-base mb-3 text-gray-700 flex items-center gap-2 flex-shrink-0">
        <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
        操作区域
      </h2>

      <div className="grid flex-1 min-h-0 gap-3 2xl:grid-cols-2">
        {/* Input Area */}
        <div className="flex min-h-0 flex-col rounded-2xl border border-blue-100 bg-white/55 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <label className="text-sm text-gray-600 font-medium">输入</label>
              <div className="text-[11px] text-gray-500">支持文本、HEX、ASCII；导入文件会自动转成 HEX。</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  importHexFromFile(file);
                  e.currentTarget.value = '';
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="p-1.5 rounded-lg bg-white/70 ring-1 ring-blue-200 text-blue-600 hover:bg-blue-50"
                title="从文件导入 HEX"
              >
                <Upload className="w-4 h-4" />
              </button>
              <MiniSelect
                value={inputFormat}
                onChange={onInputFormatChange}
                options={formatOptions}
              />
              <span className="text-xs text-gray-400">{input.length} 字符</span>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="在此输入需要处理的文本..."
            className="flex-1 min-h-[260px] w-full resize-none rounded-2xl border border-blue-200 bg-white/60 px-4 py-3 text-sm font-mono transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Output Area */}
        <div className="flex min-h-0 flex-col rounded-2xl border border-cyan-100 bg-white/55 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <label className="text-sm text-gray-600 font-medium">输出</label>
              <div className="text-[11px] text-gray-500">便于直接比对结果，宽屏下会与输入区并排显示。</div>
            </div>
            <div className="flex items-center gap-2">
              <MiniSelect
                value={outputFormat}
                onChange={onOutputFormatChange}
                options={formatOptions}
              />
              <button
                onClick={copyOutput}
                disabled={!output}
                className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-30"
                title="复制"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <span className="text-xs text-gray-400">{output.length} 字符</span>
            </div>
          </div>
          <div className="flex-1 min-h-[260px] w-full overflow-auto rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 px-4 py-3 text-sm font-mono text-gray-700 whitespace-pre-wrap">
            {output || <span className="text-gray-400">输出结果将显示在此处...</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
