import { describe, expect, it } from "vitest";
import { checkPassword, createToken, verifyToken } from "../netlify/lib/auth.ts";
import { assertPublicUrl } from "../netlify/lib/safe-fetch.ts";
import { ValidationError, validateRecipe } from "../netlify/lib/validate.ts";

describe("auth", () => {
  it("accepts only the right password", () => {
    expect(checkPassword("geheim", "geheim")).toBe(true);
    expect(checkPassword("fout", "geheim")).toBe(false);
    expect(checkPassword("", "")).toBe(false);
  });

  it("verifies a fresh token", () => expect(verifyToken(createToken("s"), "s")).toBe(true));
  it("rejects a token signed with another secret", () => expect(verifyToken(createToken("s"), "t")).toBe(false));
  it("rejects an expired token", () => {
    const token = createToken("s", 0);
    expect(verifyToken(token, "s", 1000 * 60 * 60 * 24 * 91)).toBe(false);
  });
  it("rejects a tampered token", () => {
    const [, sig] = createToken("s").split(".");
    expect(verifyToken(`${Date.now() + 1e12}.${sig}`, "s")).toBe(false);
    expect(verifyToken("garbage", "s")).toBe(false);
  });
});

describe("assertPublicUrl", () => {
  it("blocks private and non-http targets", async () => {
    await expect(assertPublicUrl("http://127.0.0.1/")).rejects.toThrow();
    await expect(assertPublicUrl("http://192.168.1.5/")).rejects.toThrow();
    await expect(assertPublicUrl("http://169.254.169.254/")).rejects.toThrow();
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow();
  });
});

describe("validateRecipe", () => {
  it("requires a title", () => expect(() => validateRecipe({ title: "  " })).toThrow(ValidationError));
  it("normalises fields", () => {
    const r = validateRecipe({
      title: " Soep ",
      image_url: "javascript:alert(1)",
      servings: "4",
      ingredients: ["a", "", 5],
      tags: ["Snel", "snel"],
    });
    expect(r).toMatchObject({ title: "Soep", image_url: null, servings: 4, ingredients: ["a"], tags: ["snel"] });
  });
});
