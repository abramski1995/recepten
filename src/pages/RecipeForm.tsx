import { useEffect, useState, type FormEvent } from "react";
import { UnauthorizedError, createRecipe, getRecipe, importFromUrl, updateRecipe } from "../lib/api.ts";
import { go } from "../lib/useRoute.ts";
import { emptyRecipe, type RecipeInput } from "../types.ts";

const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export function RecipeForm({ id, onUnauthorized }: { id?: string; onUnauthorized: () => void }) {
  const [recipe, setRecipe] = useState<RecipeInput>(emptyRecipe);
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [tags, setTags] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fill(r: RecipeInput) {
    setRecipe(r);
    setIngredients(r.ingredients.join("\n"));
    setSteps(r.steps.join("\n"));
    setTags(r.tags.join(", "));
  }

  function fail(e: unknown) {
    if (e instanceof UnauthorizedError) onUnauthorized();
    else setError(e instanceof Error ? e.message : "Er ging iets mis");
  }

  useEffect(() => {
    if (!id) return;
    getRecipe(id).then(fill).catch(fail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function runImport() {
    setBusy(true);
    setError(null);
    try {
      fill({ ...emptyRecipe, ...(await importFromUrl(importUrl.trim())) });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload: RecipeInput = {
      ...recipe,
      ingredients: lines(ingredients),
      steps: lines(steps),
      tags: tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
    };
    try {
      const saved = id ? await updateRecipe(id, payload) : await createRecipe(payload);
      go(`/r/${saved.id}`);
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  }

  const set = <K extends keyof RecipeInput>(key: K, value: RecipeInput[K]) =>
    setRecipe((r) => ({ ...r, [key]: value }));
  const num = (v: string) => (v === "" ? null : Number(v));

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <a href={id ? `#/r/${id}` : "#/"} className="text-sm text-orange-800">
        ← Terug
      </a>
      <h1 className="mb-4 mt-2 text-2xl font-semibold">{id ? "Recept bewerken" : "Nieuw recept"}</h1>

      {!id && (
        <section className="mb-6 rounded-2xl bg-orange-100/60 p-4">
          <label className="mb-2 block text-sm font-medium">Importeer via link</label>
          <div className="flex gap-2">
            <input
              className="input"
              type="url"
              placeholder="https://…"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
            />
            <button type="button" className="btn-primary" disabled={busy || !importUrl} onClick={runImport}>
              Ophalen
            </button>
          </div>
        </section>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Titel">
          <input className="input" required value={recipe.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Afbeelding (URL)">
          <input
            className="input"
            type="url"
            value={recipe.image_url ?? ""}
            onChange={(e) => set("image_url", e.target.value || null)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Personen">
            <input
              className="input"
              type="number"
              min={1}
              max={99}
              value={recipe.servings ?? ""}
              onChange={(e) => set("servings", num(e.target.value))}
            />
          </Field>
          <Field label="Totale tijd (min)">
            <input
              className="input"
              type="number"
              min={1}
              value={recipe.total_minutes ?? ""}
              onChange={(e) => set("total_minutes", num(e.target.value))}
            />
          </Field>
        </div>
        <Field label="Ingrediënten (één per regel)">
          <textarea className="input min-h-40" value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
        </Field>
        <Field label="Bereiding (één stap per regel)">
          <textarea className="input min-h-40" value={steps} onChange={(e) => setSteps(e.target.value)} />
        </Field>
        <Field label="Tags (komma-gescheiden)">
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>
        <Field label="Notities">
          <textarea
            className="input min-h-24"
            value={recipe.notes ?? ""}
            onChange={(e) => set("notes", e.target.value || null)}
          />
        </Field>

        {error && <p className="text-red-700">{error}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? "Bezig…" : "Opslaan"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      {children}
    </label>
  );
}
