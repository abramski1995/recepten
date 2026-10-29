import { useCallback, useMemo, useState } from "react";
import { UnauthorizedError, listRecipes, translateRecipe, updateRecipe } from "../lib/api.ts";
import { Chip } from "../components/Chip.tsx";
import { FilterSheet } from "../components/FilterSheet.tsx";
import { autoTags } from "../lib/autotag.ts";
import { activeCount, customLabels, filterRecipes, noFilters, type Filters } from "../lib/filter.ts";
import { GERECHTEN, TIJDEN, cleanTags, isGerecht, labelOf, sameTags } from "../lib/taxonomy.ts";
import { looksDutch } from "../lib/lang.ts";
import { useImagePolling } from "../lib/useImagePolling.ts";
import { go } from "../lib/useRoute.ts";
import { useLoad } from "../lib/useLoad.ts";

export function RecipeList({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [reload, setReload] = useState(0);
  const { data, error } = useLoad(listRecipes, onUnauthorized, [reload], true);
  useImagePolling(data, () => setReload((n) => n + 1));
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(noFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const [tagging, setTagging] = useState<string | null>(null);

  const shown = useMemo(() => (data ? filterRecipes(data, query, filters) : []), [data, query, filters]);
  const labels = useMemo(() => (data ? customLabels(data) : []), [data]);
  const withoutCategory = useMemo(() => (data ? data.filter((r) => !r.tags.some(isGerecht)).length : 0), [data]);
  const badge = activeCount(filters);

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

  // Gives every recipe one dish type and clean ingredient tags; own labels are kept.
  async function tidyTags() {
    if (!data) return;
    const changes = data
      .map((r) => ({ r, tags: cleanTags(r.tags, autoTags(r)) }))
      .filter(({ r, tags }) => !sameTags(r.tags, tags));
    if (changes.length === 0) return alert("Alle categorieën zijn al in orde.");
    if (
      !confirm(
        `Categorieën instellen voor ${changes.length} recepten? Je eigen labels blijven staan; oude tags zoals oven, slowcooker en snel verdwijnen (de tijd wordt automatisch bepaald).`,
      )
    )
      return;
    try {
      for (const [i, { r, tags }] of changes.entries()) {
        setTagging(`Categorieën instellen… ${i + 1} van ${changes.length}`);
        const { id: _id, created_at: _c, updated_at: _u, ...input } = r;
        await updateRecipe(r.id, { ...input, tags });
      }
      setReload((n) => n + 1);
    } catch (e) {
      if (e instanceof UnauthorizedError) onUnauthorized();
      else alert(e instanceof Error ? e.message : "Categorieën instellen mislukt");
    } finally {
      setTagging(null);
    }
  }

  // Translates recipes that are not in Dutch yet (e.g. imported before translation existed).
  async function translateAll() {
    if (!data) return;
    const foreign = data.filter((r) => !looksDutch(r));
    if (foreign.length === 0) return alert("Alle recepten zijn al in het Nederlands.");
    if (!confirm(`${foreign.length} Engelstalige recepten vertalen naar het Nederlands? Het origineel wordt vervangen.`)) return;
    let failed = 0;
    try {
      for (const [i, r] of foreign.entries()) {
        setTagging(`Vertalen… ${i + 1} van ${foreign.length}`);
        const { id: _id, created_at: _c, updated_at: _u, ...input } = r;
        try {
          const nl = { ...input, ...(await translateRecipe(input)) };
          await updateRecipe(r.id, { ...nl, tags: cleanTags(nl.tags, autoTags(nl)) });
        } catch (e) {
          if (e instanceof UnauthorizedError) throw e;
          failed++;
        }
      }
      if (failed) alert(`${failed} recepten konden niet vertaald worden.`);
      setReload((n) => n + 1);
    } catch (e) {
      if (e instanceof UnauthorizedError) onUnauthorized();
    } finally {
      setTagging(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-orange-800">GijsRecepten</h1>
        <button className="btn-primary" onClick={() => go("/new")}>
          + Nieuw
        </button>
      </header>

      <div className="mb-3 flex gap-2">
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
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-800 text-[#fffaf3]"
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

      {data && data.length > 0 && (
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
          <span className="shrink-0 text-sm text-stone-500">
            {shown.length} {shown.length === 1 ? "recept" : "recepten"}
          </span>
        </div>
      )}

      {withoutCategory > 0 && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-orange-100 px-4 py-3 text-sm text-orange-900">
          <span>{withoutCategory} recepten hebben nog geen categorie.</span>
          <button type="button" className="btn-primary shrink-0" disabled={!!tagging} onClick={tidyTags}>
            {tagging ?? "Instellen"}
          </button>
        </div>
      )}

      {error && <p className="text-red-700">{error}</p>}
      {!data && !error && <p className="text-stone-500">Laden…</p>}
      {data && data.length === 0 && (
        <p className="text-stone-500">Nog geen recepten. Tik op “+ Nieuw” en plak een link.</p>
      )}
      {data && data.length > 0 && shown.length === 0 && (
        <div className="py-8 text-center text-stone-500">
          <p>Niets gevonden.</p>
          {(badge > 0 || filters.gerecht || query) && (
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

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shown.map((r) => (
          <li key={r.id}>
            <a href={`#/r/${r.id}`} className="block overflow-hidden rounded-2xl bg-white shadow-sm">
              {r.image_url ? (
                <img src={r.image_url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-orange-100 text-3xl">🍲</div>
              )}
              <div className="p-3">
                <h2 className="line-clamp-2 text-sm font-medium leading-snug">{r.title}</h2>
                {r.total_minutes && <p className="mt-1 text-xs text-stone-500">{r.total_minutes} min</p>}
              </div>
            </a>
          </li>
        ))}
      </ul>

      {data && data.length > 0 && (
        <p className="mt-8 text-center text-sm text-stone-500">
          <button className="underline disabled:opacity-50" disabled={!!tagging} onClick={tidyTags}>
            {tagging ?? "Categorieën opschonen"}
          </button>
          {" · "}
          <button className="underline disabled:opacity-50" disabled={!!tagging} onClick={translateAll}>
            Engelse recepten vertalen
          </button>
        </p>
      )}
      <p className="mt-4 text-center text-sm text-stone-500">
        <a href="#/import" className="underline">
          Importeren uit Fond
        </a>
      </p>
      {sheetOpen && (
        <FilterSheet
          filters={filters}
          onChange={setFilters}
          count={shown.length}
          labels={labels}
          onClose={closeSheet}
        />
      )}
    </main>
  );
}
