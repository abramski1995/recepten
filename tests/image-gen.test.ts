import { describe, expect, it, vi } from "vitest";
import { buildImagePrompt, generateImage, ingredientName } from "../netlify/lib/image-gen.ts";

describe("ingredientName", () => {
  it.each([
    ["200 g bloem", "bloem"],
    ["2 el sojasaus", "sojasaus"],
    ["1/2 tl zout", "zout"],
    ["7½ cm verse gemberwortel", "verse gemberwortel"],
    ["6 teentjes knoflook", "knoflook"],
    ["2 tablespoons extra virgin olive oil", "extra virgin olive oil"],
    ["30 g koriander, blaadjes en steeltjes", "koriander"],
    ["gekookte rijst (zie blz. 274)", "gekookte rijst"],
  ])("%s -> %s", (input, expected) => expect(ingredientName(input)).toBe(expected));
});

describe("buildImagePrompt", () => {
  it("includes the title and a few ingredient names, without quantities", () => {
    const p = buildImagePrompt({ title: "Pad Krapow", ingredients: ["400 g rundergehakt", "2 el vissaus"] });
    expect(p).toContain('"Pad Krapow"');
    expect(p).toContain("rundergehakt, vissaus");
    expect(p).not.toContain("400");
    expect(p).toContain("No text");
  });
});

const ok = (b64: string) => new Response(JSON.stringify({ data: [{ b64_json: b64 }] }), { status: 200 });

describe("generateImage", () => {
  it("posts the right request and decodes the image", async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok(Buffer.from("jpegdata").toString("base64")));
    const img = await generateImage("a prompt", "sk-test", "gpt-image-1", fetchFn as never);
    expect(img.toString()).toBe("jpegdata");
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/images/generations");
    expect(init.headers.authorization).toBe("Bearer sk-test");
    expect(JSON.parse(init.body)).toMatchObject({ model: "gpt-image-1", prompt: "a prompt", size: "1024x1024", quality: "low", output_format: "jpeg" });
  });

  it("throws the API error message", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "content policy" } }), { status: 400 }));
    await expect(generateImage("p", "k", undefined, fetchFn as never)).rejects.toThrow("content policy");
  });

  it("fails when the response has no image", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    await expect(generateImage("p", "k", undefined, fetchFn as never)).rejects.toThrow("no image");
  });
});
