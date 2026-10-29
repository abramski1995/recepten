import type { ReactNode } from "react";

type Tab = "list" | "favorites" | "more";

const icon = (children: ReactNode) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

function NavLink({ href, label, active, children }: { href: string; label: string; active: boolean; children: ReactNode }) {
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-14 w-16 flex-col items-center justify-center gap-0.5 text-xs ${
        active ? "font-semibold text-orange-700" : "font-medium text-stone-600"
      }`}
    >
      {children}
      {label}
    </a>
  );
}

// Thumb-reach navigation with the "new recipe" button in the middle.
export function BottomNav({ active }: { active: Tab }) {
  return (
    <nav
      aria-label="Hoofdmenu"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex h-[68px] max-w-3xl items-start justify-around px-3 pt-1.5">
        <NavLink href="#/" label="Recepten" active={active === "list"}>
          {icon(<><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></>)}
        </NavLink>
        <NavLink href="#/favorites" label="Favorieten" active={active === "favorites"}>
          {icon(<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />)}
        </NavLink>
        <a
          href="#/new"
          aria-label="Nieuw recept"
          className="relative -top-5 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-orange-700 text-white shadow-lg shadow-orange-700/30 transition active:scale-95"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </a>
        <NavLink href="#/more" label="Meer" active={active === "more"}>
          {icon(<><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>)}
        </NavLink>
      </div>
    </nav>
  );
}
