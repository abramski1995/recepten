import { describe, expect, it } from "vitest";
import { convertFondExport, totalMinutes } from "../src/lib/fond.ts";

const nodes = [
  { id: 1, title: "Kook rijst", text: "Kook [200 g rijst].", time: 20, dependencies: [] },
  { id: 2, title: "Snijd ui", text: "Snijd [1 ui].", time: 5, dependencies: [] },
  { id: 3, title: "Meng", text: "Meng alles.", time: 3, dependencies: [1, 2] },
];

const full = { id: "a", title: "Rijst", url: "https://x.nl/r", ingredients: ["200 g rijst", " 1 ui "], nodes };

describe("convertFondExport", () => {
  it("converts nodes to steps, strips ingredient brackets and computes total time", () => {
    const { recipes } = convertFondExport({ authoredRecipes: [], savedRecipes: [full] });
    expect(recipes).toEqual([
      {
        title: "Rijst",
        source_url: "https://x.nl/r",
        image_url: null,
        description: null,
        notes: null,
        servings: null,
        total_minutes: 23,
        ingredients: ["200 g rijst", "1 ui"],
        steps: ["Kook rijst — Kook 200 g rijst.", "Snijd ui — Snijd 1 ui.", "Meng — Meng alles."],
        tags: ["hoofdgerecht", "rijst", "vegetarisch"],
      },
    ]);
  });

  it("uses authored data when a saved entry only points to it, and skips deleted/empty entries", () => {
    const authored = { id: "b", title: "Eigen", ingredients: ["x"], nodes };
    const { recipes, skipped } = convertFondExport({
      authoredRecipes: [authored],
      savedRecipes: [{ id: "b", title: "Eigen" }, { id: "c", title: "Weg", deleted: true }],
    });
    expect(recipes.map((r) => r.title)).toEqual(["Eigen"]);
    expect(skipped).toEqual(["Weg"]);
  });

  it("drops the same recipe saved twice", () => {
    const { recipes } = convertFondExport({ authoredRecipes: [], savedRecipes: [full, { ...full, id: "z" }] });
    expect(recipes).toHaveLength(1);
  });

  it("rejects other files", () => {
    expect(() => convertFondExport({ foo: 1 })).toThrow();
  });
});

describe("totalMinutes", () => {
  it("returns null without times and survives dependency cycles", () => {
    expect(totalMinutes([{ id: 1, title: "a", text: "b" }])).toBeNull();
    expect(() =>
      totalMinutes([
        { id: 1, title: "a", text: "b", time: 1, dependencies: [2] },
        { id: 2, title: "a", text: "b", time: 1, dependencies: [1] },
      ]),
    ).not.toThrow();
  });
});
