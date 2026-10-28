import { describe, expect, it } from "vitest";
import { scaleIngredient } from "../src/lib/scale.ts";

describe("scaleIngredient", () => {
  it("scales whole numbers", () => expect(scaleIngredient("200 g bloem", 2)).toBe("400 g bloem"));
  it("scales fractions", () => expect(scaleIngredient("1/2 tl zout", 2)).toBe("1 tl zout"));
  it("scales mixed numbers", () => expect(scaleIngredient("1 1/2 el olie", 2)).toBe("3 el olie"));
  it("scales unicode fractions", () => expect(scaleIngredient("½ ui", 3)).toBe("1,5 ui"));
  it("scales decimals with comma", () => expect(scaleIngredient("0,5 l melk", 4)).toBe("2 l melk"));
  it("scales ranges", () => expect(scaleIngredient("2-3 tenen knoflook", 2)).toBe("4-6 tenen knoflook"));
  it("leaves lines without quantity alone", () => expect(scaleIngredient("peper en zout", 2)).toBe("peper en zout"));
  it("is a no-op at factor 1", () => expect(scaleIngredient("200 g bloem", 1)).toBe("200 g bloem"));
});
