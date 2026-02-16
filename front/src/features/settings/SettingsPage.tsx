import { useState, useEffect } from 'react';
import { ChevronDown, Palette, Database, Check, Plus, Copy, Trash2, Upload, X, Info, Wrench, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getSBoxNames, getSBox, saveSBox, deleteSBox } from '@/services/api';

interface SettingItem {
  id: string;
  title: string;
  icon: any;
  content: React.ReactNode;
}

export function SettingsPage() {
  const [expandedId, setExpandedId] = useState<string | null>('sbox');

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const settings: SettingItem[] = [
    { id: 'sbox', title: 'S-Box 配置', icon: Database, content: <SBoxSettings /> },
    { id: 'tools', title: '工具路径', icon: Wrench, content: <ToolPathSettings /> },
    { id: 'logo', title: 'Logo 设置', icon: ImageIcon, content: <LogoSettings /> },
    { id: 'theme', title: '主题设置', icon: Palette, content: <ThemeSettings /> },
    { id: 'about', title: '关于', icon: Info, content: <AboutSection /> },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-12 relative">
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-gray-500/10 via-slate-500/10 to-gray-500/10 rounded-full border border-gray-200/50 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse"></div>
          <h1 className="text-3xl text-transparent bg-clip-text bg-gradient-to-r from-gray-600 to-slate-600">设置</h1>
        </div>
        <p className="mt-4 text-gray-500 ml-6">个性化您的工具箱</p>
      </div>

      <div className="space-y-4">
        {settings.map((item) => {
          const Icon = item.icon;
          const isExpanded = expandedId === item.id;

          return (
            <div
              key={item.id}
              className="bg-white/50 backdrop-blur-md rounded-2xl ring-1 ring-gray-200 overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => toggleExpand(item.id)}
                className="w-full p-6 flex items-center justify-between hover:bg-white/70 transition-all duration-300 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-400 to-slate-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-lg text-gray-700 group-hover:text-gray-900 transition-colors">
                    {item.title}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1], opacity: { duration: 0.25 } }}
                  >
                    <div className="px-6 pb-6 border-t border-gray-200">
                      <motion.div
                        initial={{ y: -10 }}
                        animate={{ y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        {item.content}
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SBoxSettings() {
  const [sboxNames, setSboxNames] = useState<string[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [currentContent, setCurrentContent] = useState('');
  const [currentName, setCurrentName] = useState('');
  const [isStandard, setIsStandard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNames();
  }, []);

  const loadNames = async () => {
    try {
      const names = await getSBoxNames();
      setSboxNames(names);
      if (names.length > 0) {
        selectSbox(names[0]);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const selectSbox = async (name: string) => {
    setSelectedName(name);
    try {
      const data = await getSBox(name);
      setCurrentName(data.name);
      setCurrentContent(data.content);
      setIsStandard(data.is_standard);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSave = async () => {
    if (!currentName.trim()) return;
    try {
      await saveSBox(currentName, currentContent);
      await loadNames();
      setSelectedName(currentName);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async () => {
    if (isStandard || !confirm('确定删除此 S-Box?')) return;
    try {
      await deleteSBox(selectedName);
      await loadNames();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleClone = () => {
    setCurrentName(currentName + '_Copy');
    setIsStandard(false);
  };

  const handleNew = () => {
    setSelectedName('');
    setCurrentName('New S-Box');
    setCurrentContent('');
    setIsStandard(false);
  };

  // Parse content to 16x16 grid
  const sboxGrid = (() => {
    try {
      const clean = currentContent.replace(/[\[\]\s]/g, '');
      if (clean.includes(',')) {
        return currentContent.replace(/[\[\]]/g, '').split(',').map(v => v.trim()).filter(v => v !== '');
      }
      const bytes = [];
      for (let i = 0; i < clean.length; i += 2) {
        bytes.push(clean.substring(i, i + 2));
      }
      return bytes;
    } catch { return []; }
  })();

  if (loading) return <div className="pt-6 text-center text-gray-500">加载中...</div>;

  return (
    <div className="pt-6 space-y-4">
      {error && <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

      <div className="flex gap-4">
        {/* S-Box List */}
        <div className="w-48 space-y-2">
          {sboxNames.map(name => (
            <button
              key={name}
              onClick={() => selectSbox(name)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${selectedName === name
                ? 'bg-purple-500 text-white'
                : 'bg-white/60 hover:bg-white hover:shadow-sm'
                }`}
            >
              {name}
            </button>
          ))}
          <button onClick={handleNew} className="w-full px-3 py-2 rounded-lg text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" /> 新建
          </button>
        </div>

        {/* S-Box Editor */}
        <div className="flex-1 space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              disabled={isStandard}
              placeholder="S-Box 名称"
              className="flex-1 px-3 py-2 bg-white/60 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
            />
            <button onClick={handleClone} className="px-3 py-2 bg-white/60 border border-gray-200 rounded-lg text-sm hover:bg-white transition-all flex items-center gap-1">
              <Copy className="w-4 h-4" /> 克隆
            </button>
          </div>

          {/* 16x16 Grid Preview */}
          {sboxGrid.length > 0 && (
            <div className="grid grid-cols-16 gap-0.5 p-2 bg-gray-100 rounded-lg max-h-48 overflow-auto">
              {sboxGrid.map((val, idx) => (
                <div key={idx} className="w-5 h-5 flex items-center justify-center text-[8px] bg-white hover:bg-purple-100 transition-colors" title={`Index: ${idx}`}>
                  {val.length === 2 ? val : ('0' + val).slice(-2)}
                </div>
              ))}
            </div>
          )}

          <textarea
            value={currentContent}
            onChange={(e) => setCurrentContent(e.target.value)}
            disabled={isStandard}
            placeholder="Hex 数据 (256字节)..."
            className="w-full h-24 px-3 py-2 bg-white/60 border border-gray-200 rounded-lg text-xs font-mono disabled:opacity-50 resize-none"
          />

          {isStandard ? (
            <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              标准 S-Box 不可修改，请克隆后编辑
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={handleSave} className="flex-1 px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-all">
                保存
              </button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all flex items-center gap-1">
                <Trash2 className="w-4 h-4" /> 删除
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ThemeSettings() {
  const [wallpaper, setWallpaper] = useState('');
  const [opacity, setOpacity] = useState(0.3);

  useEffect(() => {
    const savedWallpaper = localStorage.getItem('terminal_bg_image') || '';
    const savedOpacity = localStorage.getItem('terminal_bg_opacity');
    setWallpaper(savedWallpaper);
    if (savedOpacity) setOpacity(parseFloat(savedOpacity));
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setWallpaper(result);
      localStorage.setItem('terminal_bg_image', result);
      window.dispatchEvent(new Event('wallpaper-update'));
    };
    reader.readAsDataURL(file);
  };

  const clearWallpaper = () => {
    setWallpaper('');
    localStorage.removeItem('terminal_bg_image');
    window.dispatchEvent(new Event('wallpaper-update'));
  };

  const updateOpacity = (value: number) => {
    setOpacity(value);
    localStorage.setItem('terminal_bg_opacity', value.toString());
    window.dispatchEvent(new Event('wallpaper-update'));
  };

  return (
    <div className="pt-6 space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">终端壁纸</h3>
        <div className="flex items-center gap-4">
          <label className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors cursor-pointer flex items-center justify-center overflow-hidden">
            {wallpaper ? (
              <img src={wallpaper} className="w-full h-full object-cover" />
            ) : (
              <Upload className="w-6 h-6 text-gray-400" />
            )}
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>
          <div className="text-sm text-gray-500">
            <p>点击上传图片 (最大 5MB)</p>
            {wallpaper && (
              <button onClick={clearWallpaper} className="text-red-500 hover:underline mt-1">清除壁纸</button>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex justify-between">
          背景不透明度 <span className="text-purple-500">{Math.round(opacity * 100)}%</span>
        </h3>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={opacity}
          onChange={(e) => updateOpacity(parseFloat(e.target.value))}
          className="w-full accent-purple-500"
        />
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="pt-6 space-y-4">
      <p className="text-gray-600">
        由于不会写解密脚本于是用 AI 搓了一个奇怪小玩意。受 CyberChef 启发，基于 Electron 和 FastAPI 构建。
      </p>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="p-4 bg-white/60 rounded-xl">
          <div className="text-gray-500">版本</div>
          <div className="font-medium text-gray-800">0.0.2 BETA</div>
        </div>
        <div className="p-4 bg-white/60 rounded-xl">
          <div className="text-gray-500">作者</div>
          <div className="font-medium text-gray-800">QAQ</div>
        </div>
        <div className="p-4 bg-white/60 rounded-xl">
          <div className="text-gray-500">状态</div>
          <div className="font-medium text-green-600">运行中</div>
        </div>
      </div>
    </div>
  );
}

function ToolPathSettings() {
  const [hashcatPath, setHashcatPath] = useState('');
  const [johnPath, setJohnPath] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHashcatPath(localStorage.getItem('tool_path_hashcat') || '');
    setJohnPath(localStorage.getItem('tool_path_john') || '');
  }, []);

  const isWindows = () => /Win/i.test(navigator.platform || navigator.userAgent);
  const isValidPath = (value: string) => {
    const v = value.trim();
    if (!v) return true;
    if (!v.includes('/') && !v.includes('\\')) return true; // Command in PATH
    if (isWindows()) return /^[A-Za-z]:\\.+/.test(v);
    return /^\/.+/.test(v);
  };

  const handleSave = () => {
    if (!isValidPath(hashcatPath) || !isValidPath(johnPath)) {
      setError('路径格式不合法：Windows 需为 X:\\XXX\\XXX；Linux 需为 /xxx/xxx/xxx；或留空/只写命令名');
      return;
    }
    setError(null);
    localStorage.setItem('tool_path_hashcat', hashcatPath.trim());
    localStorage.setItem('tool_path_john', johnPath.trim());
    window.dispatchEvent(new Event('tool-paths-update'));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="pt-6 space-y-4">
      <div className="text-sm text-gray-600">
        配置外部工具路径，用于工具箱中的一键命令生成。
      </div>
      {error && <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-700 mb-1 block">Hashcat 路径</label>
          <input
            type="text"
            value={hashcatPath}
            onChange={(e) => setHashcatPath(e.target.value)}
            placeholder="例如: C:\\Tools\\hashcat\\hashcat.exe"
            className="w-full px-3 py-2 bg-white/60 border border-gray-200 rounded-lg text-sm"
          />
          {!isValidPath(hashcatPath) && (
            <div className="text-xs text-red-500 mt-1">路径格式不正确</div>
          )}
        </div>
        <div>
          <label className="text-sm text-gray-700 mb-1 block">John 路径</label>
          <input
            type="text"
            value={johnPath}
            onChange={(e) => setJohnPath(e.target.value)}
            placeholder="例如: C:\\Tools\\john\\john.exe"
            className="w-full px-3 py-2 bg-white/60 border border-gray-200 rounded-lg text-sm"
          />
          {!isValidPath(johnPath) && (
            <div className="text-xs text-red-500 mt-1">路径格式不正确</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-700 transition-all"
        >
          保存路径
        </button>
        {saved && <span className="text-sm text-green-600">已保存</span>}
      </div>
    </div>
  );
}

function LogoSettings() {
  const [logo, setLogo] = useState('');

  useEffect(() => {
    setLogo(localStorage.getItem('app_logo_image') || '');
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('图片大小不能超过 3MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setLogo(result);
      localStorage.setItem('app_logo_image', result);
      window.dispatchEvent(new Event('logo-update'));
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogo('');
    localStorage.removeItem('app_logo_image');
    window.dispatchEvent(new Event('logo-update'));
  };

  return (
    <div className="pt-6 space-y-4">
      <div className="text-sm text-gray-600">自定义左上角 Logo（支持 PNG/JPG）</div>
      <div className="flex items-center gap-4">
        <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-300 hover:border-amber-400 transition-colors cursor-pointer flex items-center justify-center overflow-hidden">
          {logo ? (
            <img src={logo} className="w-full h-full object-cover" />
          ) : (
            <Upload className="w-6 h-6 text-gray-400" />
          )}
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </label>
        <div className="text-sm text-gray-500">
          <p>点击上传图片 (最大 3MB)</p>
          {logo && (
            <button onClick={clearLogo} className="text-red-500 hover:underline mt-1">清除 Logo</button>
          )}
        </div>
      </div>
    </div>
  );
}