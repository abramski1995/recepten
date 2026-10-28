# Recepten

Persoonlijke receptenapp (één gebruiker, één wachtwoord). Vite + React + TypeScript + Tailwind, PWA, Netlify Functions, Supabase.

## Functies (v0.1)
- Recepten importeren via link (schema.org/Recipe), of handmatig invoeren
- Tags, filteren en zoeken op titel/ingrediënt
- Porties omrekenen
- Kookmodus (stap voor stap, scherm blijft aan)
- Installeerbaar als app (PWA), mobile-first

## Opzetten
1. **Supabase**: maak een project en draai `supabase/migrations/001_recipes.sql` in de SQL-editor.
2. **Netlify**: koppel deze repo. Build: `npm run build`, publish: `dist` (staat al in `netlify.toml`).
3. Zet in Netlify → Site settings → Environment variables:
   - `APP_PASSWORD` – je wachtwoord
   - `SESSION_SECRET` – lange willekeurige string (bijv. `openssl rand -hex 32`)
   - `SUPABASE_URL` – project-URL
   - `SUPABASE_SERVICE_KEY` – de *service role* key (nooit in de frontend of in git)

De database is niet publiek bereikbaar (RLS aan, geen policies); alleen de Netlify-functie in `netlify/functions/api.ts` gebruikt de service key.

## Lokaal draaien
```
cp .env.example .env   # invullen
npm install
npx netlify dev        # app + functies op http://localhost:8888
npm test               # unit tests
npm run build          # typecheck + build
```

## Roadmap
- Stap 2: recept importeren uit foto/screenshot en uit geplakte tekst (AI)
- Later, indien gewenst: boodschappenlijst, weekplanner
