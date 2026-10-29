import { describe, expect, it } from "vitest";
import { autoTags } from "../src/lib/autotag.ts";

const t = (title: string, ingredients: string[] = [], total_minutes: number | null = null, steps: string[] = []) =>
  autoTags({ title, ingredients, steps, total_minutes });

describe("autoTags", () => {
  it("gives exactly one dish type, first in the list", () => {
    expect(t("Spaghetti Bolognese", ["400 g rundergehakt", "300 g spaghetti"])[0]).toBe("hoofdgerecht");
    expect(t("Hollandse Erwtensoep (Snert)", ["worst"])[0]).toBe("soep");
    expect(t("Tomatensoep", ["tomaten"])).toEqual(["soep", "vegetarisch"]);
    expect(t("Tuna and Bean Salad", ["tuna"])[0]).toBe("salade");
    expect(t("Torta di Mele (Apple Cake)", ["appels"])).toEqual(["dessert"]);
    expect(t("Panino alla Caprese", ["ciabatta", "burrata"])).toEqual(["lunch", "vegetarisch"]);
  });

  it("tags meat with its kind", () => {
    const bolognese = t("Spaghetti Bolognese", ["400 g rundergehakt", "100 g pancetta", "300 g spaghetti"]);
    expect(bolognese).toEqual(expect.arrayContaining(["hoofdgerecht", "pasta", "vlees", "rund", "varken"]));
    expect(bolognese).not.toContain("vegetarisch");
    expect(t("Toscaanse kip", ["600 g kipfilet"])).toEqual(expect.arrayContaining(["vlees", "kip"]));
    expect(t("Gehaktballen", ["500 g gehakt"])).toEqual(expect.arrayContaining(["vlees"]));
    expect(t("Gehaktballen", ["500 g gehakt"])).not.toContain("rund");
  });

  it("recognises fish and vegetarian dishes", () => {
    expect(t("Tonno Al Pomodoro", ["tonijn", "tomaten"])).toEqual(["hoofdgerecht", "vis"]);
    expect(t("Pasta ai 4 Pomodori", ["tomaten", "pasta"])).toEqual(["hoofdgerecht", "pasta", "vegetarisch"]);
  });

  it("does not treat fish sauce, tuna steaks, stock or speculaas as meat/fish", () => {
    expect(t("Gehakt met gember", ["1 el vissaus", "700 g rundergehakt"])).not.toContain("vis");
    expect(t("Tonno", ["2 x 120g tuna steaks"])).not.toContain("vlees");
    const mussels = t("Mosselen Tom Kha Gai", ["1 kg mosselen", "250 ml kippenbouillon"]);
    expect(mussels).toContain("vis");
    expect(mussels).not.toContain("kip");
    expect(mussels).not.toContain("vlees");
    expect(t("Speculaaskoekjes", ["speculaaskruiden"])).not.toContain("vlees");
    expect(t("Biefstuk", ["2 steaks"])).toEqual(expect.arrayContaining(["vlees", "rund"]));
  });

  it("no longer produces time or method tags", () => {
    const tags = t("Snelle ovenschotel", ["kaas"], 20, ["Verwarm de oven voor"]);
    expect(tags).not.toContain("snel");
    expect(tags).not.toContain("oven");
  });
});
