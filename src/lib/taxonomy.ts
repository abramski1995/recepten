// The fixed category structure used for filtering. Tags are stored as a flat list on the recipe;
// everything that is not in these lists is a free "own label". Time is not a tag: it is derived
// from total_minutes, so it can never be out of date.

export const GERECHTEN = [
  { id: "hoofdgerecht", label: "Hoofdgerecht" },
  { id: "soep", label: "Soep" },
  { id: "salade", label: "Salade" },
  { id: "lunch", label: "Lunch" },
  { id: "dessert", label: "Dessert" },
] as const;

export const INGREDIENTEN = [
  { id: "vlees", label: "Vlees" },
  { id: "vis", label: "Vis" },
  { id: "vegetarisch", label: "Vegetarisch" },
  { id: "pasta", label: "Pasta" },
  { id: "rijst", label: "Rijst" },
] as const;

export const VLEESSOORTEN = [
  { id: "kip", label: "Kip" },
  { id: "rund", label: "Rund" },
  { id: "varken", label: "Varken" },
] as const;

export const TIJDEN = [
  { id: "snel", label: "Snel, 30 min of minder", short: "Snel" },
  { id: "rustig", label: "Rustig aan", short: "Rustig aan" },
  { id: "langzaam", label: "Langzaam, 2 uur of meer", short: "Langzaam" },
] as const;

export type TimeId = (typeof TIJDEN)[number]["id"];

const ids = (list: readonly { id: string }[]) => list.map((x) => x.id);
const GERECHT_IDS = new Set(ids(GERECHTEN));
const MEAT_KIND_IDS = new Set(ids(VLEESSOORTEN));
const CONTROLLED = new Set([...GERECHT_IDS, ...ids(INGREDIENTEN), ...MEAT_KIND_IDS]);

// Tags from earlier versions that are replaced by something derived or no longer used.
const OBSOLETE = new Set(["oven", "slowcooker", "snel"]);

export const isGerecht = (tag: string) => GERECHT_IDS.has(tag);
export const isMeatKind = (tag: string) => MEAT_KIND_IDS.has(tag);
export const isControlled = (tag: string) => CONTROLLED.has(tag);

export const labelOf = (id: string): string =>
  [...GERECHTEN, ...INGREDIENTEN, ...VLEESSOORTEN].find((x) => x.id === id)?.label ?? id;

export function timeBucket(minutes: number | null): TimeId | null {
  if (minutes === null || minutes <= 0) return null;
  if (minutes <= 30) return "snel";
  return minutes < 120 ? "rustig" : "langzaam";
}

// Free-form labels the user added themselves.
export const customOnly = (tags: string[]) => tags.filter((t) => !isControlled(t));

// Combines a recipe's existing tags with suggested ones into a tidy set:
// one dish type (the existing one wins when there is exactly one), obsolete tags removed,
// "kip/rund/varken" implying "vlees", no duplicates.
export function cleanTags(existing: string[], suggested: string[]): string[] {
  const kept = existing.map((t) => t.trim().toLowerCase()).filter((t) => t && !OBSOLETE.has(t));
  const have = kept.filter(isGerecht);
  const gerecht = have.length === 1 ? have : suggested.filter(isGerecht).slice(0, 1);
  const rest = [...kept, ...suggested].filter((t) => !isGerecht(t));
  if (rest.some(isMeatKind)) rest.push("vlees");
  return [...new Set([...gerecht, ...rest])];
}

export const sameTags = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");
