import { useState } from 'react';
import { Search, Wand2, ShieldAlert, Regex as RegexIcon } from 'lucide-react';
import { escapeRegex, generateRegex } from '@/services/api';

export function RegexPage() {
    const [escapeInput, setEscapeInput] = useState('');
    const [escapeOutput, setEscapeOutput] = useState('');

    // Generator options
    const [includeDigits, setIncludeDigits] = useState(false);
    const [includeLower, setIncludeLower] = useState(false);
    const [includeUpper, setIncludeUpper] = useState(false);
    const [customChars, setCustomChars] = useState('');
    const [excludeChars, setExcludeChars] = useState('');
    const [generatedPattern, setGeneratedPattern] = useState('');

    const [isProcessing, setIsProcessing] = useState(false);

    const handleEscape = async () => {
        if (!escapeInput.trim()) return;
        setIsProcessing(true);
        try {
            const result = await escapeRegex(escapeInput);
            setEscapeOutput(result);
        } catch (e: any) {
            setEscapeOutput(`[错误] ${e.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleGenerate = async () => {
        setIsProcessing(true);
        try {
            const result = await generateRegex({
                include_digits: includeDigits,
                include_lower: includeLower,
                include_upper: includeUpper,
                custom_chars: customChars,
                exclude_chars: excludeChars,
            });
            setGeneratedPattern(result);
        } catch (e: any) {
            setGeneratedPattern(`[错误] ${e.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 rounded-full border border-blue-200/50 backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <h1 className="text-3xl text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">正则工具</h1>
                </div>
                <p className="mt-4 text-gray-500 ml-6">正则表达式工具箱</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Regex Escape Tool */}
                <div className="bg-white/50 backdrop-blur-md rounded-3xl p-6 ring-1 ring-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                            <ShieldAlert className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-gray-800">正则转义</h3>
                            <p className="text-xs text-gray-500">转义特殊字符</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-600 mb-1 block">输入文本</label>
                            <input
                                type="text"
                                value={escapeInput}
                                onChange={(e) => setEscapeInput(e.target.value)}
                                placeholder="输入需要转义的文本..."
                                className="w-full px-4 py-3 bg-white/60 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                            />
                        </div>

                        <button
                            onClick={handleEscape}
                            disabled={isProcessing || !escapeInput.trim()}
                            className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Wand2 className="w-4 h-4" />
                            转义
                        </button>

                        <div>
                            <label className="text-xs text-gray-600 mb-1 block">转义结果</label>
                            <div className="w-full px-4 py-3 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl text-sm font-mono min-h-[60px]">
                                {escapeOutput || <span className="text-gray-400">结果将显示在这里...</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Regex Generator Tool */}
                <div className="bg-white/50 backdrop-blur-md rounded-3xl p-6 ring-1 ring-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg">
                            <RegexIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-gray-800">正则生成器</h3>
                            <p className="text-xs text-gray-500">生成字符类正则表达式</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-3">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" checked={includeDigits} onChange={(e) => setIncludeDigits(e.target.checked)} className="rounded text-blue-500" />
                                数字 (0-9)
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" checked={includeLower} onChange={(e) => setIncludeLower(e.target.checked)} className="rounded text-blue-500" />
                                小写字母 (a-z)
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" checked={includeUpper} onChange={(e) => setIncludeUpper(e.target.checked)} className="rounded text-blue-500" />
                                大写字母 (A-Z)
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-600 mb-1 block">自定义字符</label>
                                <input
                                    type="text"
                                    value={customChars}
                                    onChange={(e) => setCustomChars(e.target.value)}
                                    placeholder="例如: @#$"
                                    className="w-full px-3 py-2 bg-white/60 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-600 mb-1 block">排除字符</label>
                                <input
                                    type="text"
                                    value={excludeChars}
                                    onChange={(e) => setExcludeChars(e.target.value)}
                                    placeholder="例如: 0O1l"
                                    className="w-full px-3 py-2 bg-white/60 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isProcessing}
                            className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Wand2 className="w-4 h-4" />
                            生成
                        </button>

                        <div>
                            <label className="text-xs text-gray-600 mb-1 block">生成的正则表达式</label>
                            <div className="w-full px-4 py-3 bg-gradient-to-br from-cyan-50 to-teal-50 border border-blue-200 rounded-xl text-sm font-mono min-h-[60px]">
                                {generatedPattern || <span className="text-gray-400">正则表达式将显示在这里...</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
