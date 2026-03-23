import { useRef } from 'react';
import { Download, FolderClock, Library, Play, Save, Trash2, Upload } from 'lucide-react';
import type { DecoderRecipe, DecoderRunHistoryItem } from '@/features/decoder/types';


interface RecipeLibraryPanelProps {
  recipeName: string;
  recipeDescription: string;
  recipes: DecoderRecipe[];
  recentRuns: DecoderRunHistoryItem[];
  canSave: boolean;
  onRecipeNameChange: (value: string) => void;
  onRecipeDescriptionChange: (value: string) => void;
  onSaveRecipe: () => void;
  onLoadRecipe: (recipeId: string) => void;
  onDeleteRecipe: (recipeId: string) => void;
  onRestoreRun: (historyId: string) => void;
  onExportRecipe: () => void;
  onImportRecipe: (file: File) => void;
}


function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}


export function RecipeLibraryPanel({
  recipeName,
  recipeDescription,
  recipes,
  recentRuns,
  canSave,
  onRecipeNameChange,
  onRecipeDescriptionChange,
  onSaveRecipe,
  onLoadRecipe,
  onDeleteRecipe,
  onRestoreRun,
  onExportRecipe,
  onImportRecipe,
}: RecipeLibraryPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-[28px] border border-amber-100 bg-white/70 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Library className="h-4 w-4 text-amber-500" />
            配方库
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            把当前链路保存下来，支持 JSON 导入导出，也能从最近运行里一键恢复。
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
          {recipes.length} 个
        </span>
      </div>

      <div className="space-y-3 rounded-2xl border border-amber-100 bg-white/80 p-3">
        <input
          value={recipeName}
          onChange={(event) => onRecipeNameChange(event.target.value)}
          placeholder="配方名称"
          className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-all focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
        />
        <textarea
          value={recipeDescription}
          onChange={(event) => onRecipeDescriptionChange(event.target.value)}
          placeholder="记录用途、样本来源或适用场景"
          className="min-h-[84px] w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-all focus:border-amber-300 focus:ring-2 focus:ring-amber-200"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onSaveRecipe}
            disabled={!canSave}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="h-4 w-4" />
            保存当前链路
          </button>
          <button
            onClick={onExportRecipe}
            disabled={!canSave}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            导出 JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }

              onImportRecipe(file);
              event.currentTarget.value = '';
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" />
            导入 JSON
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-2">
        <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/80 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              已保存配方
            </div>
            <div className="text-xs text-slate-400">{recipes.length}</div>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {recipes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-400">
                还没有保存过配方。
              </div>
            ) : recipes.map((recipe) => (
              <div key={recipe.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-800">{recipe.name}</div>
                    <div className="mt-1 text-xs text-slate-400">{formatTimestamp(recipe.updatedAt)}</div>
                  </div>
                  <div className="rounded-full bg-slate-50 px-2 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200">
                    {recipe.chain.length} 步
                  </div>
                </div>
                {recipe.description && (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{recipe.description}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => onLoadRecipe(recipe.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-slate-800"
                  >
                    <Play className="h-3.5 w-3.5" />
                    载入
                  </button>
                  <button
                    onClick={() => onDeleteRecipe(recipe.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-all hover:bg-slate-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/80 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              <FolderClock className="h-4 w-4" />
              最近运行
            </div>
            <div className="text-xs text-slate-400">{recentRuns.length}</div>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {recentRuns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-400">
                执行过链路后，这里会自动记录恢复点。
              </div>
            ) : recentRuns.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-800">{item.label}</div>
                    <div className="mt-1 text-xs text-slate-400">{formatTimestamp(item.createdAt)}</div>
                  </div>
                  <div className="rounded-full bg-slate-50 px-2 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200">
                    {item.operationCount} 步
                  </div>
                </div>
                <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                  {item.outputPreview || '没有可预览的输出内容。'}
                </div>
                <button
                  onClick={() => onRestoreRun(item.id)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition-all hover:bg-slate-50"
                >
                  <Play className="h-3.5 w-3.5" />
                  恢复
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
