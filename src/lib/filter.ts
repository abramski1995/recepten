import type { Recipe } from "../types.ts";
import { customOnly, timeBucket, type TimeId } from "./taxonomy.ts";

export interface Filters {
  gerecht: string | null; // one dish type (the tabs)
  ingredienten: string[]; // vlees, vis, vegetarisch, pasta, rijst: all must match
  vlees: string[]; // kip, rund, varken: any of them
  tijd: TimeId | null;
  eigen: string[]; // own labels: all must match
}

export const noFilters: Filters = { gerecht: null, ingredienten: [], vlees: [], tijd: null, eigen: [] };

// Number shown on the filter button: everything except the dish-type tabs, which are always visible.
export const activeCount = (f: Filters) =>
  f.ingredienten.length + f.vlees.length + (f.tijd ? 1 : 0) + f.eigen.length;

export function filterRecipes(recipes: Recipe[], query: string, f: Filters): Recipe[] {
  const q = query.trim().toLowerCase();
  return recipes.filter((r) => {
    if (f.gerecht && !r.tags.includes(f.gerecht)) return false;
    if (!f.ingredienten.every((t) => r.tags.includes(t))) return false;
    if (f.vlees.length > 0 && !f.vlees.some((t) => r.tags.includes(t))) return false;
    if (f.tijd && timeBucket(r.total_minutes) !== f.tijd) return false;
    if (!f.eigen.every((t) => r.tags.includes(t))) return false;
    if (!q) return true;
    return r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.toLowerCase().includes(q));
  });
}

// Own labels in use, most used first.
export function customLabels(recipes: Recipe[]): string[] {
  const counts = new Map<string, number>();
  recipes.forEach((r) => customOnly(r.tags).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
}
