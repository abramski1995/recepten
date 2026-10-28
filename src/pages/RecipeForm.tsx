import { useEffect, useState, type FormEvent } from "react";
import {
  PasteHintError,
  UnauthorizedError,
  createRecipe,
  getRecipe,
  importFromImage,
  importFromText,
  importFromUrl,
  translateRecipe,
  updateRecipe,
} from "../lib/api.ts";
import { autoTags, mergeTags } from "../lib/autotag.ts";
import { looksDutch } from "../lib/lang.ts";
import { imageToBase64Jpeg } from "../lib/image.ts";
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
  const [pastedText, setPastedText] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fill(r: RecipeInput) {
    setRecipe(r);
    setIngredients(r.ingredients.join("\n"));
    setSteps(r.steps.join("\n"));
    setTags(r.tags.join(", "));
  }

  // Imports get suggested tags (kept next to whatever the source provided); the user can edit them.
  // Links with structured data come in the site's own language, so those are translated to Dutch first.
  async function fillImported(r: RecipeInput, translate = false) {
    let full = { ...emptyRecipe, ...r };
    let translated = false;
    if (translate && !looksDutch(full)) {
      setNotice("Vertalen naar Nederlands…");
      try {
        full = { ...full, ...(await translateRecipe(full)) };
        translated = true;
      } catch (e) {
        if (e instanceof UnauthorizedError) throw e;
        setImportError("Vertalen is niet gelukt; het originele recept is ingevuld.");
      }
    }
    setNotice(null);
    // Tags from a foreign-language source (e.g. "dinner") are dropped after translating; ours are Dutch.
    fill({ ...full, tags: translated ? autoTags(full) : mergeTags(full.tags, autoTags(full)) });
  }

  function fail(e: unknown, report: (message: string) => void = setError) {
    if (e instanceof UnauthorizedError) onUnauthorized();
    else if (e instanceof PasteHintError) {
      setAiOpen(true); // point the user to the paste-text box
      report(e.message);
    } else report(e instanceof Error ? e.message : "Er ging iets mis");
  }

  useEffect(() => {
    if (!id) return;
    getRecipe(id).then(fill).catch(fail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function runImport() {
    setBusy(true);
    setImportError(null);
    try {
      await fillImported(await importFromUrl(importUrl.trim()), true);
    } catch (e) {
      fail(e, setImportError);
    } finally {
      setBusy(false);
    }
  }

  async function runAi(task: () => Promise<RecipeInput>) {
    setBusy(true);
    setImportError(null);
    try {
      await fillImported(await task());
      setPastedText("");
    } catch (e) {
      fail(e, setImportError);
    } finally {
      setBusy(false);
    }
  }

  const importText = () => runAi(() => importFromText(pastedText));
  const importPhoto = (file: File) =>
    runAi(async () => {
      const { media_type, data } = await imageToBase64Jpeg(file);
      return importFromImage(media_type, data);
    });

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
          <details className="mt-4" open={aiOpen} onToggle={(e) => setAiOpen(e.currentTarget.open)}>
            <summary className="cursor-pointer text-sm font-medium">Of: foto, screenshot of tekst (AI)</summary>
            <label className="btn-ghost mt-3 w-full cursor-pointer">
              📷 Kies foto of screenshot
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void importPhoto(file);
                }}
              />
            </label>
            <textarea
              className="input mt-3 min-h-28"
              placeholder="Of plak hier de receptentekst…"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
            />
            <button type="button" className="btn-primary mt-2 w-full" disabled={busy || !pastedText.trim()} onClick={importText}>
              {busy ? "Bezig…" : "Tekst omzetten"}
            </button>
          </details>
          {notice && <p className="mt-3 text-sm text-orange-800">{notice}</p>}
          {importError && <p className="mt-3 text-sm text-red-700">{importError}</p>}
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
