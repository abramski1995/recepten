import type { Recipe } from "../types.ts";

// A recipe must contain every selected tag (AND), e.g. "pasta" + "vlees".
export function filterRecipes(recipes: Recipe[], query: string, tags: string[]): Recipe[] {
  const q = query.trim().toLowerCase();
  return recipes.filter((r) => {
    if (!tags.every((t) => r.tags.includes(t))) return false;
    if (!q) return true;
    return r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.toLowerCase().includes(q));
  });
}

export interface TagCount {
  tag: string;
  count: number;
}

export function tagCounts(recipes: Recipe[]): TagCount[] {
  const counts = new Map<string, number>();
  recipes.forEach((r) => r.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
