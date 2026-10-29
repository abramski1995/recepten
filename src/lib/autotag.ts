// Suggests category tags (dish type, main ingredient) from a recipe's text.
// Keyword based on purpose: free, instant and predictable. Users can still edit tags per recipe.
// Time is not tagged here: it is derived from total_minutes (see taxonomy.ts).

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
const BEEF = rx(["\\brund", "\\bbeef", "kalf", "ossobuco", "stoofvlees", "biefstuk", "entrecote", "(?<!tuna |salmon |tonijn |zalm )steak"]);
const PORK = rx(["varken", "\\bpork", "spek\\b", "bacon", "pancetta", "guanciale", "worst", "\\bham\\b", "prosciutto", "chorizo", "salami"]);
const OTHER_MEAT = rx(["gehakt", "\\blam\\b", "mince"]);
const FISH = rx(["tonijn", "\\btuna", "zalm", "salmon", "sardine", "mossel", "garnaal", "gamba", "kabeljauw", "makreel", "\\bvis\\b", "schelvis", "tong\\b", "inktvis", "calamari", "pasta al sugo di mare"]);
const SOUP = rx(["soep\\b", "soup\\b", "\\bsnert"]);
const SALAD = rx(["salade", "\\bsalad"]);
const GEBAK = rx(["\\bcake\\b", "cheesecake", "cupcake", "\\btaart", "\\btorta", "gebak", "koekje", "koekjes", "cookie", "brownie", "muffin", "scone", "croissant", "wafel", "brood\\b", "\\bbread\\b", "cinnamon roll", "kaneelbroodje"]);
const DESSERT = rx(["dessert", "toetje", "sgroppino", "pudding", "mousse", "tiramisu", "\\bijs\\b", "pannenkoek"]);
const LUNCH = rx(["sandwich", "\\bwrap", "panino", "broodje", "\\bpita", "nachos", "\\btosti", "\\btoast"]);

export function autoTags(r: TagSource): string[] {
  const head = `${r.title}\n${r.ingredients.join("\n")}`;
  const tags: string[] = [];

  const soup = SOUP.test(r.title);
  const salad = SALAD.test(r.title);
  const gebak = !soup && !salad && GEBAK.test(r.title);
  const dessert = !gebak && DESSERT.test(r.title);
  const lunch = !soup && !salad && !gebak && !dessert && LUNCH.test(head);

  tags.push(soup ? "soep" : salad ? "salade" : gebak ? "gebak" : dessert ? "dessert" : lunch ? "lunch" : "hoofdgerecht");

  // Stock ("kippenbouillon") flavours a dish but doesn't make it a meat dish.
  const proteinText = head.split("\n").filter((l) => !/bouillon|stock|\bfond\b/i.test(l)).join("\n");
  const chicken = CHICKEN.test(proteinText);
  const beef = BEEF.test(proteinText);
  const pork = PORK.test(proteinText);
  const meat = chicken || beef || pork || OTHER_MEAT.test(proteinText);
  const fish = FISH.test(head);

  if (PASTA.test(head)) tags.push("pasta");
  if (RICE.test(head)) tags.push("rijst");
  if (meat) tags.push("vlees");
  if (chicken) tags.push("kip");
  if (beef) tags.push("rund");
  if (pork) tags.push("varken");
  if (fish) tags.push("vis");
  if (!meat && !fish && !dessert && !gebak) tags.push("vegetarisch");

  return tags;
}
