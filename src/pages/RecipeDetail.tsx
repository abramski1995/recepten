import { useState } from "react";
import { deleteRecipe, getRecipe } from "../lib/api.ts";
import { requestImage } from "../lib/images.ts";
import { useImagePolling } from "../lib/useImagePolling.ts";
import { scaleIngredient } from "../lib/scale.ts";
import { useLoad } from "../lib/useLoad.ts";
import { go } from "../lib/useRoute.ts";

export function RecipeDetail({ id, onUnauthorized }: { id: string; onUnauthorized: () => void }) {
  const [reload, setReload] = useState(0);
  const { data: recipe, error } = useLoad(() => getRecipe(id), onUnauthorized, [id, reload], true);
  const [servings, setServings] = useState<number | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  useImagePolling(recipe ? [recipe] : null, () => setReload((n) => n + 1));

  if (error) return <p className="p-4 text-red-700">{error}</p>;
  if (!recipe) return <p className="p-4 text-stone-500">Laden…</p>;

  const base = recipe.servings;
  const current = servings ?? base;
  const factor = base && current ? current / base : 1;

  async function newImage() {
    setImageBusy(true);
    try {
      await requestImage(id, true, recipe?.image_url ?? null);
      setReload((n) => n + 1); // starts polling; the new photo replaces the old one when ready
    } catch (e) {
      alert(e instanceof Error ? e.message : "Foto genereren mislukt");
    } finally {
      setImageBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Dit recept verwijderen?")) return;
    await deleteRecipe(id);
    go("/");
  }

  return (
    <main className="mx-auto max-w-2xl pb-24">
      {recipe.image_url && <img src={recipe.image_url} alt="" className="aspect-[4/3] w-full object-cover" />}
      <div className="px-4 pt-4">
        <a href="#/" className="text-sm text-orange-800">
          ← Alle recepten
        </a>
        <h1 className="mt-2 text-2xl font-semibold">{recipe.title}</h1>
        {recipe.description && <p className="mt-2 text-stone-600">{recipe.description}</p>}

        <div className="mt-3 flex flex-wrap gap-2 text-sm text-stone-600">
          {recipe.total_minutes && <span>⏱ {recipe.total_minutes} min</span>}
          {recipe.tags.map((t) => (
            <span key={t} className="rounded-full bg-stone-200/70 px-2 py-0.5">
              {t}
            </span>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button className="btn-primary flex-1" onClick={() => go(`/cook/${id}`)}>
            👩‍🍳 Kookmodus
          </button>
          <button className="btn-ghost" onClick={() => go(`/edit/${id}`)}>
            Bewerk
          </button>
        </div>

        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ingrediënten</h2>
            {base && current && (
              <div className="flex items-center gap-2">
                <button
                  className="btn-ghost h-9 w-9 !p-0"
                  aria-label="Minder personen"
                  onClick={() => setServings(Math.max(1, current - 1))}
                >
                  −
                </button>
                <span className="min-w-16 text-center text-sm">{current} pers.</span>
                <button
                  className="btn-ghost h-9 w-9 !p-0"
                  aria-label="Meer personen"
                  onClick={() => setServings(Math.min(99, current + 1))}
                >
                  +
                </button>
              </div>
            )}
          </div>
          <ul className="space-y-1.5">
            {recipe.ingredients.map((ing, i) => (
              <li key={i}>{scaleIngredient(ing, factor)}</li>
            ))}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-lg font-semibold">Bereiding</h2>
          <ol className="space-y-3">
            {recipe.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-700 text-xs text-white">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        {recipe.notes && (
          <section className="mt-6">
            <h2 className="mb-2 text-lg font-semibold">Notities</h2>
            <p className="whitespace-pre-wrap text-stone-700">{recipe.notes}</p>
          </section>
        )}

        <footer className="mt-8 flex items-center justify-between text-sm text-stone-500">
          {recipe.source_url ? (
            <a href={recipe.source_url} target="_blank" rel="noreferrer noopener" className="underline">
              Bron: {new URL(recipe.source_url).hostname}
            </a>
          ) : (
            <span />
          )}
          <button className="disabled:opacity-50" disabled={imageBusy} onClick={newImage}>
            {recipe.image_url ? "Nieuwe AI-foto" : "AI-foto maken"}
          </button>
          <button className="text-red-700" onClick={remove}>
            Verwijderen
          </button>
        </footer>
      </div>
    </main>
  );
}
