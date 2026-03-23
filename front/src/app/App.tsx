import { useEffect, useState } from 'react';
import { MainContent } from '@/app/MainContent';
import type { AppTabId } from '@/app/navigation';
import { Sidebar } from '@/shared/components/Sidebar';
import { useStoredNumber, useStoredString } from '@/shared/hooks/useStoredPreference';


export default function App() {
  const [activeTab, setActiveTab] = useState<AppTabId>('decoder');
  const bgImage = useStoredString('terminal_bg_image', '', 'wallpaper-update');
  const bgOpacity = useStoredNumber('terminal_bg_opacity', 0.3, 'wallpaper-update');
  const logoImage = useStoredString('app_logo_image', '', 'logo-update');

  useEffect(() => {
    const handleOpenTerminal = () => setActiveTab('script');
    window.addEventListener('open-terminal', handleOpenTerminal);
    return () => window.removeEventListener('open-terminal', handleOpenTerminal);
  }, []);

  return (
    <div className="relative flex size-full min-h-0 min-w-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,#fff7ed_0%,#eff6ff_42%,#e2e8f0_100%)] text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.6)_0%,rgba(255,255,255,0)_28%,rgba(14,165,233,0.08)_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:32px_32px]" />

      {bgImage && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            opacity: bgOpacity,
          }}
        />
      )}

      <div className="relative z-10 flex size-full min-h-0 min-w-0 overflow-hidden p-3 sm:p-4">
        <div className="flex size-full min-h-0 min-w-0 overflow-hidden rounded-[28px] border border-white/70 bg-white/55 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} logoSrc={logoImage} />
          <MainContent activeTab={activeTab} />
        </div>
      </div>
    </div>
  );
}
