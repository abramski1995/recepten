import { describe, expect, it } from "vitest";
import { autoTags, mergeTags } from "../src/lib/autotag.ts";
import { filterRecipes, tagCounts } from "../src/lib/filter.ts";
import type { Recipe } from "../src/types.ts";

const t = (title: string, ingredients: string[] = [], total_minutes: number | null = null, steps: string[] = []) =>
  autoTags({ title, ingredients, steps, total_minutes });

describe("autoTags", () => {
  it("tags pasta with meat as main course", () => {
    const tags = t("Spaghetti Bolognese in winterse stijl", ["400 g rundergehakt", "300 g spaghetti"], 57);
    expect(tags).toEqual(expect.arrayContaining(["hoofdgerecht", "pasta", "vlees"]));
    expect(tags).not.toContain("vegetarisch");
  });
  it("tags chicken as both vlees and kip", () => {
    expect(t("Toscaanse kip uit de slowcooker", ["600 g kipfilet"], 177)).toEqual(
      expect.arrayContaining(["vlees", "kip", "slowcooker"]),
    );
  });
  it("recognises soup, dessert, lunch and fish", () => {
    expect(t("Hollandse Erwtensoep (Snert)", ["worst", "spliterwten"])).toContain("soep");
    expect(t("Tomatensoep", ["tomaten"])).toEqual(expect.arrayContaining(["soep", "vegetarisch"]));
    expect(t("Tomatensoep", ["tomaten"])).not.toContain("hoofdgerecht");
    expect(t("Torta di Mele (Apple Cake)", ["appels", "meel"])).toEqual(expect.arrayContaining(["dessert"]));
    expect(t("Torta di Mele (Apple Cake)", ["appels"])).not.toContain("hoofdgerecht");
    expect(t("Panino alla Caprese", ["ciabatta", "burrata"])).toEqual(expect.arrayContaining(["lunch", "vegetarisch"]));
    expect(t("Tonno Al Pomodoro", ["tonijn", "tomaten"])).toEqual(expect.arrayContaining(["vis", "hoofdgerecht"]));
  });
  it("does not treat fish sauce or speculaas as fish/meat", () => {
    const tags = t("Gehakt met gember en limoen", ["1 el vissaus", "700 g rundergehakt"]);
    expect(tags).not.toContain("vis");
    expect(t("Speculaaskoekjes", ["speculaaskruiden"])).not.toContain("vlees");
  });
  it("ignores tuna steaks and stock when detecting meat", () => {
    expect(t("Tonno Al Pomodoro", ["2 x 120g tuna steaks"])).not.toContain("vlees");
    const soup = t("Mosselen Tom Kha Gai", ["1 kg mosselen", "250 ml kippenbouillon"]);
    expect(soup).toEqual(expect.arrayContaining(["vis"]));
    expect(soup).not.toContain("vlees");
    expect(soup).not.toContain("kip");
    expect(t("Biefstuk", ["2 steaks"])).toContain("vlees");
  });
  it("adds snel only for 30 minutes or less, and oven from the steps", () => {
    expect(t("Salade met ei", ["ei"], 20)).toContain("snel");
    expect(t("Stoof", ["rundvlees"], 200)).not.toContain("snel");
    expect(t("Ovenschotel", ["kaas"], null, ["Verwarm de oven voor"])).toContain("oven");
  });
});

describe("mergeTags", () => {
  it("keeps existing tags, lowercases and dedupes", () => {
    expect(mergeTags(["Eigen", "pasta"], ["pasta", "vlees"])).toEqual(["eigen", "pasta", "vlees"]);
  });
});

const recipe = (title: string, tags: string[], ingredients: string[] = []): Recipe =>
  ({ id: title, title, tags, ingredients, steps: [], created_at: "", updated_at: "" }) as unknown as Recipe;

describe("filterRecipes / tagCounts", () => {
  const list = [recipe("A", ["pasta", "vlees"], ["gehakt"]), recipe("B", ["pasta"]), recipe("C", ["soep"])];
  it("requires all selected tags", () => {
    expect(filterRecipes(list, "", ["pasta"]).map((r) => r.title)).toEqual(["A", "B"]);
    expect(filterRecipes(list, "", ["pasta", "vlees"]).map((r) => r.title)).toEqual(["A"]);
    expect(filterRecipes(list, "gehakt", ["pasta"]).map((r) => r.title)).toEqual(["A"]);
    expect(filterRecipes(list, "", [])).toHaveLength(3);
  });
  it("counts tags, most common first", () => {
    expect(tagCounts(list)).toEqual([
      { tag: "pasta", count: 2 },
      { tag: "soep", count: 1 },
      { tag: "vlees", count: 1 },
    ]);
  });
});
