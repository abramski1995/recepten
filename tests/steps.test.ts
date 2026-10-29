import { describe, expect, it } from "vitest";
import { findTimers, formatClock, ingredientsForStep, splitByTimes, splitStep } from "../src/lib/steps.ts";

describe("splitStep", () => {
  it("splits a Fond style heading off", () => {
    expect(splitStep("Snipper ui — Snipper 1 witte ui.")).toEqual({ title: "Snipper ui", text: "Snipper 1 witte ui." });
  });
  it("leaves plain steps alone", () => {
    expect(splitStep("Kook de pasta.")).toEqual({ title: null, text: "Kook de pasta." });
    expect(splitStep(`${"x".repeat(80)} — tekst`).title).toBeNull();
  });
});

describe("findTimers / splitByTimes", () => {
  it.each([
    ["Bak 8 minuten op hoog vuur.", 480],
    ["Laat 1 uur rusten.", 3600],
    ["Roer 30 seconden.", 30],
    ["Bak 8-10 minuten.", 600],
    ["Laat ongeveer 5 min staan.", 300],
    ["Kook 1,5 uur.", 5400],
  ])("%s -> %s s", (text, seconds) => expect(findTimers(text)[0]?.seconds).toBe(seconds));

  it("ignores temperatures and other numbers, and dedupes", () => {
    expect(findTimers("Verwarm de oven voor op 180 graden met 2 bakplaten.")).toEqual([]);
    expect(findTimers("Bak 5 minuten, draai om en bak nog eens 5 minuten.")).toHaveLength(1);
    expect(findTimers("Bak 5 minuten en daarna 2 minuten.").map((t) => t.seconds)).toEqual([300, 120]);
  });

  it("keeps the whole text when split into parts", () => {
    const text = "Bak 8 minuten op hoog vuur, dan 2 min rusten.";
    const parts = splitByTimes(text);
    expect(parts.map((p) => p.text).join("")).toBe(text);
    expect(parts.filter((p) => p.seconds).map((p) => p.text)).toEqual(["8 minuten", "2 min"]);
  });
});

describe("formatClock", () => {
  it("formats seconds", () => {
    expect([480, 59, 0, 3725, -5].map(formatClock)).toEqual(["8:00", "0:59", "0:00", "1:02:05", "0:00"]);
  });
});

describe("ingredientsForStep", () => {
  const ingredients = ["700 g rundergehakt", "6 teentjes knoflook", "1 sjalotje", "2 el sojasaus", "1 ui", "3 tomaten", "peper"];
  it("finds ingredients mentioned in the step", () => {
    expect(ingredientsForStep("Bak het rundergehakt en voeg de knoflook toe.", ingredients)).toEqual([
      "700 g rundergehakt",
      "6 teentjes knoflook",
    ]);
  });
  it("handles plurals but not look-alike words", () => {
    expect(ingredientsForStep("Snijd de uien en de tomaten.", ingredients)).toEqual(["1 ui", "3 tomaten"]);
    expect(ingredientsForStep("Haal de pan uit de oven.", ingredients)).toEqual([]);
  });
});
