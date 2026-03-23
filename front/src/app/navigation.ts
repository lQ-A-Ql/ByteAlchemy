import type { LucideIcon } from 'lucide-react';
import { Binary, Code2, Puzzle, Regex, ScrollText, Settings, Wrench } from 'lucide-react';


export type AppTabId =
  | 'decoder'
  | 'formatter'
  | 'regex'
  | 'script'
  | 'keyreconstruct'
  | 'toolbox'
  | 'settings';


export interface AppNavigationItem {
  id: AppTabId;
  icon: LucideIcon;
  label: string;
  description: string;
  accent: string;
  layout: 'full' | 'padded';
}


export const navigationItems: AppNavigationItem[] = [
  {
    id: 'decoder',
    icon: Binary,
    label: '解码器',
    description: '配方链路、辅助分析和格式转换都集中在这里。',
    accent: 'from-rose-500 via-orange-400 to-amber-300',
    layout: 'full',
  },
  {
    id: 'formatter',
    icon: Code2,
    label: '格式化',
    description: '整理 JSON、代码片段和结构化文本。',
    accent: 'from-sky-500 via-cyan-400 to-teal-300',
    layout: 'padded',
  },
  {
    id: 'regex',
    icon: Regex,
    label: '正则',
    description: '处理转义、字符集和常用模式生成。',
    accent: 'from-fuchsia-500 via-pink-400 to-rose-300',
    layout: 'padded',
  },
  {
    id: 'script',
    icon: ScrollText,
    label: '脚本库',
    description: '管理、编辑并执行本地 Python 脚本。',
    accent: 'from-cyan-500 via-sky-400 to-indigo-300',
    layout: 'full',
  },
  {
    id: 'keyreconstruct',
    icon: Puzzle,
    label: '密钥重构',
    description: '用积木方式拼装密钥流程并生成代码。',
    accent: 'from-violet-500 via-fuchsia-400 to-pink-300',
    layout: 'full',
  },
  {
    id: 'toolbox',
    icon: Wrench,
    label: '工具箱',
    description: '逆向辅助工具和爆破命令模板集中区。',
    accent: 'from-amber-500 via-orange-400 to-red-300',
    layout: 'padded',
  },
  {
    id: 'settings',
    icon: Settings,
    label: '设置',
    description: '自定义资源、工具路径和运行默认项。',
    accent: 'from-slate-500 via-slate-400 to-zinc-300',
    layout: 'padded',
  },
];


export function getNavigationItem(tab: AppTabId) {
  return navigationItems.find((item) => item.id === tab) ?? navigationItems[0];
}


export function isFullHeightTab(tab: AppTabId) {
  return getNavigationItem(tab).layout === 'full';
}
