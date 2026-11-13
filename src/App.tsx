import { useEffect, useState } from 'react';
import { useStore } from './store';
import { requestPersistence } from './storage/db';
import { Home } from './ui/Home';
import { VerbSetup } from './modes/verbs/VerbSetup';
import { VerbSession } from './modes/verbs/VerbSession';
import { VerbsScreen } from './ui/VerbsScreen';
import { StatsScreen } from './ui/StatsScreen';
import { SettingsScreen } from './ui/SettingsScreen';
import type { VerbCard } from './modes/verbs/cards';

export type Screen =
  | { name: 'home' }
  | { name: 'setup' }
  | { name: 'session'; cards: VerbCard[]; review?: boolean }
  | { name: 'verbs' }
  | { name: 'stats' }
  | { name: 'settings' };

const TABS: { name: Screen['name']; label: string; icon: string }[] = [
  { name: 'home', label: 'Practicar', icon: '🎯' },
  { name: 'verbs', label: 'Verbos', icon: '📚' },
  { name: 'stats', label: 'Progreso', icon: '📈' },
  { name: 'settings', label: 'Ajustes', icon: '⚙️' },
];

function useTheme() {
  const theme = useStore((s) => s.settings.theme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#020617' : '#0f766e');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

export default function App() {
  const ready = useStore((s) => s.ready);
  const init = useStore((s) => s.init);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  useTheme();

  useEffect(() => {
    init();
    requestPersistence();
  }, [init]);

  if (!ready) {
    return <div className="flex h-full items-center justify-center text-slate-400">Cargando…</div>;
  }

  if (screen.name === 'session') {
    return (
      <VerbSession
        key={screen.cards.map((c) => c.key).join()}
        cards={screen.cards}
        review={screen.review}
        onExit={() => setScreen({ name: 'home' })}
        onRestart={(cards, review) => setScreen({ name: 'session', cards, review })}
      />
    );
  }

  const tab = screen.name === 'setup' ? 'home' : screen.name;
  return (
    <div className="flex h-full flex-col">
      <main className="pt-safe mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-4 pb-24">
        {screen.name === 'home' && <Home go={setScreen} />}
        {screen.name === 'setup' && <VerbSetup go={setScreen} />}
        {screen.name === 'verbs' && <VerbsScreen />}
        {screen.name === 'stats' && <StatsScreen />}
        {screen.name === 'settings' && <SettingsScreen />}
      </main>
      <nav className="pb-safe fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-5xl">
          {TABS.map((t) => (
            <button
              key={t.name}
              onClick={() => setScreen({ name: t.name } as Screen)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${tab === t.name ? 'text-teal-700 dark:text-teal-400' : 'text-slate-500'}`}
            >
              <span className="text-xl leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
