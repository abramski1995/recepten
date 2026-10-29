import { useState } from "react";
import { UnauthorizedError, translateRecipe, updateRecipe } from "./api.ts";
import { autoTags } from "./autotag.ts";
import { looksDutch } from "./lang.ts";
import { cleanTags, sameTags } from "./taxonomy.ts";
import type { Recipe } from "../types.ts";

// Bulk clean-ups over all recipes (tags, translation), with progress for the UI.
export function useMaintenance(recipes: Recipe[] | null, onUnauthorized: () => void, onDone: () => void) {
  const [label, setLabel] = useState<string | null>(null);

  async function run(work: () => Promise<void>, failure: string) {
    try {
      await work();
      onDone();
    } catch (e) {
      if (e instanceof UnauthorizedError) onUnauthorized();
      else alert(e instanceof Error ? e.message : failure);
    } finally {
      setLabel(null);
    }
  }

  // Gives every recipe one dish type and clean ingredient tags; own labels are kept.
  async function tidyTags() {
    if (!recipes) return;
    const changes = recipes
      .map((r) => ({ r, tags: cleanTags(r.tags, autoTags(r)) }))
      .filter(({ r, tags }) => !sameTags(r.tags, tags));
    if (changes.length === 0) return alert("Alle categorieën zijn al in orde.");
    if (
      !confirm(
        `Categorieën instellen voor ${changes.length} recepten? Je eigen labels blijven staan; oude tags zoals oven, slowcooker en snel verdwijnen (de tijd wordt automatisch bepaald).`,
      )
    )
      return;
    await run(async () => {
      for (const [i, { r, tags }] of changes.entries()) {
        setLabel(`Categorieën instellen… ${i + 1} van ${changes.length}`);
        const { id: _id, created_at: _c, updated_at: _u, favorite: _f, ...input } = r;
        await updateRecipe(r.id, { ...input, tags });
      }
    }, "Categorieën instellen mislukt");
  }

  // Translates recipes that are not in Dutch yet (e.g. imported before translation existed).
  async function translateAll() {
    if (!recipes) return;
    const foreign = recipes.filter((r) => !looksDutch(r));
    if (foreign.length === 0) return alert("Alle recepten zijn al in het Nederlands.");
    if (!confirm(`${foreign.length} Engelstalige recepten vertalen naar het Nederlands? Het origineel wordt vervangen.`)) return;
    let failed = 0;
    await run(async () => {
      for (const [i, r] of foreign.entries()) {
        setLabel(`Vertalen… ${i + 1} van ${foreign.length}`);
        const { id: _id, created_at: _c, updated_at: _u, favorite: _f, ...input } = r;
        try {
          const nl = { ...input, ...(await translateRecipe(input)) };
          await updateRecipe(r.id, { ...nl, tags: cleanTags(nl.tags, autoTags(nl)) });
        } catch (e) {
          if (e instanceof UnauthorizedError) throw e;
          failed++;
        }
      }
      if (failed) alert(`${failed} recepten konden niet vertaald worden.`);
    }, "Vertalen mislukt");
  }

  return { label, tidyTags, translateAll };
}
