// Helpers for ingredient lines such as "200 g bloem". Shared by the app and the Netlify functions.

// "200 g bloem" -> "bloem": the image prompt only needs what the ingredient is, not how much.
export function ingredientName(line: string): string {
  return line
    .replace(/\(.*?\)/g, " ")
    .replace(/^[\d\s.,/½¼¾⅓⅔⅛-]+/, "")
    .replace(/^(g|gr|gram|kg|ml|l|dl|cl|el|tl|eetlepels?|theelepels?|cm|mm|kopje|kopjes|teentjes?|stuks?|stuk|bos|bosje|blik|blikje|pak|zakje|handje|snufje|tablespoons?|teaspoons?|cups?|cloves?|pinch|bunch)\b\.?\s*/i, "")
    .replace(/^(van|of)\s+/i, "")
    .split(",")[0]
    .trim();
}
