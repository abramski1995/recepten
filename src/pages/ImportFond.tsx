import { useState } from "react";
import { UnauthorizedError, createRecipe, listRecipes } from "../lib/api.ts";
import { convertFondExport, type FondConversion } from "../lib/fond.ts";
import type { RecipeInput } from "../types.ts";

export function ImportFond({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [conversion, setConversion] = useState<FondConversion | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setError(null);
    setResult(null);
    try {
      setConversion(convertFondExport(JSON.parse(await file.text())));
    } catch (e) {
      setConversion(null);
      setError(e instanceof Error ? e.message : "Bestand kon niet gelezen worden");
    }
  }

  async function run() {
    if (!conversion) return;
    setBusy(true);
    setError(null);
    try {
      // Skip what is already in the app, so running this twice never creates duplicates.
      const existing = await listRecipes();
      const known = new Set(existing.map((r) => `${r.title.toLowerCase()}|${r.source_url ?? ""}`));
      const todo: RecipeInput[] = conversion.recipes.filter(
        (r) => !known.has(`${r.title.toLowerCase()}|${r.source_url ?? ""}`),
      );
      let failed = 0;
      for (const [i, recipe] of todo.entries()) {
        setProgress({ done: i, total: todo.length });
        try {
          await createRecipe(recipe);
        } catch (e) {
          if (e instanceof UnauthorizedError) throw e;
          failed++;
        }
      }
      setProgress(null);
      setResult(
        `${todo.length - failed} recepten toegevoegd` +
          (conversion.recipes.length - todo.length ? `, ${conversion.recipes.length - todo.length} stonden er al` : "") +
          (failed ? `, ${failed} mislukt` : "") +
          ".",
      );
    } catch (e) {
      if (e instanceof UnauthorizedError) onUnauthorized();
      else setError(e instanceof Error ? e.message : "Importeren mislukt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <a href="#/" className="text-sm text-orange-800">
        ← Terug
      </a>
      <h1 className="mb-2 mt-2 text-2xl font-semibold">Importeren uit Fond</h1>
      <p className="mb-4 text-stone-600">
        Kies het bestand <code>fond-export-….json</code> uit je Fond-export. Foto's zitten niet in de export; die kun je
        later per recept toevoegen.
      </p>

      <label className="btn-ghost w-full cursor-pointer">
        Kies Fond-exportbestand (.json)
        <input
          type="file"
          accept="application/json,.json"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void onFile(file);
          }}
        />
      </label>

      {conversion && !result && (
        <section className="mt-4">
          <p>
            <strong>{conversion.recipes.length}</strong> recepten gevonden
            {conversion.skipped.length > 0 && (
              <span className="text-stone-500">
                {" "}
                ({conversion.skipped.length} overgeslagen: {conversion.skipped.join(", ")} — geen receptgegevens in de
                export)
              </span>
            )}
            .
          </p>
          <ul className="mt-2 max-h-64 list-disc space-y-0.5 overflow-y-auto pl-5 text-sm text-stone-600">
            {conversion.recipes.map((r, i) => (
              <li key={i}>{r.title}</li>
            ))}
          </ul>
          <button className="btn-primary mt-4 w-full" disabled={busy} onClick={run}>
            {progress ? `Bezig… ${progress.done + 1} van ${progress.total}` : busy ? "Bezig…" : "Importeren"}
          </button>
        </section>
      )}

      {result && (
        <p className="mt-4 rounded-xl bg-green-100 p-3 text-green-900">
          {result}{" "}
          <a href="#/" className="underline">
            Naar mijn recepten
          </a>
        </p>
      )}
      {error && <p className="mt-4 text-red-700">{error}</p>}
    </main>
  );
}
