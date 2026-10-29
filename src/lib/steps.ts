// Helpers for cooking steps: split a heading off, find times for timers, find the ingredients a step uses.
import { ingredientName } from "./ingredients.ts";

// Steps imported from Fond look like "Snipper ui — Snipper 1 witte ui."
export function splitStep(step: string): { title: string | null; text: string } {
  const i = step.indexOf(" — ");
  if (i > 0 && i <= 60) return { title: step.slice(0, i).trim(), text: step.slice(i + 3).trim() };
  return { title: null, text: step.trim() };
}

export interface TextPart {
  text: string;
  seconds?: number; // present when this part is a time such as "8 minuten"
}

const TIME = /(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|tot)\s*(\d+(?:[.,]\d+)?))?\s*(seconden|seconde|sec|minuten|minuut|min|uren|uur)\b/gi;

function toSeconds(value: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith("sec")) return Math.round(value);
  if (u.startsWith("u")) return Math.round(value * 3600);
  return Math.round(value * 60);
}

// Splits text into plain parts and time parts. For a range ("8-10 minuten") the upper value is used.
export function splitByTimes(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(TIME)) {
    const seconds = toSeconds(Number((m[2] ?? m[1]).replace(",", ".")), m[3]);
    if (seconds <= 0 || seconds > 24 * 3600) continue;
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: m[0], seconds });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

// Distinct times in a step, in order of appearance.
export function findTimers(text: string): { label: string; seconds: number }[] {
  const seen = new Set<number>();
  const out: { label: string; seconds: number }[] = [];
  for (const p of splitByTimes(text)) {
    if (p.seconds && !seen.has(p.seconds)) {
      seen.add(p.seconds);
      out.push({ label: p.text, seconds: p.seconds });
    }
  }
  return out;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Best effort: ingredients whose main word (usually the last word) appears in the step text.
export function ingredientsForStep(stepText: string, ingredients: string[]): string[] {
  const text = stepText.toLowerCase();
  return ingredients
    .filter((line) => {
      const words = ingredientName(line).toLowerCase().match(/[a-zà-ÿ]+/g) ?? [];
      const word = words.at(-1);
      if (!word || word.length < 2) return false;
      const stem = word.length > 5 && word.endsWith("en") ? word.slice(0, -2) : word;
      return new RegExp(`(^|[^a-zà-ÿ])${escapeRegex(stem)}(en|s|e|n)?($|[^a-zà-ÿ])`).test(text);
    })
    .slice(0, 8);
}
