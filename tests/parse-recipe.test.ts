import { describe, expect, it } from "vitest";
import { parseDurationMinutes, parseRecipeFromHtml } from "../netlify/lib/parse-recipe.ts";

const page = (json: unknown) =>
  `<html><head><script type="application/ld+json">${JSON.stringify(json)}</script></head></html>`;

describe("parseRecipeFromHtml", () => {
  it("parses a recipe inside @graph", () => {
    const html = page({
      "@graph": [
        { "@type": "WebSite", name: "Site" },
        {
          "@type": "Recipe",
          name: "Pasta &amp; pesto",
          image: [{ url: "https://x.nl/a.jpg" }],
          recipeYield: ["4", "4 personen"],
          totalTime: "PT1H15M",
          recipeIngredient: ["200 g pasta", "2 el pesto"],
          recipeInstructions: [
            { "@type": "HowToStep", text: "Kook de pasta." },
            { "@type": "HowToSection", itemListElement: [{ "@type": "HowToStep", text: "Meng met pesto." }] },
          ],
          keywords: "Pasta, snel, pasta",
          recipeCategory: ["Hoofdgerecht"],
        },
      ],
    });
    const r = parseRecipeFromHtml(html, "https://x.nl/r");
    expect(r).toMatchObject({
      title: "Pasta & pesto",
      image_url: "https://x.nl/a.jpg",
      servings: 4,
      total_minutes: 75,
      ingredients: ["200 g pasta", "2 el pesto"],
      steps: ["Kook de pasta.", "Meng met pesto."],
      tags: ["hoofdgerecht", "pasta", "snel"],
    });
  });

  it("splits string instructions on newlines", () => {
    const html = page({ "@type": "Recipe", name: "X", recipeInstructions: "Stap een\nStap twee" });
    expect(parseRecipeFromHtml(html, "https://x.nl")?.steps).toEqual(["Stap een", "Stap twee"]);
  });

  it("returns null when there is no recipe", () => {
    expect(parseRecipeFromHtml(page({ "@type": "Article", name: "Nope" }), "https://x.nl")).toBeNull();
    expect(parseRecipeFromHtml("<html></html>", "https://x.nl")).toBeNull();
  });

  it("parses durations", () => {
    expect(parseDurationMinutes("PT20M")).toBe(20);
    expect(parseDurationMinutes("PT2H")).toBe(120);
    expect(parseDurationMinutes("nonsense")).toBeNull();
  });
});
