import { describe, expect, it } from "vitest";
import { looksDutch } from "../src/lib/lang.ts";

describe("looksDutch", () => {
  it("recognises Dutch recipes", () => {
    expect(
      looksDutch({
        title: "Gehakt met gember en limoen",
        ingredients: ["700 g rundergehakt", "2 el sriracha", "grof zeezout"],
        steps: ["Verhit een pan op hoog vuur.", "Snijd de ui en voeg het gehakt toe."],
      }),
    ).toBe(true);
  });
  it("recognises English recipes", () => {
    expect(
      looksDutch({
        title: "Tonno Al Pomodoro",
        ingredients: ["2 tablespoons extra virgin olive oil", "1 garlic clove", "Fine sea salt and freshly ground black pepper"],
        steps: ["Heat the oil in a pan over medium heat.", "Add the tuna and cook for 2 minutes."],
      }),
    ).toBe(false);
  });
  it("flags a recipe with Dutch ingredients but English steps", () => {
    expect(
      looksDutch({
        title: "Loaded Nachos",
        ingredients: ["½ zak naturel nachos", "4 el creme fraîche", "2 el mayonaise"],
        steps: ["Mix the tuna, juice of the lemon and the capers.", "Add the jalapeños and serve with the nachos."],
      }),
    ).toBe(false);
  });
  it("flags Italian steps", () => {
    expect(looksDutch({ title: "Pasta al sugo", ingredients: ["250g totani"], steps: ["Tagliare i totani ad anelli, aggiungere olio e sale, cuocere e servire."] })).toBe(false);
  });
  it("treats an Italian title with Dutch steps as Dutch", () => {
    expect(looksDutch({ title: "Pasta Alla Zozzonna", ingredients: ["400 g pasta"], steps: ["Kook de pasta en meng met de saus."] })).toBe(true);
  });
});
