import Anthropic from "@anthropic-ai/sdk";
import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { checkPassword, createToken, verifyToken } from "../lib/auth.ts";
import { DEFAULT_MODEL, NoRecipeError, extractRecipeWithAi, type AiInput } from "../lib/ai-import.ts";
import { parseRecipeFromHtml } from "../lib/parse-recipe.ts";
import { fetchHtml } from "../lib/safe-fetch.ts";
import { ValidationError, validateRecipe } from "../lib/validate.ts";

export const config: Config = { path: "/api/*" };

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

function env(name: string): string {
  const value = Netlify.env.get(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ValidationError("Invalid JSON");
  }
}

export default async (req: Request): Promise<Response> => {
  const path = new URL(req.url).pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const [resource, id] = path.split("/");

  try {
    const secret = env("SESSION_SECRET");

    if (resource === "login" && req.method === "POST") {
      const body = (await readJson(req)) as { password?: unknown };
      const ok = typeof body.password === "string" && checkPassword(body.password, env("APP_PASSWORD"));
      return ok ? json({ token: createToken(secret) }) : json({ error: "Wrong password" }, 401);
    }

    const token = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
    if (!verifyToken(token, secret)) return json({ error: "Unauthorized" }, 401);

    if (resource === "import" && req.method === "POST") {
      const body = (await readJson(req)) as { url?: unknown };
      if (typeof body.url !== "string") throw new ValidationError("url is required");
      const html = await fetchHtml(body.url);
      const draft = parseRecipeFromHtml(html, body.url);
      return draft ? json(draft) : json({ error: "No recipe found on that page" }, 422);
    }

    if (resource === "import-ai" && req.method === "POST") {
      const body = (await readJson(req)) as { text?: unknown; image?: { media_type?: unknown; data?: unknown } };
      const input: AiInput =
        typeof body.text === "string"
          ? { text: body.text }
          : typeof body.image?.data === "string" && typeof body.image.media_type === "string"
            ? { image: { media_type: body.image.media_type, data: body.image.data } }
            : (() => {
                throw new ValidationError("text of image is verplicht");
              })();
      try {
        const client = new Anthropic({ apiKey: env("ANTHROPIC_API_KEY") });
        return json(await extractRecipeWithAi(input, client, Netlify.env.get("ANTHROPIC_MODEL") || DEFAULT_MODEL));
      } catch (err) {
        if (err instanceof NoRecipeError) return json({ error: err.message }, 422);
        throw err;
      }
    }

    if (resource !== "recipes") return json({ error: "Not found" }, 404);

    const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_KEY"), {
      auth: { persistSession: false },
    });

    if (!id && req.method === "GET") {
      const { data, error } = await db.from("recipes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (!id && req.method === "POST") {
      const recipe = validateRecipe(await readJson(req));
      const { data, error } = await db.from("recipes").insert(recipe).select().single();
      if (error) throw error;
      return json(data, 201);
    }

    if (id && req.method === "GET") {
      const { data, error } = await db.from("recipes").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? json(data) : json({ error: "Not found" }, 404);
    }

    if (id && req.method === "PUT") {
      const recipe = validateRecipe(await readJson(req));
      const { data, error } = await db.from("recipes").update(recipe).eq("id", id).select().maybeSingle();
      if (error) throw error;
      return data ? json(data) : json({ error: "Not found" }, 404);
    }

    if (id && req.method === "DELETE") {
      const { error } = await db.from("recipes").delete().eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    if (err instanceof ValidationError) return json({ error: err.message }, 400);
    console.error(err);
    const message = err instanceof Error ? err.message : "Server error";
    return json({ error: message }, 500);
  }
};
