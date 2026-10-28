// Background function (suffix "-background"): returns 202 at once and may run for minutes,
// which image generation needs. The client polls the recipe until image_url appears.
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "../lib/auth.ts";
import { buildImagePrompt, DEFAULT_IMAGE_MODEL, generateImage } from "../lib/image-gen.ts";

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
    const { data: recipe, error } = await db.from("recipes").select("id,title,ingredients,image_url").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!recipe || (recipe.image_url && force !== true)) return;

    const image = await generateImage(
      buildImagePrompt(recipe),
      env("OPENAI_API_KEY"),
      Netlify.env.get("OPENAI_IMAGE_MODEL") || DEFAULT_IMAGE_MODEL,
    );

    const path = `${id}.jpg`;
    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(path, image, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
    if (uploadError) throw uploadError;

    // The version parameter busts caches when a photo is regenerated under the same file name.
    const url = `${db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
    const { error: updateError } = await db.from("recipes").update({ image_url: url }).eq("id", id);
    if (updateError) throw updateError;
  } catch (err) {
    console.error("image generation failed", err);
  }
};
