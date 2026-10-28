// Background function (suffix "-background"): returns 202 at once and may run for minutes,
// which image generation needs. The client polls the recipe until image_url appears.
// Photo order: 1) the photo on the recipe's source page, 2) AI generated. (A web image search step
// could slot in between; Google's Image Search API is closed to new customers.)
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "../lib/auth.ts";
import { buildImagePrompt, DEFAULT_IMAGE_MODEL, generateImage } from "../lib/image-gen.ts";
import { fetchSourceImage } from "../lib/source-image.ts";
import type { DownloadedImage } from "../lib/safe-fetch.ts";

const BUCKET = "recipe-images";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function env(name: string): string {
  const value = Netlify.env.get(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export default async (req: Request): Promise<void> => {
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
    if (!verifyToken(token, env("SESSION_SECRET"))) return;

    const { id, force } = (await req.json()) as { id?: unknown; force?: unknown };
    if (typeof id !== "string" || !UUID.test(id)) return;

    const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_KEY"), { auth: { persistSession: false } });
    const { data: recipe, error } = await db.from("recipes").select("id,title,ingredients,image_url,source_url").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!recipe || (recipe.image_url && force !== true)) return;

    // "force" means the user wants a different photo, so skip the source photo and generate a new one.
    let image: DownloadedImage | null = null;
    if (force !== true && recipe.source_url) {
      try {
        image = await fetchSourceImage(recipe.source_url);
      } catch (err) {
        console.log("no photo on source page, falling back to AI:", err instanceof Error ? err.message : err);
      }
    }
    if (!image) {
      const data = await generateImage(
        buildImagePrompt(recipe),
        env("OPENAI_API_KEY"),
        Netlify.env.get("OPENAI_IMAGE_MODEL") || DEFAULT_IMAGE_MODEL,
      );
      image = { data, contentType: "image/jpeg", ext: "jpg" };
    }

    const path = `${id}.${image.ext}`;
    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(path, image.data, { contentType: image.contentType, upsert: true, cacheControl: "31536000" });
    if (uploadError) throw uploadError;

    // The version parameter busts caches when a photo is regenerated under the same file name.
    const url = `${db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
    const { error: updateError } = await db.from("recipes").update({ image_url: url }).eq("id", id);
    if (updateError) throw updateError;
  } catch (err) {
    console.error("image generation failed", err);
  }
};
