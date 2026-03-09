import { DecoderPage } from '@/features/decoder/DecoderPage';
import { FormatterPage } from '@/features/formatter/FormatterPage';
import { RegexPage } from '@/features/regex/RegexPage';
import { ScriptPage } from '@/features/script/ScriptPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { KeyReconstructPage } from '@/features/key-reconstruct/KeyReconstructPage';
import { ToolboxPage } from '@/features/toolbox/ToolboxPage';

interface MainContentProps {
  activeTab: string;
}

export function MainContent({ activeTab }: MainContentProps) {
  const renderContent = () => {
    switch (activeTab) {
      case 'decoder':
        return <DecoderPage />;
      case 'formatter':
        return <FormatterPage />;
      case 'regex':
        return <RegexPage />;
      case 'script':
        return <ScriptPage />;
      case 'keyreconstruct':
        return <KeyReconstructPage />;
      case 'toolbox':
        return <ToolboxPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DecoderPage />;
    }
  };

  const isFullHeightPage = activeTab === 'decoder' || activeTab === 'keyreconstruct' || activeTab === 'script';
  const fullHeightWrapperClass = activeTab === 'decoder'
    ? 'min-h-full min-w-0 overflow-auto'
    : 'h-full min-h-0 min-w-0 overflow-hidden';

  return (
    <main className="flex-1 min-w-0 min-h-0 overflow-auto relative z-10">
      {isFullHeightPage ? (
        <div className={fullHeightWrapperClass}>
          {renderContent()}
        </div>
      ) : (
        <div className="min-h-full p-4 sm:p-6 lg:p-10">
          {renderContent()}
        </div>
      )}
    </main>
  );
}