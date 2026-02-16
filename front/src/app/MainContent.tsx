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

  return (
    <main className="flex-1 h-full overflow-auto relative z-10">
      {isFullHeightPage ? (
        <div className="h-full overflow-hidden">
          {renderContent()}
        </div>
      ) : (
        <div className="min-h-full p-10">
          {renderContent()}
        </div>
      )}
    </main>
  );
}