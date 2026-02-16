
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Puzzle, Play, Copy, Check, Trash2, ChevronRight, ChevronDown, Plus, CornerDownRight, MoreHorizontal, ArrowLeft, RefreshCw } from 'lucide-react';
import { getKeyBlocks, generateKeyCode, executeKeyCode, parseKeyCode, BlocksData, BlockDefinition } from '@/services/api';
import { CodeEditor } from '@/shared/components/CodeEditor';
import { MiniSelect } from '@/shared/components/CustomSelect';
import { CustomBlockModal } from '@/shared/components/CustomBlockModal';
import { saveCustomBlock, deleteCustomBlock } from '@/services/api';

// 积木块实例
interface BlockInstance {
    id: string;
    block_id: string;
    params: Record<string, any>;
    children?: BlockInstance[];
}

export function KeyReconstructPage() {
    const [blocksData, setBlocksData] = useState<BlocksData | null>(null);
    const [chain, setChain] = useState<BlockInstance[]>([]);
    const [generatedCode, setGeneratedCode] = useState('# 从左侧拖入积木块开始构建...');
    const [inputHex, setInputHex] = useState('');
    const [inputFormat, setInputFormat] = useState<'hex' | 'utf8' | 'number'>('hex');
    const [outputResult, setOutputResult] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);

    // Expanded categories state
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        malware: true, // New category open by default
        crypto: false,
        input: true,
        transform: false,
        bitwise: false,
        sbox: false,
        ctypes: false,
        loop: false,
        function: false,
        variable: false,
        custom: false,
    });

    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false); // User is typing code manually
    const [isParsing, setIsParsing] = useState(false); // System is parsing code to blocks
    const [blockSearch, setBlockSearch] = useState('');
    const [templateName, setTemplateName] = useState('');
    const [savedTemplates, setSavedTemplates] = useState<Array<{ id: string; name: string; blocks: any[] }>>([]);

    // Custom Block Modal
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Flag to prevent code regeneration when syncing from code -> blocks
    const shouldSkipRegenerate = useRef(false);

    // Selection state for insertion target
    const [selection, setSelection] = useState<{ id: string | null; position: 'after' | 'inside' }>({
        id: null,
        position: 'after'
    });

    const defaultTemplates = useMemo(() => ([
        {
            id: 'xor_reverse',
            name: 'XOR + Reverse',
            blocks: [
                { block_id: 'input_hex', params: { hex_string: '00112233' } },
                { block_id: 'xor_key', params: { key: 'DEADBEEF' } },
                { block_id: 'reverse_bytes', params: {} },
                { block_id: 'return_hex', params: { var_name: 'data' } },
            ],
        },
        {
            id: 'pbkdf2_chain',
            name: 'PBKDF2 + SHA256',
            blocks: [
                { block_id: 'input_string', params: { text: 'password' } },
                { block_id: 'pbkdf2_sha256', params: { salt_hex: '00112233', iterations: '1000', dklen: '32' } },
                { block_id: 'return_hex', params: { var_name: 'data' } },
            ],
        },
        {
            id: 'crc32_chain',
            name: 'CRC32 + Int->Hex',
            blocks: [
                { block_id: 'input_string', params: { text: 'Hello' } },
                { block_id: 'crc32', params: {} },
                { block_id: 'int_to_bytes', params: { length: '4', byteorder: 'big' } },
                { block_id: 'hex_encode', params: {} },
                { block_id: 'return_data', params: { var_name: 'data' } },
            ],
        },
    ]), []);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('keyreconstruct_templates');
            if (raw) setSavedTemplates(JSON.parse(raw));
        } catch {
            setSavedTemplates([]);
        }
    }, []);

    const persistTemplates = (list: Array<{ id: string; name: string; blocks: any[] }>) => {
        setSavedTemplates(list);
        localStorage.setItem('keyreconstruct_templates', JSON.stringify(list));
    };

    // 加载积木块定义
    const fetchBlocks = useCallback(() => {
        getKeyBlocks().then(setBlocksData).catch(console.error);
    }, []);

    useEffect(() => {
        fetchBlocks();
    }, [fetchBlocks]);

    const handleSaveCustomBlock = async (blockDef: BlockDefinition) => {
        const blockId = `custom_${Date.now()}`;
        const success = await saveCustomBlock(blockId, blockDef);
        if (success) {
            fetchBlocks();
        } else {
            alert("保存失败");
        }
    };

    const handleDeleteCustomBlock = async (e: React.MouseEvent, blockId: string) => {
        e.stopPropagation();
        if (!confirm("确定要删除这个自定义积木吗？")) return;
        const success = await deleteCustomBlock(blockId);
        if (success) {
            fetchBlocks();
        } else {
            alert("删除失败");
        }
    };

    // 生成代码 (Block -> Code)
    // Only run if NOT editing manually to avoid overwriting user input
    const regenerateCode = useCallback(async () => {
        if (isEditing) return;

        // If we just synced from code, skip this regeneration to preserve user's formatting
        if (shouldSkipRegenerate.current) {
            shouldSkipRegenerate.current = false;
            return;
        }

        if (chain.length === 0) {
            if (generatedCode !== '# 从左侧拖入积木块开始构建...') {
                setGeneratedCode('# 从左侧拖入积木块开始构建...');
            }
            return;
        }
        try {
            const code = await generateKeyCode(chain);
            setGeneratedCode(code);
        } catch (e: any) {
            setGeneratedCode(`# 生成错误: ${e.message}`);
        }
    }, [chain, isEditing]);

    useEffect(() => {
        regenerateCode();
    }, [regenerateCode]);

    // Handle manual code editing (Code -> Block)
    const handleCodeChange = (newCode: string) => {
        setGeneratedCode(newCode);
        setIsEditing(true);
    };

    const syncToBlocks = async () => {
        setIsParsing(true);
        try {
            const newChain = await parseKeyCode(generatedCode);
            // Set flag to skip the next regeneration effect
            shouldSkipRegenerate.current = true;
            setChain(newChain);
            setIsEditing(false);
        } catch (e: any) {
            console.error("Parse error:", e);
            // Optionally set outputResult to error
            setOutputResult(`解析错误: ${e.message || e}`);
        }
        setIsParsing(false);
    };

    // Recursively insert block
    const insertBlock = (list: BlockInstance[], newBlock: BlockInstance): { list: BlockInstance[], inserted: boolean } => {
        if (selection.id === null) {
            return { list: [...list, newBlock], inserted: true };
        }

        const newList = [...list];
        for (let i = 0; i < newList.length; i++) {
            const block = newList[i];

            if (block.id === selection.id) {
                if (selection.position === 'inside' && blocksData?.blocks[block.block_id]?.is_container) {
                    const newChildren = [...(block.children || []), newBlock];
                    newList[i] = { ...block, children: newChildren };
                    return { list: newList, inserted: true };
                } else {
                    newList.splice(i + 1, 0, newBlock);
                    return { list: newList, inserted: true };
                }
            }

            if (block.children) {
                const { list: newChildren, inserted } = insertBlock(block.children, newBlock);
                if (inserted) {
                    newList[i] = { ...block, children: newChildren };
                    return { list: newList, inserted: true };
                }
            }
        }
        return { list, inserted: false };
    };

    // 添加积木块
    const addBlock = (blockId: string) => {
        if (!blocksData) return;
        const blockDef = blocksData.blocks[blockId];
        if (!blockDef) return;

        // Force exit editing mode to accept block addition
        if (isEditing) {
            setIsEditing(false);
        }

        const newBlock: BlockInstance = {
            id: `${blockId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            block_id: blockId,
            params: {},
        };

        for (const param of blockDef.params) {
            newBlock.params[param.name] = param.default || '';
        }

        if (blockDef.is_container) {
            newBlock.children = [];
        }

        if (selection.id === null) {
            setChain(prev => [...prev, newBlock]);
        } else {
            const { list, inserted } = insertBlock(chain, newBlock);
            if (inserted) {
                setChain(list);
            } else {
                setChain(prev => [...prev, newBlock]);
            }
        }
    };

    const buildBlockInstance = (blockId: string, overrideParams?: Record<string, any>): BlockInstance | null => {
        if (!blocksData) return null;
        const blockDef = blocksData.blocks[blockId];
        if (!blockDef) return null;
        const params: Record<string, any> = {};
        for (const param of blockDef.params) {
            params[param.name] = param.default || '';
        }
        return {
            id: `${blockId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            block_id: blockId,
            params: { ...params, ...(overrideParams || {}) },
            children: blockDef.is_container ? [] : undefined,
        };
    };

    const applyTemplate = (templateId: string) => {
        const template = [...defaultTemplates, ...savedTemplates].find((t) => t.id === templateId);
        if (!template) return;
        const buildTree = (nodes: any[]): BlockInstance[] =>
            nodes
                .map((b) => {
                    const base = buildBlockInstance(b.block_id, b.params);
                    if (!base) return null;
                    if (b.children && b.children.length > 0) {
                        base.children = buildTree(b.children);
                    }
                    return base;
                })
                .filter((b): b is BlockInstance => Boolean(b));

        const newChain = buildTree(template.blocks);
        setChain(newChain);
        setSelection({ id: null, position: 'after' });
        setIsEditing(false);
    };

    const serializeChain = (nodes: BlockInstance[]): any[] =>
        nodes.map((b) => ({
            block_id: b.block_id,
            params: b.params,
            children: b.children ? serializeChain(b.children) : undefined,
        }));

    const saveTemplate = () => {
        if (!templateName.trim()) return;
        const entry = {
            id: `tpl_${Date.now()}`,
            name: templateName.trim(),
            blocks: serializeChain(chain),
        };
        persistTemplates([...savedTemplates, entry]);
        setTemplateName('');
    };

    const deleteTemplate = (id: string) => {
        persistTemplates(savedTemplates.filter((t) => t.id !== id));
    };

    const deleteBlockRecursive = (list: BlockInstance[], id: string): BlockInstance[] => {
        return list.filter(b => b.id !== id).map(b => ({
            ...b,
            children: b.children ? deleteBlockRecursive(b.children, id) : undefined
        }));
    };

    const removeBlock = (id: string) => {
        if (isEditing) setIsEditing(false);
        setChain(deleteBlockRecursive(chain, id));
        if (selection.id === id) {
            setSelection({ id: null, position: 'after' });
        }
    };

    const updateParamsRecursive = (list: BlockInstance[], id: string, params: Record<string, any>): BlockInstance[] => {
        return list.map(b => {
            if (b.id === id) return { ...b, params };
            if (b.children) return { ...b, children: updateParamsRecursive(b.children, id, params) };
            return b;
        });
    };

    const updateBlockParams = (id: string, params: Record<string, any>) => {
        if (isEditing) setIsEditing(false);
        setChain(updateParamsRecursive(chain, id, params));
    };

    const moveBlockRecursive = (list: BlockInstance[], id: string, direction: -1 | 1): { list: BlockInstance[], moved: boolean } => {
        const index = list.findIndex(b => b.id === id);
        if (index !== -1) {
            const newIndex = index + direction;
            if (newIndex >= 0 && newIndex < list.length) {
                const newList = [...list];
                const [removed] = newList.splice(index, 1);
                newList.splice(newIndex, 0, removed);
                return { list: newList, moved: true };
            }
            return { list, moved: true };
        }
        const newList = [...list];
        for (let i = 0; i < newList.length; i++) {
            if (newList[i].children) {
                const { list: newChildren, moved } = moveBlockRecursive(newList[i].children || [], id, direction);
                if (moved) {
                    newList[i] = { ...newList[i], children: newChildren };
                    return { list: newList, moved: true };
                }
            }
        }
        return { list, moved: false };
    };

    const moveBlock = (id: string, direction: -1 | 1) => {
        if (isEditing) setIsEditing(false);
        const { list } = moveBlockRecursive(chain, id, direction);
        setChain(list);
    };

    const executeCode = async () => {
        setIsExecuting(true);
        try {
            // Convert input based on format
            let hexInput = inputHex;
            if (inputFormat === 'utf8') {
                // Convert UTF-8 string to hex
                const encoder = new TextEncoder();
                const bytes = encoder.encode(inputHex);
                hexInput = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
            } else if (inputFormat === 'number') {
                // Convert number to hex (big-endian)
                const num = parseInt(inputHex, 10);
                if (!isNaN(num)) {
                    // Handle as unsigned 32-bit or larger
                    if (num < 0) {
                        hexInput = (num >>> 0).toString(16).padStart(8, '0');
                    } else {
                        hexInput = num.toString(16);
                        if (hexInput.length % 2 !== 0) hexInput = '0' + hexInput;
                    }
                } else {
                    hexInput = '';
                }
            }
            const result = await executeKeyCode(generatedCode, hexInput);
            if (result.success) {
                setOutputResult(result.result || '');
            } else {
                setOutputResult(`错误: ${result.error}`);
            }
        } catch (e: any) {
            setOutputResult(`执行错误: ${e.message}`);
        }
        setIsExecuting(false);
    };

    const copyCode = () => {
        navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    if (!blocksData) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin text-indigo-500 mr-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </div>
                <div className="text-gray-400">加载积木定义...</div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-4">
            {/* Header */}
            <div className="mb-3 flex-shrink-0 flex justify-between items-center">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-red-500/10 via-indigo-500/10 to-red-500/10 rounded-full border border-red-200/50 backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <h1 className="text-xl text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-indigo-600">密钥重构 (Malware Analysis Mode)</h1>
                </div>
                <div className="text-xs text-gray-500 flex gap-2">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-indigo-500"></span>选中</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-indigo-100 border border-indigo-500 border-dashed"></span>内部</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded border-b-2 border-indigo-500"></span>下方</span>
                </div>
            </div>

            <div className="flex gap-3 flex-1 min-h-0">
                {/* Left: Toolbox */}
                <div className="w-56 flex-shrink-0 bg-white/50 backdrop-blur-md rounded-2xl p-3 ring-1 ring-gray-200 overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Puzzle className="w-4 h-4 text-indigo-500" />
                            积木工具箱
                        </h3>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="text-xs flex items-center gap-1 text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                        >
                            <Plus className="w-3 h-3" /> 新建
                        </button>
                    </div>
                    <div className="mb-2 space-y-2">
                        <input
                            value={blockSearch}
                            onChange={(e) => setBlockSearch(e.target.value)}
                            placeholder="搜索积木..."
                            className="w-full px-2 py-1.5 text-xs bg-white/70 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">模板</span>
                            <div className="flex-1">
                                <MiniSelect
                                    value={''}
                                    onChange={(v) => applyTemplate(v)}
                                    options={[...defaultTemplates, ...savedTemplates].map(t => ({ value: t.id, label: t.name }))}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="保存当前为模板"
                                className="flex-1 px-2 py-1.5 text-xs bg-white/70 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            <button
                                onClick={saveTemplate}
                                disabled={!templateName.trim() || chain.length === 0}
                                className="px-2 py-1.5 text-xs rounded-lg bg-indigo-500 text-white shadow hover:bg-indigo-600 disabled:opacity-40"
                            >
                                保存
                            </button>
                        </div>
                        {savedTemplates.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                                {savedTemplates.map((t) => (
                                    <span key={t.id} className="inline-flex items-center gap-1">
                                        {t.name}
                                        <button
                                            onClick={() => deleteTemplate(t.id)}
                                            className="text-[10px] text-rose-500 hover:text-rose-600"
                                            title="删除模板"
                                        >
                                            删除
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {Object.entries(blocksData.categories).map(([catId, cat]) => (
                            <div key={catId} className="select-none">
                                <button
                                    onClick={() => toggleCategory(catId)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/50 transition-colors text-left"
                                >
                                    {expandedCategories[catId] ? (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    )}
                                    <div
                                        className="w-3 h-3 rounded"
                                        style={{ backgroundColor: cat.color }}
                                    />
                                    <span className="text-xs font-medium text-gray-700">{cat.name}</span>
                                </button>
                                {expandedCategories[catId] && (
                                    <div className="ml-6 space-y-1 mt-1">
                                        {Object.entries(blocksData.blocks)
                                            .filter(([_, b]) => b.category === catId)
                                            .filter(([_, b]) => !blockSearch || b.name.toLowerCase().includes(blockSearch.toLowerCase()))
                                            .map(([blockId, block]) => (
                                                <button
                                                    key={blockId}
                                                    onClick={() => addBlock(blockId)}
                                                    className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-left transition-all duration-200 hover:scale-105 active:scale-95 group relative"
                                                    style={{
                                                        backgroundColor: `${blocksData.categories[block.category].color}10`,
                                                        borderLeft: `2px solid ${blocksData.categories[block.category].color}`,
                                                    }}
                                                >
                                                    <Plus className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
                                                    <span className="text-xs text-gray-700 truncate flex-1">{block.name}</span>
                                                    {(block as any).is_custom && (
                                                        <span
                                                            onClick={(e) => handleDeleteCustomBlock(e, blockId)}
                                                            className="p-1 rounded-full hover:bg-red-100 text-gray-300 hover:text-red-500 transition-colors"
                                                            title="删除自定义积木"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Middle: Canvas */}
                <div
                    className="w-[450px] flex-shrink-0 bg-white/50 backdrop-blur-md rounded-2xl p-3 ring-1 ring-gray-200 flex flex-col min-w-0"
                    onClick={() => setSelection({ id: null, position: 'after' })}
                >
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-gray-700">编程区域</h3>
                        <div className="flex items-center gap-2">
                            {isParsing && <span className="text-xs text-indigo-500 animate-pulse flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> 同步中...</span>}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-[200px] bg-gradient-to-br from-gray-50/50 to-gray-100/50 rounded-xl p-4 shadow-inner custom-scrollbar relative">
                        <div className="flex flex-col gap-2">
                            {chain.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                    <Puzzle className="w-8 h-8 mb-2 opacity-50" />
                                    <span className="text-sm">点击左侧积木添加</span>
                                    <span className="text-xs opacity-75 mt-1">或直接在右侧编写代码</span>
                                </div>
                            ) : (
                                chain.map((block) => (
                                    <BlockCard
                                        key={block.id}
                                        block={block}
                                        blocksData={blocksData}
                                        selection={selection}
                                        onSelect={setSelection}
                                        onRemove={removeBlock}
                                        onUpdateParams={updateBlockParams}
                                        onMove={moveBlock}
                                    />
                                ))
                            )}
                            {/* Root insertion point indicator */}
                            {selection.id === null && chain.length > 0 && (
                                <div className="h-1 bg-indigo-500/30 rounded-full mx-4 mt-1 animate-pulse" />
                            )}
                        </div>
                    </div>

                    {/* Input/Output */}
                    <div className="mt-3 flex gap-3" onClick={e => e.stopPropagation()}>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <label className="text-xs text-gray-600">输入</label>
                                <select
                                    value={inputFormat}
                                    onChange={(e) => setInputFormat(e.target.value as 'hex' | 'utf8' | 'number')}
                                    className="text-xs px-1.5 py-0.5 bg-white/60 border border-indigo-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 text-gray-600"
                                >
                                    <option value="hex">HEX</option>
                                    <option value="utf8">UTF-8</option>
                                    <option value="number">数字</option>
                                </select>
                            </div>
                            <input
                                type="text"
                                value={inputHex}
                                onChange={(e) => setInputHex(e.target.value)}
                                placeholder={inputFormat === 'hex' ? '00112233...' : inputFormat === 'utf8' ? 'Hello World' : '12345'}
                                className="w-full px-3 py-2 text-sm bg-white/60 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={executeCode}
                                disabled={isExecuting}
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                            >
                                <Play className="w-4 h-4" fill="currentColor" />
                                {isExecuting ? '执行中...' : '运行'}
                            </button>
                        </div>
                    </div>
                    {outputResult && (
                        <div className="mt-2 px-3 py-2 bg-gray-100 rounded-lg text-sm font-mono text-gray-700 break-all border border-gray-200 hover:bg-white transition-colors cursor-text">
                            {outputResult}
                        </div>
                    )}
                </div>

                {/* Right: Code Preview */}
                <div className="flex-1 min-w-0 bg-white/50 backdrop-blur-md rounded-2xl p-3 ring-1 ring-gray-200 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-gray-700">代码编辑器</h3>
                            {isEditing && (
                                <button
                                    onClick={syncToBlocks}
                                    disabled={isParsing}
                                    className="flex items-center gap-1 px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 transition-colors border border-orange-200"
                                    title="将当前代码解析覆盖到积木区域 (注意: 可能会重排代码)"
                                >
                                    {isParsing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                    同步到积木
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={copyCode}
                                className="p-1.5 rounded-lg hover:bg-indigo-100 text-gray-500 hover:text-indigo-600 transition-colors"
                                title="复制代码"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div className={`flex-1 min-h-0 bg-white rounded-xl border overflow-hidden shadow-sm transition-colors ${isEditing ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-200'}`}>
                        <CodeEditor
                            value={generatedCode}
                            onChange={handleCodeChange}
                            readOnly={false}
                            height="100%"
                            wordWrap="off"
                        />
                    </div>
                </div>
            </div>
            <style>{`
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(99, 102, 241, 0.2);
            border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(99, 102, 241, 0.4);
        }
      `}</style>
            <CustomBlockModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveCustomBlock}
                categories={blocksData.categories}
            />
        </div>
    );
}

// 递归积木组件
interface BlockCardProps {
    block: BlockInstance;
    blocksData: BlocksData;
    selection: { id: string | null; position: 'after' | 'inside' };
    onSelect: (sel: { id: string | null; position: 'after' | 'inside' }) => void;
    onRemove: (id: string) => void;
    onUpdateParams: (id: string, params: Record<string, any>) => void;
    onMove: (id: string, direction: -1 | 1) => void;
}

function BlockCard({ block, blocksData, selection, onSelect, onRemove, onUpdateParams, onMove }: BlockCardProps) {
    const blockDef = blocksData.blocks[block.block_id] || { name: "Raw Code", category: "variable", color: "#ccc", params: [] };
    const category = blocksData.categories[blockDef.category] || blocksData.categories['variable']; // fallback

    // Check Raw Code
    const isRaw = block.block_id === 'raw_code';

    const isSelected = selection.id === block.id;
    const isTargetAfter = isSelected && selection.position === 'after';
    const isTargetInside = isSelected && selection.position === 'inside';

    const handleHeaderClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect({ id: block.id, position: 'after' });
    };

    const handleBodyClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect({ id: block.id, position: 'inside' });
    };

    const updateParam = (name: string, value: any) => {
        onUpdateParams(block.id, { ...block.params, [name]: value });
    };

    return (
        <div className="flex flex-col gap-1 transition-all duration-200">
            {/* Main Block Card */}
            <div
                onClick={handleHeaderClick}
                className={`
                    group flex flex-col rounded-xl border transition-all duration-200 shadow-sm
                    ${isTargetAfter
                        ? 'ring-2 ring-indigo-500 shadow-md transform scale-[1.01]'
                        : 'border-transparent hover:border-indigo-200 hover:shadow'
                    }
                `}
                style={{
                    backgroundColor: isRaw ? '#f3f4f6' : `${category.color}15`,
                    borderLeft: `4px solid ${isRaw ? '#9CA3AF' : category.color}`,
                }}
            >
                {/* Header Row */}
                <div className="flex items-center gap-2 p-2 relative">
                    {/* Move Handle / Indicator */}
                    <div className="flex items-center gap-1 opacity-50 hover:opacity-100 cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: isRaw ? '#4B5563' : category.color }}>
                            {isRaw ? '自定义代码' : blockDef.name}
                        </span>
                        {!isRaw && (blockDef.input || blockDef.output) && (
                            <div className="flex items-center gap-1">
                                {blockDef.input && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/70 text-gray-600 border border-gray-200">in: {blockDef.input}</span>
                                )}
                                {blockDef.output && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/70 text-gray-600 border border-gray-200">out: {blockDef.output}</span>
                                )}
                            </div>
                        )}

                        {/* Parameters */}
                        {isRaw ? (
                            <div className="flex-1 ml-2">
                                <code className="text-[10px] bg-white/50 px-1 py-0.5 rounded text-gray-500 block truncate font-mono max-w-[200px]">
                                    {block.params.code}
                                </code>
                            </div>
                        ) : (
                            blockDef.params.length > 0 && (
                                <div className="flex flex-wrap gap-2 ml-2">
                                    {blockDef.params.map((param) => (
                                        <div key={param.name} className="flex items-center gap-1 bg-white/40 rounded px-1">
                                            <span className="text-[10px] text-gray-500 select-none">{param.label}</span>
                                            {param.type === 'select' ? (
                                                <div onClick={e => e.stopPropagation()}>
                                                    <MiniSelect
                                                        value={block.params[param.name] || ''}
                                                        onChange={(v) => updateParam(param.name, v)}
                                                        options={(param.options === 'sbox_list' ? blocksData.sbox_list : []).map(s => ({ value: s, label: s }))}
                                                    />
                                                </div>
                                            ) : (
                                                <input
                                                    type={param.type === 'number' ? 'number' : 'text'}
                                                    value={block.params[param.name] || ''}
                                                    onChange={(e) => updateParam(param.name, e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                    className="w-16 px-1 py-0.5 text-xs bg-white/80 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono text-gray-700"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex flex-col -space-y-1">
                            <button onClick={(e) => { e.stopPropagation(); onMove(block.id, -1); }} className="hover:text-indigo-600 p-0.5"><ChevronDown className="w-3 h-3 rotate-180" /></button>
                            <button onClick={(e) => { e.stopPropagation(); onMove(block.id, 1); }} className="hover:text-indigo-600 p-0.5"><ChevronDown className="w-3 h-3" /></button>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemove(block.id); }}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Container Body */}
                {blockDef.is_container && (
                    <div
                        className={`
                            mx-2 mb-2 p-2 rounded-lg min-h-[40px] flex flex-col gap-2 transition-colors
                            ${isTargetInside ? 'bg-indigo-50/80 border-2 border-dashed border-indigo-400' : 'bg-black/5 border border-black/5'}
                        `}
                        onClick={handleBodyClick}
                    >
                        {block.children && block.children.length > 0 ? (
                            block.children.map(child => (
                                <BlockCard
                                    key={child.id}
                                    block={child}
                                    blocksData={blocksData}
                                    selection={selection}
                                    onSelect={onSelect}
                                    onRemove={onRemove}
                                    onUpdateParams={onUpdateParams}
                                    onMove={onMove}
                                />
                            ))
                        ) : (
                            <div className="flex items-center justify-center py-2 text-xs text-gray-400/70 select-none cursor-pointer">
                                <CornerDownRight className="w-3 h-3 mr-1" />
                                {isTargetInside ? "点击左侧积木添加至此处" : "点击此处选中以添加子积木"}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Insertion Indicator */}
            {isTargetAfter && (
                <div className="h-1 bg-indigo-500/50 rounded-full mx-2 animate-pulse" />
            )}
        </div>
    );
}

function GripVertical({ className }: { className?: string }) {
    return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" />
            <circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" />
        </svg>
    )
}
