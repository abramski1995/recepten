import { useCallback, useMemo, useState } from "react";
import { BottomNav } from "../components/BottomNav.tsx";
import { Chip } from "../components/Chip.tsx";
import { FilterSheet } from "../components/FilterSheet.tsx";
import { RecipeCard, RecipeCardSkeleton } from "../components/RecipeCard.tsx";
import { UnauthorizedError, listRecipes, setFavorite } from "../lib/api.ts";
import { activeCount, customLabels, filterRecipes, noFilters, type Filters } from "../lib/filter.ts";
import { GERECHTEN, TIJDEN, isGerecht, labelOf } from "../lib/taxonomy.ts";
import { useImagePolling } from "../lib/useImagePolling.ts";
import { useLoad } from "../lib/useLoad.ts";
import { useMaintenance } from "../lib/useMaintenance.ts";
import type { Recipe } from "../types.ts";

interface Props {
  onUnauthorized: () => void;
  favoritesOnly?: boolean;
}

export function RecipeList({ onUnauthorized, favoritesOnly = false }: Props) {
  const [reload, setReload] = useState(0);
  const { data, error } = useLoad(listRecipes, onUnauthorized, [reload], true);
  useImagePolling(data, () => setReload((n) => n + 1));
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(noFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const { label: tidyLabel, tidyTags } = useMaintenance(data, onUnauthorized, () => setReload((n) => n + 1));

  // Optimistic favorites: show the new state at once, undo it when saving fails.
  const [favOverride, setFavOverride] = useState<Record<string, boolean>>({});
  const isFav = useCallback((r: Recipe) => favOverride[r.id] ?? r.favorite ?? false, [favOverride]);

  async function toggleFavorite(r: Recipe) {
    const next = !isFav(r);
    setFavOverride((o) => ({ ...o, [r.id]: next }));
    try {
      await setFavorite(r.id, next);
    } catch (e) {
      setFavOverride((o) => ({ ...o, [r.id]: !next }));
      if (e instanceof UnauthorizedError) return onUnauthorized();
      const message = e instanceof Error ? e.message : "";
      alert(
        /favorite/i.test(message)
          ? "Favorieten werken pas na het draaien van supabase/migrations/003_favorites.sql in Supabase."
          : `Favoriet bewaren mislukt${message ? `: ${message}` : ""}`,
      );
    }
  }

  const pool = useMemo(() => (data ? (favoritesOnly ? data.filter(isFav) : data) : []), [data, favoritesOnly, isFav]);
  const shown = useMemo(() => filterRecipes(pool, query, filters), [pool, query, filters]);
  const labels = useMemo(() => (data ? customLabels(data) : []), [data]);
  const withoutCategory = useMemo(() => (data ? data.filter((r) => !r.tags.some(isGerecht)).length : 0), [data]);
  const badge = activeCount(filters);
  const filtering = badge > 0 || filters.gerecht !== null || query.trim() !== "";

  // Removable chips for every active filter except the dish-type tabs (those are visible anyway).
  const activeChips: { key: string; label: string; remove: () => void }[] = [
    ...filters.ingredienten.map((id) => ({
      key: id,
      label: labelOf(id),
      remove: () =>
        setFilters((f) => ({
          ...f,
          ingredienten: f.ingredienten.filter((x) => x !== id),
          vlees: id === "vlees" ? [] : f.vlees,
        })),
    })),
    ...filters.vlees.map((id) => ({
      key: id,
      label: labelOf(id),
      remove: () => setFilters((f) => ({ ...f, vlees: f.vlees.filter((x) => x !== id) })),
    })),
    ...(filters.tijd
      ? [{ key: "tijd", label: TIJDEN.find((t) => t.id === filters.tijd)!.short, remove: () => setFilters((f) => ({ ...f, tijd: null })) }]
      : []),
    ...filters.eigen.map((l) => ({
      key: `eigen-${l}`,
      label: l,
      remove: () => setFilters((f) => ({ ...f, eigen: f.eigen.filter((x) => x !== l) })),
    })),
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 pb-32 pt-7">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900">{favoritesOnly ? "Favorieten" : "GijsRecepten"}</h1>

      <div className="mb-3 mt-4 flex gap-2">
        <input
          className="input"
          type="search"
          placeholder="Zoek op titel of ingrediënt…"
          aria-label="Zoek recept"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          aria-label={badge > 0 ? `Filters, ${badge} actief` : "Filters"}
          onClick={() => setSheetOpen(true)}
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-800 text-[#fbf6ee]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="8" cy="17" r="2" />
          </svg>
          {badge > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-700 px-1 text-xs font-semibold text-white">
              {badge}
            </span>
          )}
        </button>
      </div>

      <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip pressed={filters.gerecht === null} onClick={() => setFilters((f) => ({ ...f, gerecht: null }))}>
          Alles
        </Chip>
        {GERECHTEN.map((g) => (
          <Chip key={g.id} pressed={filters.gerecht === g.id} onClick={() => setFilters((f) => ({ ...f, gerecht: g.id }))}>
            {g.label}
          </Chip>
        ))}
      </div>

      {data && pool.length > 0 && (
        <div className="mb-3 flex min-h-9 items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {activeChips.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-label={`Verwijder filter ${c.label}`}
                onClick={c.remove}
                className="flex h-9 items-center gap-1.5 rounded-full bg-lime-100 pl-3.5 pr-2.5 text-sm font-semibold text-lime-900"
              >
                {c.label}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            ))}
          </div>
          <span className="shrink-0 text-sm text-stone-600">
            {shown.length} {shown.length === 1 ? "recept" : "recepten"}
          </span>
        </div>
      )}

      {withoutCategory > 0 && !favoritesOnly && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-orange-100 px-4 py-3 text-sm text-orange-900">
          <span>
            {withoutCategory === 1 ? "1 recept heeft nog geen categorie." : `${withoutCategory} recepten hebben nog geen categorie.`}
          </span>
          <button type="button" className="btn-primary shrink-0" disabled={!!tidyLabel} onClick={tidyTags}>
            {tidyLabel ?? "Instellen"}
          </button>
        </div>
      )}

      {error && <p className="text-red-700">{error}</p>}

      {!data && !error && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3" aria-label="Laden" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <RecipeCardSkeleton key={i} />
          ))}
        </div>
      )}

      {data && pool.length === 0 && (
        <div className="mx-auto mt-10 max-w-xs text-center">
          <p className="font-display text-xl font-semibold">{favoritesOnly ? "Nog geen favorieten" : "Nog geen recepten"}</p>
          <p className="mt-2 text-stone-600">
            {favoritesOnly
              ? "Tik op het hartje bij een recept om het hier te bewaren."
              : "Plak een link, foto of tekst en je eerste recept staat er zo."}
          </p>
          {!favoritesOnly && (
            <a href="#/new" className="btn-primary mt-5">
              Eerste recept toevoegen
            </a>
          )}
        </div>
      )}

      {data && pool.length > 0 && shown.length === 0 && (
        <div className="py-10 text-center text-stone-600">
          <p className="font-display text-xl font-semibold text-stone-900">Niets gevonden</p>
          {filtering && (
            <button
              type="button"
              className="mt-3 underline"
              onClick={() => {
                setFilters(noFilters);
                setQuery("");
              }}
            >
              Wis filters en zoekopdracht
            </button>
          )}
        </div>
      )}

      <ul className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
        {shown.map((r) => (
          <li key={r.id}>
            <RecipeCard recipe={r} favorite={isFav(r)} onToggleFavorite={() => toggleFavorite(r)} />
          </li>
        ))}
      </ul>

      {sheetOpen && (
        <FilterSheet filters={filters} onChange={setFilters} count={shown.length} labels={labels} onClose={closeSheet} />
      )}
      <BottomNav active={favoritesOnly ? "favorites" : "list"} />
    </main>
  );
}
