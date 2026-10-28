import { useMemo, useState } from "react";
import { listRecipes } from "../lib/api.ts";
import { allTags, filterRecipes } from "../lib/filter.ts";
import { go } from "../lib/useRoute.ts";
import { useLoad } from "../lib/useLoad.ts";

export function RecipeList({ onUnauthorized }: { onUnauthorized: () => void }) {
  const { data, error } = useLoad(listRecipes, onUnauthorized, []);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(() => (data ? allTags(data) : []), [data]);
  const shown = useMemo(() => (data ? filterRecipes(data, query, tag) : []), [data, query, tag]);

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
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setTag(tag === t ? null : t)}
              className={`shrink-0 rounded-full px-3 py-1 text-sm ${
                tag === t ? "bg-orange-700 text-white" : "bg-stone-200/70 text-stone-700"
              }`}
            >
              {t}
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

      <p className="mt-8 text-center text-sm text-stone-500">
        <a href="#/import" className="underline">
          Importeren uit Fond
        </a>
      </p>
    </main>
  );
}
