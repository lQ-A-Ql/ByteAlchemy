import { useEffect, useMemo, useState } from 'react';
import { Wrench, Search, Sparkles, Copy, Terminal, ArrowLeft, Key, Plus, Trash2 } from 'lucide-react';
import { analyzeIdaPseudocode, IdaAnalyzeResult } from '@/services/api';
import { runTerminalCommand } from '@/shared/components/XTermTerminal';

export function ToolboxPage() {
  const [view, setView] = useState<'home' | 'ida' | 'hashcat' | 'john' | 'known-plaintext'>('home');
  const [code, setCode] = useState('');
  const [result, setResult] = useState<IdaAnalyzeResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hashcatPath, setHashcatPath] = useState('');
  const [johnPath, setJohnPath] = useState('');
  const [hashcatMode, setHashcatMode] = useState('-m 0');
  const [hashcatAttack, setHashcatAttack] = useState('-a 0');
  const [hashcatFlags, setHashcatFlags] = useState({ show: false, username: false, force: false, potfileDisable: false });
  const [hashcatHashFile, setHashcatHashFile] = useState('');
  const [hashcatWordlist, setHashcatWordlist] = useState('');
  const [hashcatMask, setHashcatMask] = useState('');
  const [hashcatExtra, setHashcatExtra] = useState('');
  const [johnFormat, setJohnFormat] = useState('--format=raw-md5');
  const [johnMode, setJohnMode] = useState('--wordlist');
  const [johnFlags, setJohnFlags] = useState({ show: false, rules: false });
  const [johnHashFile, setJohnHashFile] = useState('');
  const [johnWordlist, setJohnWordlist] = useState('');
  const [johnMask, setJohnMask] = useState('');
  const [johnExtra, setJohnExtra] = useState('');
  const [terminalHint, setTerminalHint] = useState<string | null>(null);
  const [hashcatModeCustom, setHashcatModeCustom] = useState('');
  const [johnFormatCustom, setJohnFormatCustom] = useState('');
  const [knownCipherHex, setKnownCipherHex] = useState('');
  const [knownPlainHex, setKnownPlainHex] = useState('');
  const [magicPreset, setMagicPreset] = useState('custom');
  const [repeatLen, setRepeatLen] = useState('');
  const [useRepeat, setUseRepeat] = useState(true);
  const [customTools, setCustomTools] = useState<Array<{ id: string; name: string; command: string }>>([]);
  const [showToolModal, setShowToolModal] = useState(false);
  const [toolName, setToolName] = useState('');
  const [toolCommand, setToolCommand] = useState('');
  const [toolError, setToolError] = useState<string | null>(null);

  useEffect(() => {
    const loadPaths = () => {
      setHashcatPath(localStorage.getItem('tool_path_hashcat') || 'hashcat');
      setJohnPath(localStorage.getItem('tool_path_john') || 'john');
    };
    loadPaths();
    const onUpdate = () => loadPaths();
    window.addEventListener('tool-paths-update', onUpdate);
    return () => window.removeEventListener('tool-paths-update', onUpdate);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('toolbox_custom_tools');
      if (raw) setCustomTools(JSON.parse(raw));
    } catch {
      setCustomTools([]);
    }
  }, []);

  const persistCustomTools = (next: Array<{ id: string; name: string; command: string }>) => {
    setCustomTools(next);
    localStorage.setItem('toolbox_custom_tools', JSON.stringify(next));
  };

  const runAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await analyzeIdaPseudocode(code);
      setResult(res);
    } catch (e: any) {
      setError(e.message || '分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const hashcatModeOptions = [
    { label: 'MD5', value: '-m 0' },
    { label: 'SHA1', value: '-m 100' },
    { label: 'SHA256', value: '-m 1400' },
    { label: 'SHA512', value: '-m 1700' },
    { label: 'NTLM', value: '-m 1000' },
    { label: 'bcrypt', value: '-m 3200' },
    { label: 'PBKDF2-HMAC-SHA256', value: '-m 10900' },
  ];

  const hashcatTemplates = [
    { name: 'MD5 + 字典', mode: '-m 0', attack: '-a 0', flags: { show: false, username: false, force: false, potfileDisable: false } },
    { name: 'NTLM + 字典', mode: '-m 1000', attack: '-a 0', flags: { show: false, username: false, force: false, potfileDisable: false } },
    { name: 'SHA256 + 掩码', mode: '-m 1400', attack: '-a 3', flags: { show: false, username: false, force: false, potfileDisable: false } },
    { name: 'bcrypt + 字典', mode: '-m 3200', attack: '-a 0', flags: { show: false, username: false, force: false, potfileDisable: false } },
  ];

  const johnFormatOptions = [
    { label: 'MD5', value: '--format=raw-md5' },
    { label: 'SHA1', value: '--format=raw-sha1' },
    { label: 'SHA256', value: '--format=raw-sha256' },
    { label: 'SHA512', value: '--format=raw-sha512' },
    { label: 'NTLM', value: '--format=nt' },
    { label: 'bcrypt', value: '--format=bcrypt' },
    { label: 'zip', value: '--format=zip' },
  ];

  const johnTemplates = [
    { name: 'MD5 + 字典', format: '--format=raw-md5', mode: '--wordlist', flags: { show: false, rules: false } },
    { name: 'NTLM + 字典', format: '--format=nt', mode: '--wordlist', flags: { show: false, rules: false } },
    { name: 'SHA256 + 掩码', format: '--format=raw-sha256', mode: '--mask', flags: { show: false, rules: false } },
    { name: 'zip + 字典', format: '--format=zip', mode: '--wordlist', flags: { show: false, rules: false } },
  ];

  const magicPresets = [
    { id: 'custom', label: '自定义', hex: '' },
    { id: 'png', label: 'PNG', hex: '89504e470d0a1a0a' },
    { id: 'zip', label: 'ZIP', hex: '504b0304' },
    { id: 'elf', label: 'ELF', hex: '7f454c46' },
    { id: 'pe', label: 'PE', hex: '4d5a' },
    { id: 'jpg', label: 'JPEG', hex: 'ffd8ffe0' },
    { id: 'gzip', label: 'GZIP', hex: '1f8b08' },
    { id: 'pdf', label: 'PDF', hex: '25504446' },
    { id: '7z', label: '7z', hex: '377abcaf271c' },
  ];

  const hashcatCommand = useMemo(() => {
    const parts: string[] = [];
    parts.push(hashcatPath || 'hashcat');
    if (hashcatAttack) parts.push(hashcatAttack);
    const modeValue = hashcatModeCustom.trim() ? hashcatModeCustom.trim() : hashcatMode;
    if (modeValue) parts.push(modeValue);
    if (hashcatFlags.show) parts.push('--show');
    if (hashcatFlags.username) parts.push('--username');
    if (hashcatFlags.force) parts.push('--force');
    if (hashcatFlags.potfileDisable) parts.push('--potfile-disable');
    if (hashcatHashFile) parts.push(`"${hashcatHashFile}"`);
    if (hashcatAttack === '-a 0' || hashcatAttack === '-a 6') {
      if (hashcatWordlist) parts.push(`"${hashcatWordlist}"`);
    }
    if (hashcatAttack === '-a 3' || hashcatAttack === '-a 6') {
      if (hashcatMask) parts.push(hashcatMask);
    }
    if (hashcatExtra.trim()) parts.push(hashcatExtra.trim());
    return parts.join(' ');
  }, [hashcatPath, hashcatAttack, hashcatMode, hashcatModeCustom, hashcatFlags, hashcatHashFile, hashcatWordlist, hashcatMask, hashcatExtra]);

  const johnCommand = useMemo(() => {
    const parts: string[] = [];
    parts.push(johnPath || 'john');
    const formatValue = johnFormatCustom.trim() ? johnFormatCustom.trim() : johnFormat;
    if (formatValue) parts.push(formatValue);
    if (johnFlags.show) parts.push('--show');
    if (johnFlags.rules) parts.push('--rules');
    if (johnMode === '--wordlist') {
      if (johnWordlist) parts.push(`--wordlist="${johnWordlist}"`);
    }
    if (johnMode === '--mask') {
      if (johnMask) parts.push(`--mask=${johnMask}`);
    }
    if (johnMode === '--incremental') {
      parts.push('--incremental');
    }
    if (johnHashFile) parts.push(`"${johnHashFile}"`);
    if (johnExtra.trim()) parts.push(johnExtra.trim());
    return parts.join(' ');
  }, [johnPath, johnFormat, johnFormatCustom, johnMode, johnFlags, johnHashFile, johnWordlist, johnMask, johnExtra]);

  const copyCommand = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setTerminalHint('已复制命令');
    setTimeout(() => setTerminalHint(null), 1500);
  };

  const openTerminal = () => {
    (window as any).__openTerminalOnMount = true;
    window.dispatchEvent(new Event('open-terminal'));
  };

  const sendCommand = (value: string) => {
    openTerminal();
    setTimeout(() => {
      const sender = (window as any).__xtermSendCommand;
      if (!sender) {
        setTerminalHint('未连接终端，请在脚本页打开终端');
        setTimeout(() => setTerminalHint(null), 2000);
        return;
      }
      runTerminalCommand(value);
      setTerminalHint('已发送到终端');
      setTimeout(() => setTerminalHint(null), 1500);
    }, 200);
  };

  const addCustomTool = () => {
    if (!toolName.trim() || !toolCommand.trim()) {
      setToolError('名称和命令不能为空');
      return;
    }
    const next = [
      ...customTools,
      { id: `tool_${Date.now()}`, name: toolName.trim(), command: toolCommand.trim() },
    ];
    persistCustomTools(next);
    setToolName('');
    setToolCommand('');
    setToolError(null);
    setShowToolModal(false);
  };

  const removeCustomTool = (id: string) => {
    persistCustomTools(customTools.filter((t) => t.id !== id));
  };

  const runCustomTool = (command: string) => {
    openTerminal();
    setTimeout(() => {
      const sender = (window as any).__xtermSendCommand;
      if (!sender) {
        setTerminalHint('未连接终端，请在脚本页打开终端');
        setTimeout(() => setTerminalHint(null), 2000);
        return;
      }
      runTerminalCommand(command);
      setTerminalHint('已发送到终端');
      setTimeout(() => setTerminalHint(null), 1500);
    }, 200);
  };

  const cleanHex = (value: string) => value.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '').toLowerCase();
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
  const bytesToAscii = (bytes: number[]) => bytes.map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');

  const knownPlainEffective = magicPreset === 'custom'
    ? knownPlainHex
    : (magicPresets.find((p) => p.id === magicPreset)?.hex || '');

  const knownAnalysis = useMemo(() => {
    const emptyResult = {
      error: null as string | null,
      keyHex: '',
      keyRepeatHex: '',
      bestLen: 0,
      bestScore: 0,
      previewHex: '',
      previewAscii: '',
    };
    const cipherBytes = hexToBytes(knownCipherHex || '');
    const plainBytes = hexToBytes(knownPlainEffective || '');
    if (!cipherBytes || !plainBytes) return { ...emptyResult, error: 'HEX 输入不合法（需要偶数长度）' };
    if (cipherBytes.length === 0 || plainBytes.length === 0) return emptyResult;
    if (plainBytes.length > cipherBytes.length) return { ...emptyResult, error: '已知明文长度不能超过密文' };

    const keyBytes = cipherBytes.slice(0, plainBytes.length).map((b, i) => b ^ plainBytes[i]);

    const maxLen = Math.min(32, keyBytes.length);
    let bestLen = 1;
    let bestScore = 0;
    for (let len = 1; len <= maxLen; len += 1) {
      let match = 0;
      for (let i = 0; i < keyBytes.length; i += 1) {
        if (keyBytes[i] === keyBytes[i % len]) match += 1;
      }
      const score = match / keyBytes.length;
      if (score > bestScore + 0.001 || (Math.abs(score - bestScore) < 0.001 && len < bestLen)) {
        bestScore = score;
        bestLen = len;
      }
    }

    const useLen = useRepeat ? (parseInt(repeatLen, 10) || bestLen) : keyBytes.length;
    const keyRepeat = keyBytes.slice(0, useLen);
    const decryptedBytes = cipherBytes.map((b, i) => b ^ keyRepeat[i % keyRepeat.length]);

    return {
      error: null,
      keyHex: bytesToHex(keyBytes),
      keyRepeatHex: bytesToHex(keyRepeat),
      bestLen,
      bestScore,
      previewHex: bytesToHex(decryptedBytes.slice(0, 128)),
      previewAscii: bytesToAscii(decryptedBytes.slice(0, 128)),
    };
  }, [knownCipherHex, knownPlainEffective, repeatLen, useRepeat]);

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-xl">
          <Wrench className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800">工具箱</h2>
          <p className="text-sm text-gray-500">收录常用安全分析小工具</p>
        </div>
      </div>

      {view === 'home' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setView('ida')}
            className="group bg-white/70 backdrop-blur-md rounded-2xl p-5 ring-1 ring-amber-200 hover:shadow-lg transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-800">IDA 伪代码算法识别</div>
                <div className="text-xs text-gray-500">粘贴伪代码，规则识别</div>
              </div>
            </div>
          </button>
          <button
            onClick={() => setView('hashcat')}
            className="group bg-white/70 backdrop-blur-md rounded-2xl p-5 ring-1 ring-amber-200 hover:shadow-lg transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-800">Hashcat 命令生成</div>
                <div className="text-xs text-gray-500">按钮化参数与预览</div>
              </div>
            </div>
          </button>
          <button
            onClick={() => setView('john')}
            className="group bg-white/70 backdrop-blur-md rounded-2xl p-5 ring-1 ring-amber-200 hover:shadow-lg transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-800">John 命令生成</div>
                <div className="text-xs text-gray-500">按钮化参数与预览</div>
              </div>
            </div>
          </button>
          <button
            onClick={() => setView('known-plaintext')}
            className="group bg-white/70 backdrop-blur-md rounded-2xl p-5 ring-1 ring-amber-200 hover:shadow-lg transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Key className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-800">已知明文助手</div>
                <div className="text-xs text-gray-500">文件头/XOR 推断</div>
              </div>
            </div>
          </button>
          <button
            onClick={() => runCustomTool('strings -n 5')}
            className="group bg-white/70 backdrop-blur-md rounded-2xl p-5 ring-1 ring-amber-200 hover:shadow-lg transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-800">strings</div>
                <div className="text-xs text-gray-500">默认: strings -n 5</div>
              </div>
            </div>
          </button>
          <button
            onClick={() => runCustomTool('binwalk')}
            className="group bg-white/70 backdrop-blur-md rounded-2xl p-5 ring-1 ring-amber-200 hover:shadow-lg transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-800">binwalk</div>
                <div className="text-xs text-gray-500">默认: binwalk</div>
              </div>
            </div>
          </button>
          </div>

          <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 ring-1 ring-amber-200">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-700">自定义工具</div>
              <button
                onClick={() => setShowToolModal(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> 导入工具
              </button>
            </div>
            {customTools.length === 0 ? (
              <div className="text-xs text-gray-500">暂无自定义工具</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {customTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => runCustomTool(tool.command)}
                    className="group bg-white/80 rounded-xl p-3 ring-1 ring-amber-100 hover:ring-amber-300 hover:shadow-md transition-all text-left relative"
                  >
                    <div className="text-xs font-medium text-gray-800 truncate">{tool.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">{tool.command}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomTool(tool.id);
                      }}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      title="删除"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </button>
                ))}
              </div>
            )}
            {terminalHint && <div className="mt-2 text-xs text-gray-500">{terminalHint}</div>}
          </div>
        </div>
      )}

      {view === 'ida' && (
        <div className="space-y-4">
          <button
            onClick={() => setView('home')}
            className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4" /> 返回工具箱
          </button>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-0">
            <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 ring-1 ring-amber-200 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-medium text-gray-700">IDA 伪代码算法识别</h3>
                </div>
                <button
                  onClick={runAnalyze}
                  disabled={isAnalyzing || !code.trim()}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium shadow hover:shadow-md transition-all disabled:opacity-50"
                >
                  {isAnalyzing ? '分析中...' : '开始分析'}
                </button>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="粘贴IDA伪代码..."
                className="flex-1 min-h-[200px] w-full px-3 py-2 bg-white/80 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono text-xs"
              />
              <div className="mt-2 text-[10px] text-gray-500">
                支持从IDA插件/剪贴板粘贴伪代码；规则匹配结果需要人工验证
              </div>
              {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
            </div>

            <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 ring-1 ring-amber-200 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-medium text-gray-700">识别结果</h3>
              </div>
              {!result ? (
                <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
                  结果将显示在这里
                </div>
              ) : (
                <div className="flex-1 overflow-auto space-y-3 text-xs">
                  <div className="px-3 py-2 rounded-lg bg-amber-50 text-amber-700">
                    {result.summary}
                  </div>
                  {result.matches.length === 0 ? (
                    <div className="text-gray-500">未检测到明显特征</div>
                  ) : (
                    result.matches.map((m) => (
                      <div key={m.name} className="border border-amber-200 rounded-lg p-3 bg-white">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800">{m.name}</span>
                          <span className="text-amber-600">{Math.round(m.confidence * 100)}%</span>
                        </div>
                        <div className="mt-2 text-[10px] text-gray-600">证据: {m.evidence.join(' | ')}</div>
                        <div className="mt-2 text-[10px] text-gray-500">建议: {m.notes.join(' ')}</div>
                      </div>
                    ))
                  )}
                  {result.notes.length > 0 && (
                    <div className="text-[10px] text-gray-500">{result.notes.join(' ')}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'hashcat' && (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 ring-1 ring-amber-200">
          <button
            onClick={() => setView('home')}
            className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> 返回工具箱
          </button>
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-medium text-gray-700">Hashcat 命令生成</h3>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">模板</div>
                <div className="flex flex-wrap gap-2">
                  {hashcatTemplates.map((tpl) => (
                    <button
                      key={tpl.name}
                      onClick={() => {
                        setHashcatMode(tpl.mode);
                        setHashcatAttack(tpl.attack);
                        setHashcatFlags(tpl.flags);
                        setHashcatModeCustom('');
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs bg-white/70 text-gray-600 hover:bg-white"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">哈希类型</div>
                <div className="flex flex-wrap gap-2">
                  {hashcatModeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setHashcatMode(opt.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs ${hashcatMode === opt.value ? 'bg-amber-500 text-white' : 'bg-white/70 text-gray-600 hover:bg-white'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">模式自动补全</div>
                <input
                  list="hashcat-modes"
                  value={hashcatModeCustom}
                  onChange={(e) => setHashcatModeCustom(e.target.value)}
                  placeholder="例如: -m 1800"
                  className="w-full px-3 py-2 text-xs bg-white/80 border border-amber-200 rounded-lg"
                />
                <datalist id="hashcat-modes">
                  {hashcatModeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </datalist>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">攻击模式</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '字典', value: '-a 0' },
                    { label: '掩码', value: '-a 3' },
                    { label: '字典+掩码', value: '-a 6' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setHashcatAttack(opt.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs ${hashcatAttack === opt.value ? 'bg-amber-500 text-white' : 'bg-white/70 text-gray-600 hover:bg-white'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">常用开关</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '--show', key: 'show' },
                    { label: '--username', key: 'username' },
                    { label: '--force', key: 'force' },
                    { label: '--potfile-disable', key: 'potfileDisable' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setHashcatFlags({ ...hashcatFlags, [opt.key]: !hashcatFlags[opt.key as keyof typeof hashcatFlags] })}
                      className={`px-2.5 py-1 rounded-lg text-xs ${hashcatFlags[opt.key as keyof typeof hashcatFlags] ? 'bg-amber-500 text-white' : 'bg-white/70 text-gray-600 hover:bg-white'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-[10px] text-gray-500">
                  --show 输出已破解；--username 忽略用户名字段；--force 跳过警告；--potfile-disable 禁用 potfile。
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <input
                value={hashcatHashFile}
                onChange={(e) => setHashcatHashFile(e.target.value)}
                placeholder="哈希文件路径"
                className="w-full px-3 py-2 text-xs bg-white/80 border border-amber-200 rounded-lg"
              />
              <input
                value={hashcatWordlist}
                onChange={(e) => setHashcatWordlist(e.target.value)}
                placeholder="字典路径 (字典/混合模式)"
                className="w-full px-3 py-2 text-xs bg-white/80 border border-amber-200 rounded-lg"
              />
              <input
                value={hashcatMask}
                onChange={(e) => setHashcatMask(e.target.value)}
                placeholder="掩码 (如 ?l?l?l?l)"
                className="w-full px-3 py-2 text-xs bg-white/80 border border-amber-200 rounded-lg"
              />
              <input
                value={hashcatExtra}
                onChange={(e) => setHashcatExtra(e.target.value)}
                placeholder="额外参数 (可选)"
                className="w-full px-3 py-2 text-xs bg-white/80 border border-amber-200 rounded-lg"
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="text-xs text-gray-500">命令预览</div>
            <div className="px-3 py-2 bg-amber-50 rounded-lg text-[11px] font-mono text-amber-800 break-all">
              {hashcatCommand}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyCommand(hashcatCommand)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium shadow hover:shadow-md flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> 复制命令
              </button>
              <button
                onClick={() => sendCommand(hashcatCommand)}
                className="px-3 py-1.5 rounded-lg bg-white text-amber-600 text-xs font-medium ring-1 ring-amber-200 hover:bg-amber-50 flex items-center gap-1"
              >
                <Terminal className="w-3 h-3" /> 发送到终端
              </button>
              {terminalHint && <span className="text-xs text-gray-500">{terminalHint}</span>}
            </div>
          </div>
        </div>
      )}

      {view === 'john' && (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 ring-1 ring-amber-200">
          <button
            onClick={() => setView('home')}
            className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> 返回工具箱
          </button>
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-medium text-gray-700">John 命令生成</h3>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">模板</div>
                <div className="flex flex-wrap gap-2">
                  {johnTemplates.map((tpl) => (
                    <button
                      key={tpl.name}
                      onClick={() => {
                        setJohnFormat(tpl.format);
                        setJohnMode(tpl.mode);
                        setJohnFlags(tpl.flags);
                        setJohnFormatCustom('');
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs bg-white/70 text-gray-600 hover:bg-white"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">哈希格式</div>
                <div className="flex flex-wrap gap-2">
                  {johnFormatOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setJohnFormat(opt.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs ${johnFormat === opt.value ? 'bg-amber-500 text-white' : 'bg-white/70 text-gray-600 hover:bg-white'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">格式自动补全</div>
                <input
                  list="john-formats"
                  value={johnFormatCustom}
                  onChange={(e) => setJohnFormatCustom(e.target.value)}
                  placeholder="例如: --format=raw-md5"
                  className="w-full px-3 py-2 text-xs bg-white/80 border border-amber-200 rounded-lg"
                />
                <datalist id="john-formats">
                  {johnFormatOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </datalist>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">模式</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '字典', value: '--wordlist' },
                    { label: '增量', value: '--incremental' },
                    { label: '掩码', value: '--mask' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setJohnMode(opt.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs ${johnMode === opt.value ? 'bg-amber-500 text-white' : 'bg-white/70 text-gray-600 hover:bg-white'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">常用开关</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '--show', key: 'show' },
                    { label: '--rules', key: 'rules' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setJohnFlags({ ...johnFlags, [opt.key]: !johnFlags[opt.key as keyof typeof johnFlags] })}
                      className={`px-2.5 py-1 rounded-lg text-xs ${johnFlags[opt.key as keyof typeof johnFlags] ? 'bg-amber-500 text-white' : 'bg-white/70 text-gray-600 hover:bg-white'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-[10px] text-gray-500">
                  --show 输出已破解；--rules 使用规则变换字典。
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <input
                value={johnHashFile}
                onChange={(e) => setJohnHashFile(e.target.value)}
                placeholder="哈希文件路径"
                className="w-full px-3 py-2 text-xs bg-white/80 border border-amber-200 rounded-lg"
              />
              <input
                value={johnWordlist}
                onChange={(e) => setJohnWordlist(e.target.value)}
                placeholder="字典路径 (字典模式)"
                className="w-full px-3 py-2 text-xs bg-white/80 border border-amber-200 rounded-lg"
              />
              <input
                value={johnMask}
                onChange={(e) => setJohnMask(e.target.value)}
                placeholder="掩码 (如 ?l?l?l?l)"
                className="w-full px-3 py-2 text-xs bg-white/80 border border-amber-200 rounded-lg"
              />
              <input
                value={johnExtra}
                onChange={(e) => setJohnExtra(e.target.value)}
                placeholder="额外参数 (可选)"
                className="w-full px-3 py-2 text-xs bg-white/80 border border-amber-200 rounded-lg"
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="text-xs text-gray-500">命令预览</div>
            <div className="px-3 py-2 bg-amber-50 rounded-lg text-[11px] font-mono text-amber-800 break-all">
              {johnCommand}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyCommand(johnCommand)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium shadow hover:shadow-md flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> 复制命令
              </button>
              <button
                onClick={() => sendCommand(johnCommand)}
                className="px-3 py-1.5 rounded-lg bg-white text-amber-600 text-xs font-medium ring-1 ring-amber-200 hover:bg-amber-50 flex items-center gap-1"
              >
                <Terminal className="w-3 h-3" /> 发送到终端
              </button>
              {terminalHint && <span className="text-xs text-gray-500">{terminalHint}</span>}
            </div>
          </div>
        </div>
      )}

      {view === 'known-plaintext' && (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 ring-1 ring-amber-200 space-y-4">
          <button
            onClick={() => setView('home')}
            className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4" /> 返回工具箱
          </button>
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-medium text-gray-700">已知明文 / 文件头助手</h3>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">密文 (HEX)</div>
                <textarea
                  value={knownCipherHex}
                  onChange={(e) => setKnownCipherHex(e.target.value)}
                  placeholder="输入密文 HEX"
                  className="w-full min-h-[120px] px-3 py-2 text-xs bg-white/80 border border-amber-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">已知明文 / 文件头</div>
                <div className="flex gap-2 mb-2">
                  <select
                    value={magicPreset}
                    onChange={(e) => setMagicPreset(e.target.value)}
                    className="px-2 py-1.5 text-xs bg-white/80 border border-amber-200 rounded-lg"
                  >
                    {magicPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>{preset.label}</option>
                    ))}
                  </select>
                  {magicPreset !== 'custom' && (
                    <div className="text-xs text-gray-500 flex items-center">{magicPresets.find((p) => p.id === magicPreset)?.hex}</div>
                  )}
                </div>
                <input
                  value={knownPlainHex}
                  onChange={(e) => setKnownPlainHex(e.target.value)}
                  placeholder="自定义已知明文 HEX"
                  disabled={magicPreset !== 'custom'}
                  className="w-full px-3 py-2 text-xs bg-white/80 border border-amber-200 rounded-lg font-mono disabled:opacity-60"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">重复密钥推断</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUseRepeat(!useRepeat)}
                    className={`px-2.5 py-1 rounded-lg text-xs ${useRepeat ? 'bg-amber-500 text-white' : 'bg-white/70 text-gray-600'}`}
                  >
                    {useRepeat ? '启用' : '禁用'}
                  </button>
                  <input
                    value={repeatLen}
                    onChange={(e) => setRepeatLen(e.target.value)}
                    placeholder="手动长度 (可选)"
                    className="w-32 px-2 py-1.5 text-xs bg-white/80 border border-amber-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {knownAnalysis.error ? (
                <div className="text-xs text-red-600">{knownAnalysis.error}</div>
              ) : (
                <>
                  <div className="text-xs text-gray-500">派生密钥 (HEX)</div>
                  <div className="px-3 py-2 bg-amber-50 rounded-lg text-[11px] font-mono text-amber-800 break-all">
                    {knownAnalysis.keyHex || '等待输入'}
                  </div>
                  <div className="text-xs text-gray-500">重复密钥 (HEX)</div>
                  <div className="px-3 py-2 bg-amber-50 rounded-lg text-[11px] font-mono text-amber-800 break-all">
                    {knownAnalysis.keyRepeatHex || '等待输入'}
                  </div>
                  <div className="text-xs text-gray-500">推断长度</div>
                  <div className="text-xs text-gray-600">{knownAnalysis.bestLen ? `${knownAnalysis.bestLen} (置信 ${Math.round((knownAnalysis.bestScore || 0) * 100)}%)` : '等待输入'}</div>
                  <div className="text-xs text-gray-500">解密预览 (HEX / ASCII)</div>
                  <div className="px-3 py-2 bg-amber-50 rounded-lg text-[11px] font-mono text-amber-800 break-all">
                    {knownAnalysis.previewHex || '等待输入'}
                  </div>
                  <div className="px-3 py-2 bg-white/80 rounded-lg text-[11px] font-mono text-gray-700 break-all">
                    {knownAnalysis.previewAscii || '等待输入'}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="text-[10px] text-gray-500">
            适用于 XOR/重复密钥流类场景，结果仅作分析参考。
          </div>
        </div>
      )}

      {showToolModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[420px] shadow-2xl">
            <div className="text-sm font-medium text-gray-800 mb-3">导入自定义工具</div>
            {toolError && <div className="mb-2 text-xs text-red-600">{toolError}</div>}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">名称</label>
                <input
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  placeholder="例如: strings"
                  className="w-full px-3 py-2 text-xs bg-white/80 border border-amber-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">命令</label>
                <input
                  value={toolCommand}
                  onChange={(e) => setToolCommand(e.target.value)}
                  placeholder="例如: C:\\Tools\\strings.exe -n 5 input.bin"
                  className="w-full px-3 py-2 text-xs bg-white/80 border border-amber-200 rounded-lg"
                />
                <div className="mt-1 text-[10px] text-gray-500">点击工具卡片后会直接执行该命令</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowToolModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs bg-gray-100 text-gray-600"
              >
                取消
              </button>
              <button
                onClick={addCustomTool}
                className="px-3 py-1.5 rounded-lg text-xs bg-amber-500 text-white"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
