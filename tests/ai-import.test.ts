import { describe, expect, it, vi } from "vitest";
import { MAX_TEXT_CHARS, NoRecipeError, extractRecipeWithAi } from "../netlify/lib/ai-import.ts";
import { ValidationError } from "../netlify/lib/validate.ts";

function fakeClient(text: string, stop_reason = "end_turn") {
  const create = vi.fn().mockResolvedValue({ stop_reason, content: [{ type: "text", text }] });
  return { client: { messages: { create } } as never, create };
}

const reply = JSON.stringify({
  title: "Pannenkoeken",
  description: null,
  servings: 4,
  total_minutes: 30,
  ingredients: ["250 g bloem", "2 eieren"],
  steps: ["Meng alles.", "Bak."],
  tags: ["Zoet"],
});

describe("extractRecipeWithAi", () => {
  it("parses a text response into a validated draft", async () => {
    const { client, create } = fakeClient(reply);
    const draft = await extractRecipeWithAi({ text: "pannenkoeken…" }, client);
    expect(draft).toMatchObject({ title: "Pannenkoeken", servings: 4, tags: ["zoet"], image_url: null });
    expect(draft).not.toHaveProperty("notes");
    const args = create.mock.calls[0][0];
    expect(args.output_config.format.type).toBe("json_schema");
    expect(args.messages[0].content[0].type).toBe("text");
  });

  it("sends images as base64 image blocks", async () => {
    const { client, create } = fakeClient(reply);
    await extractRecipeWithAi({ image: { media_type: "image/jpeg", data: "AAAA" } }, client);
    expect(create.mock.calls[0][0].messages[0].content[0]).toMatchObject({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: "AAAA" },
    });
  });

  it("reports an input without a recipe", async () => {
    const { client } = fakeClient(JSON.stringify({ title: "" }));
    await expect(extractRecipeWithAi({ text: "hallo" }, client)).rejects.toThrow(NoRecipeError);
  });

  it("handles refusals, truncation and bad JSON", async () => {
    await expect(extractRecipeWithAi({ text: "x" }, fakeClient(reply, "refusal").client)).rejects.toThrow(NoRecipeError);
    await expect(extractRecipeWithAi({ text: "x" }, fakeClient(reply, "max_tokens").client)).rejects.toThrow(NoRecipeError);
    await expect(extractRecipeWithAi({ text: "x" }, fakeClient("not json").client)).rejects.toThrow(NoRecipeError);
  });

  it("rejects bad input before calling the API", async () => {
    const { client, create } = fakeClient(reply);
    await expect(extractRecipeWithAi({ text: "  " }, client)).rejects.toThrow(ValidationError);
    await expect(extractRecipeWithAi({ text: "a".repeat(MAX_TEXT_CHARS + 1) }, client)).rejects.toThrow(ValidationError);
    await expect(extractRecipeWithAi({ image: { media_type: "image/svg+xml", data: "A" } }, client)).rejects.toThrow(
      ValidationError,
    );
    expect(create).not.toHaveBeenCalled();
  });
});
