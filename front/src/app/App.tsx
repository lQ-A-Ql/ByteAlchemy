import { useState, useEffect } from 'react';
import { Sidebar } from '@/shared/components/Sidebar';
import { MainContent } from '@/app/MainContent';

export default function App() {
  const [activeTab, setActiveTab] = useState('decoder');
  const [bgImage, setBgImage] = useState('');
  const [bgOpacity, setBgOpacity] = useState(0.3);
  const [logoImage, setLogoImage] = useState('');

  // Load global wallpaper from localStorage
  useEffect(() => {
    const loadWallpaper = () => {
      setBgImage(localStorage.getItem('terminal_bg_image') || '');
      setBgOpacity(parseFloat(localStorage.getItem('terminal_bg_opacity') || '0.3'));
    };
    loadWallpaper();
    window.addEventListener('storage', loadWallpaper);
    // Also listen for custom event for same-tab updates
    const handleUpdate = () => loadWallpaper();
    window.addEventListener('wallpaper-update', handleUpdate);
    return () => {
      window.removeEventListener('storage', loadWallpaper);
      window.removeEventListener('wallpaper-update', handleUpdate);
    };
  }, []);

  useEffect(() => {
    const handleOpenTerminal = () => setActiveTab('script');
    window.addEventListener('open-terminal', handleOpenTerminal);
    return () => window.removeEventListener('open-terminal', handleOpenTerminal);
  }, []);

  useEffect(() => {
    const loadLogo = () => {
      setLogoImage(localStorage.getItem('app_logo_image') || '');
    };
    loadLogo();
    window.addEventListener('storage', loadLogo);
    const handleUpdate = () => loadLogo();
    window.addEventListener('logo-update', handleUpdate);
    return () => {
      window.removeEventListener('storage', loadLogo);
      window.removeEventListener('logo-update', handleUpdate);
    };
  }, []);

  return (
    <div className="size-full min-h-0 min-w-0 flex overflow-hidden bg-gradient-to-br from-white via-pink-50 to-purple-50 relative">
      {/* Global Wallpaper */}
      {bgImage && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: bgOpacity,
          }}
        />
      )}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} logoSrc={logoImage} />
      <MainContent activeTab={activeTab} />
    </div>
  );
}