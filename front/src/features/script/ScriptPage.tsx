import { useState, useEffect } from 'react';
import { Plus, Play, Trash2, Edit3, Save, X, FileText, Terminal as TerminalIcon, Code, Send } from 'lucide-react';
import { getScripts, getScript, createScript, updateScript, deleteScript, Script } from '@/services/api';
import { XTermTerminal, runTerminalCommand, runTerminalInput } from '@/shared/components/XTermTerminal';
import { CodeEditor } from '@/shared/components/CodeEditor';

type RightTab = 'script' | 'terminal';

export function ScriptPage() {
    const [scripts, setScripts] = useState<Script[]>([]);
    const [selectedScript, setSelectedScript] = useState<Script | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showNewForm, setShowNewForm] = useState(false);
    const [activeTab, setActiveTab] = useState<RightTab>('script');

    // Run dialog state
    const [showRunDialog, setShowRunDialog] = useState(false);
    const [scriptParams, setScriptParams] = useState<{ label: string; value: string }[]>([]);
    const [manualInput, setManualInput] = useState('');
    const [scriptArgs, setScriptArgs] = useState('');
    const [scriptFilePath, setScriptFilePath] = useState('');

    useEffect(() => {
        loadScripts();
    }, []);

    useEffect(() => {
        if ((window as any).__openTerminalOnMount) {
            setActiveTab('terminal');
            delete (window as any).__openTerminalOnMount;
        }
        const handler = () => setActiveTab('terminal');
        window.addEventListener('open-terminal', handler);
        return () => window.removeEventListener('open-terminal', handler);
    }, []);

    const loadScripts = async () => {
        try {
            const data = await getScripts();
            setScripts(data);
        } catch (e) {
            console.error('Failed to load scripts:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!editName.trim()) return;
        try {
            const script = await createScript(editName, editContent, editDescription);
            setScripts([...scripts, script]);
            // Fetch full script to ensure content is included
            const fullScript = await getScript(script.id);
            setSelectedScript(fullScript);
            setShowNewForm(false);
            resetForm();
        } catch (e: any) {
            alert(`创建失败: ${e.message}`);
        }
    };

    const handleUpdate = async () => {
        if (!selectedScript) return;
        try {
            const updated = await updateScript(selectedScript.id, {
                name: editName,
                content: editContent,
                description: editDescription,
            });
            setScripts(scripts.map(s => s.id === updated.id ? updated : s));
            setSelectedScript(updated);
            setIsEditing(false);
        } catch (e: any) {
            alert(`更新失败: ${e.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除此脚本吗?')) return;
        try {
            await deleteScript(id);
            setScripts(scripts.filter(s => s.id !== id));
            if (selectedScript?.id === id) {
                setSelectedScript(null);
            }
        } catch (e: any) {
            alert(`删除失败: ${e.message}`);
        }
    };

    // Open run dialog and analyze script for input() calls
    const openRunDialog = async () => {
        if (!selectedScript) return;

        // Parse input() calls from script content
        const content = selectedScript.content || '';
        const inputRegex = /input\s*\(\s*['"](.+?)['"]\s*\)/g;
        const params: { label: string; value: string }[] = [];
        let match;
        while ((match = inputRegex.exec(content)) !== null) {
            params.push({ label: match[1], value: '' });
        }

        setScriptParams(params);
        setManualInput('');
        setScriptArgs('');
        setScriptFilePath('');
        setShowRunDialog(true);
    };

    const quoteArg = (value: string) => {
        if (!value) return value;
        if (/[\s"]/g.test(value)) {
            return `"${value.replace(/"/g, '\\"')}"`;
        }
        return value;
    };

    // Execute script with args and optional stdin
    const executeScript = () => {
        if (!selectedScript) return;

        setShowRunDialog(false);
        setActiveTab('terminal');

        const scriptPath = selectedScript.relative_path
            || (selectedScript.filename ? `scripts/${selectedScript.filename}` : `scripts/${selectedScript.id}.py`);

        const args = scriptArgs.trim();
        const fileArg = scriptFilePath.trim();
        const cmdParts = [quoteArg(scriptPath)];
        if (args) cmdParts.push(args);
        if (fileArg) cmdParts.push(quoteArg(fileArg));
        const command = `python ${cmdParts.join(' ')}`;

        // Build stdin lines
        let inputLines: string[] = [];
        if (scriptParams.length > 0) {
            inputLines = scriptParams.map(p => p.value);
        } else if (manualInput.trim()) {
            inputLines = manualInput.replace(/\r\n/g, '\n').split('\n');
        }

        runTerminalCommand(command);
        inputLines.forEach((line) => {
            runTerminalInput(`${line}\r\n`);
        });
    };

    const startEdit = (script: Script) => {
        setEditName(script.name);
        setEditContent(script.content);
        setEditDescription(script.description);
        setIsEditing(true);
    };

    const resetForm = () => {
        setEditName('');
        setEditContent('');
        setEditDescription('');
        setIsEditing(false);
        setShowNewForm(false);
    };

    const selectScript = async (script: Script) => {
        resetForm();
        setActiveTab('script');
        try {
            const fullScript = await getScript(script.id);
            setSelectedScript(fullScript);
        } catch (e) {
            console.error('Failed to load script:', e);
            setSelectedScript(script);
        }
    };

    return (
        <div className="h-full flex flex-col p-4">
            {/* Header */}
            <div className="mb-3 flex-shrink-0">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-cyan-500/10 via-teal-500/10 to-cyan-500/10 rounded-full border border-cyan-200/50 backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                    <h1 className="text-xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-teal-600">脚本库</h1>
                </div>
            </div>

            <div className="flex gap-3 flex-1 min-h-0">
                {/* Script List - Narrower */}
                <div className="w-48 flex-shrink-0 bg-white/50 backdrop-blur-md rounded-2xl p-3 ring-1 ring-cyan-200 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">脚本列表</span>
                        <button
                            onClick={() => { setShowNewForm(true); setSelectedScript(null); setEditName(''); setEditContent(''); setEditDescription(''); setIsEditing(false); setActiveTab('script'); }}
                            className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 text-white hover:shadow-lg transition-all"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1">
                        {isLoading ? (
                            <div className="text-center text-gray-400 py-4 text-xs">加载中...</div>
                        ) : scripts.length === 0 ? (
                            <div className="text-center text-gray-400 py-4 text-xs">暂无脚本</div>
                        ) : (
                            scripts.map((script) => (
                                <button
                                    key={script.id}
                                    onClick={() => selectScript(script)}
                                    className={`w-full text-left p-2 rounded-lg transition-all text-xs ${selectedScript?.id === script.id
                                        ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg'
                                        : 'bg-white/60 hover:bg-white hover:shadow-md ring-1 ring-cyan-100'
                                        }`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <FileText className="w-3 h-3 flex-shrink-0" />
                                        <span className="font-medium truncate">{script.name}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel with Tabs */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Tab Bar */}
                    <div className="flex gap-1 mb-2 bg-white/50 backdrop-blur-md rounded-lg p-1 ring-1 ring-cyan-200 w-fit flex-shrink-0">
                        <button
                            onClick={() => setActiveTab('script')}
                            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all ${activeTab === 'script'
                                ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow'
                                : 'text-gray-600 hover:bg-white/80'
                                }`}
                        >
                            <Code className="w-3 h-3" />
                            脚本编辑
                        </button>
                        <button
                            onClick={() => setActiveTab('terminal')}
                            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all ${activeTab === 'terminal'
                                ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow'
                                : 'text-gray-600 hover:bg-white/80'
                                }`}
                        >
                            <TerminalIcon className="w-3 h-3" />
                            终端
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 min-h-0">
                        <div className={activeTab === 'terminal' ? 'h-full' : 'hidden'}>
                            <XTermTerminal />
                        </div>
                        <div className={activeTab === 'script' ? 'h-full bg-white/50 backdrop-blur-md rounded-2xl p-4 ring-1 ring-cyan-200 flex flex-col' : 'hidden'}>
                                {showNewForm ? (
                                    <div className="flex flex-col h-full">
                                        <h3 className="text-sm font-medium text-gray-800 mb-2">新建脚本</h3>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder="脚本名称"
                                            className="w-full px-3 py-1.5 mb-2 bg-white/60 border border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                                        />
                                        <input
                                            type="text"
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            placeholder="描述 (可选)"
                                            className="w-full px-3 py-1.5 mb-2 bg-white/60 border border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                                        />
                                        <div className="mb-2 flex-1 min-h-0">
                                            <CodeEditor value={editContent} onChange={setEditContent} height="100%" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handleCreate} className="flex-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-1">
                                                <Save className="w-3.5 h-3.5" /> 保存
                                            </button>
                                            <button onClick={resetForm} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all flex items-center gap-1 text-sm">
                                                <X className="w-3.5 h-3.5" /> 取消
                                            </button>
                                        </div>
                                    </div>
                                ) : selectedScript ? (
                                    <div className="flex flex-col h-full">
                                        {isEditing ? (
                                            <>
                                                <div className="flex gap-2 mb-2">
                                                    <input
                                                        type="text"
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        placeholder="脚本名称"
                                                        className="flex-1 px-3 py-1.5 bg-white/60 border border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm font-medium"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={editDescription}
                                                        onChange={(e) => setEditDescription(e.target.value)}
                                                        placeholder="描述 (可选)"
                                                        className="flex-[2] px-3 py-1.5 bg-white/60 border border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                                                    />
                                                </div>
                                                <div className="mb-2 flex-1 min-h-0">
                                                    <CodeEditor value={editContent} onChange={setEditContent} height="100%" />
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={resetForm} className="px-4 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all flex items-center gap-1 text-sm">
                                                        <X className="w-3.5 h-3.5" /> 取消
                                                    </button>
                                                    <button onClick={handleUpdate} className="px-6 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-1">
                                                        <Save className="w-3.5 h-3.5" /> 保存
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                                                    <div>
                                                        <h3 className="text-base font-medium text-gray-800">{selectedScript.name}</h3>
                                                        {selectedScript.description && <p className="text-xs text-gray-500">{selectedScript.description}</p>}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => startEdit(selectedScript)} className="p-1.5 rounded-lg hover:bg-cyan-100 text-gray-600 hover:text-cyan-600 transition-all">
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => handleDelete(selectedScript.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-gray-600 hover:text-red-600 transition-all">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={openRunDialog} className="px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-1">
                                                            <Play className="w-3 h-3" fill="currentColor" />
                                                            运行
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-h-0">
                                                    <CodeEditor value={selectedScript.content || ''} onChange={() => { }} readOnly height="100%" />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">
                                        <div className="text-center">
                                            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">选择一个脚本或创建新脚本</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                    </div>
                </div>
            </div>

            {/* Run Dialog */}
            {showRunDialog && selectedScript && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-[450px] max-h-[80vh] overflow-auto shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                                <Play className="w-5 h-5 text-white" fill="currentColor" />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-gray-800">运行脚本</h3>
                                <p className="text-xs text-gray-500">{selectedScript.name}</p>
                            </div>
                        </div>

                        {scriptParams.length > 0 ? (
                            <div className="space-y-3 mb-4">
                                <p className="text-sm text-gray-600">检测到以下输入参数:</p>
                                {scriptParams.map((param, idx) => (
                                    <div key={idx}>
                                        <label className="text-sm text-gray-700 mb-1 block">{param.label}</label>
                                        <input
                                            type="text"
                                            value={param.value}
                                            onChange={(e) => {
                                                const newParams = [...scriptParams];
                                                newParams[idx].value = e.target.value;
                                                setScriptParams(newParams);
                                            }}
                                            placeholder={`输入 ${param.label}`}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono text-sm"
                                        />
                                    </div>
                                ))}
                                <div className="px-3 py-2 bg-cyan-50 rounded-lg text-xs text-cyan-700">
                                    参数将通过标准输入发送给脚本
                                </div>
                            </div>
                        ) : (
                            <div className="mb-4">
                                <label className="text-sm text-gray-700 mb-1 block">输入参数 (可选)</label>
                                <textarea
                                    value={manualInput}
                                    onChange={(e) => setManualInput(e.target.value)}
                                    placeholder="脚本未检测到 input() 调用&#10;如需输入请在此手动填写，多行输入用换行分隔"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono text-sm resize-none h-24"
                                />
                                <div className="mt-2 px-3 py-2 bg-amber-50 rounded-lg text-xs text-amber-700">
                                    留空则直接运行，可在终端中交互
                                </div>
                            </div>
                        )}

                        <div className="space-y-3 mb-4">
                            <div>
                                <label className="text-sm text-gray-700 mb-1 block">命令行参数</label>
                                <input
                                    type="text"
                                    value={scriptArgs}
                                    onChange={(e) => setScriptArgs(e.target.value)}
                                    placeholder="例如: -a 1 -b 2"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-700 mb-1 block">文件路径 (可选)</label>
                                <input
                                    type="text"
                                    value={scriptFilePath}
                                    onChange={(e) => setScriptFilePath(e.target.value)}
                                    placeholder="例如: C:\\path\\to\\input.bin"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono text-sm"
                                />
                            </div>
                            <div className="px-3 py-2 bg-slate-50 rounded-lg text-xs text-slate-700">
                                执行方式: python script.py [args] [file]
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={executeScript}
                                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                            >
                                <Send className="w-4 h-4" />
                                运行
                            </button>
                            <button
                                onClick={() => setShowRunDialog(false)}
                                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
