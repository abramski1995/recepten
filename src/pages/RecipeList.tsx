import { useMemo, useState } from "react";
import { UnauthorizedError, listRecipes, translateRecipe, updateRecipe } from "../lib/api.ts";
import { autoTags, mergeTags } from "../lib/autotag.ts";
import { filterRecipes, tagCounts } from "../lib/filter.ts";
import { looksDutch } from "../lib/lang.ts";
import { useImagePolling } from "../lib/useImagePolling.ts";
import { go } from "../lib/useRoute.ts";
import { useLoad } from "../lib/useLoad.ts";

export function RecipeList({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [reload, setReload] = useState(0);
  const { data, error } = useLoad(listRecipes, onUnauthorized, [reload], true);
  useImagePolling(data, () => setReload((n) => n + 1));
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [tagging, setTagging] = useState<string | null>(null);

  const tags = useMemo(() => (data ? tagCounts(data) : []), [data]);
  const shown = useMemo(() => (data ? filterRecipes(data, query, selected) : []), [data, query, selected]);
  const toggle = (t: string) => setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  // Adds suggested tags to recipes that miss them; existing tags are kept.
  async function addSmartTags() {
    if (!data) return;
    const changes = data
      .map((r) => ({ r, tags: mergeTags(r.tags, autoTags(r)) }))
      .filter(({ r, tags }) => tags.length !== r.tags.length);
    if (!confirm(`Tags automatisch toevoegen aan ${changes.length} recepten? Bestaande tags blijven staan.`)) return;
    try {
      for (const [i, { r, tags }] of changes.entries()) {
        setTagging(`Tags toevoegen… ${i + 1} van ${changes.length}`);
        const { id: _id, created_at: _c, updated_at: _u, ...input } = r;
        await updateRecipe(r.id, { ...input, tags });
      }
      setReload((n) => n + 1);
    } catch (e) {
      if (e instanceof UnauthorizedError) onUnauthorized();
      else alert(e instanceof Error ? e.message : "Tags toevoegen mislukt");
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
          await updateRecipe(r.id, { ...nl, tags: mergeTags(nl.tags, autoTags(nl)) });
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

      <input
        className="input mb-3"
        type="search"
        placeholder="Zoek op titel of ingrediënt…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {tags.length > 0 && (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {selected.length > 0 && (
            <button
              onClick={() => setSelected([])}
              className="shrink-0 rounded-full border border-orange-700 px-3 py-1 text-sm text-orange-800"
            >
              ✕ Wis filters
            </button>
          )}
          {tags.map(({ tag: t, count }) => (
            <button
              key={t}
              onClick={() => toggle(t)}
              className={`shrink-0 rounded-full px-3 py-1 text-sm ${
                selected.includes(t) ? "bg-orange-700 text-white" : "bg-stone-200/70 text-stone-700"
              }`}
            >
              {t} <span className="opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-red-700">{error}</p>}
      {!data && !error && <p className="text-stone-500">Laden…</p>}
      {data && data.length === 0 && (
        <p className="text-stone-500">Nog geen recepten. Tik op “+ Nieuw” en plak een link.</p>
      )}
      {data && data.length > 0 && shown.length === 0 && <p className="text-stone-500">Niets gevonden.</p>}

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
          <button className="underline disabled:opacity-50" disabled={!!tagging} onClick={addSmartTags}>
            {tagging ?? "Tags automatisch toevoegen"}
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
    </main>
  );
}
