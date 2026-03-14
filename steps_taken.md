# StudyFlow — Steps Taken & App Architecture

## How the App Works

StudyFlow is a Quizlet-like study app built with:
- **React + TypeScript** (Vite, SPA)
- **Zustand** for state management
- **Supabase** for auth, database (PostgreSQL), and RLS-based security
- **TipTap** for rich text editing (terms/definitions support bold, italic, images, etc.)
- **IndexedDB (Dexie)** for offline-first local storage
- **Framer Motion** for animations

### Core Data Model

- **StudySet**: id, title, description, tags, cards[], studyStats, visibility, sharingMode, folderId, userId
- **Card**: id, term (HTML string), definition (HTML string), imageData?, spaced repetition fields (difficulty, interval, efFactor, nextReviewDate, history)
- **Folder**: id, name, description, color, parentFolderId, sharingMode, userId
- Cards' term and definition fields store **TipTap HTML** (e.g., `<p>Hello</p><p><img src="data:..."></p>`), not plain text.

### Key Files & Directories

| Path | Purpose |
|------|---------|
| `src/App.tsx` | Main router — all routes defined here |
| `src/stores/studyStore.ts` | Zustand store for study sets CRUD, sync to cloud |
| `src/stores/sharingStore.ts` | Zustand store for sharing permissions, links, invites |
| `src/stores/authStore.ts` | Zustand store for authentication (Supabase auth) |
| `src/stores/folderStore.ts` | Zustand store for folder CRUD |
| `src/lib/cloudSync.ts` | Supabase queries: fetchUserSets, fetchPublicSets, fetchSetById, syncSetToCloud |
| `src/lib/supabase.ts` | Supabase client initialization |
| `src/lib/db.ts` | IndexedDB/Dexie local database |
| `src/lib/editorExtensions.ts` | TipTap editor config + ImagePasteHandler |
| `src/lib/validation.ts` | Card/set validation, stripHtml utility |
| `src/hooks/useStudySet.ts` | Hook to find a set (local or shared) by ID |
| `src/hooks/useSpacedRep.ts` | Spaced repetition recording hook |
| `src/pages/SetDetailPage.tsx` | Set editing, card management, study mode launcher |
| `src/pages/StudyPage.tsx` | Study mode router (flashcards/learn/match/test) |
| `src/pages/AcceptSharePage.tsx` | Share link acceptance flow |
| `src/pages/SharedWithMePage.tsx` | Lists items shared with current user |
| `src/pages/PublicSetsPage.tsx` | Browse public sets |
| `src/components/modes/FlashcardMode.tsx` | Flashcard study mode |
| `src/components/modes/LearnMode.tsx` | Learn mode (MC, written, T/F) |
| `src/components/modes/MatchMode.tsx` | Drag-and-drop matching game |
| `src/components/modes/TestMode.tsx` | Test/quiz mode with PDF export |
| `src/components/study/Flashcard.tsx` | Individual flashcard renderer (flip, swipe) |
| `src/components/study/MatchTile.tsx` | Drag-and-drop tile for match mode |
| `src/components/sharing/ShareDialog.tsx` | Sharing settings modal |
| `src/components/sharing/ShareButton.tsx` | Share button component |
| `src/components/inline/EditableCard.tsx` | Inline card editor with TipTap |
| `src/lib/diacritics.ts` | Script-aware diacritics config registry (Arabic harakat, extensible) + diacritics comparison helpers |
| `src/hooks/useScriptDetection.ts` | Hook to detect script/language from TipTap editor content |
| `src/components/editor/DiacriticsToolbar.tsx` | Auto-showing diacritics toolbar for Arabic (TipTap editors) |
| `src/components/editor/InputDiacriticsToolbar.tsx` | Auto-showing diacritics toolbar for plain `<input>` elements (learn/test modes) |
| `src/styles/editor.css` | TipTap + study mode CSS (`.study-content` rules) |
| `src/styles/globals.css` | Design system CSS variables |
| `supabase/migrations/` | All SQL migrations (001-005) |

### Database Schema (Supabase/PostgreSQL)

Defined across 5 migration files in `supabase/migrations/`:

1. **001_study_sets.sql** — `study_sets` table (id, user_id, title, description, tags, cards JSONB, timestamps, study_stats)
2. **002_public_sets.sql** — Added `visibility` column, public set RLS policies
3. **003_password_security.sql** — `password_history`, `failed_login_attempts`, `password_reset_requests` tables + security RPCs
4. **004_sharing_and_folders.sql** — Full sharing system:
   - Custom enums: `sharing_mode`, `permission_level`, `item_type`
   - `folders` table with nested folder support
   - `folder_items` junction table
   - `sharing_permissions` table (direct user-to-user sharing)
   - `share_links` table (unlisted link sharing with tokens)
   - Added `sharing_mode` and `folder_id` columns to `study_sets`
   - RPC functions: `get_effective_permission`, `validate_share_link`, `increment_share_link_access`, `cascade_folder_permissions`
   - RLS policies for all tables
   - Trigger to cascade folder sharing mode to contained sets
5. **005_sharing_fixes.sql** — Bug fixes (see below)

### Data Flow

**Creating/Editing Sets:**
1. User edits in TipTap editor -> `editor.getHTML()` -> Card.term/definition (HTML strings)
2. Debounced auto-save -> `studyStore.replaceSet()` -> IndexedDB + Supabase upsert

**Loading Sets:**
1. `studyStore.loadSets()` -> `fetchUserSets(user.id)` from Supabase (filtered by user_id)
2. Falls back to IndexedDB if cloud fails (offline-first)
3. For shared sets: `useStudySet` hook tries local store first, then fetches from Supabase via `fetchSharedSet()`

**Sharing Flow:**
1. Owner sets sharing mode (private/restricted/link/public) via ShareDialog
2. Owner can invite by email -> creates `sharing_permissions` row
3. Owner can create share link -> generates token in `share_links` table
4. Recipient clicks `/share/{token}` -> AcceptSharePage validates, creates `sharing_permissions` entry
5. Recipient navigates to set -> `useStudySet` fetches from Supabase (RLS allows access)
6. Shared items appear in recipient's "Shared with Me" page

**Study Modes:**
- All modes receive `cards[]` from the set and render term/definition HTML via `dangerouslySetInnerHTML`
- CSS class `.study-content` constrains images (max-height, max-width, border-radius)
- Spaced repetition updates card scheduling fields after each review

---

## Bugs Fixed (9 Total)

### Bug A: `shareWithUser` silently failed — missing `shared_by_user_id`
**File:** `src/stores/sharingStore.ts`
**Problem:** The `shareWithUser` function inserted into `sharing_permissions` without setting `shared_by_user_id`, which is a NOT NULL column with no default. Every email invite silently failed at the database level.
**Fix:** Added `supabase.auth.getUser()` call and included `shared_by_user_id: userData.user.id` in the insert.

### Bug B: `acceptShareLink` never created a persistent permission
**File:** `src/stores/sharingStore.ts`
**Problem:** When a user accepted a share link, the function validated the token and incremented the access count, but never created a `sharing_permissions` row. The accepting user had no persistent access — the set would show "not found" on subsequent visits.
**Fix:** After validation, the function now queries `share_links` for `created_by` and inserts a `sharing_permissions` row with `shared_with_user_id = currentUser.id`. Duplicates are handled gracefully by the unique constraint.
**Migration:** Added RLS policy "Users can accept share links for themselves" in `005_sharing_fixes.sql`.

### Bug C: `loadPendingInvites` missed email-based invites
**File:** `src/stores/sharingStore.ts`
**Problem:** Sharing via email set `shared_with_email` but `loadPendingInvites` only queried by `shared_with_user_id`. Email invites were never found.
**Fix:** Changed query to use `.or()` matching both `shared_with_user_id` and `shared_with_email`.
**Migration:** Added RLS policy "Users can view permissions shared with their email" in `005_sharing_fixes.sql`.

### Bug D: Shared sets showed "Set not found"
**Files:** `src/lib/cloudSync.ts`, `src/stores/studyStore.ts`, `src/hooks/useStudySet.ts`
**Problem:** `useStudySet` only searched the local `sets` array, which was populated by `fetchUserSets(user.id)` filtering by the current user's ID. Shared sets from other users were never loaded.
**Fix:**
- Added `fetchSetById(setId)` to `cloudSync.ts` — fetches a single set by ID (RLS allows shared access)
- Added `sharedSets: Map<string, StudySet>` and `fetchSharedSet()` action to `studyStore.ts`
- Updated `useStudySet` hook to fall back to `fetchSharedSet()` when set is not in local store

### Bug E: `<p>` tags visible before/after images in study modes
**Files:** `src/components/study/Flashcard.tsx`, `src/components/modes/LearnMode.tsx`, `src/components/modes/TestMode.tsx`
**Problem:** TipTap stores content as HTML with `<p>` tags. When rendered via `dangerouslySetInnerHTML` inside a `<p>` or `<span>` wrapper element, the browser's HTML parser creates invalid nested structure (block-level `<p>` inside inline `<span>` is not allowed), causing visible `<p>` text and broken layout.
**Fix:** Changed all `<p>` and `<span>` wrappers containing `dangerouslySetInnerHTML` to `<div>` elements with the `study-content` CSS class.

### Bug F: Flashcard back side completely broken for HTML/image content
**File:** `src/components/study/Flashcard.tsx`
**Problem:** `card.definition.split(/\s+/)` split the raw HTML string by whitespace, treating `<img`, `src="data:..."`, `<p>`, etc. as individual "words". The progressive word reveal was fundamentally broken for any card with HTML content or images.
**Fix:**
- Added `getPlainText()` helper that extracts text content from HTML
- Progressive word reveal now uses plain text words extracted from the definition
- When all words are revealed or the card is flipped (no reveal in progress), the full HTML definition is rendered via `dangerouslySetInnerHTML`

### Bug G: Images overlapping/going off screen in study modes
**File:** `src/components/study/Flashcard.tsx`
**Problem:** Flashcard face containers used `absolute inset-0` with `flex items-center justify-center` but had no overflow handling. Multiple images stacked without bounds. The flashcard also didn't use the `study-content` CSS class, so the `max-height: 200px` image constraint from `editor.css` didn't apply.
**Fix:**
- Added `overflow-y-auto` to both front and back flashcard face containers
- Added `study-content` class to content rendered via `dangerouslySetInnerHTML`
- Removed legacy `card.imageData` rendering (images are now inline in TipTap HTML)

### Bug H: SharedWithMePage showed "Shared Item" / "Unknown"
**File:** `src/stores/sharingStore.ts`
**Problem:** `loadPendingInvites` had TODO comments — item names were hardcoded to "Shared Item" and sharer emails to "Unknown".
**Fix:** After loading permissions, the function now batch-fetches:
- Set titles via `study_sets.select('id, title').in('id', setIds)`
- Folder names via `folders.select('id, name').in('id', folderIds)`
- Sharer emails via the new `get_user_emails` RPC function
**Migration:** Added `get_user_emails` RPC in `005_sharing_fixes.sql`.

### Bug I: LearnMode "correct answer" display broken
**File:** `src/components/modes/LearnMode.tsx`
**Problem:** When showing the correct answer after an incorrect response, the code concatenated a translation string with the raw HTML definition: `${t('correctAnswer')} ${current.card.definition}`. This produced broken mixed text+HTML output.
**Fix:** Separated the label text from the HTML content into distinct elements — a `<span>` for the label and a `<div class="study-content">` for the definition rendered via `dangerouslySetInnerHTML`.

---

## New Migration: `005_sharing_fixes.sql`

This migration must be applied to the Supabase database. It adds:

1. **RLS Policy:** "Users can accept share links for themselves" — allows authenticated users to insert a `sharing_permissions` row for themselves when a valid, active share link exists for the item.

2. **RLS Policy:** "Users can view permissions shared with their email" — allows users to see `sharing_permissions` rows where `shared_with_email` matches their auth email, enabling email-based invites to work.

3. **RPC Function:** `get_user_emails(user_ids uuid[])` — looks up email addresses from `auth.users` by ID array. Used by the SharedWithMe page to display who shared an item. Uses `SECURITY DEFINER` to access `auth.users`.

**To apply:** Run the SQL in `supabase/migrations/005_sharing_fixes.sql` against your Supabase database via the SQL editor in the Supabase dashboard, or via the Supabase CLI.

### Bug J: Images too large in card editor, cluttering the editing view
**File:** `src/styles/editor.css`
**Problem:** When users paste or insert images into card term/definition fields during editing, the images rendered at full size (`max-width: 100%`, no height constraint), taking up excessive vertical space and making it hard to see multiple cards.
**Fix:** Added thumbnail constraints to editor images:
- `.studio-editor .ProseMirror img`: `max-width: 120px`, `max-height: 80px`, `object-fit: contain` — images appear as compact thumbnails
- `.inline-editor .ProseMirror img`: `max-width: 100px`, `max-height: 64px`, `object-fit: contain`
- Images in study modes (`.study-content img`) remain at normal size (up to 200px tall)
- Added `margin: 4px` to study-mode images so multiple images per card have proper spacing

### Bug K: Multiple images per card not displaying cleanly in study modes
**File:** `src/styles/editor.css`
**Problem:** Users adding multiple images to a single card side found that images butted up against each other with no spacing in flashcard, learn, test, and match modes.
**Fix:** Added `margin: 4px 4px` to `.study-content img` so multiple images have breathing room between them. Multiple images per card were already functionally supported (TipTap stores them as inline HTML); this was purely a visual spacing fix.

### Bug L: Editor thumbnail CSS selectors never matched (images still full-size)
**File:** `src/styles/editor.css`
**Problem:** The CSS selectors `.studio-editor .ProseMirror img` and `.inline-editor .ProseMirror img` used a descendant combinator (space), expecting `.ProseMirror` to be a child of `.studio-editor`. However, TipTap's `editorProps.attributes.class` places the custom class directly on the ProseMirror div, producing `<div class="ProseMirror studio-editor">` — both classes on the **same** element. The descendant selector never matched, so editor images rendered at default full size despite the thumbnail rules existing.
**Fix:** Changed all CSS selectors from descendant (`.studio-editor .ProseMirror`) to compound (`.ProseMirror.studio-editor`) so they match when both classes are on the same element. Same fix applied to `.inline-editor .ProseMirror` → `.ProseMirror.inline-editor`. This affects all related selectors (base styles, placeholder, focus, img, mark).

### Bug M: Study mode images too large, causing excessive scrolling with multiple images
**File:** `src/styles/editor.css`
**Problem:** `.study-content img` used `max-width: 100%` and `max-height: 200px`, causing images in test, learn, and flashcard modes to fill the entire container width. With multiple images per card, users had to scroll extensively between questions.
**Fix:** Reduced study-content image constraints to `max-width: 280px` and `max-height: 140px` with `object-fit: contain`. Images are still clearly visible and readable but take significantly less vertical space, especially when a card has multiple images.

---

## UI Improvements

### Card Numbers in Editing Mode
**Files:** `src/components/editor/CardEditor.tsx`, `src/components/inline/EditableCard.tsx`, `src/styles/editor.css`
**Change:** Added visible card numbers to both editor modes:
- **Studio mode (CardEditor):** Replaced the tiny floating badge with a full card header bar showing the number, a "Card" label, and the drag handle.
- **Inline mode (EditableCard):** Added the card number (bold, primary color) to the left of each card next to the grip/drag handle.
- **CSS:** Added `.studio-card-header` and `.studio-card-number` styles.

### Test Mode — Improved Question Count Selector & "Both" Direction
**File:** `src/components/modes/TestMode.tsx`
**Changes:**
1. **Better question count selector:** Replaced the small range slider with a number input field flanked by −/+ buttons (step 5), plus preset quick-select buttons (5, 10, 20, All, 2×All). Much easier to pick exact counts.
2. **Questions can exceed card count:** Removed the `max={cards.length}` cap. When `questionCount > cards.length`, cards repeat evenly — e.g., 6 questions with 3 cards → each card appears exactly twice. A helper message explains the repetition.
3. **"Both" answer direction:** Added a third option alongside "Definition" and "Term". When "Both" is selected, each question randomly picks whether to answer with the term or definition. Image-only card logic still applies — if one side is image-only, the text side is always the answer regardless of the random pick.

---

## Printable Activities Feature

### Overview
Added a "Print Activities" feature accessible from the SetDetailPage's Actions menu. Users can generate 4 types of printable PDF worksheets from any study set, all generated client-side using jsPDF.

### New Files
- **`src/lib/printables.ts`** — Contains 4 PDF generator functions and shared helpers:
  - `generateLineMatchingPDF()` — Worksheet with numbered terms on the left, shuffled lettered definitions on the right, with a gap for drawing matching lines. Includes answer key on final page.
  - `generateTestPDF()` — Printable test with written (blank answer lines), multiple choice (4 options with bubbles), and true/false questions distributed round-robin. Includes Name/Date/Score header and answer key.
  - `generateFlashcardsPDF()` — 2x4 grid of cut-out flashcards per page. Each card cell has the term (bold, top half) and definition (bottom half) separated by a dashed divider. Supports embedded base64 images.
  - `generateMatchingGamePDF()` — Cut-out game cards (3x5 grid). Each study card produces 2 tiles (term + definition), all shuffled. Cards have colored type badges (T/D) and matching numbers for answer verification.
- **`src/components/print/PrintDialog.tsx`** — Modal dialog with 2x2 grid of activity options. Each shows an icon, label, description, and generates PDF on click with loading spinner. Disables options when card count is insufficient. Shows privacy note that PDFs are generated locally.

### Modified Files
- **`src/pages/SetDetailPage.tsx`** — Added `Printer` icon import, `PrintDialog` import, `showPrintDialog` state, "Print activities" button in More Actions dropdown, and `<PrintDialog>` render alongside other modals.

### Technical Details
- All PDF generators use dynamic `import('jspdf')` for code-splitting (~290KB loaded on demand)
- HTML content stripped to plain text for PDF rendering; image-only cards show `[Image]` or embed base64 images via `doc.addImage()`
- Uses `shuffle()` from `algorithms.ts` for randomizing definitions/tiles
- A4 format (210x297mm) with 15mm margins, auto-pagination with page break detection
- Text auto-wraps using `splitTextToSize()` and font shrinks (down to 7pt) for long content
- Answer keys generated on separate pages for line matching and test PDFs

### Edge Cases Handled
- Sets with < 2 cards: all PDF buttons disabled with warning message
- Sets with < 4 cards: multiple choice questions fall back to written/true-false only
- Image-only cards: `[Image]` placeholder in text-based PDFs, `addImage()` attempted in flashcard/matching game PDFs
- Long text: auto-wrapped and font-shrunk, truncated with `...` as last resort
- Large sets: natural pagination across multiple pages

---

## Files Modified

| File | What Changed |
|------|-------------|
| `supabase/migrations/005_sharing_fixes.sql` | **NEW** — RLS policies + RPC function |
| `src/stores/sharingStore.ts` | Fixed shareWithUser, acceptShareLink, loadPendingInvites |
| `src/lib/cloudSync.ts` | Added `fetchSetById()` function |
| `src/stores/studyStore.ts` | Added `sharedSets` Map, `fetchSharedSet()` action |
| `src/hooks/useStudySet.ts` | Added fallback fetch for shared sets from Supabase |
| `src/components/study/Flashcard.tsx` | Fixed `<p>` wrapping, back side HTML rendering, image overflow |
| `src/components/modes/LearnMode.tsx` | Fixed `<span>` wrapping, correct answer display |
| `src/components/modes/TestMode.tsx` | Fixed `<span>` wrapping; improved question count UI, card repetition, "Both" direction |
| `src/components/editor/CardEditor.tsx` | Added card number header bar replacing floating badge |
| `src/components/inline/EditableCard.tsx` | Added card number next to drag handle |
| `src/styles/editor.css` | Fixed CSS selector specificity, editor thumbnails, card header/number styles |
| `src/lib/printables.ts` | **NEW** — 4 PDF generator functions (line matching, test, flashcards, matching game) |
| `src/components/print/PrintDialog.tsx` | **NEW** — Print activities modal dialog |
| `src/pages/SetDetailPage.tsx` | Added "Print activities" to Actions menu, renders PrintDialog |
| `steps_taken.md` | **NEW** — This documentation file |

---

## Games Section Framework

### Overview
Added a "Games" entry to the study modes grid on SetDetailPage. Unlike other modes that navigate directly to a study route, clicking Games opens a modal browser designed to house hundreds of games over time. No actual games are implemented yet — just the expandable framework.

### New Files
- **`src/config/gameRegistry.ts`** — Central game registry. Exports:
  - `GameDefinition` interface: `{ id, name, description, icon, color, category, tags, minCards, component }` where `component` is a `React.lazy` loaded component
  - `GameModeProps` interface: `{ cards, setId, onExit }` — standard props for all game components
  - `GameCategory` type: `'word' | 'memory' | 'speed' | 'puzzle' | 'quiz'`
  - `gameCategories` map with labels and colors for each category
  - `gameRegistry: GameDefinition[]` — empty array; adding a game = adding one object here
- **`src/components/games/GamesBrowserModal.tsx`** — Games browser popup modal:
  - Follows existing modal pattern (AnimatePresence, motion.div backdrop, escape key, ARIA attributes, focus restore)
  - Header with title, game count, and close button
  - Search bar (Input with Search icon) filtering by name, description, and tags
  - Category pill filter buttons (only shown when categories have games)
  - 2-column game card grid matching SetDetailPage mode card style (gradient icon, name, description, category badge)
  - Games disabled when `cardCount < game.minCards` with "Needs X+ cards" message
  - Clicking a game navigates to `/sets/{setId}/study/{game.id}` and closes modal
  - Empty state: "Games coming soon!" with Gamepad2 icon when registry is empty
  - No-results state for search with no matches
- **`src/components/modes/games/`** — Empty directory for future game mode components

### Modified Files
- **`src/pages/SetDetailPage.tsx`**:
  - Added `Gamepad2` icon import and `GamesBrowserModal` import
  - Added `showGamesBrowser` state
  - Added Games card as 5th item in study modes grid (rose-to-pink gradient, Gamepad2 icon, "Browse fun games to study your cards." description)
  - Games card is a `<button>` (not Link) that opens the modal; disabled when `!canStartStudying` with same styling as other disabled modes
  - Renders `<GamesBrowserModal>` alongside other modals
- **`src/pages/StudyPage.tsx`**:
  - Added `Suspense` import and `gameRegistry` import
  - Extended `default` switch case to look up `mode` in `gameRegistry`
  - If a matching game is found, renders its lazy-loaded component wrapped in `<Suspense>` with a spinner fallback
  - Falls back to "Unknown study mode" error if no match

### How to Add a Future Game
1. Create `src/components/modes/games/MyGame.tsx` implementing `GameModeProps` (`{ cards, setId, onExit }`)
2. Add one entry to the `gameRegistry` array in `src/config/gameRegistry.ts` with `component: lazy(() => import(...))`
3. Done — the game automatically appears in the browser modal and routes via `/sets/{id}/study/{gameId}`

### Architecture Decisions
- Games reuse the existing `/sets/{id}/study/{mode}` routing pattern — no new routes needed
- Game components are code-split via `React.lazy` so they load on demand
- The registry pattern means no switch/case updates needed — just one array entry per game
- Categories and tags support future filtering when the game count grows to hundreds
- The modal design (vs. a separate page) keeps the user close to their set while browsing games

---

## Block Builder Game

### Overview
The first game in the registry. A survival/quiz hybrid where users answer study questions to build a tower of blocks while rising lava threatens to engulf their character. Players climb a mountain, and on winning (limited mode), a helicopter rescues them from the summit.

### New Files
- **`src/components/modes/games/block-builder/types.ts`** — All game types and constants:
  - `Difficulty` (`easy` | `medium` | `hard`), `AnswerDirection`, `GamePhase`, `QuestionType`
  - `BlockBuilderConfig` — pre-game options (answer direction, question types, count, difficulty, infinity mode)
  - `BlockBuilderQuestion` — generated question with prompt, options, correct answer
  - `GameState` — runtime state (blocks, score, lava height, streak, phase, timing)
  - Constants: `BLOCK_HEIGHT_PX` (40), `INITIAL_BLOCKS` (3), `TOWER_CONTAINER_HEIGHT` (480)
  - `DIFFICULTY_SPEEDS` — lava speed per difficulty (easy: constant 3px/s, medium: 2.5+0.08/s accel, hard: 3+0.15/s accel)
  - `BLOCK_PENALTY` — blocks lost on wrong answer (easy: 0, medium: 1, hard: 2)

- **`src/components/modes/games/block-builder/useBlockBuilderGame.ts`** — Core game hook:
  - State machine: config → playing → won | lost
  - Question generation reusing TestMode patterns (`selectCardsForQuestions`, `isImageOnly`, `getTextContent`, `hasTextContent`)
  - `requestAnimationFrame` loop for lava rising (synced to React state via refs)
  - Scoring: +100 base, +50 speed bonus (1 − timeTaken/15s), difficulty multiplier (1x/1.5x/2x), streak bonus (capped 2x)
  - Infinity mode: generates new question batches when queue runs low (< 5 remaining)
  - Exports: config, gameState, currentQuestion, questions, start/submit/reset functions

- **`src/components/modes/games/block-builder/TowerView.tsx`** — Visual game rendering:
  - Camera system that follows the character (spring-animated translateY, character at 60% viewport height)
  - Mountain background with jagged SVG ridge silhouettes (`MountainRidge` component), rock shelves on alternating sides (`RockShelf` component)
  - Sky gradient transitioning from dark space at peak through sunset tones to blue sky at base
  - Snow zone near summit with gradient overlay and snowflake decorations
  - Helicopter (🚁) at summit with gentle bobbing animation; flies away with character on win
  - Lava with gradient body, wavy top edge (CSS keyframe), glow shadow, and animated bubbles
  - Colored block stack with AnimatePresence (scale in/out), HSL color rotation
  - Character (🧱👷) bounces on correct, shakes on wrong, flies off with helicopter on win
  - HUD: score, streak counter, difficulty badge, altitude percentage
  - Altitude progress bar (right edge) with animated fill and character dot
  - Rocky ground base with rock/plant emoji decorations

- **`src/components/modes/games/block-builder/QuestionPanel.tsx`** — Question interface:
  - Renders one question at a time with `dangerouslySetInnerHTML` + `study-content` class
  - Written: Input + Enter submit, uses `gradeWrittenAnswer()` for typo tolerance
  - Multiple choice: 4 option buttons
  - True/False: True/False buttons
  - Brief feedback flash (green/red ring, ~500ms) then auto-advance
  - AnimatePresence for question transitions

- **`src/components/modes/games/block-builder/BlockBuilderConfig.tsx`** — Pre-game config screen:
  - Answer direction toggle (Definition / Term / Both)
  - Question types checkboxes (Written, Multiple Choice, True/False)
  - Question count stepper + preset buttons (hidden when infinity mode is on)
  - Difficulty selector (Easy/Medium/Hard color-coded toggle buttons with descriptions)
  - Infinity mode toggle switch
  - Start / Exit buttons

- **`src/components/modes/games/block-builder/BlockBuilderResults.tsx`** — End screens:
  - Win: helicopter emoji (🚁) with hovering animation, "Rescued!" title, "The helicopter got you to safety!" subtitle, confetti particles
  - Lose: volcano emoji (🌋), "Game Over" (or "Nice Run!" for infinity mode)
  - Score display, stats grid (accuracy, time, correct, wrong, max tower, best streak)
  - Play Again / Exit buttons

- **`src/components/modes/games/BlockBuilderMode.tsx`** — Entry point:
  - Phase router: config → playing → won/lost (results)
  - Desktop: side-by-side grid `grid-cols-[2fr_3fr]` (tower left, questions right)
  - Mobile: stacked layout
  - Passes all game state + config to child components

### Modified Files
- **`src/config/gameRegistry.ts`** — Added Block Builder entry:
  - id: `block-builder`, name: `Block Builder`, category: `quiz`, minCards: 4
  - icon: `Blocks` (lucide-react), color: `from-orange-500 to-red-500`
  - Lazy-loaded component pointing to `BlockBuilderMode`

### Game Mechanics
- **Blocks:** Start with 3. Correct = +1, Wrong = −0/−1/−2 (by difficulty). Each block 40px tall, HSL color rotation.
- **Lava:** Rises from bottom via RAF loop. Easy: constant 3px/s. Medium/Hard: accelerating.
- **Win condition (limited mode):** Answer all questions before lava reaches character. Helicopter rescue animation plays.
- **Lose condition:** Lava height ≥ tower height (blocks × 40px).
- **Infinity mode:** No question limit, no summit/helicopter. Play for high score until lava catches you.
- **Scoring:** Base 100 + speed bonus (up to 50) × difficulty multiplier × streak bonus.

---

## Spinner Mode

### Overview
A visual spinning-wheel study mode that appears as its own card in the "Choose a study mode" grid on SetDetailPage, positioned between the core modes and Games. Instead of linearly going through flashcards, users spin a colorful wheel containing all their terms. The wheel lands on a random term, the user views its flashcard (term → flip → definition), then that term is removed from the wheel. This continues until all terms have been reviewed.

### New Files
- **`src/components/modes/SpinnerMode.tsx`** — Full spinner implementation:
  - SVG-based spinning wheel with colored segments (12-color palette cycling)
  - Each segment displays the term's plain text (truncated to 18 chars)
  - Font size adapts to segment count (12px for ≤6, 10px for ≤12, 8px for 12+)
  - CSS transition-based spin animation (3.5s cubic-bezier easing for realistic deceleration)
  - Pointer triangle indicator at top of wheel
  - Center hub with primary-color dot
  - "SPIN!" button triggers 5–7 full rotations landing on a random segment
  - On landing: flashcard overlay appears with 3D flip animation (term → definition)
  - "Got it — Remove & Continue" button on definition side removes the card and returns to wheel
  - Completion screen with trophy icon and "Spin Again" / "Back to Set" buttons
  - Progress counter in header (X / Y done)
  - Reset button to restart with all cards
  - Escape key: dismisses flashcard if open, otherwise shows exit confirmation
  - Exit confirmation modal (reuses ConfirmModal)

### Modified Files
- **`src/pages/SetDetailPage.tsx`**:
  - Added `Disc` icon import from lucide-react
  - Added Spinner card in study modes grid (fuchsia-to-violet gradient, Disc icon)
  - Spinner card is a `<Link>` to `/sets/{id}/study/spinner`
  - Grid updated from `sm:grid-cols-4` to `sm:grid-cols-3 lg:grid-cols-6` to fit 6 items
- **`src/pages/StudyPage.tsx`**:
  - Added `SpinnerMode` import
  - Added `'spinner'` to Mode type union
  - Added `case 'spinner'` in switch to render `<SpinnerMode>`

### How It Works
1. User clicks "Spinner" on SetDetailPage → navigates to `/sets/{id}/study/spinner`
2. SpinnerMode renders with all cards loaded into wheel segments
3. User clicks "SPIN!" → wheel rotates 5–7 full turns + lands on random segment
4. After 3.5s animation, flashcard overlay appears showing the term
5. User taps to flip → sees definition
6. User clicks "Got it" → card removed from wheel, returns to spinner
7. Repeat until all cards reviewed → completion screen

### Architecture Decisions
- Built as a first-class study mode (like Flashcards/Learn/Match/Test), not a game in the registry, since it's a visual flashcard reviewer rather than a scored game
- Uses CSS `transition` for wheel spin (not requestAnimationFrame) for smooth GPU-accelerated rotation
- SVG wheel renders entirely client-side with computed arc paths; no external dependencies
- Flashcard overlay reuses the same `study-content` CSS class and `dangerouslySetInnerHTML` pattern as other modes

---

## Memory Card Flip Game

### Overview
The second game in the registry. A classic memory/concentration game where players flip face-down cards two at a time to find matching term-definition pairs. Cards that match vanish from the board; mismatches flip back over after a brief reveal. The goal is to clear the entire board in as few moves as possible. Similar to the existing MatchMode (drag-and-drop matching) but uses a click-to-flip mechanic with a grid of face-down cards.

### New Files
- **`src/components/modes/games/memory-card-flip/types.ts`** — Game types:
  - `MemoryTile` — individual tile with id, cardId, content (HTML), and type (term/definition)
  - `GamePhase` — `'playing' | 'complete'`
  - `MemoryGameState` — runtime state (tiles, flippedIndices, matchedCardIds, moves, timing)
  - `getGridCols()` — responsive grid column helper based on pair count

- **`src/components/modes/games/memory-card-flip/useMemoryCardFlip.ts`** — Core game hook:
  - Builds shuffled tile array from study cards (up to 8 pairs = 16 tiles)
  - Flip logic: first click reveals tile, second click checks for match
  - Match: same cardId but different type (term vs definition) → added to matchedCardIds
  - Mismatch: both tiles shown for 800ms then flip back (locked during delay)
  - Move counter increments on each pair attempt
  - Auto-detects completion when all pairs matched
  - Reset function to start fresh with re-shuffled tiles

- **`src/components/modes/games/memory-card-flip/MemoryCard.tsx`** — Individual card component:
  - CSS 3D flip animation using `perspective` and `rotateY` via Framer Motion
  - Back face: violet-to-purple gradient with "?" symbol
  - Front face: content with colored type badge (T=blue, D=emerald)
  - Matched cards animate to scale 0.8 + opacity 0 and vanish
  - Keyboard accessible (Enter/Space to flip)
  - HTML content rendered via `dangerouslySetInnerHTML` with `study-content` class

- **`src/components/modes/games/memory-card-flip/MemoryResults.tsx`** — Completion screen:
  - Performance rating based on moves-to-pairs ratio (Perfect Memory → Keep Practicing)
  - Stats grid: moves, time, pairs, accuracy percentage
  - Confetti celebration on mount
  - Play Again / Exit buttons

- **`src/components/modes/games/MemoryCardFlipMode.tsx`** — Entry point:
  - Header with game name, pair/move counter, exit button
  - Renders responsive card grid during play, results screen on completion
  - Minimum 2 cards required

### Modified Files
- **`src/config/gameRegistry.ts`**:
  - Added `FlipVertical2` icon import from lucide-react
  - Added Memory Card Flip entry: id `memory-card-flip`, category `memory`, minCards 2
  - Color: `from-violet-500 to-purple-500`

### Game Mechanics
- **Grid:** Up to 8 pairs (16 tiles) from study cards, shuffled randomly
- **Flipping:** Click a face-down card to reveal it. Click a second card to attempt a match.
- **Matching:** Term + definition from the same study card = match. Both vanish with animation.
- **Mismatch:** Both cards shown for 800ms, then flip back face-down. Input locked during reveal.
- **Moves:** Each pair attempt counts as one move, regardless of match/mismatch.
- **Completion:** All pairs matched → results screen with confetti, stats, and performance rating.
- **Rating scale:** Perfect Memory (≤1.2× moves/pairs), Excellent (≤1.8×), Great (≤2.5×), Good (≤3.5×), Keep Practicing (>3.5×).

### Bugs Fixed

#### Bug N: Game froze after first match — flippedIndices never cleared
**File:** `src/components/modes/games/memory-card-flip/useMemoryCardFlip.ts`
**Problem:** After a successful match, `flippedIndices` was immediately set to `[]` in the same state update that added the match. However, the second card's flip was never visible because the state transitioned too fast. The original fix (clearing flippedIndices synchronously) actually caused a different problem — the `flippedIndices.length >= 2` guard blocked all subsequent clicks because the matched indices were still present before the first fix.
**Fix:** On match, keep both indices in `flippedIndices` so both cards visually flip face-up. Lock input (`lockRef`) and use a 600ms `setTimeout` to then clear `flippedIndices` and add the cardId to `matchedCardIds`. This gives the player time to see both cards before they vanish.

#### Bug O: Images beyond the 3rd not visible on cards
**File:** `src/components/modes/games/memory-card-flip/MemoryCard.tsx`
**Problem:** The card content area used `line-clamp-4` which hard-caps visible content to 4 CSS lines. Images after the 3rd were completely hidden with no way to see them.
**Fix:** Replaced `line-clamp-4 overflow-hidden` with `overflow-y-auto flex-1 min-h-0` so the content area becomes scrollable. Each image is constrained to `max-h-[50px]` individually with `display: block` so they stack vertically and all remain accessible via scroll.

#### Bug P: Second card didn't flip before match vanished
**File:** `src/components/modes/games/memory-card-flip/useMemoryCardFlip.ts`
**Problem:** When the second card was flipped and it matched, the state update immediately cleared `flippedIndices` and set `matchedCardIds`, so the second card jumped straight from face-down to the vanish animation without ever showing its face-up content. The player couldn't confirm what they matched.
**Fix:** On match, the second card's index is added to `flippedIndices` immediately (so Framer Motion animates the flip), then a 600ms delay runs before transitioning to the matched state. Input is locked during this window so the player can't flip other cards while the match is being revealed.

---

## Race to Finish Game

### Overview
The third game in the registry. A board game where players answer study questions to earn dice rolls, then race along a winding path to reach the finish line first. Supports 1–4 players (hot-seat multiplayer). The board features a procedurally generated serpentine road with shortcuts (warp portals), animated player tokens, and a dice-rolling mechanic.

### New Files
- **`src/components/modes/games/race-to-finish/types.ts`** — Game types and constants:
  - `AnswerDirection`, `GamePhase` (`config | question | rolling | moving | finished`), `QuestionType`
  - `RaceConfig` — pre-game options (playerCount, pathLength, answerDirection, questionTypes)
  - `Player` — id, name, position, color/bgColor/borderColor, emoji
  - `Shortcut` — from/to cell indices (warp portals)
  - `BoardCell` — index, content (HTML), label (Term/Definition), optional shortcutTo
  - `RaceQuestion` — generated question with prompt, options, correct answer, answerWith
  - `PendingMove` — tracks in-progress movement animation (playerId, fromPos, toPos, shortcutTo, steps)
  - `RaceGameState` — full runtime state (phase, players, board, shortcuts, winner, stats, pendingMove)
  - `PLAYER_THEMES` — 4 player color/emoji themes (🚀🔥🌿⚡)

- **`src/components/modes/games/race-to-finish/useRaceToFinish.ts`** — Core game hook:
  - `generateBoard()` — creates board cells from study cards, cycling term/definition content
  - `generateShortcuts()` — places 1–3 forward-jumping shortcuts on the board (no backward movement)
  - `generateQuestion()` — creates written/multiple-choice/true-false questions from cards
  - `gradeWrittenAnswer()` — fuzzy string matching for written answers (case-insensitive, strips HTML)
  - Game state machine: config → question → rolling → moving → question (loop) → finished
  - `handleAnswerResult()` — correct answer → transition to rolling phase; wrong → skip turn (multi) or stay (solo)
  - `onDiceRollComplete()` — calculates pending move (with shortcut detection), transitions to moving phase
  - `onMoveComplete()` — applies final position after animation, checks win condition, advances to next player

- **`src/components/modes/games/race-to-finish/GameBoard.tsx`** — Visual board component:
  - `generatePath()` — procedural serpentine path generation using seeded layout, creating zigzag node positions
  - `buildSmoothPath()` — converts node positions to SVG cubic bezier path for the road
  - SVG road rendering with shadow, main road, and dashed center line
  - Shortcut arcs rendered as dashed cyan SVG paths between cells
  - Cell circles with numbered labels, content tooltips on hover, shortcut indicators
  - GO (start) and FINISH cells with special styling
  - **Floating player tokens** — absolutely positioned `motion.div` elements with spring-physics animation between board positions
  - **Step-by-step hop animation** — players hop cell-by-cell with delays (350ms per hop, 500ms for shortcut warp)
  - **Smart scrolling** — `isYInView()` checks if character is in viewport; only scrolls vertically when needed, using smooth behavior
  - **Turn-change scroll** — auto-scrolls to current player's position on turn change
  - ResizeObserver for responsive container width tracking
  - `canvasW = containerW` (no horizontal scroll); SVG viewBox with `preserveAspectRatio` for responsive rendering

- **`src/components/modes/games/race-to-finish/RaceQuestionPanel.tsx`** — Question display:
  - `splitContent()` — regex-based HTML parser that separates text from `<img>` tags
  - `RaceContent` component — renders text via `dangerouslySetInnerHTML`, images in a flex grid with `data-count` attribute
  - Written answer input with Enter-to-submit
  - Multiple choice buttons
  - True/False with green/red styled buttons and proposed answer display
  - Feedback flash (green/red ring) on correct/wrong answer
  - Player indicator bar with emoji and turn label

- **`src/components/modes/games/race-to-finish/DiceRoll.tsx`** — Dice rolling animation:
  - `DICE_FACES` — dot position maps for dice faces 1–6
  - `DiceFace` component — 3×3 grid rendering dice dots
  - Roll animation: 1.2s of random face cycling (70ms interval), then lands on pre-determined result
  - Framer Motion shake/bounce during roll, spring settle on land
  - "Roll Dice" button → rolling → landed (shows move count) → notifies parent after 900ms

- **`src/components/modes/games/race-to-finish/RaceToFinishConfig.tsx`** — Pre-game config:
  - Player count selector (1–4) with toggle buttons
  - Path length: stepper (−/+) with manual input + preset buttons (10, 15, 20, 30, 50, 75, 100)
  - Answer direction toggle (Definition / Term / Both)
  - Question type checkboxes (Written, Multiple Choice, True/False)
  - Start Race / Exit buttons

- **`src/components/modes/games/race-to-finish/RaceToFinishResults.tsx`** — End screen:
  - Solo: "You Finished!" with accuracy percentage
  - Multiplayer: winner announcement with emoji, final standings sorted by position
  - Stats grid: questions answered, accuracy percentage
  - Play Again / Exit buttons with spring animations

- **`src/components/modes/games/RaceToFinishMode.tsx`** — Entry point:
  - Phase router: config → playing → finished (results)
  - Header with player avatars (active player highlighted with ring + scale)
  - Turn indicator bar with player emoji, name, and current cell position
  - **Always side-by-side layout** — `flex` with `flex-1 min-w-0` panels (board left, question/dice right)
  - `h-screen overflow-hidden` root container for proper viewport-constrained independent scrolling
  - Board panel: `overflow-y-auto overflow-x-hidden` for vertical-only scroll
  - Right panel: `overflow-y-auto` for independent scroll of question content

### Modified Files
- **`src/config/gameRegistry.ts`** — Added Race to Finish entry:
  - id: `race-to-finish`, name: `Race to Finish`, category: `quiz`, minCards: 4
  - Lazy-loaded component pointing to `RaceToFinishMode`
- **`src/styles/editor.css`** — Added `.race-question-content` and `.race-img-grid` CSS:
  - `race-img-grid` uses `data-count` attribute for responsive image sizing
  - 1 image: 180px max-height, full width
  - 2 images: 140px max-height, side by side (50% each)
  - 3 images: 110px max-height, three across (33% each)
  - 4+ images: 90px max-height, 2 per row (50% each)

### Game Flow
1. Config screen → set players, path length, question types, answer direction
2. Question phase → answer a study question (written/MC/TF)
3. Correct → Rolling phase → click "Roll Dice" → animated dice roll
4. Moving phase → token hops cell-by-cell along the path (spring animation)
5. If landing on a shortcut cell → token warps forward
6. If reaching the finish → game over, winner announced
7. Wrong answer → turn skipped (multiplayer) or try again next round (solo)
8. Repeat from step 2 with next player

### UI/UX Improvements Made
- **Smooth character movement:** Player tokens are absolutely positioned `motion.div` elements using Framer Motion spring physics, not inline DOM elements. They interpolate smoothly between board positions.
- **Smart scrolling:** Board only scrolls vertically when the character moves near/past the viewport edge. Uses `isYInView()` check with 80px margin. No jarring jumps.
- **Independent panel scrolling:** Board (left) and question panel (right) scroll independently. Achieved via `h-screen overflow-hidden` → `flex-1 min-h-0` → `flex-1 min-w-0 overflow-y-auto` CSS containment chain.
- **Image layout optimization:** `RaceContent` component extracts images from HTML via regex, renders them in a flex grid with `data-count` attribute for CSS-driven responsive sizing. Minimizes vertical scrolling.
- **Player token positioning:** Tokens sit on top edge of their cell (`node.y - NODE_R - 12`) to reduce confusion about which cell a player occupies.
- **Vertical-only board scroll:** `overflow-x-hidden` on board container; canvas width matches container width.

### Path Non-Overlap Fix
- **File:** `src/components/modes/games/race-to-finish/GameBoard.tsx`
- **Problem:** The procedurally generated path frequently crossed over itself — road segments (SVG bezier curves) would intersect when the path wound back upward, creating visual confusion where the player couldn't tell which direction the road was going.
- **Fix:** Added segment intersection and proximity detection to the path generator:
  - `segmentsIntersect()` — cross-product math to detect if a new edge would cross any previous edge
  - `pointToSegmentDistSq()` — ensures new nodes and segment midpoints aren't too close to any old segment (using `ROAD_BUFFER = ROAD_WIDTH + NODE_R`)
  - `isValid()` combines three checks: node clear, segment doesn't cross, segment not too close
  - Candidate angle system: generates 13 candidate directions (preferred + 12 evenly-spaced fallbacks). Picks the first that passes all checks, naturally routing around already-used areas.
  - Last resort fallback pushes outward/downward when all 13 angles fail in tight spaces.

### Build Fix
- **Unused variable `pIdx` in GameBoard.tsx:** Vercel's `npm run build` runs `tsc -b` which treats unused variables as errors (exit code 2). Removed the unused `pIdx` parameter from `players.map((player, pIdx) => ...)` → `players.map((player) => ...)`.

---

## Arabic Diacritics (Harakat) Toolbar

### What It Does
Automatically detects when a user is typing Arabic text in the card editor and shows a harakat toolbar below the text box. The toolbar provides clickable buttons for common Arabic diacritical marks so users can easily add tashkeel to their flashcard content. The system is built to be extensible — adding support for other languages (e.g., French accents) requires only adding a config object, no component changes.

### How It Works
1. **Script detection** — A custom hook (`useScriptDetection`) subscribes to TipTap editor updates and checks the current paragraph's text against Unicode ranges. Arabic is detected via `/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/`. A 50ms debounce prevents flicker during rapid typing.
2. **Toolbar rendering** — When Arabic is detected, a `DiacriticsToolbar` component animates in (Framer Motion slide) below the `<EditorContent>`. When the user switches to non-Arabic text, it animates out.
3. **Character insertion** — Buttons use `onMouseDown` + `e.preventDefault()` to keep the TipTap editor focused, then call `editor.chain().focus().insertContent(char).run()` to insert the combining character at the cursor position.
4. **Extensibility** — All language configs live in a `SCRIPT_CONFIGS` array in `diacritics.ts`. Each config has a `detectPattern` (RegExp) and `groups` (button groups). Adding a new language is one config object.

### Diacritics Available
- **Short Vowels:** Fatha (َ), Kasra (ِ), Damma (ُ), Sukun (ْ)
- **Shaddah:** Shaddah (ّ)
- **Tanwin:** Fathatan (ً), Kasratan (ٍ), Dammatan (ٌ)

Button labels display each diacritic on a tatweel base character (e.g., `ـَ`) for visual clarity.

### New Files
| Path | Purpose |
|------|---------|
| `src/lib/diacritics.ts` | Script config registry — interfaces (`ScriptToolbarConfig`, `DiacriticGroup`, `DiacriticButton`), Arabic config with harakat groups, `detectScript()` function, extensible `SCRIPT_CONFIGS` array |
| `src/hooks/useScriptDetection.ts` | Custom hook — subscribes to TipTap `update` and `selectionUpdate` events, extracts current paragraph text, runs `detectScript()` with 50ms debounce, returns matching `ScriptToolbarConfig` or `null` |
| `src/components/editor/DiacriticsToolbar.tsx` | Toolbar component — self-manages visibility via `useScriptDetection`, renders grouped buttons with dividers, uses `AnimatePresence` for enter/exit animation |

### Modified Files
- **`src/components/editor/CardEditor.tsx`** — Imported `DiacriticsToolbar`, added `<DiacriticsToolbar editor={termEditor} />` and `<DiacriticsToolbar editor={defEditor} />` after each `<EditorContent>` in the studio mode bilateral editor.
- **`src/components/inline/EditableCard.tsx`** — Same integration for inline (Notion-style) card editor — toolbar appears inside each term/definition input box when Arabic is detected.
- **`src/styles/editor.css`** — Added `.diacritics-toolbar` (flex-wrap bar with subtle primary-tinted background), `.diacritics-toolbar-group`, `.diacritics-toolbar-divider`, `.diacritics-btn` (32px square buttons with hover/active states).

### Key Design Decisions
- **Hook-based detection (not TipTap extension):** The toolbar is a React component rendered outside ProseMirror's DOM, so React state is needed for show/hide. A hook is simpler and shareable across both editor components.
- **`onMouseDown` + `preventDefault()` on buttons:** Prevents the browser from moving focus away from the editor when clicking a diacritic button. Without this, the cursor position would be lost and insertion would fail.
- **Tatweel base for labels:** Arabic combining marks are invisible in isolation, so each button label shows the diacritic on a tatweel character (`ـ`) for readability.
- **Per-paragraph detection:** Only the current paragraph's text is checked, not the full document. This means the toolbar appears/disappears based on where the cursor is, not what's elsewhere in the card.

---

## Sharing Permissions Fix & Anonymous Share Link Access

### Problem
Multiple sharing permission issues:
1. When a user sent a set (via email invite), the receiving user clicked "Show Set" and got "Set not found" because RLS policies on `study_sets` only checked `shared_with_user_id` — email-only invites never granted read access.
2. `SharedWithMePage` ignored the `itemName` already fetched by `loadPendingInvites()`, always showing "Untitled Set".
3. `acceptShareLink` silently swallowed insert errors and didn't include `shared_with_email`.
4. `useStudySet` hook had no retry logic — if the initial fetch raced before permissions were created, "Set not found" was permanent.
5. Anonymous users (not signed in) could not view shared sets even with a valid share link.

### Migration History & Lessons Learned

#### Migration 010 (ROLLED BACK — caused DB outage)
- Added RLS policy `"Users can view sets shared with their email"` on `study_sets` using `auth.jwt() ->> 'email'` with an `EXISTS` subquery on `sharing_permissions`
- Added `claim_email_invites()` SECURITY DEFINER function
- Added overlapping SELECT policy on `sharing_permissions`
- **Problem:** The `auth.jwt()` + subquery policy evaluated on **every row read** from `study_sets`, causing massive performance degradation. Database became unhealthy — all queries timed out, users couldn't sign in.
- **Recovery:** Restarted database from Supabase dashboard, then ran 3 DROP statements to remove the policies and function.
- **Lesson:** Never add RLS policies with `auth.jwt()` calls + subqueries on high-traffic tables. Use SECURITY DEFINER functions instead.

#### Migration 011 (emergency rollback)
- Just 3 DROP statements to undo migration 010
- `DROP POLICY IF EXISTS "Users can view sets shared with their email" ON public.study_sets;`
- `DROP POLICY IF EXISTS "Users can view permissions for accessible items" ON public.sharing_permissions;`
- `DROP FUNCTION IF EXISTS public.claim_email_invites();`

#### Migration 012 (safe — anonymous share link access)
- Creates `get_set_by_share_token(p_token text)` SECURITY DEFINER function
- Validates the share link (active, not expired, under max uses)
- Returns full set data as JSONB if valid
- Increments access count for analytics
- **No RLS changes** — zero performance risk
- Only supports sets (not folders) for anonymous access

### Application Code Changes

#### `src/lib/cloudSync.ts`
- Added `fetchSetByToken(token)` — calls the `get_set_by_share_token` RPC function
- Added error logging to `fetchSetById` for easier debugging

#### `src/stores/studyStore.ts`
- Added `fetchSharedSetByToken(token)` action — fetches set via token RPC and caches in `sharedSets` map
- Import updated to include `fetchSetByToken` from cloudSync

#### `src/pages/AcceptSharePage.tsx`
- **Anonymous flow:** When no user is signed in, fetches the set directly via `fetchSharedSetByToken(token)` instead of showing "Sign in required"
- On success: shows "View item" button + "Sign in to save" option
- On error: shows invalid link page with sign-in option
- **Signed-in flow:** Unchanged — accepts link, creates `sharing_permissions`, pre-warms cache

#### `src/pages/SharedWithMePage.tsx`
- Fixed: now uses `invite.itemName` from `loadPendingInvites()` instead of always showing "Untitled Set"
- Falls back to translated "Untitled Set"/"Untitled Folder" only when `itemName` is empty

#### `src/stores/sharingStore.ts`
- `shareWithUser`: After inserting sharing_permissions, auto-upgrades `sharing_mode` from `'private'` to `'restricted'` so RLS policies can match
- `acceptShareLink`: Now includes `shared_with_email` in the permission entry; properly logs insert failures instead of silently swallowing
- `loadPendingInvites`: Calls `claim_email_invites()` RPC first (wrapped in try/catch for graceful degradation)

#### `src/hooks/useStudySet.ts`
- Added 1.5s retry for race condition where sharing_permissions entry is created just after the initial fetch fails

#### `src/i18n/translations.ts`
- Added `readyToStudy` and `signInToSave` keys (EN, AR, ES)

### Architecture Decisions
- **SECURITY DEFINER function over RLS policy:** After migration 010 took down the database, anonymous access is handled via an RPC function that bypasses RLS entirely. The function validates the token itself, so security is maintained without touching RLS.
- **Token-based access, not set-ID-based:** Anonymous users can only access a set if they have a valid share token. They cannot browse or guess set IDs.
- **Cache-first for anonymous users:** The set is fetched and stored in the `sharedSets` map on the AcceptSharePage. When navigating to `/sets/:id`, the SetDetailPage finds it in cache via `useStudySet`.

---

## Step 13 — Move Spinner into Games Section

### What Changed
Moved the Spinner study mode from a standalone study mode card into the Games browser modal, so it appears alongside Block Builder, Memory Card Flip, and Race to Finish.

### Why
UI cleanup — the Spinner is conceptually a game/activity rather than a core study mode like Flashcards, Learn, Match, or Test. Consolidating it into the Games section reduces clutter on the set detail page.

### Files Changed

#### `src/config/gameRegistry.ts`
- Added `Disc` icon import from lucide-react
- Registered Spinner as the first game entry: id `'spinner'`, category `'quiz'`, minCards `2`, fuchsia-violet gradient
- Used `lazy(() => import(...).then(m => ({ default: m.SpinnerMode })))` to wrap the named export as a default export for React.lazy compatibility

#### `src/pages/SetDetailPage.tsx`
- Removed the standalone Spinner card (both enabled and disabled states) from the study modes grid
- Removed unused `Disc` icon import
- Changed grid layout from `lg:grid-cols-6` to `lg:grid-cols-5` (4 study modes + Games button)

#### `src/pages/StudyPage.tsx`
- Removed `SpinnerMode` import and the hardcoded `case 'spinner'` from the switch statement
- Removed `'spinner'` from the `Mode` type union
- Spinner now routes through the game registry's dynamic `default` case, same as other games

### What Did NOT Change
- `src/components/modes/SpinnerMode.tsx` — the spinner game component itself was not modified at all
- The spinner is still accessible at `/sets/:id/study/spinner` — now resolved via the game registry instead of a hardcoded switch case

---

## Step: Study Mode Tiles — Single Row & Consistent Height

### What Changed
- Set detail page study mode tiles (Flashcards, Learn, Match, Test, Games, Print) now display in a single row on large screens (`lg:grid-cols-6`)
- All tiles use `h-full min-h-[160px]` for consistent height across all 6 tiles
- Link and button wrappers got `h-full` (and `w-full` on Games/Print buttons) so inner cards stretch to fill the grid row height

### Files Changed
- `src/pages/SetDetailPage.tsx` — grid columns `lg:grid-cols-5` → `lg:grid-cols-6`, consistent tile height classes, wrapper stretch classes

---

## Step: Print Activities — PDF Spacing & Test Configuration

### What Changed

#### 1. Print Dialog Two-Step Flow
The PrintDialog now has a two-step flow:
- **Main view**: Shows "Number of cards" + "Answer with" direction + 4 activity buttons (Printable Test, Line Matching, Flashcards, Matching Game)
- **Test config sub-view**: Clicking "Printable Test" opens a dedicated config screen with:
  - Question types: Written, Multiple choice, True/False checkboxes (same options as online TestMode)
  - Answer direction: Definition / Term / Both
  - Number of questions: Stepper + presets (5, 10, 20, All, 2x) — can exceed card count, cards repeat evenly
  - Back arrow to return to main view, "Generate Test" button

#### 2. Test PDF — Question Count & Card Repeating
- `PrintConfig` now has `testQuestionCount` and `testQuestionTypes` fields
- `generateTestPDF` uses `testQuestionCount` (separate from card count) and repeats cards evenly when question count exceeds card count, matching the online test behavior
- Question type selection respects the user's checkbox choices

#### 3. PDF Spacing Fixes — All Activities
- **Written questions**: Reduced from 3 answer lines to 2, line spacing 7→6mm, removed extra gaps
- **MC questions**: Reduced trailing gaps, tightened inter-option spacing
- **T/F questions**: Trailing gap reduced from 10→6mm, added 4mm gap between images and True/False bubbles
- **Image grid layout**: `addScaledImages` changed from vertical stacking to horizontal-first grid:
  - 1 image: full width
  - 2-3 images: side-by-side in one row
  - 4 images: 2x2 grid (not 3+1)
  - 5-6 images: 3-column grid with row wrapping
- **Image width constraints**: MC option images use 60mm width, T/F images use 70mm, answer key images use 60mm (prevents images spreading across full page width)
- **Grid-aware height estimation**: `imgGridHeight()` helper calculates correct height for horizontal layouts instead of multiplying per-image height by count
- **MC option images**: Use smaller `IMG_H_OPTION = 12mm` instead of 18mm
- **Matching game tiles**: Increased tile height 35→38mm, reduced gaps 4→3mm

#### 4. Matching Game Tiles — Horizontal Image Layout
- Matching game tile rendering now delegates to `addScaledImages` (horizontal-first grid) instead of manual vertical stacking loops

### Files Changed

#### `src/components/print/PrintDialog.tsx`
- Full rewrite: two-step flow with main activity picker and test config sub-view
- Test config has question type checkboxes, question count stepper with presets, answer direction picker
- Separated test generation (`handleGenerateTest`) from other activities (`handleGenerate`)
- Added `ArrowLeft` icon for back navigation

#### `src/lib/printables.ts`
- `PrintConfig` interface: added `testQuestionCount` and `testQuestionTypes` fields
- `generateTestPDF`: uses `testQuestionCount`, repeats cards when count > pool size, respects question type selections
- `addScaledImages`: rewritten from vertical stacking to horizontal-first grid layout with smart column selection (4 images → 2x2)
- Added `IMG_H_OPTION = 12` constant for smaller MC option images
- Added `imgGridHeight()` helper for grid-aware height estimation
- All test question types (written, MC, T/F) use grid-aware height calculations
- MC option images: constrained to 60mm width
- T/F images: combined into single horizontal grid, constrained to 70mm width, 4mm gap before True/False bubbles
- Answer key images: constrained to 60mm width
- Matching game tiles: both "text+images" and "images only" cases delegate to `addScaledImages`

### What Did NOT Change
- Line matching worksheet layout (was already fine)
- Flashcard PDF layout (automatically benefits from `addScaledImages` horizontal layout since `renderCellContent` already delegated to it)
- Online TestMode component — no changes to the interactive test

---

## Step: Cut & Glue Printable Activity

### What Changed

Added a new "Cut & Glue" printable PDF activity where students cut out terms and glue them next to matching definitions.

#### PDF Layout
1. **Definitions pages** — Each definition is numbered on the left with an empty solid-bordered glue box on the right (labeled "Glue here"). Name and date fields at the top of the first page.
2. **Cut-out terms pages** — Terms arranged in a 3-column shuffled grid, each in a dotted-border box (same dimensions as glue boxes so they fit perfectly when glued). Heavier dashed lines clearly indicate where to cut.
3. **Answer key page** — Lists each term paired with its definition for teacher verification.

#### Key Design Details
- Dotted lines (`[2,2]` dash pattern, 0.5pt weight) on all cut-out term boxes; solid lines on glue target boxes
- Glue box height dynamically stretches to match definition row height when images are present
- Term box height pre-calculated from tallest content across all terms, with `imgGridHeight()` for proper image grid spacing (matching test mode pattern)
- Rows per page recalculated dynamically based on actual term box height
- Supports images, non-Latin text (canvas rendering), and answer direction setting

### Files Changed

#### `src/components/print/PrintDialog.tsx`
- Imported `Scissors` icon from lucide-react and `generateCutAndGluePDF` from printables
- Added "Cut & Glue" entry to `nonTestActivities` array with rose/red gradient, scissors icon, minCards: 2

#### `src/lib/printables.ts`
- Added `generateCutAndGluePDF()` export function (~160 lines)
- Definitions section: dynamic row height using `imgGridHeight()` with `IMG_H_INLINE`, glue box stretches to match
- Term cut-out section: pre-scans all terms for max height, dynamically calculates rows per page
- Name/Date fields on first page (matching test PDF pattern)
- Answer key page with term = definition pairs

---

## Arabic Diacritics Toolbar in Learn/Test Modes + Harakat-Aware Grading

### What It Does
Extends the Arabic diacritics (harakat) toolbar to all places where users type written answers — Learn mode, Test mode, Block Builder game, and Race to Finish game. Also implements harakat-aware answer grading: users are not punished for adding extra or omitting diacritics, but are penalised for putting the **wrong** diacritic where the correct answer has one.

### Grading Logic
The comparison works on a per-character-position basis:
- **User adds harakat where answer has none** → correct (extra diacritics tolerated)
- **User omits harakat where answer has one** → correct (missing diacritics tolerated)
- **User puts the wrong harakat where answer has one** → incorrect (e.g., fatha vs damma)
- **Shadda** follows the same rules but is binary (present/absent) — "wrong shadda" can't exist, so it's only ever extra or missing, both tolerated
- **Base text** (stripped of all diacritics) still uses Levenshtein distance for typo tolerance (max 2 edits)
- If the base text matches only approximately (within Levenshtein tolerance but not exact), diacritics comparison is skipped since character alignment can't be guaranteed

### How It Works
1. **`gradeWrittenAnswer()`** in `algorithms.ts` detects Arabic content via Unicode ranges
2. Strips all combining diacritics from both strings and compares base text with Levenshtein
3. If base text is exactly equal, runs `compareWithDiacriticsTolerance()` which:
   - Parses both strings into `(baseChar, diacritics[])` tuples via `parseArabicChars()`
   - For each aligned position, extracts the vowel-class diacritic (fatha/kasra/damma/sukun/tanwin)
   - If both sides have a vowel mark → they must be the same; if only one side has one → OK
4. **`InputDiacriticsToolbar`** component detects Arabic in the `<input>` value using `detectScript()`, renders the same harakat buttons as the TipTap toolbar, and inserts characters at the cursor position using `onMouseDown` + `preventDefault()` to keep focus

### New Files
| Path | Purpose |
|------|---------|
| `src/components/editor/InputDiacriticsToolbar.tsx` | Diacritics toolbar for plain `<input>` elements — auto-shows via `detectScript()` on input value, inserts combining characters at cursor position, uses `requestAnimationFrame` to restore cursor after React re-render |

### Modified Files
- **`src/lib/diacritics.ts`** — Added exported helpers: `isArabicDiacritic()`, `stripArabicDiacritics()`, `parseArabicChars()`, `compareWithDiacriticsTolerance()`. Vowel-class diacritics set (`VOWEL_DIACRITICS`) used to identify which marks are mutually exclusive per position.
- **`src/lib/algorithms.ts`** — `gradeWrittenAnswer()` now imports diacritics helpers and has an Arabic-aware code path: strip → Levenshtein on base text → position-by-position vowel mark comparison when base text is exactly equal.
- **`src/components/modes/LearnMode.tsx`** — Added `useRef` + `writtenInputRef`, passed ref to `<Input>`, added `<InputDiacriticsToolbar>` below the written answer input.
- **`src/components/modes/TestMode.tsx`** — Same integration for test mode written answer input.
- **`src/components/modes/games/block-builder/QuestionPanel.tsx`** — Same integration for Block Builder game written input.
- **`src/components/modes/games/race-to-finish/RaceQuestionPanel.tsx`** — Same integration for Race to Finish game written input.
- **`src/styles/editor.css`** — Added `.diacritics-toolbar--input` variant (no border-top, standalone border + border-radius + margin-top) for use outside TipTap editors. Fixed `.diacritics-toolbar` border-top fallback from `var(--studio-border)` to `var(--studio-border, var(--color-border))`.

### Key Design Decisions
- **Symmetric comparison:** The diacritics tolerance logic is symmetric — it doesn't matter which argument is "correct" vs "user". This matters because some callers (TestMode, game hooks) pass arguments in swapped order.
- **Skip diacritics check on approximate base match:** When base text matches within Levenshtein tolerance but not exactly, character positions can't be reliably aligned, so diacritics comparison is skipped entirely (answer accepted).
- **Vowel-class grouping:** Only vowel marks (fatha, kasra, damma, sukun, tanwin variants) are compared. Shadda is a separate binary category — since there's only one kind of shadda, it can never be "wrong", only missing or extra.
- **`InputDiacriticsToolbar` separate from `DiacriticsToolbar`:** The TipTap version uses `editor.chain().focus().insertContent()` and the `useScriptDetection` hook (which subscribes to ProseMirror events). The plain input version uses `selectionStart/End` + string slicing and `useMemo(detectScript(value))`. Sharing code would add unnecessary coupling.
- **`requestAnimationFrame` for cursor restore:** After calling `onValueChange` (React state update), the input re-renders with the new value. The cursor position must be restored after React's commit phase, hence `rAF`.
- **Disabled input guard:** The toolbar's `onMouseDown` handler checks `input.disabled` before inserting, preventing diacritic insertion on answered/locked inputs (e.g., LearnMode after submitting).

---

## Step 17: Equivalent Cards — Content-Based Answer Matching

### What Changed

When cards share the same term content (e.g., `a→apple` and `a→ant`), the app now treats them as an **equivalence group** — any answer from the group is accepted as correct. This works symmetrically: cards sharing the same definition also form groups. Affects all study modes, games, live game, match/memory modes, and printable PDFs.

### Core Architecture

Two new shared modules consolidate duplicated helpers and implement the equivalence system:

**`src/lib/contentHelpers.ts`** — Consolidated content helpers previously duplicated across 4+ files:
- `getTextContent(html)` — strips HTML tags
- `normalizeContent(html)` — strips HTML, lowercases, trims (used for all content comparison)
- `isImageOnly(content)` — checks if content is only images with no text
- `hasTextContent(content)` — checks if content has any text
- `selectCardsForQuestions(cards, count)` — selects cards for question generation, repeating evenly when count > cards.length

**`src/lib/equivalence.ts`** — Core equivalence module:
- `EquivalenceGroups` — `{ byTerm: Map<string, Card[]>, byDefinition: Map<string, Card[]> }` built with `buildEquivalenceGroups(cards)` (O(n), called once per session via `useMemo`)
- `getEquivalentAnswers(card, answerWith, groups)` — returns all valid plain-text answers for a card
- `getEquivalentAnswersHtml(card, answerWith, groups)` — same but returns raw HTML
- `getWrongOptionPool(card, allCards, answerWith, groups)` — filters out cards whose answer-side content matches any correct answer
- `findCorrectOptionIndices(options, card, answerWith, groups)` — scans MC option array to find ALL correct indices
- `buildMultiAnswerOptions(card, allCards, answerWith, groups)` — builds 4-option MC arrays with up to 2 correct answers (1 primary + 1 equivalent), filling remaining slots with wrong options
- `isDistinctAnswer(candidate, correctAnswersNorm)` — ensures T/F "false" pairings are genuinely wrong
- `getCorrectAnswersNormSet(card, answerWith, groups)` — returns normalized set of all correct answers
- `gradeWrittenAnswerMulti(correctAnswers, userInput)` — checks input against ALL equivalent correct answers using existing `gradeWrittenAnswer` (exact → Arabic diacritics tolerance → Levenshtein ≤ 2)
- `areMatchableByContent(termContent, defContent, groups)` — checks if a term-definition pair is valid via equivalence lookup

### Mode-by-Mode Changes

#### LearnMode (`src/components/modes/LearnMode.tsx`)
- MC generation uses `buildMultiAnswerOptions` (always multi-answer, no config toggle needed)
- Multi-select checkbox UI when `correctOptionIndices.length > 1` — user must select ALL correct options
- Written grading uses `gradeWrittenAnswerMulti`
- Incorrect answer feedback shows all equivalent answers via `equivalentAnswersHtml`

#### TestMode (`src/components/modes/TestMode.tsx`)
- Added `multiAnswerMC` toggle to `TestConfig` and config screen UI
- When enabled: MC uses `buildMultiAnswerOptions`, renders checkbox multi-select UI
- When disabled: standard 1-correct MC behavior
- Written grading uses `gradeWrittenAnswerMulti`
- `TestQuestion` interface extended with `correctOptionIndices?: number[]` and `equivalentAnswers?: string[]`

#### Block Builder (`src/components/modes/games/block-builder/`)
- `BlockBuilderConfig` type extended with `multiAnswerMC: boolean`
- Config screen toggle: "Multi-answer MC" checkbox (shown when MC is enabled)
- `generateQuestions()` uses `buildMultiAnswerOptions` when `multiAnswerMC` is ON
- `submitMultipleChoice` uses `correctOptionIndices.includes(optionIndex)` — any single correct option accepted (timed mode)
- `submitWrittenAnswer` uses `gradeWrittenAnswerMulti`

#### Race to Finish (`src/components/modes/games/race-to-finish/`)
- `RaceConfig` type extended with `multiAnswerMC: boolean`
- Config screen toggle added
- `generateQuestion()` uses `buildMultiAnswerOptions` when `multiAnswerMC` is ON
- Answer submission uses `correctOptionIndices.includes()` and `gradeWrittenAnswerMulti`

#### Match Mode (`src/components/modes/MatchMode.tsx`, `src/components/study/MatchTile.tsx`)
- `MatchTileData` extended with `tileIndex: number` — flows through drag/drop data
- Matching changed from `cardId === cardId` to `areMatchableByContent(termTile.text, defTile.text, groups)`
- Tracking changed from `matchedPairs: Set<string>` (card IDs) to `matchedTiles: Set<number>` (tile indices)
- Same tile detection uses `tileIndex` instead of `cardId + type`

#### Memory Card Flip (`src/components/modes/games/memory-card-flip/`)
- `MemoryGameState.matchedCardIds: Set<string>` → `matchedTileIndices: Set<number>`
- Match check: `first.cardId === second.cardId && first.type !== second.type` → `areMatchableByContent(termTile.content, defTile.content, groups)`
- Completion check: `matchedTileIndices.size === pairCount * 2`
- `MemoryCardFlipMode.tsx` updated to use `matchedTileIndices.has(i)` for display

#### Live Game
- **Types** (`src/types/liveGame.ts`): Added `correctOptionIndices: number[]` to `LiveQuestion` and `AnswerRevealPayload`
- **Question generation** (`src/lib/liveGameUtils.ts`): `buildQuestions()` uses `getWrongOptionPool` and `findCorrectOptionIndices`
- **Answer checking** (`src/stores/liveGameStore.ts`): `question.correctOptionIndices.includes(payload.chosenOption)`
- **Host reveal** (`src/components/live/HostRevealView.tsx`): Highlights ALL correct options
- **Player reveal** (`src/components/live/PlayerRevealView.tsx`): Shows all correct options with "Correct answers:" label when multiple exist
- **Player page** (`src/pages/live/PlayerGamePage.tsx`): Passes `correctOptionIndices` to reveal view

#### Printable PDFs (`src/lib/printables.ts`)
- `PrintConfig` extended with `multiAnswerMC?: boolean`
- MC generation uses `buildMultiAnswerOptions` when enabled; T/F uses `isDistinctAnswer` for false pairings
- **Test answer key**: Shows `"apple (or ant)"` for written, multiple letters for MC (e.g., `"a, b) apple (or ant)"`)
- **Line matching answer key**: Shows `"1 = C (or D)"` when equivalent definitions exist
- **Cut & glue answer key**: Shows `"1. a = apple (or ant)"` with equivalent alternatives

#### Print Dialog (`src/components/print/PrintDialog.tsx`)
- Added `testMultiAnswerMC` state and "Multi-answer MC" checkbox to test config sub-view
- Passes `multiAnswerMC` through to `PrintConfig`

#### Validation (`src/lib/validation.ts`)
- `DUPLICATE_TERMS` severity changed from `'block'` to `'warning'`
- Message updated: "Some cards share the same term — they'll be treated as equivalent answers."

### New Files
| Path | Purpose |
|------|---------|
| `src/lib/contentHelpers.ts` | Consolidated text/content helpers — `getTextContent`, `normalizeContent`, `isImageOnly`, `hasTextContent`, `selectCardsForQuestions` |
| `src/lib/equivalence.ts` | Equivalence groups, multi-answer grading, MC helpers, content-based matching |

### Modified Files
- **`src/lib/validation.ts`** — DUPLICATE_TERMS downgraded to warning
- **`src/components/modes/LearnMode.tsx`** — Equivalence groups, multi-answer MC, feedback with all equivalents
- **`src/components/modes/TestMode.tsx`** — Config toggle, multi-answer MC, equivalence-aware grading
- **`src/components/modes/MatchMode.tsx`** — Content-based matching with `areMatchableByContent`
- **`src/components/study/MatchTile.tsx`** — `tileIndex` in data, content-based same-tile detection
- **`src/components/modes/SpinnerMode.tsx`** — Imports from `contentHelpers` instead of local helpers
- **`src/components/modes/games/block-builder/types.ts`** — `multiAnswerMC` in config, `correctOptionIndices`/`equivalentAnswers` in question
- **`src/components/modes/games/block-builder/useBlockBuilderGame.ts`** — Equivalence-aware question gen + grading
- **`src/components/modes/games/block-builder/BlockBuilderConfig.tsx`** — Multi-answer MC toggle
- **`src/components/modes/games/race-to-finish/types.ts`** — `multiAnswerMC` in config, `correctOptionIndices`/`equivalentAnswers` in question
- **`src/components/modes/games/race-to-finish/useRaceToFinish.ts`** — Equivalence-aware question gen + grading
- **`src/components/modes/games/race-to-finish/RaceToFinishConfig.tsx`** — Multi-answer MC toggle
- **`src/components/modes/games/memory-card-flip/types.ts`** — `matchedCardIds` → `matchedTileIndices`
- **`src/components/modes/games/memory-card-flip/useMemoryCardFlip.ts`** — Content-based matching
- **`src/components/modes/games/MemoryCardFlipMode.tsx`** — Updated for `matchedTileIndices`
- **`src/types/liveGame.ts`** — `correctOptionIndices` on `LiveQuestion` and `AnswerRevealPayload`
- **`src/lib/liveGameUtils.ts`** — Equivalence-aware `buildQuestions`
- **`src/stores/liveGameStore.ts`** — `correctOptionIndices` state, equivalence-aware answer checking
- **`src/components/live/HostRevealView.tsx`** — Highlights all correct options
- **`src/components/live/PlayerRevealView.tsx`** — Shows all correct answers
- **`src/pages/live/PlayerGamePage.tsx`** — Passes `correctOptionIndices` to reveal
- **`src/lib/printables.ts`** — Equivalence-aware MC/TF generation, answer keys show all equivalents
- **`src/components/print/PrintDialog.tsx`** — Multi-answer MC toggle for printable test

### Key Design Decisions
- **Content normalization**: `stripHTML → lowercase → trim` is the single source of truth for content comparison. Two cards with `<b>apple</b>` and `apple` are correctly treated as equivalent.
- **`useMemo` for groups**: `buildEquivalenceGroups(cards)` is called once per session via `useMemo`, not on every question.
- **Game modes accept any single correct**: Timed modes (Block Builder, Race to Finish, Live Game) use `correctOptionIndices.includes(chosen)` — no multi-select UI. Only LearnMode and TestMode require selecting ALL correct options.
- **Tile-index tracking for Match/Memory**: Switched from `cardId`-based to tile-index-based tracking because a match can now span two different card IDs (e.g., term tile from card 1 matched with definition tile from card 2).
- **Multi-answer MC is opt-in**: All modes default to `multiAnswerMC: false`. When OFF, MC options have exactly 1 correct answer. When ON, `buildMultiAnswerOptions` includes up to 2 correct answers (1 primary + 1 equivalent). LearnMode always uses multi-answer behavior (no config, always enabled).
- **T/F fallback**: When no distinct wrong answer exists (all cards equivalent), T/F forces `isTrue: true` instead of generating an impossible false question.
- **Backward compatibility**: `correctOptionIndex` (singular) is preserved alongside `correctOptionIndices` (array) for all types to avoid breaking existing code paths.

---

## Step: Validation UX Overhaul — Deferred Warnings, Save Button, Graceful Empty Card Handling

### What Changed

Three user-facing improvements to how card validation works during set editing:

1. **Deferred validation warnings**: Validation errors no longer appear immediately when creating/editing a set. Warnings only show after the user explicitly clicks "Save Changes" or tries to start a study mode. Once activated, errors update in real-time as the user fixes them.

2. **"Save Changes" button**: A prominent save button was added at the bottom of `SetDetailPage` (below "Add card"). Shows "Save Changes" when dirty (primary color) or "All changes saved" when clean (muted/disabled). Auto-save still runs silently in the background.

3. **Context-aware validation (`'save'` vs `'study'`)**: `validateCard()` now accepts a `ValidationContext` parameter. Empty-card errors (`EMPTY_CONTENT`, `EMPTY_TERM_CONTENT`, `EMPTY_DEFINITION_CONTENT`) only fire in `'study'` context. All save paths use `'save'` context, so empty/incomplete cards are freely saved without blocking.

4. **Graceful empty/incomplete card handling for study modes**: Blank cards (both sides empty) and incomplete cards (only one side filled) no longer block the user from starting any study mode or game. Instead, a warning toast tells the user how many cards will be skipped (e.g., "2 blank and 1 incomplete cards will be skipped"), and those cards are filtered out before reaching the study component.

### How It Works

- **`ValidationContext` type** (`'save' | 'study'`): Added to `src/lib/validation.ts`. The three empty-content checks in `validateCard()` are wrapped in `if (context === 'study')`. Default is `'study'` for backward compatibility.
- **`validationActivated` state** in `SetDetailPage`: Starts `false`. Set to `true` when user clicks "Save Changes" or starts a study mode. Card error display and warning banners are gated behind this flag.
- **Silent auto-save**: `debouncedSave` in `SetDetailPage` no longer runs validation or shows errors. It only silently skips save on `MAX_LENGTH_EXCEEDED` (data integrity). The auto-save in `EditorPage` (`useAutoSave`) also passes `'save'` context.
- **Card filtering**: `StudyPage.tsx` filters cards via `hasContent(c) && hasTermContent(c) && hasDefinitionContent(c)` before passing to any study mode component. `liveGameStore.ts` does the same before `buildQuestions()`.
- **Study mode buttons**: Converted from `<Link>` to `<button onClick={handleStartStudy}>` to show the skip warning toast before navigating.

### Files Changed

- **`src/lib/validation.ts`** — Added `ValidationContext` type; `validateCard` accepts optional context param; exported `hasTermContent` and `hasDefinitionContent`
- **`src/stores/validationStore.ts`** — `runValidation` accepts context param (default `'save'`); `canStudy` reverted to set-level only check
- **`src/pages/SetDetailPage.tsx`** — `validationActivated` flag; silent `debouncedSave`; `handleExplicitSave` callback; `handleStartStudy` with skip warning; `handleStartLiveGame` with skip warning; "Save Changes" button; conditional error display on `EditableCard`; warning banners gated behind activation
- **`src/pages/StudyPage.tsx`** — Filters out blank/incomplete cards before passing to study mode components
- **`src/stores/liveGameStore.ts`** — Filters cards in `createSession` before building questions and snapshot
- **`src/hooks/useAutoSave.ts`** — Passes `'save'` context to `runValidation`
- **`src/pages/EditorPage.tsx`** — Passes `'save'` context to `runValidation` in useEffect and `handleSaveAndExit`

### Key Design Decisions
- **Auto-save remains silent**: The background debounced save never shows validation toasts — it just saves. Only explicit user actions (Save button, starting a study mode) surface errors.
- **Warn but don't block**: Empty/incomplete cards produce a toast warning when starting study modes but never prevent the user from studying. The cards are simply excluded.
- **Filtering at the gateway**: Card filtering happens in `StudyPage` (the single entry point for all study modes) and `liveGameStore.createSession`, so no individual mode component needs to worry about incomplete cards.
- **`hasTermContent` / `hasDefinitionContent` exported**: These were previously private functions in `validation.ts`. Exported so `SetDetailPage`, `StudyPage`, and `liveGameStore` can detect incomplete cards without duplicating logic.

---

## Step 30 — Fix Flashcard "Know it" / "Study again" Buttons Not Working

### Problem
In flashcard mode, clicking "Know it" or "Study again" did nothing — the card never advanced. "Skip" worked fine.

### Root Cause
`handleRate` in `FlashcardMode.tsx` was `async` and `await`ed `recordReview()` before calling `setIndex()`. The `recordReview` call triggers a Zustand store update (and potentially a cloud sync via `syncSetToCloud`), which could hang or throw. Since the `await` blocked, `setIndex` was never reached.

### Fix
Changed `handleRate` from async/await to fire-and-forget. The review recording runs in the background with `.catch()` for error logging, while the card advances immediately — matching how `handleSkip` already worked.

### Files Changed
- **`src/components/modes/FlashcardMode.tsx`** — `handleRate` changed from `async` to synchronous; `recordReview` called without `await`, errors caught via `.catch()`

---

## Step 31 — Increase Text Size for Terms & Definitions Across Entire App

### Problem
Terms and definitions appeared too small across all editors, study modes, and games.

### Changes
Bumped all term/definition text sizes up by one step throughout the app.

#### Editors (CSS)
| Area | Before | After |
|------|--------|-------|
| Studio editor (`ProseMirror.studio-editor`) | `1.125rem` (18px) | `1.25rem` (20px) |
| Inline editor (`ProseMirror.inline-editor`) | `0.9375rem` (15px) | `1.0625rem` (17px) |

#### Study Modes & Games (Tailwind classes)
| Component | Before | After |
|-----------|--------|-------|
| Flashcard term/definition | `text-lg` | `text-xl` |
| LearnMode term prompt | `text-lg` | `text-xl` |
| LearnMode true/false definition | `text-base` | `text-lg` |
| TestMode question prompts (×4) | `text-lg` | `text-xl` |
| TestMode true/false definition | `text-base` | `text-lg` |
| MatchTile text | `text-sm` | `text-base` |
| BlockBuilder question prompt | `text-lg` | `text-xl` |
| BlockBuilder true/false definition | `text-base` | `text-lg` |
| RaceToFinish question prompt | `text-lg` | `text-xl` |
| RaceToFinish true/false definition | `text-base` | `text-lg` |
| MemoryCard content | `text-xs / text-sm` | `text-sm / text-base` |
| HostQuestionView term | `text-2xl` | `text-3xl` |
| HostQuestionView options | `text-sm` | `text-base` |
| PlayerQuestionView term | `text-lg` | `text-xl` |
| PlayerQuestionView options | `text-sm` | `text-base` |
| HostRevealView term | `text-xl` | `text-2xl` |
| HostRevealView options | `text-sm` | `text-base` |
| PlayerRevealView options | `text-sm` | `text-base` |

### Files Changed
- **`src/styles/editor.css`** — Increased `font-size` for `.ProseMirror.studio-editor` and `.ProseMirror.inline-editor`
- **`src/components/study/Flashcard.tsx`** — Term, definition, and progressive reveal text bumped to `text-xl`
- **`src/components/modes/LearnMode.tsx`** — Term prompt and true/false definition bumped
- **`src/components/modes/TestMode.tsx`** — All question prompts and true/false definition bumped
- **`src/components/study/MatchTile.tsx`** — Tile text bumped to `text-base`
- **`src/components/modes/games/block-builder/QuestionPanel.tsx`** — Prompt and true/false bumped
- **`src/components/modes/games/race-to-finish/RaceQuestionPanel.tsx`** — Prompt and true/false bumped
- **`src/components/modes/games/memory-card-flip/MemoryCard.tsx`** — Card content bumped
- **`src/components/live/HostQuestionView.tsx`** — Term and options bumped
- **`src/components/live/PlayerQuestionView.tsx`** — Term and options bumped
- **`src/components/live/HostRevealView.tsx`** — Term and options bumped
- **`src/components/live/PlayerRevealView.tsx`** — Options bumped
