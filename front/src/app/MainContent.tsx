import { lazy, Suspense } from 'react';
import type { AppTabId } from '@/app/navigation';
import { getNavigationItem, isFullHeightTab } from '@/app/navigation';


interface MainContentProps {
  activeTab: AppTabId;
}


const DecoderPage = lazy(() => import('@/features/decoder/DecoderPage').then((module) => ({ default: module.DecoderPage })));
const FormatterPage = lazy(() => import('@/features/formatter/FormatterPage').then((module) => ({ default: module.FormatterPage })));
const RegexPage = lazy(() => import('@/features/regex/RegexPage').then((module) => ({ default: module.RegexPage })));
const ScriptPage = lazy(() => import('@/features/script/ScriptPage').then((module) => ({ default: module.ScriptPage })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const KeyReconstructPage = lazy(() => import('@/features/key-reconstruct/KeyReconstructPage').then((module) => ({ default: module.KeyReconstructPage })));
const ToolboxPage = lazy(() => import('@/features/toolbox/ToolboxPage').then((module) => ({ default: module.ToolboxPage })));

const tabPages = {
  decoder: DecoderPage,
  formatter: FormatterPage,
  regex: RegexPage,
  script: ScriptPage,
  keyreconstruct: KeyReconstructPage,
  toolbox: ToolboxPage,
  settings: SettingsPage,
} satisfies Record<AppTabId, typeof DecoderPage>;


export function MainContent({ activeTab }: MainContentProps) {
  const ActivePage = tabPages[activeTab] ?? tabPages.decoder;
  const navigationItem = getNavigationItem(activeTab);
  const fullHeightWrapperClass = activeTab === 'decoder'
    ? 'min-h-full min-w-0 overflow-auto'
    : 'h-full min-h-0 min-w-0 overflow-hidden';

  return (
    <main className="relative z-10 flex-1 min-h-0 min-w-0 overflow-auto bg-white/20">
      <Suspense
        fallback={(
          <div className="flex h-full min-h-[18rem] items-center justify-center p-6">
            <div className="w-full max-w-xl rounded-[28px] border border-white/70 bg-white/70 px-6 py-10 text-center shadow-lg backdrop-blur-md">
              <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-400 to-teal-300" />
              <h2 className="text-lg font-semibold text-slate-900">{navigationItem.label}</h2>
              <p className="mt-2 text-sm text-slate-500">{navigationItem.description}</p>
            </div>
          </div>
        )}
      >
        {isFullHeightTab(activeTab) ? (
          <div className={fullHeightWrapperClass}>
            <ActivePage />
          </div>
        ) : (
          <div className="min-h-full p-4 sm:p-6 lg:p-8">
            <ActivePage />
          </div>
        )}
      </Suspense>
    </main>
  );
}
