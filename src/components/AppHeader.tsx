import { useLocation } from 'react-router-dom';

const STEPS = [
  { path: '/',          num: '①', label: 'Setup' },
  { path: '/cues',      num: '②', label: 'Plan' },
  { path: '/select',    num: '③', label: 'Words' },
  { path: '/grammar',   num: '③½', label: 'Grammar' },
  { path: '/timeline',  num: '④', label: 'Timeline' },
  { path: '/record',    num: '⑤', label: 'Record' },
  { path: '/evaluate',  num: '⑥', label: 'Self-check' },
  { path: '/feedback',  num: '⑦', label: 'Feedback' },
];

export default function AppHeader() {
  const { pathname } = useLocation();
  const currentIdx = STEPS.findIndex(s => s.path === pathname);

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-stone">
      <div className="max-w-6xl mx-auto px-8 h-20 flex items-center justify-between gap-8">
        {/* Logo */}
        <div className="flex items-baseline gap-3 flex-shrink-0">
          <span className="font-display text-3xl text-ink">말해봐</span>
          <span className="text-sm font-mono text-ink-muted hidden sm:block">Korean speaking practice</span>
        </div>

        {/* Step indicators */}
        <nav className="flex items-center gap-2">
          {STEPS.map((step, idx) => {
            const done   = currentIdx > idx;
            const active = currentIdx === idx;
            return (
              <div key={step.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono whitespace-nowrap transition-all
                  ${active  ? 'bg-ink text-white font-semibold'
                  : done    ? 'text-ink-muted'
                  :           'text-stone'}`}>
                <span>{step.num}</span>
                {active && <span className="hidden lg:block">{step.label}</span>}
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
