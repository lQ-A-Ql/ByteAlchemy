import { Check, Copy, Upload } from 'lucide-react';
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
    const hex = Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    onInputChange(hex);
    onInputFormatChange('HEX');
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-blue-100 bg-white/70 p-5 shadow-sm backdrop-blur-md">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <div className="h-5 w-1 rounded-full bg-gradient-to-b from-blue-500 to-cyan-500" />
            输入 / 输出
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            左侧输入待处理内容，右侧查看结果；桌面端会自动并排显示，方便对照。
          </p>
        </div>
      </div>

      <div className="grid flex-1 min-h-0 gap-3 xl:grid-cols-2">
        <section className="flex min-h-0 flex-col rounded-2xl border border-blue-100 bg-white/75 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">输入</label>
              <div className="text-[11px] text-slate-500">
                支持文本、HEX、ASCII；从文件导入时会自动转成 HEX。
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }

                  importHexFromFile(file);
                  event.currentTarget.value = '';
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-lg bg-white/80 p-1.5 text-blue-600 ring-1 ring-blue-200 transition-all hover:bg-blue-50"
                title="从文件导入为 HEX"
              >
                <Upload className="h-4 w-4" />
              </button>
              <MiniSelect
                value={inputFormat}
                onChange={onInputFormatChange}
                options={formatOptions}
              />
              <span className="text-xs text-slate-400">{input.length} 字符</span>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="在这里输入需要处理的文本或二进制内容……"
            className="flex-1 min-h-[280px] w-full resize-none rounded-2xl border border-blue-200 bg-white/80 px-4 py-3 text-sm font-mono text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </section>

        <section className="flex min-h-0 flex-col rounded-2xl border border-cyan-100 bg-white/75 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">输出</label>
              <div className="text-[11px] text-slate-500">
                结果会保留格式，便于直接复制、比对和继续分析。
              </div>
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
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-blue-100 hover:text-blue-600 disabled:opacity-30"
                title="复制输出"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
              <span className="text-xs text-slate-400">{output.length} 字符</span>
            </div>
          </div>
          <div className="flex-1 min-h-[280px] w-full overflow-auto rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 px-4 py-3 text-sm font-mono text-slate-700 whitespace-pre-wrap">
            {output || <span className="text-slate-400">输出结果会显示在这里……</span>}
          </div>
        </section>
      </div>
    </div>
  );
}
