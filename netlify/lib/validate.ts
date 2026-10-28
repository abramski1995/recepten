// Validates and normalises a recipe payload coming from the client.
import type { RecipeDraft } from "./parse-recipe.ts";

export class ValidationError extends Error {}

function str(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v ? v.slice(0, max) : null;
}

function strList(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => str(v, maxLen))
    .filter((v): v is string => v !== null)
    .slice(0, maxItems);
}

function posInt(value: unknown, max: number): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n <= max ? n : null;
}

function httpUrl(value: unknown): string | null {
  const v = str(value, 2000);
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function validateRecipe(body: unknown): RecipeDraft & { notes: string | null } {
  if (typeof body !== "object" || body === null) throw new ValidationError("Invalid body");
  const b = body as Record<string, unknown>;
  const title = str(b.title, 200);
  if (!title) throw new ValidationError("Title is required");
  return {
    title,
    source_url: httpUrl(b.source_url),
    image_url: httpUrl(b.image_url),
    description: str(b.description, 2000),
    notes: str(b.notes, 5000),
    servings: posInt(b.servings, 99),
    total_minutes: posInt(b.total_minutes, 10000),
    ingredients: strList(b.ingredients, 200, 300),
    steps: strList(b.steps, 100, 3000),
    tags: [...new Set(strList(b.tags, 20, 30).map((t) => t.toLowerCase()))],
  };
}
