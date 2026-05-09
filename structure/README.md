# StudyFlow — Project Structure

> Last updated: 2026-05-09
> These docs auto-update after every prompt. See `changelog.md` for history.
> To do a full refresh, run `/structure` again.

## Overview

StudyFlow is a local-first flashcard study application built with React and TypeScript. It supports rich text cards (via TipTap), multiple study modes (flashcards, learn, match, test), three game modes (Block Builder, Memory Card Flip, Race to Finish), live multiplayer Kahoot-style games, spaced repetition (FSRS + SM-2), OCR photo import, folder organization, sharing/permissions, analytics, PDF export, and optional AI features. Data is stored offline in IndexedDB (Dexie) and optionally synced to Supabase for cloud persistence, auth, and real-time multiplayer.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 19, TypeScript ~5.9 |
| Build | Vite 7.3 |
| Styling | Tailwind CSS v4, Framer Motion |
| State | Zustand 5, TanStack Query 5 |
| Database | Supabase (PostgreSQL), Dexie (IndexedDB) |
| Rich Text | TipTap 3 (ProseMirror) |
| Spaced Rep | ts-fsrs 5 |
| OCR | Tesseract.js 7 |
| Charts | Recharts 3 |
| PDF | jsPDF 4 |
| Search | Fuse.js 7, cmdk |
| Icons | Lucide React |
| Drag & Drop | dnd-kit |
| PWA | vite-plugin-pwa |
| Deployment | Vercel, Netlify |

## Quick Start

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # TypeScript check + production build
npm run lint       # ESLint
npm run preview    # Preview production build
```

## Documentation Index

| File | Description |
|------|-------------|
| [architecture.md](architecture.md) | High-level architecture, folder structure, data flow |
| [data-model.md](data-model.md) | Database schema, Zustand stores, offline storage, sync strategy |
| [patterns.md](patterns.md) | Naming conventions, shared hooks, utilities, error handling, validation |
| [features/](features/) | Detailed docs for each feature |
| [features/auth.md](features/auth.md) | Authentication & account management |
| [features/card-editor.md](features/card-editor.md) | TipTap rich text card editor |
| [features/study-modes.md](features/study-modes.md) | Flashcards, Learn, Match, Test, Spinner modes |
| [features/game-modes.md](features/game-modes.md) | Block Builder, Memory Card Flip, Race to Finish |
| [features/live-multiplayer.md](features/live-multiplayer.md) | Real-time Kahoot-style multiplayer |
| [features/spaced-repetition.md](features/spaced-repetition.md) | FSRS + SM-2 algorithms |
| [features/sharing.md](features/sharing.md) | Sharing, permissions, share links |
| [features/folders.md](features/folders.md) | Folder organization system |
| [features/ocr-import.md](features/ocr-import.md) | Photo import via OCR |
| [features/ai-features.md](features/ai-features.md) | AI sidebar, Ollama adapter |
| [features/analytics.md](features/analytics.md) | Study statistics & charts |
| [features/printing.md](features/printing.md) | PDF export & print dialog |
| [features/search-navigation.md](features/search-navigation.md) | Command palette, search, keyboard shortcuts |
| [features/i18n-theming.md](features/i18n-theming.md) | Internationalization, RTL, dark/light themes |
| [features/offline-pwa.md](features/offline-pwa.md) | Offline-first architecture & PWA |
| [changelog.md](changelog.md) | Change history |

## File Tree

```
not_quizlet/
├── src/
│   ├── App.tsx                          # Router, global init, keyboard shortcuts
│   ├── main.tsx                         # React 19 entry point + ErrorBoundary
│   ├── vite-env.d.ts                    # Vite type declarations
│   │
│   ├── pages/                           # Lazy-loaded route components
│   │   ├── HomePage.tsx                 # Dashboard, set library, folder sidebar
│   │   ├── SetDetailPage.tsx            # Set view/edit with inline card editor
│   │   ├── NewSetPage.tsx               # Create new study set
│   │   ├── EditorPage.tsx               # Full-screen TipTap card editor
│   │   ├── StudyPage.tsx                # Study mode router (by :mode param)
│   │   ├── StatsPage.tsx                # Analytics dashboard
│   │   ├── PublicSetsPage.tsx           # Browse public sets
│   │   ├── SharedWithMePage.tsx         # Shared sets & pending invites
│   │   ├── FolderDetailPage.tsx         # Folder contents view
│   │   ├── AcceptSharePage.tsx          # Accept share link token
│   │   ├── SignInPage.tsx               # Login
│   │   ├── SignUpPage.tsx               # Registration
│   │   ├── ForgotPasswordPage.tsx       # Password reset request
│   │   ├── ResetPasswordPage.tsx        # Password reset confirmation
│   │   ├── AccountSettingsPage.tsx      # Account settings (protected)
│   │   └── live/                        # Live multiplayer pages
│   │       ├── JoinPage.tsx             # Enter game code + nickname
│   │       ├── HostPage.tsx             # Host game management
│   │       └── PlayerGamePage.tsx       # Player gameplay view
│   │
│   ├── components/                      # UI components by feature domain
│   │   ├── ErrorBoundary.tsx            # React error boundary
│   │   ├── CardFilterModal.tsx          # Card selection filter
│   │   ├── editor/                      # Rich text editor components
│   │   │   ├── CardEditor.tsx           # Main card editing interface
│   │   │   ├── AISidebar.tsx            # AI-powered sidebar
│   │   │   ├── EditorStream.tsx         # Streaming AI updates
│   │   │   ├── FloatingToolbar.tsx      # Selection formatting toolbar
│   │   │   ├── DiacriticsToolbar.tsx    # Special character toolbar
│   │   │   ├── InputDiacriticsToolbar.tsx # Input field diacritics
│   │   │   ├── ImageSearchModal.tsx     # Image search integration
│   │   │   └── MediaDropzone.tsx        # Drag-drop media upload
│   │   ├── modes/                       # Study mode implementations
│   │   │   ├── FlashcardMode.tsx        # Flashcard flip mode
│   │   │   ├── LearnMode.tsx            # Mixed question types
│   │   │   ├── MatchMode.tsx            # Drag-to-match game
│   │   │   ├── TestMode.tsx             # Quiz mode
│   │   │   ├── SpinnerMode.tsx          # Spinning wheel mode
│   │   │   └── games/                   # Game mode implementations
│   │   │       ├── BlockBuilderMode.tsx
│   │   │       ├── MemoryCardFlipMode.tsx
│   │   │       ├── RaceToFinishMode.tsx
│   │   │       ├── block-builder/       # Block Builder internals
│   │   │       │   ├── BlockBuilderConfig.tsx
│   │   │       │   ├── BlockBuilderResults.tsx
│   │   │       │   ├── QuestionPanel.tsx
│   │   │       │   ├── TowerView.tsx
│   │   │       │   ├── types.ts
│   │   │       │   └── useBlockBuilderGame.ts
│   │   │       ├── memory-card-flip/    # Memory Card Flip internals
│   │   │       │   ├── MemoryCard.tsx
│   │   │       │   ├── MemoryResults.tsx
│   │   │       │   ├── types.ts
│   │   │       │   └── useMemoryCardFlip.ts
│   │   │       └── race-to-finish/      # Race to Finish internals
│   │   │           ├── DiceRoll.tsx
│   │   │           ├── GameBoard.tsx
│   │   │           ├── RaceQuestionPanel.tsx
│   │   │           ├── RaceToFinishConfig.tsx
│   │   │           ├── RaceToFinishResults.tsx
│   │   │           ├── types.ts
│   │   │           └── useRaceToFinish.ts
│   │   ├── live/                        # Live multiplayer components
│   │   │   ├── CountdownRing.tsx
│   │   │   ├── GameCodeInput.tsx
│   │   │   ├── HostFinishedView.tsx
│   │   │   ├── HostLeaderboardView.tsx
│   │   │   ├── HostLobbyView.tsx
│   │   │   ├── HostQuestionView.tsx
│   │   │   ├── HostRevealView.tsx
│   │   │   ├── PlayerChip.tsx
│   │   │   ├── PlayerLeaderboardView.tsx
│   │   │   ├── PlayerQuestionView.tsx
│   │   │   ├── PlayerRevealView.tsx
│   │   │   └── PlayerWaitingView.tsx
│   │   ├── layout/
│   │   │   └── AppLayout.tsx            # Header, nav, sidebar, responsive
│   │   ├── folders/
│   │   │   ├── FolderSidebar.tsx        # Folder tree navigation
│   │   │   └── MoveToFolderDialog.tsx   # Move sets between folders
│   │   ├── sharing/
│   │   │   ├── ShareButton.tsx
│   │   │   ├── ShareDialog.tsx
│   │   │   └── PermissionBadge.tsx
│   │   ├── import/
│   │   │   └── PhotoImportModal.tsx     # OCR photo import
│   │   ├── print/
│   │   │   └── PrintDialog.tsx          # PDF generation dialog
│   │   ├── games/
│   │   │   └── GamesBrowserModal.tsx    # Game mode selection
│   │   ├── study/
│   │   │   ├── Flashcard.tsx            # Flashcard display component
│   │   │   ├── MatchTile.tsx            # Match game tile
│   │   │   └── Timer.tsx                # Study timer
│   │   ├── inline/
│   │   │   ├── EditableCard.tsx         # Inline editing
│   │   │   └── index.ts
│   │   ├── ui/                          # Reusable design system
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── CommandPalette.tsx
│   │   │   ├── CommandPalette.css
│   │   │   ├── ConfirmModal.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── LanguageSwitcher.tsx
│   │   │   ├── PasswordStrength.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── ToastManager.tsx
│   │   │   ├── VisibilityToggle.tsx
│   │   │   └── index.ts
│   │   └── validation/
│   │       ├── ValidationBadge.tsx
│   │       └── index.ts
│   │
│   ├── stores/                          # Zustand state management
│   │   ├── authStore.ts                 # Auth lifecycle + Supabase
│   │   ├── studyStore.ts               # Sets, cards, cloud sync
│   │   ├── editorStore.ts              # In-memory editor state
│   │   ├── folderStore.ts              # Folder hierarchy
│   │   ├── sharingStore.ts             # Permissions & share links
│   │   ├── liveGameStore.ts            # Real-time game state
│   │   ├── themeStore.ts               # Light/dark theme
│   │   ├── languageStore.ts            # i18n + RTL
│   │   ├── toastStore.ts               # Toast notifications
│   │   ├── cardFilterStore.ts          # Card filter per set
│   │   └── validationStore.ts          # Content validation
│   │
│   ├── hooks/                           # Custom React hooks
│   │   ├── useAutoSave.ts              # Debounced editor save (5s)
│   │   ├── useLocalStorage.ts          # localStorage persistence
│   │   ├── useSpacedRep.ts             # Review recording + scheduling
│   │   ├── useStudySet.ts              # Set fetching with retry
│   │   ├── useScriptDetection.ts       # Script/language detection
│   │   ├── useTranslation.ts           # i18n hook
│   │   └── useSetPattern.ts            # Card pattern analysis
│   │
│   ├── lib/                             # Business logic & utilities
│   │   ├── algorithms.ts               # SM-2, Levenshtein, shuffle
│   │   ├── fsrs.ts                     # FSRS algorithm wrapper
│   │   ├── db.ts                       # Dexie IndexedDB setup + CRUD
│   │   ├── cloudSync.ts                # Supabase sync functions
│   │   ├── supabase.ts                 # Supabase client init
│   │   ├── validation.ts               # Content validation rules
│   │   ├── passwordValidation.ts       # Password strength rules
│   │   ├── equivalence.ts              # Answer equivalence/grading
│   │   ├── contentHelpers.ts           # HTML content utilities
│   │   ├── diacritics.ts               # Script detection + diacritics
│   │   ├── editorExtensions.ts         # TipTap extensions config
│   │   ├── importText.ts               # Text parsing for import
│   │   ├── imageSearch.ts              # Image search utilities
│   │   ├── bingImageSearch.ts          # Bing image search API
│   │   ├── ocr.ts                      # Tesseract.js wrapper
│   │   ├── liveGameUtils.ts            # Live game helpers
│   │   ├── printables.ts               # PDF generation
│   │   ├── ContextAnalyzer.ts          # Content analysis
│   │   ├── utils.ts                    # uuid, timestamp, compressImage
│   │   └── ai/                         # AI integration
│   │       ├── adapters/
│   │       │   ├── OfflineAdapter.ts
│   │       │   ├── OllamaAdapter.ts
│   │       │   └── index.ts
│   │       ├── getGenerator.ts
│   │       ├── ollamaConfig.ts
│   │       ├── types.ts
│   │       └── index.ts
│   │
│   ├── types/                           # TypeScript type definitions
│   │   ├── index.ts                    # Card, StudySet, ReviewLog, etc.
│   │   ├── folder.ts                   # Folder, FolderItem
│   │   ├── sharing.ts                  # SharePermission, ShareLink
│   │   └── liveGame.ts                 # LiveGameSession, PlayerEntry
│   │
│   ├── config/
│   │   └── gameRegistry.ts             # Game mode component registry
│   │
│   ├── i18n/
│   │   └── translations.ts             # en, ar, es translations
│   │
│   ├── styles/
│   │   ├── globals.css                 # Tailwind + custom properties
│   │   └── editor.css                  # TipTap editor styles
│   │
│   └── assets/
│       └── react.svg
│
├── public/
│   ├── favicon.svg
│   └── vite.svg
│
├── supabase/
│   └── migrations/                      # 15 SQL migration files (001–014)
│       ├── 001_study_sets.sql           # Core study_sets table
│       ├── 002_public_sets.sql          # Public visibility
│       ├── 003_password_security.sql    # Password history
│       ├── 004_sharing_and_folders.sql  # Sharing + folders
│       ├── 005–008_*.sql                # Sharing fixes
│       ├── 009_live_game_sessions.sql   # Live multiplayer tables
│       ├── 010–013b_*.sql               # Permission + perf fixes
│       └── 014_fix_missing_write_policies.sql
│
├── package.json                         # Dependencies & scripts
├── vite.config.ts                       # Vite + PWA + Tailwind config
├── tsconfig.json                        # TypeScript project references
├── tsconfig.app.json                    # App compilation (ES2022, strict)
├── tsconfig.node.json                   # Build tools (ES2023)
├── eslint.config.js                     # ESLint + TS + React hooks
├── index.html                           # HTML entry (Google Fonts, Supabase preconnect)
├── netlify.toml                         # Netlify SPA config
├── vercel.json                          # Vercel SPA config
├── APP_SPECIFICATION.md                 # Feature blueprint (30 sections)
├── BACKUP_SCHEMA.md                     # Backup JSON format spec
├── PRINT_OPTIONS.md                     # PDF generation spec
├── steps_taken.md                       # Architecture docs + bug fixes
└── README.md                            # Quick start & feature overview
```
