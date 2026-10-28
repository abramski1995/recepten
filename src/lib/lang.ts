// Cheap Dutch-vs-other detector, used to decide whether a recipe needs translating.
// Words that exist in both languages (e.g. "in", "a", "pasta") are left out of both sets.
const DUTCH = new Set(
  ("de het een en met van voor tot aan je op naar als eerst daarna totdat ongeveer minuten gram el tl snijd bak kook voeg meng schil laat " +
    "doe roer verwarm breng zout peper olie ui knoflook water deze dan ook niet wat of").split(" "),
);
const FOREIGN = new Set(
  ("the and with of to until add minutes cup cups tablespoon tablespoons teaspoon teaspoons heat stir mix cook bake cut chopped into for " +
    "then over medium high low pan oil salt pepper onion garlic water this that it is are about serve juice " +
    "tagliare aggiungere cuocere unire servire mescolare con il della olio sale impiattare").split(" "),
);

function counts(text: string) {
  let nl = 0;
  let foreign = 0;
  for (const w of text.toLowerCase().match(/[a-zà-ÿ]+/g) ?? []) {
    if (DUTCH.has(w)) nl++;
    if (FOREIGN.has(w)) foreign++;
  }
  return { nl, foreign };
}

// Ingredients and steps are judged separately: a recipe with Dutch ingredients but English steps
// (common after importing from mixed sources) still needs translating. Needs some evidence (>= 3 words).
export function looksDutch(r: { title: string; ingredients: string[]; steps: string[] }): boolean {
  const parts = r.ingredients.length || r.steps.length ? [r.ingredients.join(" "), r.steps.join(" ")] : [r.title];
  return parts.every((p) => {
    const { nl, foreign } = counts(p);
    return !(foreign >= 3 && foreign > nl);
  });
}
