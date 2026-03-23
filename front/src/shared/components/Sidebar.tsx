import logoImg from '../../assets/logo.png';
import type { AppTabId } from '@/app/navigation';
import { navigationItems } from '@/app/navigation';


interface SidebarProps {
  activeTab: AppTabId;
  onTabChange: (tab: AppTabId) => void;
  logoSrc?: string;
}


export function Sidebar({ activeTab, onTabChange, logoSrc }: SidebarProps) {
  return (
    <aside className="relative z-10 flex h-full w-24 shrink-0 flex-col items-center overflow-hidden border-r border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(248,250,252,0.74)_100%)] py-6 shadow-[inset_-1px_0_0_rgba(255,255,255,0.6)] backdrop-blur-xl sm:w-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-orange-200/30 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-sky-200/20 to-transparent" />

      <div className="relative mb-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-1 shadow-[0_18px_40px_rgba(15,23,42,0.28)]">
          <div className="h-full w-full overflow-hidden rounded-[20px] bg-white/90">
            <img src={logoSrc || logoImg} alt="ByteAlchemy" className="h-full w-full object-cover" />
          </div>
        </div>
        <div className="mt-3 hidden px-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 xl:block">
          ByteAlchemy
        </div>
      </div>

      <nav className="flex w-full flex-1 flex-col gap-3 px-3">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="group relative w-full"
              title={item.label}
            >
              <div
                className={`relative flex aspect-square w-full flex-col items-center justify-center rounded-[22px] border transition-all duration-300 ${
                  isActive
                    ? 'border-white/80 bg-slate-950 text-white shadow-[0_16px_30px_rgba(15,23,42,0.22)]'
                    : 'border-white/70 bg-white/50 text-slate-500 shadow-sm hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white/80 hover:text-slate-800'
                }`}
              >
                <div className={`absolute inset-0 rounded-[22px] bg-gradient-to-br ${item.accent} ${isActive ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`} />
                <div className={`absolute inset-[1px] rounded-[21px] ${isActive ? 'bg-slate-950/82' : 'bg-white/78'} backdrop-blur-md`} />
                <div className="relative z-10 flex flex-col items-center gap-2 px-2">
                  <Icon className={`h-6 w-6 ${isActive ? 'text-white' : 'text-current'}`} strokeWidth={isActive ? 2.4 : 2.1} />
                  <span className="hidden text-[11px] font-medium leading-tight text-center xl:block">
                    {item.label}
                  </span>
                </div>
              </div>

              {isActive && (
                <div className="pointer-events-none absolute -left-3 top-1/2 flex -translate-y-1/2 items-center">
                  <div className={`h-10 w-1.5 rounded-r-full bg-gradient-to-b ${item.accent} shadow-[0_10px_20px_rgba(15,23,42,0.18)]`} />
                </div>
              )}

              <div className="pointer-events-none absolute left-full top-1/2 ml-4 hidden w-52 -translate-y-1/2 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-left opacity-0 shadow-xl transition-all duration-200 group-hover:block group-hover:opacity-100 xl:block xl:group-hover:translate-x-1">
                <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{item.description}</div>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="mt-4 px-4 text-center text-[11px] leading-5 text-slate-400">
        离线工作台
      </div>
    </aside>
  );
}
