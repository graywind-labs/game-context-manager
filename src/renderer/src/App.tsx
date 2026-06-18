import { useState } from 'react';

type Language = 'zh' | 'en';

const copy = {
  zh: {
    subtitle: '本地游戏上下文工作区',
    badge: 'MVP 脚手架',
    switchLabel: 'English',
    treeTitle: '节点树',
    emptyWorkspace: '尚未选择工作空间。',
    status: '桌面应用已就绪',
    heading: '游戏上下文管理器',
    description:
      '这个最小 Electron、React、TypeScript、Vite 和 Tailwind 应用壳已经可运行，并已准备进入共享领域模型定义任务。',
    panelsTitle: '上下文面板',
    panelsDescription: '图片、Markdown 预览、AI 辅助和历史记录会在后续任务中显示在这里。'
  },
  en: {
    subtitle: 'Local game context workspace',
    badge: 'MVP scaffold',
    switchLabel: '中文',
    treeTitle: 'Node Tree',
    emptyWorkspace: 'No workspace selected.',
    status: 'Desktop app ready',
    heading: 'Game Context Manager',
    description:
      'This minimal Electron, React, TypeScript, Vite, and Tailwind shell is ready for shared domain model definitions.',
    panelsTitle: 'Context Panels',
    panelsDescription: 'Images, Markdown preview, AI assistance, and history will appear here in later tasks.'
  }
} as const;

function App(): React.JSX.Element {
  const [language, setLanguage] = useState<Language>('zh');
  const text = copy[language];
  const nextLanguage: Language = language === 'zh' ? 'en' : 'zh';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5">
        <div>
          <h1 className="text-base font-semibold">Game Context Manager</h1>
          <p className="text-xs text-slate-500">{text.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded border border-slate-200 px-3 py-1 text-xs text-slate-600">
            {text.badge}
          </div>
          <button
            className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-teal-500 hover:text-teal-700"
            type="button"
            onClick={() => setLanguage(nextLanguage)}
          >
            {text.switchLabel}
          </button>
        </div>
      </header>

      <section className="grid min-h-[calc(100vh-3.5rem)] grid-cols-[260px_1fr_320px]">
        <aside className="border-r border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-700">{text.treeTitle}</h2>
          <div className="mt-4 rounded border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            {text.emptyWorkspace}
          </div>
        </aside>

        <section className="p-6">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
              {text.status}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950">
              {text.heading}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {text.description}
            </p>
          </div>
        </section>

        <aside className="border-l border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-700">{text.panelsTitle}</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-500">
            <p>{text.panelsDescription}</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default App;
