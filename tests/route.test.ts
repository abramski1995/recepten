import { describe, expect, it } from "vitest";
import { parseHash } from "../src/lib/useRoute.ts";
import { gerechtOf } from "../src/lib/taxonomy.ts";

describe("parseHash", () => {
  it.each([
    ["", { name: "list" }],
    ["#/", { name: "list" }],
    ["#/favorites", { name: "favorites" }],
    ["#/more", { name: "more" }],
    ["#/new", { name: "new" }],
    ["#/import", { name: "import" }],
    ["#/r/abc", { name: "detail", id: "abc" }],
    ["#/edit/abc", { name: "edit", id: "abc" }],
    ["#/cook/abc", { name: "cook", id: "abc" }],
    ["#/r", { name: "list" }],
    ["#/onbekend", { name: "list" }],
  ])("%s", (hash, route) => expect(parseHash(hash)).toEqual(route));
});

describe("gerechtOf", () => {
  it("returns the dish type of a recipe, or null", () => {
    expect(gerechtOf(["vlees", "soep", "oma"])).toBe("soep");
    expect(gerechtOf(["vlees"])).toBeNull();
  });
});
