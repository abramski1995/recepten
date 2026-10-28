import type { Recipe } from "../types.ts";

export function filterRecipes(recipes: Recipe[], query: string, tag: string | null): Recipe[] {
  const q = query.trim().toLowerCase();
  return recipes.filter((r) => {
    if (tag && !r.tags.includes(tag)) return false;
    if (!q) return true;
    return r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.toLowerCase().includes(q));
  });
}

export function allTags(recipes: Recipe[]): string[] {
  const counts = new Map<string, number>();
  recipes.forEach((r) => r.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
}
