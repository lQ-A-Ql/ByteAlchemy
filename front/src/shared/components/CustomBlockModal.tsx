
import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { BlockDefinition, BlocksData } from '@/services/api';

interface CustomBlockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (block: BlockDefinition) => void;
    categories: BlocksData['categories'];
}

export function CustomBlockModal({ isOpen, onClose, onSave, categories }: CustomBlockModalProps) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('custom');
    const [code, setCode] = useState('');
    const [params, setParams] = useState<{ name: string; label: string; type: string; default: string }[]>([]);

    if (!isOpen) return null;

    const handleAddParam = () => {
        setParams([...params, { name: '', label: '', type: 'text', default: '' }]);
    };

    const handleParamChange = (index: number, field: string, value: string) => {
        const newParams = [...params];
        (newParams[index] as any)[field] = value;
        setParams(newParams);
    };

    const handleRemoveParam = (index: number) => {
        setParams(params.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!name || !code) return;

        const imports = extractImports(code);

        const blockDef: BlockDefinition = {
            name,
            category,
            code,
            params: params,
            imports: imports,
        };
        onSave(blockDef);
        onClose();
        // Reset
        setName('');
        setCode('');
        setParams([]);
        setCategory('custom');
    };

    const extractImports = (codeStr: string): string[] => {
        const imports: Set<string> = new Set();
        const lines = codeStr.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('import ')) {
                const parts = trimmed.substring(7).split(',');
                parts.forEach(p => imports.add(p.trim().split(' ')[0]));
            } else if (trimmed.startsWith('from ')) {
                const parts = trimmed.split(/\s+/);
                if (parts.length > 1) {
                    imports.add(parts[1]);
                }
            }
        }
        return Array.from(imports);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800">新建自定义积木</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">积木名称</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                                placeholder="例如: My Encryption"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                            >
                                {Object.entries(categories).map(([id, cat]) => (
                                    <option key={id} value={id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Parameters */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">参数列表</label>
                            <button onClick={handleAddParam} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium">
                                <Plus className="w-3 h-3" /> 添加参数
                            </button>
                        </div>
                        <div className="space-y-2">
                            {params.map((param, idx) => (
                                <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <input
                                        placeholder="变量名(如 key)"
                                        value={param.name}
                                        onChange={(e) => handleParamChange(idx, 'name', e.target.value)}
                                        className="w-1/4 px-2 py-1 text-xs border rounded"
                                    />
                                    <input
                                        placeholder="显示标签"
                                        value={param.label}
                                        onChange={(e) => handleParamChange(idx, 'label', e.target.value)}
                                        className="w-1/4 px-2 py-1 text-xs border rounded"
                                    />
                                    <select
                                        value={param.type}
                                        onChange={(e) => handleParamChange(idx, 'type', e.target.value)}
                                        className="w-1/5 px-2 py-1 text-xs border rounded"
                                    >
                                        <option value="text">文本</option>
                                        <option value="number">数字</option>
                                        <option value="hex">HEX</option>
                                    </select>
                                    <input
                                        placeholder="默认值"
                                        value={param.default}
                                        onChange={(e) => handleParamChange(idx, 'default', e.target.value)}
                                        className="flex-1 px-2 py-1 text-xs border rounded"
                                    />
                                    <button onClick={() => handleRemoveParam(idx)} className="text-red-400 hover:text-red-600">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {params.length === 0 && <div className="text-xs text-gray-400 text-center py-2">无参数</div>}
                        </div>
                    </div>

                    {/* Code Template */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">代码模板 (使用 {`{param_name}`} 引用参数)</label>
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full h-32 px-3 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                            placeholder="import os&#10;data = os.urandom({length})"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                            提示: 系统会自动从代码中提取 'import' 语句 (例如: import os)，并在生成完整代码时将其置顶。
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200">取消</button>
                    <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md">保存积木</button>
                </div>
            </div>
        </div>
    );
}
