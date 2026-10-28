// Extracts a recipe from schema.org JSON-LD embedded in a web page.

export interface RecipeDraft {
  title: string;
  source_url: string | null;
  image_url: string | null;
  description: string | null;
  servings: number | null;
  total_minutes: number | null;
  ingredients: string[];
  steps: string[];
  tags: string[];
}

type Json = unknown;
type Obj = Record<string, Json>;

const isObj = (v: Json): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

export function decodeEntities(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function collectNodes(value: Json, out: Obj[]): void {
  if (Array.isArray(value)) {
    value.forEach((v) => collectNodes(v, out));
  } else if (isObj(value)) {
    out.push(value);
    if (value["@graph"]) collectNodes(value["@graph"], out);
  }
}

function isRecipe(node: Obj): boolean {
  const type = node["@type"];
  return Array.isArray(type) ? type.includes("Recipe") : type === "Recipe";
}

function findRecipeNode(html: string): Obj | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    try {
      const nodes: Obj[] = [];
      collectNodes(JSON.parse(match[1].trim()), nodes);
      const recipe = nodes.find(isRecipe);
      if (recipe) return recipe;
    } catch {
      // Malformed JSON-LD block: try the next one.
    }
  }
  return null;
}

function toText(value: Json): string | null {
  if (typeof value === "string") return decodeEntities(value) || null;
  if (typeof value === "number") return String(value);
  return null;
}

function toImage(value: Json): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.length ? toImage(value[0]) : null;
  if (isObj(value)) return toImage(value.url);
  return null;
}

export function parseDurationMinutes(value: Json): number | null {
  if (typeof value !== "string") return null;
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/.exec(value);
  if (!m) return null;
  const minutes = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return minutes > 0 ? minutes : null;
}

function toServings(value: Json): number | null {
  const first = Array.isArray(value) ? value[0] : value;
  const m = /\d+/.exec(String(first ?? ""));
  return m ? Math.min(Number(m[0]), 99) || null : null;
}

function toSteps(value: Json): string[] {
  if (typeof value === "string") {
    return value
      .split(/\r?\n+/)
      .map(decodeEntities)
      .filter(Boolean);
  }
  if (Array.isArray(value)) return value.flatMap(toSteps);
  if (isObj(value)) {
    if (value.itemListElement) return toSteps(value.itemListElement);
    return toSteps(value.text ?? value.name);
  }
  return [];
}

function toTags(node: Obj): string[] {
  const raw: string[] = [];
  for (const key of ["recipeCategory", "recipeCuisine", "keywords"]) {
    const v = node[key];
    const parts = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
    parts.forEach((p) => typeof p === "string" && raw.push(p));
  }
  const tags = raw.map((t) => decodeEntities(t).toLowerCase()).filter((t) => t && t.length <= 30);
  return [...new Set(tags)].slice(0, 8);
}

export function parseRecipeFromHtml(html: string, sourceUrl: string): RecipeDraft | null {
  const node = findRecipeNode(html);
  if (!node) return null;
  const title = toText(node.name);
  if (!title) return null;

  const ingredients = (Array.isArray(node.recipeIngredient) ? node.recipeIngredient : [])
    .map(toText)
    .filter((x): x is string => !!x);

  return {
    title,
    source_url: sourceUrl,
    image_url: toImage(node.image),
    description: toText(node.description),
    servings: toServings(node.recipeYield),
    total_minutes: parseDurationMinutes(node.totalTime) ?? parseDurationMinutes(node.cookTime),
    ingredients,
    steps: toSteps(node.recipeInstructions),
    tags: toTags(node),
  };
}
