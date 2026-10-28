// Finds the photo that belongs to a recipe's source page (the original author's picture).
import { metaContent, parseRecipeFromHtml } from "./parse-recipe.ts";
import { fetchHtml, fetchImage, type DownloadedImage } from "./safe-fetch.ts";

// Order: the recipe's own schema.org image, then the social preview image (og:image / twitter:image).
export function findSourceImageUrl(html: string, pageUrl: string): string | null {
  const candidates = [
    parseRecipeFromHtml(html, pageUrl)?.image_url,
    ...metaContent(html, ["og:image", "og:image:url", "og:image:secure_url"]),
    ...metaContent(html, ["twitter:image", "twitter:image:src"]),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate, pageUrl);
      if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    } catch {
      // not a usable URL: try the next candidate
    }
  }
  return null;
}

export async function fetchSourceImage(
  sourceUrl: string,
  deps: { fetchHtml?: typeof fetchHtml; fetchImage?: typeof fetchImage } = {},
): Promise<DownloadedImage | null> {
  const html = await (deps.fetchHtml ?? fetchHtml)(sourceUrl);
  const imageUrl = findSourceImageUrl(html, sourceUrl);
  return imageUrl ? (deps.fetchImage ?? fetchImage)(imageUrl) : null;
}
