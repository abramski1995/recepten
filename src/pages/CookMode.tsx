import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { getRecipe } from "../lib/api.ts";
import { findTimers, formatClock, ingredientsForStep, splitByTimes, splitStep } from "../lib/steps.ts";
import { useCookTimers } from "../lib/useCookTimers.ts";
import { useLoad } from "../lib/useLoad.ts";
import { go } from "../lib/useRoute.ts";

// Keeps the screen on while cooking (where the browser supports it).
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = () => {
      navigator.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => undefined);
    };
    const onVisible = () => document.visibilityState === "visible" && acquire();
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => undefined);
    };
  }, []);
}

const iconProps = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", "aria-hidden": true } as const;

export function CookMode({ id, onUnauthorized }: { id: string; onUnauthorized: () => void }) {
  const { data: recipe, error } = useLoad(() => getRecipe(id), onUnauthorized, [id]);
  const [step, setStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const { timers, now, start, dismiss } = useCookTimers();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  useWakeLock();

  const total = recipe?.steps.length ?? 0;
  const last = step >= total - 1;
  const next = () => (last ? go(`/r/${id}`) : setStep((s) => s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  // Arrow keys for a tablet with a keyboard; swipe handled on the step area below.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showIngredients) return e.key === "Escape" ? setShowIngredients(false) : undefined;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const current = recipe?.steps[step];
  const parts = useMemo(() => (current ? splitStep(current) : null), [current]);
  const stepTimers = useMemo(() => (parts ? findTimers(parts.text) : []), [parts]);
  const stepIngredients = useMemo(
    () => (parts && recipe ? ingredientsForStep(`${parts.title ?? ""} ${parts.text}`, recipe.ingredients) : []),
    [parts, recipe],
  );

  if (error) return <p className="p-4 text-red-700">{error}</p>;
  if (!recipe) return <p className="p-4 text-stone-500">Laden…</p>;

  function onTouchEnd(e: TouchEvent) {
    const s = touchStart.current;
    touchStart.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)();
  }

  const running = timers.map((t) => ({ ...t, remaining: (t.endAt - now) / 1000 }));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col bg-[#241e1a] px-5 pb-7 pt-6 text-[#fbf6ee]">
      <header className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Stoppen met koken"
          onClick={() => go(`/r/${id}`)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3a322c]"
        >
          <svg {...iconProps}>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <span className="text-[15px] font-semibold text-[#d9cbb8]">{total > 0 ? `Stap ${step + 1} van ${total}` : recipe.title}</span>
        <button
          type="button"
          aria-label="Alle ingrediënten"
          onClick={() => setShowIngredients(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3a322c]"
        >
          <svg {...iconProps}>
            <path d="M9 6h11M9 12h11M9 18h11" />
            <circle cx="4.5" cy="6" r="1" />
            <circle cx="4.5" cy="12" r="1" />
            <circle cx="4.5" cy="18" r="1" />
          </svg>
        </button>
      </header>

      {total > 0 && (
        <div className="mt-4 flex gap-1.5" role="img" aria-label={`Voortgang: stap ${step + 1} van ${total}`}>
          {recipe.steps.map((_, i) => (
            <span key={i} className={`h-[5px] flex-1 rounded-full ${i <= step ? "bg-[#e08a68]" : "bg-[#4a4038]"}`} />
          ))}
        </div>
      )}

      {running.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" role="status" aria-live="polite">
          {running.map((t) =>
            t.remaining > 0 ? (
              <span key={t.id} className="flex h-10 items-center gap-2 rounded-full bg-[#3a322c] pl-4 pr-1.5 text-[15px] font-semibold">
                {formatClock(t.remaining)}
                <span className="font-normal text-[#d9cbb8]">{t.label}</span>
                <button type="button" aria-label={`Stop timer ${t.label}`} onClick={() => dismiss(t.id)} className="flex h-8 w-8 items-center justify-center rounded-full">
                  <svg {...iconProps} width={16} height={16}>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </span>
            ) : (
              <button
                key={t.id}
                type="button"
                onClick={() => dismiss(t.id)}
                className="flex h-12 animate-pulse items-center gap-2 rounded-full bg-[#e08a68] px-5 text-[16px] font-semibold text-[#241e1a]"
              >
                Klaar: {t.label}
                <span className="font-normal">tik om te sluiten</span>
              </button>
            ),
          )}
        </div>
      )}

      <div
        className="flex flex-1 flex-col justify-center gap-4 py-6"
        onTouchStart={(e) => (touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={onTouchEnd}
      >
        {!parts ? (
          <p className="text-2xl">Dit recept heeft nog geen stappen.</p>
        ) : (
          <>
            {parts.title && <h1 className="text-[34px] font-semibold leading-tight tracking-tight">{parts.title}</h1>}
            <p className="text-[23px] leading-[1.45] text-[#f1e8da]">
              {splitByTimes(parts.text).map((p, i) =>
                p.seconds ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => start(p.text, p.seconds!)}
                    className="border-b-2 border-[#e08a68] font-semibold text-white"
                    aria-label={`Start timer ${p.text}`}
                  >
                    {p.text}
                  </button>
                ) : (
                  <span key={i}>{p.text}</span>
                ),
              )}
            </p>

            {stepTimers.map((t) => (
              <button
                key={t.seconds}
                type="button"
                onClick={() => start(t.label, t.seconds)}
                className="flex h-16 items-center justify-center gap-3 rounded-[20px] border-2 border-[#e08a68] text-[18px] font-semibold"
              >
                <svg {...iconProps} width={24} height={24} stroke="#e08a68">
                  <circle cx="12" cy="13" r="8" />
                  <path d="M12 9v4l2.5 2M9.5 3h5" />
                </svg>
                Start timer, {formatClock(t.seconds)}
              </button>
            ))}

            {stepIngredients.length > 0 && (
              <div className="rounded-[18px] bg-[#302923] px-4 py-3.5">
                <h2 className="font-sans text-xs font-semibold uppercase tracking-wide text-[#bfaf9a]">Voor deze stap</h2>
                <ul className="mt-1.5 text-[17px] leading-relaxed">
                  {stepIngredients.map((ing) => (
                    <li key={ing}>{ing}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="flex gap-3">
        <button
          type="button"
          onClick={prev}
          disabled={step === 0}
          className="h-[60px] flex-1 rounded-[18px] bg-[#3a322c] text-[17px] font-semibold disabled:opacity-40"
        >
          Vorige
        </button>
        <button type="button" onClick={next} className="h-[60px] flex-[2] rounded-[18px] bg-[#c4532f] text-[18px] font-semibold text-white">
          {last ? "Klaar" : "Volgende stap"}
        </button>
      </footer>

      {showIngredients && (
        <div className="fixed inset-0 z-40 flex items-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowIngredients(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-label="Ingrediënten" className="relative mx-auto max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-[#302923] px-5 pb-8 pt-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Ingrediënten</h2>
              <button type="button" onClick={() => setShowIngredients(false)} className="h-11 px-2 font-semibold text-[#e08a68]">
                Sluiten
              </button>
            </div>
            <ul className="mt-2 divide-y divide-[#463c34] text-[18px]">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="py-3">
                  {ing}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
