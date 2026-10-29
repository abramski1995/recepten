import { describe, expect, it } from "vitest";
import { activeCount, customLabels, filterRecipes, noFilters } from "../src/lib/filter.ts";
import { cleanTags, customOnly, sameTags, timeBucket } from "../src/lib/taxonomy.ts";
import type { Recipe } from "../src/types.ts";

describe("timeBucket", () => {
  it("buckets minutes", () => {
    expect([null, 0, 1, 30, 31, 119, 120, 665].map(timeBucket)).toEqual([null, null, "snel", "snel", "rustig", "rustig", "langzaam", "langzaam"]);
  });
});

describe("cleanTags", () => {
  it("drops obsolete tags, keeps own labels, implies vlees from a kind", () => {
    expect(cleanTags(["Oven", "snel", "slowcooker", "kip", "favoriet"], ["hoofdgerecht", "vlees", "kip"])).toEqual([
      "hoofdgerecht",
      "kip",
      "favoriet",
      "vlees",
    ]);
  });
  it("keeps the existing dish type when there is exactly one, otherwise takes the suggestion", () => {
    expect(cleanTags(["soep"], ["hoofdgerecht"])).toEqual(["soep"]);
    expect(cleanTags(["soep", "dessert"], ["lunch"])).toEqual(["lunch"]);
    expect(cleanTags([], ["salade", "vegetarisch"])).toEqual(["salade", "vegetarisch"]);
  });
  it("is stable: cleaning twice changes nothing", () => {
    const once = cleanTags(["Oven", "kip", "mijn-label"], ["hoofdgerecht", "vlees", "kip"]);
    expect(sameTags(cleanTags(once, ["hoofdgerecht", "vlees", "kip"]), once)).toBe(true);
  });
});

describe("customOnly", () => {
  it("returns only free-form labels", () => expect(customOnly(["soep", "vlees", "kip", "oma", "favoriet"])).toEqual(["oma", "favoriet"]));
});

const recipe = (title: string, tags: string[], total_minutes: number | null = null, ingredients: string[] = []): Recipe =>
  ({ id: title, title, tags, ingredients, steps: [], total_minutes, created_at: "", updated_at: "" }) as unknown as Recipe;

describe("filterRecipes", () => {
  const list = [
    recipe("Pad Krapow", ["hoofdgerecht", "rijst", "vlees", "rund"], 17, ["gehakt"]),
    recipe("Kip wrap", ["lunch", "vlees", "kip", "favoriet"], 17),
    recipe("Tomatensoep", ["soep", "vegetarisch"], 45),
    recipe("Stoofvlees", ["hoofdgerecht", "vlees", "rund"], 212),
    recipe("Zonder tijd", ["hoofdgerecht", "pasta"], null),
  ];
  const names = (f: Partial<typeof noFilters>, q = "") => filterRecipes(list, q, { ...noFilters, ...f }).map((r) => r.title);

  it("filters by dish type", () => expect(names({ gerecht: "hoofdgerecht" })).toEqual(["Pad Krapow", "Stoofvlees", "Zonder tijd"]));
  it("requires all selected ingredients", () => expect(names({ ingredienten: ["vlees", "rijst"] })).toEqual(["Pad Krapow"]));
  it("matches any selected meat kind", () => expect(names({ ingredienten: ["vlees"], vlees: ["kip", "rund"] })).toEqual(["Pad Krapow", "Kip wrap", "Stoofvlees"]));
  it("derives time from minutes (and excludes recipes without time)", () => {
    expect(names({ tijd: "snel" })).toEqual(["Pad Krapow", "Kip wrap"]);
    expect(names({ tijd: "rustig" })).toEqual(["Tomatensoep"]);
    expect(names({ tijd: "langzaam" })).toEqual(["Stoofvlees"]);
  });
  it("combines filters with search and own labels", () => {
    expect(names({ gerecht: "hoofdgerecht", tijd: "snel" })).toEqual(["Pad Krapow"]);
    expect(names({ eigen: ["favoriet"] })).toEqual(["Kip wrap"]);
    expect(names({}, "gehakt")).toEqual(["Pad Krapow"]);
  });
  it("returns everything without filters", () => expect(names({})).toHaveLength(5));
});

describe("activeCount / customLabels", () => {
  it("counts everything except the dish-type tabs", () => {
    expect(activeCount({ ...noFilters, gerecht: "soep" })).toBe(0);
    expect(activeCount({ gerecht: "soep", ingredienten: ["vlees"], vlees: ["kip"], tijd: "snel", eigen: ["x"] })).toBe(4);
  });
  it("lists own labels by usage", () => {
    const list = [recipe("a", ["soep", "oma"]), recipe("b", ["oma", "favoriet"]), recipe("c", ["favoriet", "oma"])];
    expect(customLabels(list)).toEqual(["oma", "favoriet"]);
  });
});
