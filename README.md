# GijsRecepten

Persoonlijke receptenapp (één gebruiker, één wachtwoord). Vite + React + TypeScript + Tailwind, PWA, Netlify Functions, Supabase.

## Functies (v0.1)
- Recepten importeren via link (schema.org/Recipe), uit een foto/screenshot of uit geplakte tekst (AI), of handmatig invoeren
- Vaste categorieën (gerecht, hoofdingrediënt, tijd) met tabs en een filterpaneel; zoeken op titel/ingrediënt
- Porties omrekenen
- Kookmodus (stap voor stap, scherm blijft aan)
- Installeerbaar als app (PWA), mobile-first
- Importeren uit een Fond-export (`#/import`, onderaan de receptenlijst)

## Opzetten
1. **Supabase**: maak een project en draai `supabase/migrations/001_recipes.sql` én `002_recipe_images.sql` in de SQL-editor.
2. **Netlify**: koppel deze repo. Build: `npm run build`, publish: `dist` (staat al in `netlify.toml`).
3. Zet in Netlify → Site settings → Environment variables:
   - `APP_PASSWORD` – je wachtwoord
   - `SESSION_SECRET` – lange willekeurige string (bijv. `openssl rand -hex 32`)
   - `SUPABASE_URL` – project-URL
   - `SUPABASE_SERVICE_KEY` – de *service role* key (nooit in de frontend of in git)
   - `ANTHROPIC_API_KEY` – voor de AI-import (alleen op de server)
   - `OPENAI_API_KEY` – voor AI-foto's (alleen op de server)
   - `ANTHROPIC_MODEL` – optioneel, standaard `claude-opus-5-5`; een sneller/goedkoper model kan hier worden gezet

De database is niet publiek bereikbaar (RLS aan, geen policies); alleen de Netlify-functie in `netlify/functions/api.ts` gebruikt de service key.

## Lokaal draaien
```
cp .env.example .env   # invullen
npm install
npx netlify dev        # app + functies op http://localhost:8888
npm test               # unit tests
npm run build          # typecheck + build
```

## AI-import
Foto's worden in de browser verkleind (max 1600 px) en naar `/api/import-ai` gestuurd; de functie laat Claude het recept als JSON teruggeven, valideert dat opnieuw en toont het als concept in het formulier. Er wordt niets opgeslagen voordat jij op Opslaan drukt.

**Let op:** Netlify-functies hebben standaard een time-out van 10 seconden. Als AI-import soms afbreekt, verhoog de time-out (Netlify-instellingen) of zet `ANTHROPIC_MODEL` op een sneller model.

## Link-import en AI
Een link wordt in drie stappen verwerkt: (1) staat er een gestructureerd recept op de pagina (de meeste receptensites), dan wordt dat direct gebruikt; (2) anders leest de AI de paginatekst (bijv. een videobeschrijving); (3) lukt dat niet, dan haalt Claude de link zelf op (web fetch). Sites als Instagram vragen vaak inloggen en kunnen dus geblokkeerd blijven; kopieer dan de beschrijving en plak die bij ‘tekst’ (het formulier opent dat vakje dan automatisch).

## Vertalen naar Nederlands
- Recepten uit een **link** worden na het ophalen automatisch vertaald als ze niet in het Nederlands zijn (aparte aanvraag, zodat de time-out niet in de weg zit).
- **Foto's, geplakte tekst** en links die de AI zelf leest, komen direct in het Nederlands uit de AI.
- Bij de **Fond-import** staat een vinkje ‘Engelstalige recepten vertalen’ (standaard aan). Onderaan de receptenlijst staat ‘Engelse recepten vertalen’ voor recepten die er al in staan.
- Vertalen gebruikt standaard `claude-haiku-5-5` (snel en goedkoop); overschrijfbaar met `ANTHROPIC_TRANSLATE_MODEL`. Alleen titel, omschrijving, ingrediënten en stappen worden vertaald; hoeveelheden, link en tijd blijven ongewijzigd. Mislukt vertalen? Dan blijft het origineel staan.

## Foto's
Een foto wordt in deze volgorde gezocht: (1) de foto van de **bronpagina** (de link van het recept: schema.org-afbeelding, anders `og:image`), (2) anders een **AI-foto** (OpenAI `gpt-image-1`, lage kwaliteit, vierkant). Een stap voor zoeken in een afbeeldingszoekmachine is bewust overgeslagen: Google's Image Search API is gesloten voor nieuwe klanten.
- Heeft een link-import al een foto van de site, dan blijft die.
- Alleen **nieuwe** recepten krijgen automatisch een foto. Bestaande recepten worden niet aangepast en er zijn geen knoppen om foto's op te halen of opnieuw te maken.
- Bronfoto's worden gedownload en in de Supabase-bucket `recipe-images` bewaard (niet gehotlinkt, want social-media-links verlopen). Let op: dat is een kopie van andermans foto, bedoeld voor persoonlijk gebruik.
- Het werk gebeurt in een Netlify *background function* (`generate-image-background`, mag minuten duren); de app ververst zelf tot de foto er is. Sites als Instagram blokkeren vaak het ophalen; dan valt het automatisch terug op AI.
- AI-model aanpasbaar met `OPENAI_IMAGE_MODEL`. Kosten: een paar cent per AI-foto; controleer de actuele prijs bij OpenAI.

## Categorieën en filters
- **Gerecht** (precies één per recept): hoofdgerecht, soep, salade, lunch, dessert. Dit zijn de tabs bovenaan de lijst.
- **Hoofdingrediënt**: vlees (met kip, rund, varken), vis, vegetarisch, pasta, rijst. Meerdere tegelijk kan; ze moeten dan allemaal kloppen.
- **Tijd** wordt automatisch uit de totale tijd afgeleid (snel ≤ 30 min, rustig aan, langzaam ≥ 2 uur) en is dus geen tag.
- **Eigen labels** (vrije tekst) blijven bestaan maar staan verborgen in het filterpaneel onder ‘Toon mijn labels’.
- Tags worden automatisch voorgesteld uit trefwoorden (`src/lib/autotag.ts`). Onderaan de lijst staat ‘Categorieën opschonen’: zet voor bestaande recepten één gerecht en de juiste ingrediënt-tags, bewaart je eigen labels en verwijdert oude tags (oven, slowcooker, snel). Bij imports worden de tags van de bron niet overgenomen, zodat de lijst overzichtelijk blijft.

## Roadmap
- Later, indien gewenst: boodschappenlijst, weekplanner
