// Converts a Fond data export (JSON, export version 2) into recipes for this app.
import type { RecipeInput } from "../types.ts";
import { autoTags } from "./autotag.ts";

interface FondNode {
  id: number;
  title: string;
  text: string;
  time?: number;
  dependencies?: number[];
}

interface FondRecipe {
  id: string;
  title: string;
  url?: string | null;
  ingredients?: string[];
  nodes?: FondNode[];
  deleted?: boolean;
}

export interface FondConversion {
  recipes: RecipeInput[];
  skipped: string[];
}

// Fond marks ingredients inside step text as "[1 el olie]"; show them as plain text.
const plain = (text: string) => text.replace(/\[([^\]]*)\]/g, "$1").replace(/\s+/g, " ").trim();

// Total time = longest chain of dependent steps (steps without dependencies run in parallel).
export function totalMinutes(nodes: FondNode[]): number | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const memo = new Map<number, number>();
  const finish = (id: number, seen: Set<number>): number => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    const node = byId.get(id);
    if (!node || seen.has(id)) return 0;
    seen.add(id);
    const start = Math.max(0, ...(node.dependencies ?? []).map((d) => finish(d, seen)));
    seen.delete(id);
    const end = start + (node.time ?? 0);
    memo.set(id, end);
    return end;
  };
  const total = Math.max(0, ...nodes.map((n) => finish(n.id, new Set())));
  return total > 0 ? Math.round(total) : null;
}

export function convertFondExport(data: unknown): FondConversion {
  const root = data as { savedRecipes?: FondRecipe[]; authoredRecipes?: FondRecipe[] };
  if (!root || !Array.isArray(root.savedRecipes) || !Array.isArray(root.authoredRecipes)) {
    throw new Error("Dit lijkt geen Fond-export (.json) te zijn");
  }

  // Authored recipes carry the full data; saved entries may only point to them. Dedupe by Fond id.
  const byId = new Map<string, FondRecipe>();
  const skipped: string[] = [];
  for (const r of [...root.authoredRecipes, ...root.savedRecipes]) {
    if (r.deleted || !r.nodes) {
      if (!byId.has(r.id)) skipped.push(r.title);
      continue;
    }
    if (!byId.has(r.id) || !byId.get(r.id)!.nodes) byId.set(r.id, r);
  }
  // Drop "skipped" entries that turned out to be covered by a full authored copy.
  const stillSkipped = skipped.filter((title) => ![...byId.values()].some((r) => r.title === title));

  // Same recipe saved twice under different ids: keep the first.
  const seen = new Set<string>();
  const recipes: RecipeInput[] = [];
  for (const r of byId.values()) {
    const key = `${r.title.toLowerCase()}|${r.url ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const recipe: RecipeInput = {
      title: r.title,
      source_url: r.url ?? null,
      image_url: null,
      description: null,
      notes: null,
      servings: null,
      total_minutes: totalMinutes(r.nodes!),
      ingredients: (r.ingredients ?? []).map((i) => i.trim()).filter(Boolean),
      steps: r.nodes!.map((n) => `${n.title} — ${plain(n.text)}`),
      tags: [],
    };
    recipe.tags = autoTags(recipe);
    recipes.push(recipe);
  }
  return { recipes, skipped: stillSkipped };
}
