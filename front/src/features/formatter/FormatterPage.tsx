import { useState } from 'react';
import { FileJson, Wand2 } from 'lucide-react';
import { formatCode } from '@/services/api';

const formatOptions = [
    { value: 'json', label: 'JSON', icon: '📦' },
    { value: 'xml', label: 'XML', icon: '📄' },
    { value: 'html', label: 'HTML', icon: '🌐' },
    { value: 'sql', label: 'SQL', icon: '🗃️' },
    { value: 'css', label: 'CSS', icon: '🎨' },
    { value: 'python', label: 'Python', icon: '🐍' },
];

export function FormatterPage() {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [selectedFormat, setSelectedFormat] = useState('json');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFormat = async () => {
        if (!input.trim()) {
            setError('请输入需要格式化的代码');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const result = await formatCode(selectedFormat, input);
            setOutput(result);
        } catch (e: any) {
            setOutput(`[错误] ${e.message}`);
            setError(e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-500/10 via-violet-500/10 to-purple-500/10 rounded-full border border-purple-200/50 backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                    <h1 className="text-3xl text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600">代码格式化</h1>
                </div>
                <p className="mt-4 text-gray-500 ml-6">让代码更优雅整洁</p>
            </div>

            {/* Format Selection */}
            <div className="mb-6 flex items-center gap-4">
                <span className="text-sm text-gray-600">格式类型:</span>
                <div className="flex gap-2">
                    {formatOptions.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setSelectedFormat(opt.value)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${selectedFormat === opt.value
                                    ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg'
                                    : 'bg-white/60 text-gray-600 hover:bg-white hover:shadow-md ring-1 ring-purple-100'
                                }`}
                        >
                            {opt.icon} {opt.label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleFormat}
                    disabled={isProcessing}
                    className="ml-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 flex items-center gap-2"
                >
                    <Wand2 className="w-4 h-4" />
                    {isProcessing ? '处理中...' : '格式化'}
                </button>
            </div>

            {error && (
                <div className="mb-4 text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">
                    {error}
                </div>
            )}

            {/* Editor Panels */}
            <div className="grid grid-cols-2 gap-6">
                {/* Input Panel */}
                <div className="bg-white/50 backdrop-blur-md rounded-3xl ring-1 ring-purple-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-purple-100 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">输入</span>
                        <span className="text-xs text-gray-400">{input.length} 字符</span>
                    </div>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="在此粘贴需要格式化的代码..."
                        className="w-full h-80 p-6 bg-transparent resize-none focus:outline-none font-mono text-sm text-gray-700"
                    />
                </div>

                {/* Output Panel */}
                <div className="bg-white/50 backdrop-blur-md rounded-3xl ring-1 ring-purple-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-purple-100 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">输出</span>
                        <span className="text-xs text-gray-400">{output.length} 字符</span>
                    </div>
                    <div className="w-full h-80 p-6 overflow-auto font-mono text-sm text-gray-700 whitespace-pre-wrap">
                        {output || <span className="text-gray-400">格式化结果将显示在此处...</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}
