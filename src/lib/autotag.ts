// Suggests filter tags (dish type, main ingredient, speed) from a recipe's text.
// Keyword based on purpose: free, instant and predictable. Users can still edit tags per recipe.

interface TagSource {
  title: string;
  ingredients: string[];
  steps: string[];
  total_minutes: number | null;
}

const rx = (words: string[]) => new RegExp(words.join("|"), "i");

const PASTA = rx(["\\bpasta", "spaghetti", "rigatoni", "penne", "pennette", "orzo\\b", "tagliatelle", "linguine", "fusilli", "macaroni", "lasagne", "farfalle", "fettuccine", "bucatini", "paccheri", "zozzona"]);
const RICE = rx(["\\brijst", "\\brice\\b", "risotto"]);
const CHICKEN = rx(["\\bkip", "chicken", "poulet", "kalkoen"]);
const MEAT = rx([
  "gehakt", "\\brund", "\\bbeef", "kalf", "varken", "\\bpork", "\\blam\\b", "spek\\b", "bacon", "pancetta", "guanciale", "worst",
  "\\bham\\b", "prosciutto", "ossobuco", "stoofvlees", "biefstuk", "entrecote", "(?<!tuna |salmon |tonijn |zalm )steak", "chorizo", "salami", "mince",
]);
const FISH = rx(["tonijn", "\\btuna", "zalm", "salmon", "sardine", "mossel", "garnaal", "gamba", "kabeljauw", "makreel", "\\bvis\\b", "schelvis", "tong\\b", "inktvis", "calamari", "pasta al sugo di mare"]);
const SOUP = rx(["soep\\b", "soup\\b", "\\bsnert"]);
const SALAD = rx(["salade", "\\bsalad"]);
const DESSERT = rx(["\\bcake\\b", "\\btaart", "\\btorta", "cheesecake", "dessert", "toetje", "sgroppino", "koekje", "brownie", "pudding", "mousse", "tiramisu", "\\bijs\\b", "pannenkoek", "brood\\b.*banaan"]);
const LUNCH = rx(["sandwich", "\\bwrap", "panino", "broodje", "\\bpita", "nachos", "\\btosti", "\\btoast"]);
const OVEN = rx(["\\boven\\b", "\\bbakplaat", "\\bovenschaal"]);
const SLOWCOOKER = rx(["slowcooker", "slow cooker", "slow-cooker"]);

export function autoTags(r: TagSource): string[] {
  const head = `${r.title}\n${r.ingredients.join("\n")}`;
  const all = `${head}\n${r.steps.join("\n")}`;
  const tags: string[] = [];

  const soup = SOUP.test(r.title);
  const salad = SALAD.test(r.title);
  const dessert = DESSERT.test(r.title);
  const lunch = !soup && !salad && !dessert && LUNCH.test(r.title + "\n" + r.ingredients.join("\n"));

  if (soup) tags.push("soep");
  if (salad) tags.push("salade");
  if (dessert) tags.push("dessert");
  if (lunch) tags.push("lunch");
  if (!soup && !salad && !dessert && !lunch) tags.push("hoofdgerecht");

  // Stock ("kippenbouillon") flavours a dish but doesn't make it a meat dish.
  const proteinText = head.split("\n").filter((l) => !/bouillon|stock|\bfond\b/i.test(l)).join("\n");
  const chicken = CHICKEN.test(proteinText);
  const meat = chicken || MEAT.test(proteinText);
  const fish = FISH.test(head);
  if (PASTA.test(head)) tags.push("pasta");
  if (RICE.test(head)) tags.push("rijst");
  if (meat) tags.push("vlees");
  if (chicken) tags.push("kip");
  if (fish) tags.push("vis");
  if (!meat && !fish && !dessert) tags.push("vegetarisch");

  if (SLOWCOOKER.test(all)) tags.push("slowcooker");
  if (OVEN.test(all)) tags.push("oven");
  if (r.total_minutes !== null && r.total_minutes <= 30) tags.push("snel");

  return tags;
}

export function mergeTags(existing: string[], suggested: string[]): string[] {
  return [...new Set([...existing.map((t) => t.toLowerCase()), ...suggested])];
}
