# StudyFlow

A local-first study app (Quizlet-style) with flashcards, learn mode (SM-2 spaced repetition), match game, and tests. No external API keys required; runs fully offline.

## Prerequisites

- **Node.js** 18+ (LTS recommended)

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Database

StudyFlow uses **IndexedDB** in the browser (via Dexie.js). No setup or migrations are required—data is stored locally and persists across sessions. Clearing site data in the browser will remove all sets and cards.

## Build

```bash
npm run build
```

Output is in `dist/`. Serve with any static host.

## Deploy

- **Frontend (static)**: Deploy the `dist/` folder to Vercel, Netlify, GitHub Pages, or any static host.
- **Optional sync server**: Not included by default. See “Optional sync backend” below if you add one.

## Features

- **Study modes**: Flashcards (3D flip, swipe, keyboard), Learn (SM-2, mixed question types), Match (drag-and-drop pairs), Test (configurable, PDF export).
- **Import**: Paste text (`term - definition` or `term: definition` or tab-separated) and preview before adding. JSON backup import/export.
- **Demo data**: “Load Demo Data” on the home page adds sample sets (Spanish, Biology, History).
- **PWA**: Installable, works offline. Service worker caches the app shell.
- **Read aloud**: Per-card speak (term/definition) via Web Speech API.
- **Images**: Optional card images (base64, compressed client-side, stored in IndexedDB). In Studio Mode, **image search** suggests photos from Unsplash/Pexels by the card’s term.

## Keyboard shortcuts

- **/** – Focus search (when not in an input).
- **Flashcards**: Space = flip / reveal word; Left/Right = prev/next; 1–3 = rate.
- **Esc** – Exit study (with confirmation) or close modal.
- **Studio**: **Ctrl+Shift+I** – Open image search for the active pane.

## Troubleshooting

- **IndexedDB missing or empty**: Data is per-origin. Clearing site data or using a different browser/profile resets it. Use Export to backup.
- **Service worker / cache**: After deploying a new version, do a hard refresh or unregister the service worker in DevTools (Application → Service Workers) to avoid stale cache.
- **CORS**: Only relevant if you add the optional backend; configure the server to allow your frontend origin.
- **Ollama connection refused**: Ensure Ollama is running and CORS is enabled: `OLLAMA_ORIGINS=* ollama serve`.
- **Tesseract slow**: First OCR is slow (model loading); subsequent runs are faster.
- **Storage limit**: Browsers limit IndexedDB (often ~500MB). Export old sets if you see quota errors.

## Image search (Studio Mode)

In the Studio editor, adding an image to a card can use **Search Web**. Results match the card term; “Load more” fetches additional pages.

1. **Google Image Search (recommended)** – Same relevance as Google Images.  
   - Create a [Programmable Search Engine](https://programmablesearchengine.google.com/): add a search engine that searches “the entire web”, then turn on **Image search** in the engine’s setup.  
   - In [Google Cloud Console](https://console.cloud.google.com/), enable **Custom Search API** and create an API key.  
   - In `.env`:  
     - `VITE_GOOGLE_CSE_KEY=your_api_key`  
     - `VITE_GOOGLE_CSE_CX=your_search_engine_id`  
   - Free tier: 100 queries/day.

2. **Unsplash**  
   - Go to [Unsplash Developers](https://unsplash.com/developers) → New Application.  
   - In `.env`: `VITE_UNSPLASH_ACCESS_KEY=your_key`  
   - Free tier: 50 requests/hour.

3. **Pexels (fallback)**  
   - Get a key at [Pexels API](https://www.pexels.com/api/).  
   - In `.env`: `VITE_PEXELS_API_KEY=your_key`  
   - Free tier: 200 requests/hour.

Without any keys, **Wikimedia Commons** is used (no key); **Upload** and pasting an image URL always work.

## Accounts and cloud sync (Supabase)

You can enable **sign up / sign in** and **save flashcards to the cloud** so they sync across devices.

1. Create a project at [Supabase](https://supabase.com).
2. In the Supabase dashboard: **Authentication** → enable **Email** provider (default).
3. Run the migration: **SQL Editor** → paste and run the contents of `supabase/migrations/001_study_sets.sql`. This creates the `study_sets` table and RLS so each user only sees their own sets.
4. In **Project Settings** → **API**: copy the **Project URL** and **anon public** key.
5. In your app `.env`:
   - `VITE_SUPABASE_URL=https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=your-anon-key`

After that, **Sign up** and **Sign in** appear in the header. New and updated sets are stored in IndexedDB and synced to Supabase when signed in. Signing in loads your cloud sets into the app.

## Local AI setup (privacy-first)

StudyFlow can use **Ollama** for AI features (Magic Create, AI Tutor, Smart Import) with no cloud or API keys.

1. Install [Ollama](https://ollama.com) and start the server.
2. Pull a model: `ollama pull llama3.2`
3. Enable in the app: set `VITE_OLLAMA_ENABLED=true` in `.env` (see `.env.example`).
4. For browser access, run Ollama with CORS: `OLLAMA_ORIGINS=* ollama serve`

AI features degrade gracefully: if Ollama is off or unreachable, the app uses manual mode and shows a toast.

## Cloud AI (optional)

To use OpenAI instead: add your API key to `.env`. The app can be extended with a small proxy so the key never hits the client. GPT-4o-mini is low-cost for typical flashcard use.

## OCR (photo to flashcards)

- **Default**: Tesseract.js runs in the browser; photos never leave your device.
- **Languages**: English (and optionally Spanish) by default. Add more by placing `.traineddata` files in `public/tessdata/` (see [Tesseract GitHub](https://github.com/tesseract-ocr/tessdata)).
- **Performance**: First OCR is slower (model load); subsequent runs are faster. Use lazy loading in production.

## Spaced repetition (FSRS)

The app supports **FSRS** (Free Spaced Repetition Scheduler) for more accurate scheduling than SM-2. Existing cards are migrated to FSRS state on first use. You can see “Hard” penalty and forecast graphs in the stats dashboard.

## Build and production

- `npm run build` — output in `dist/`. Tesseract.js worker and language data are large (~10MB); configure lazy loading if needed.
- **Ollama** runs on the user’s machine; it is not deployed with the app. Cloud AI (if used) requires your own backend or proxy.

## Tech stack

- React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Lucide React  
- Zustand (state), Dexie (IndexedDB), Fuse.js (search), jspdf (PDF export), canvas-confetti  
- AI: Ollama (local), optional OpenAI/Anthropic; OCR: Tesseract.js; scheduling: FSRS
