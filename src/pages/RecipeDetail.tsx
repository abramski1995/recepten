import { useEffect, useRef, useState } from "react";
import { RecipeThumb } from "../components/RecipeThumb.tsx";
import { UnauthorizedError, deleteRecipe, getRecipe, setFavorite } from "../lib/api.ts";
import { scaleIngredient } from "../lib/scale.ts";
import { splitStep } from "../lib/steps.ts";
import { gerechtOf, isGerecht, labelOf } from "../lib/taxonomy.ts";
import { useImagePolling } from "../lib/useImagePolling.ts";
import { useLoad } from "../lib/useLoad.ts";
import { go } from "../lib/useRoute.ts";

const UNDO_SECONDS = 6;
const CHECKED_KEY = (id: string) => `recepten-checked-${id}`;

// Ticked ingredients survive a page reload within the session, so you can leave and come back while cooking.
function readChecked(id: string): number[] {
  try {
    return JSON.parse(sessionStorage.getItem(CHECKED_KEY(id)) ?? "[]") as number[];
  } catch {
    return [];
  }
}

const Icon = ({ children, size = 22 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

function Fact({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl border border-stone-200 bg-white px-1 py-2.5">
      <span className="text-orange-700">{icon}</span>
      <span className="max-w-full px-0.5 text-sm font-semibold">{value}</span>
      <span className="text-xs text-stone-600">{label}</span>
    </div>
  );
}

export function RecipeDetail({ id, onUnauthorized }: { id: string; onUnauthorized: () => void }) {
  const [reload, setReload] = useState(0);
  const { data: recipe, error } = useLoad(() => getRecipe(id), onUnauthorized, [id, reload], true);
  const [servings, setServings] = useState<number | null>(null);
  const [tab, setTab] = useState<"ingredienten" | "bereiding">("ingredienten");
  const [checked, setChecked] = useState<number[]>(() => readChecked(id));
  const [favorite, setFav] = useState<boolean | null>(null); // null: use what the server says
  const [deleting, setDeleting] = useState(false);
  const deleteTimer = useRef<number | null>(null);
  useImagePolling(recipe ? [recipe] : null, () => setReload((n) => n + 1));

  // Leaving the page while a delete is pending means the user meant it: finish it now.
  useEffect(
    () => () => {
      if (deleteTimer.current !== null) {
        clearTimeout(deleteTimer.current);
        void deleteRecipe(id);
      }
    },
    [id],
  );

  if (error) return <p className="p-4 text-red-700">{error}</p>;
  if (!recipe) return <p className="p-4 text-stone-500">Laden…</p>;

  const base = recipe.servings;
  const current = servings ?? base;
  const factor = base && current ? current / base : 1;
  const gerecht = gerechtOf(recipe.tags);
  const isFavorite = favorite ?? recipe.favorite ?? false;
  const chips = recipe.tags.filter((t) => !isGerecht(t));

  function toggleChecked(i: number) {
    const next = checked.includes(i) ? checked.filter((x) => x !== i) : [...checked, i];
    setChecked(next);
    try {
      sessionStorage.setItem(CHECKED_KEY(id), JSON.stringify(next));
    } catch {
      // storage unavailable: ticks just won't survive a reload
    }
  }

  async function toggleFavorite() {
    const next = !isFavorite;
    setFav(next);
    try {
      await setFavorite(id, next);
    } catch (e) {
      setFav(!next);
      if (e instanceof UnauthorizedError) return onUnauthorized();
      const message = e instanceof Error ? e.message : "";
      alert(
        /favorite/i.test(message)
          ? "Favorieten werken pas na het draaien van supabase/migrations/003_favorites.sql in Supabase."
          : `Favoriet bewaren mislukt${message ? `: ${message}` : ""}`,
      );
    }
  }

  function startDelete() {
    setDeleting(true);
    deleteTimer.current = window.setTimeout(async () => {
      deleteTimer.current = null;
      try {
        await deleteRecipe(id);
        go("/");
      } catch (e) {
        setDeleting(false);
        alert(e instanceof Error ? e.message : "Verwijderen mislukt");
      }
    }, UNDO_SECONDS * 1000);
  }

  function undoDelete() {
    if (deleteTimer.current !== null) clearTimeout(deleteTimer.current);
    deleteTimer.current = null;
    setDeleting(false);
  }

  if (deleting) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold">Recept verwijderd</h1>
        <p className="text-stone-600">“{recipe.title}” wordt over {UNDO_SECONDS} seconden definitief verwijderd.</p>
        <button type="button" className="btn-primary" onClick={undoDelete}>
          Ongedaan maken
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl pb-40">
      <div className="relative">
        <RecipeThumb recipe={recipe} className="h-[300px] w-full" />
        <a
          href="#/"
          aria-label="Terug naar overzicht"
          className="absolute left-3 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-stone-900"
        >
          <Icon>
            <path d="M15 5l-7 7 7 7" />
          </Icon>
        </a>
        <div className="absolute right-3 top-5 flex gap-2">
          <a href={`#/edit/${id}`} aria-label="Recept bewerken" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-stone-900">
            <Icon size={20}>
              <path d="M4 20h4L19 9l-4-4L4 16z" />
              <path d="M13.5 6.5l4 4" />
            </Icon>
          </a>
          <button
            type="button"
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Verwijder uit favorieten" : "Bewaar als favoriet"}
            onClick={toggleFavorite}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round" aria-hidden="true" fill={isFavorite ? "#b4492a" : "none"} stroke={isFavorite ? "#b4492a" : "#2b2420"}>
              <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative -mt-7 rounded-t-[28px] bg-[#fbf6ee] px-5 pt-6">
        <h1 className="text-[32px] font-semibold leading-[1.1] tracking-tight">{recipe.title}</h1>
        {recipe.description && <p className="mt-2 text-stone-700">{recipe.description}</p>}

        <div className="mt-4 flex gap-2">
          <Fact
            icon={
              <Icon size={20}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </Icon>
            }
            value={recipe.total_minutes ? `${recipe.total_minutes} min` : "–"}
            label="Tijd"
          />
          <Fact
            icon={
              <Icon size={20}>
                <circle cx="9" cy="8" r="3.5" />
                <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M16 5a3.5 3.5 0 0 1 0 7M18 15c2 .8 3 2.7 3 5" />
              </Icon>
            }
            value={current ? String(current) : "–"}
            label="Personen"
          />
          <Fact
            icon={
              <Icon size={20}>
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="4" />
              </Icon>
            }
            value={gerecht ? labelOf(gerecht) : "–"}
            label="Soort"
          />
        </div>

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((t) => (
              <span key={t} className="flex h-7 items-center rounded-full bg-lime-100 px-3 text-[13px] font-semibold text-lime-900">
                {labelOf(t)}
              </span>
            ))}
          </div>
        )}

        <div role="tablist" aria-label="Recept" className="mt-5 flex border-b border-stone-200">
          {(["ingredienten", "bereiding"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`tab-${t}`}
              aria-selected={tab === t}
              aria-controls={`panel-${t}`}
              onClick={() => setTab(t)}
              className={`h-12 flex-1 border-b-[3px] text-base ${
                tab === t ? "border-orange-700 font-semibold text-stone-900" : "border-transparent font-medium text-stone-600"
              }`}
            >
              {t === "ingredienten" ? `Ingrediënten (${recipe.ingredients.length})` : `Bereiding (${recipe.steps.length})`}
            </button>
          ))}
        </div>

        {tab === "ingredienten" ? (
          <section role="tabpanel" id="panel-ingredienten" aria-labelledby="tab-ingredienten">
            {base && current && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[15px] text-stone-600">Hoeveelheden voor</span>
                <div className="flex items-center rounded-full border border-stone-200 bg-white p-0.5">
                  <button type="button" aria-label="Minder personen" onClick={() => setServings(Math.max(1, current - 1))} className="h-11 w-11 rounded-full text-[22px]">
                    −
                  </button>
                  <span className="min-w-[84px] text-center text-[15px] font-semibold">{current} {current === 1 ? "persoon" : "personen"}</span>
                  <button type="button" aria-label="Meer personen" onClick={() => setServings(Math.min(99, current + 1))} className="h-11 w-11 rounded-full text-[22px]">
                    +
                  </button>
                </div>
              </div>
            )}
            {recipe.ingredients.length === 0 ? (
              <p className="mt-4 text-stone-600">Geen ingrediënten ingevuld.</p>
            ) : (
              <ul className="mt-2">
                {recipe.ingredients.map((ing, i) => {
                  const done = checked.includes(i);
                  return (
                    <li key={i} className="border-b border-stone-200/70 last:border-0">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={done}
                        onClick={() => toggleChecked(i)}
                        className="flex min-h-12 w-full items-center gap-3.5 py-1.5 text-left"
                      >
                        <span
                          className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-2 ${
                            done ? "border-lime-800 bg-lime-800" : "border-stone-400"
                          }`}
                        >
                          {done && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M5 12.5l4.5 4.5L19 7.5" />
                            </svg>
                          )}
                        </span>
                        <span className={`text-base ${done ? "text-stone-500 line-through" : ""}`}>{scaleIngredient(ing, factor)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : (
          <section role="tabpanel" id="panel-bereiding" aria-labelledby="tab-bereiding">
            {recipe.steps.length === 0 ? (
              <p className="mt-4 text-stone-600">Geen stappen ingevuld.</p>
            ) : (
              <ol className="mt-4 space-y-4">
                {recipe.steps.map((s, i) => {
                  const { title, text } = splitStep(s);
                  return (
                    <li key={i} className="flex gap-3.5">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-700 text-sm font-semibold text-white">
                        {i + 1}
                      </span>
                      <span className="text-base leading-relaxed">
                        {title && <strong className="block font-semibold">{title}</strong>}
                        {text}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
            {recipe.notes && (
              <div className="mt-6 rounded-2xl bg-orange-100 px-4 py-3">
                <h2 className="text-lg font-semibold">Notities</h2>
                <p className="mt-1 whitespace-pre-wrap text-stone-800">{recipe.notes}</p>
              </div>
            )}
          </section>
        )}

        <footer className="mt-8 flex items-center justify-between gap-3 text-sm text-stone-600">
          {recipe.source_url ? (
            <a href={recipe.source_url} target="_blank" rel="noreferrer noopener" className="flex min-h-11 items-center underline">
              Bron: {new URL(recipe.source_url).hostname.replace(/^www\./, "")}
            </a>
          ) : (
            <span />
          )}
          <button type="button" className="min-h-11 px-1 font-medium text-red-700" onClick={startDelete}>
            Verwijderen
          </button>
        </footer>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-[#fbf6ee] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <a
          href={`#/cook/${id}`}
          className="mx-auto flex h-14 max-w-2xl items-center justify-center gap-2.5 rounded-2xl bg-orange-700 text-[17px] font-semibold text-white transition active:scale-[0.98]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
          Start met koken
        </a>
      </div>
    </main>
  );
}
