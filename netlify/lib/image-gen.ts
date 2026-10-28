// Generates a food photo for a recipe with OpenAI's image API (plain fetch, no extra dependency).

export const DEFAULT_IMAGE_MODEL = "gpt-image-1";

// "200 g bloem" -> "bloem": the image prompt only needs what the ingredient is, not how much.
export function ingredientName(line: string): string {
  return line
    .replace(/\(.*?\)/g, " ")
    .replace(/^[\d\s.,/½¼¾⅓⅔⅛-]+/, "")
    .replace(/^(g|gr|gram|kg|ml|l|dl|cl|el|tl|eetlepels?|theelepels?|cm|mm|kopje|kopjes|teentjes?|stuks?|stuk|bos|bosje|blik|blikje|pak|zakje|handje|snufje|tablespoons?|teaspoons?|cups?|cloves?|pinch|bunch)\b\.?\s*/i, "")
    .replace(/^(van|of)\s+/i, "")
    .split(",")[0]
    .trim();
}

export function buildImagePrompt(r: { title: string; ingredients: string[] }): string {
  const names = r.ingredients.map(ingredientName).filter((n) => n.length > 1 && n.length < 40).slice(0, 6);
  return [
    `Appetizing, realistic overhead food photograph of the finished dish "${r.title.slice(0, 120)}",`,
    "freshly served on a plate or in a bowl on a rustic table, natural daylight, shallow depth of field, cookbook style.",
    names.length ? `Visible ingredients may include: ${names.join(", ")}.` : "",
    "No text, no logos, no people, no hands.",
  ]
    .filter(Boolean)
    .join(" ");
}

interface ImagesResponse {
  data?: { b64_json?: string; url?: string }[];
  error?: { message?: string };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Returns JPEG bytes. Retries rate limits (new OpenAI accounts only get a few images per minute).
export async function generateImage(
  prompt: string,
  apiKey: string,
  model = DEFAULT_IMAGE_MODEL,
  fetchFn: typeof fetch = fetch,
): Promise<Buffer> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetchFn("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "low",
        output_format: "jpeg",
        output_compression: 80,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (res.status === 429 && attempt < 3) {
      await sleep(15_000 * (attempt + 1));
      continue;
    }
    const body = (await res.json().catch(() => ({}))) as ImagesResponse;
    if (!res.ok) throw new Error(body.error?.message ?? `Image API returned status ${res.status}`);

    const image = body.data?.[0];
    if (image?.b64_json) return Buffer.from(image.b64_json, "base64");
    if (image?.url) return Buffer.from(await (await fetchFn(image.url)).arrayBuffer());
    throw new Error("Image API returned no image");
  }
  throw new Error("Image API rate limit");
}
