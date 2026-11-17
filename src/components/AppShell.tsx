import type { ReactNode } from 'react';
import type { Learner } from '../types';
import { Logo } from './Logo';

const NAV = [
  { label: 'Dashboard', icon: '▦', active: true },
  { label: 'My Courses', icon: '▤', active: false },
  { label: 'Progress', icon: '◔', active: false },
  { label: 'Profile', icon: '◉', active: false },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function AppShell({ learner, children }: { learner: Learner; children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-line bg-ink/95 px-4 py-3 backdrop-blur md:px-6">
        <Logo />
        <div className="ml-auto hidden max-w-md flex-1 sm:block">
          <label className="sr-only" htmlFor="search">
            Search courses
          </label>
          <input
            id="search"
            type="search"
            placeholder="Search courses…"
            className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-paper placeholder:text-muted focus:border-brand focus:outline-none"
          />
        </div>
        <div className="ml-auto flex items-center gap-2.5 sm:ml-4">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand font-label text-sm font-semibold text-ink">
            {initials(learner.name)}
          </span>
          <div className="hidden leading-tight md:block">
            <div className="text-sm font-semibold text-paper">{learner.name}</div>
            <div className="label text-[11px] text-muted">Steward</div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <nav className="hidden w-56 shrink-0 border-r border-line bg-panel p-3 md:block" aria-label="Main">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  disabled={!item.active}
                  aria-current={item.active ? 'page' : undefined}
                  className={`label flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
                    item.active ? 'bg-brand/10 text-brand' : 'cursor-not-allowed text-muted/70'
                  }`}
                  title={item.active ? undefined : 'Coming soon'}
                >
                  <span aria-hidden="true" className="w-4 text-center">
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
