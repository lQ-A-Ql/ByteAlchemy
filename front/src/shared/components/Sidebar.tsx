import { Binary, Code2, Regex, ScrollText, Settings, Puzzle, Wrench } from 'lucide-react';
import logoImg from '../../assets/logo.png';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  logoSrc?: string;
}

const menuItems = [
  { id: 'decoder', icon: Binary, label: '解码器', accent: 'from-pink-400 via-rose-400 to-pink-500' },
  { id: 'formatter', icon: Code2, label: '代码格式化', accent: 'from-purple-400 via-violet-400 to-purple-500' },
  { id: 'regex', icon: Regex, label: '正则转换', accent: 'from-blue-400 via-indigo-400 to-blue-500' },
  { id: 'script', icon: ScrollText, label: '脚本库', accent: 'from-cyan-400 via-teal-400 to-cyan-500' },
  { id: 'keyreconstruct', icon: Puzzle, label: '密钥重构', accent: 'from-indigo-400 via-purple-400 to-indigo-500' },
  { id: 'toolbox', icon: Wrench, label: '工具箱', accent: 'from-amber-400 via-orange-400 to-amber-500' },
  { id: 'settings', icon: Settings, label: '设置', accent: 'from-gray-400 via-slate-400 to-gray-500' },
];

export function Sidebar({ activeTab, onTabChange, logoSrc }: SidebarProps) {
  return (
    <aside className="w-20 sm:w-24 h-full shrink-0 bg-white/70 backdrop-blur-md shadow-2xl flex flex-col items-center py-6 sm:py-8 border-r border-pink-100/60 relative overflow-hidden z-10">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-pink-100/30 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-purple-100/30 to-transparent pointer-events-none"></div>

      {/* Logo */}
      <div className="relative mb-12 group cursor-pointer">
        <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-xl transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
          <img src={logoSrc || logoImg} alt="Logo" className="w-full h-full object-cover" />
        </div>
        <div className="absolute -inset-1 bg-gradient-to-br from-pink-400 to-purple-500 rounded-2xl opacity-20 blur-md group-hover:opacity-40 transition-opacity"></div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 flex flex-col gap-4 w-full px-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="group relative w-full aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-500 ease-out"
            >
              {/* Background with gradient */}
              <div className={`
                absolute inset-0 rounded-2xl transition-all duration-500
                ${isActive
                  ? `bg-gradient-to-br ${item.accent} shadow-xl scale-100 opacity-100`
                  : 'bg-white/40 shadow-md scale-95 opacity-60 group-hover:scale-100 group-hover:opacity-100 group-hover:shadow-lg'
                }
              `}>
                {/* Inner glow effect */}
                {isActive && (
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.accent} blur-xl opacity-50`}></div>
                )}
              </div>

              {/* Icon */}
              <div className="relative z-10">
                <Icon
                  className={`
                    transition-all duration-500
                    ${isActive
                      ? 'text-white w-7 h-7 drop-shadow-lg'
                      : 'text-gray-600 w-6 h-6 group-hover:text-gray-800 group-hover:w-7 group-hover:h-7'
                    }
                  `}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>

              {/* Tooltip */}
              <div className={`
                absolute left-full ml-6 px-4 py-2 bg-gray-900/90 backdrop-blur-sm text-white text-sm rounded-xl
                opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap
                transition-all duration-300 z-20 shadow-2xl
                group-hover:ml-8
              `}>
                {item.label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-gray-900/90"></div>
              </div>

              {/* Active Indicator - animated line */}
              {isActive && (
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex items-center">
                  <div className={`w-1.5 h-10 bg-gradient-to-b ${item.accent} rounded-r-full shadow-lg animate-pulse`}></div>
                  <div className={`w-1 h-6 bg-gradient-to-b ${item.accent} blur-sm ml-0.5 opacity-60`}></div>
                </div>
              )}

              {/* Particle effect on hover */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className={`
                  absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700
                  bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.3),transparent_70%)]
                `}></div>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
