# StudyFlow — Complete Application Specification

This document describes every feature, behavior, screen, interaction, data model, and visual detail of the StudyFlow application. It is intended to serve as a complete blueprint for recreating the app from scratch.

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Technology Stack & Dependencies](#2-technology-stack--dependencies)
3. [Design System & Visual Language](#3-design-system--visual-language)
4. [Data Models](#4-data-models)
5. [Database Schema](#5-database-schema)
6. [Authentication System](#6-authentication-system)
7. [Application Layout & Navigation](#7-application-layout--navigation)
8. [Pages & Screens](#8-pages--screens)
9. [Card Editor System](#9-card-editor-system)
10. [Study Modes](#10-study-modes)
11. [Game Modes](#11-game-modes)
12. [Live Multiplayer System](#12-live-multiplayer-system)
13. [Spaced Repetition System](#13-spaced-repetition-system)
14. [OCR & Photo Import](#14-ocr--photo-import)
15. [Image Handling](#15-image-handling)
16. [Printable PDF Generation](#16-printable-pdf-generation)
17. [Folder Organization System](#17-folder-organization-system)
18. [Command Palette](#18-command-palette)
19. [Analytics & Statistics](#19-analytics--statistics)
20. [Theming](#20-theming)
21. [Validation System](#21-validation-system)
22. [Answer Equivalence System](#22-answer-equivalence-system)
23. [Offline-First Architecture](#23-offline-first-architecture)
24. [Cloud Sync](#24-cloud-sync)
25. [Progressive Web App](#25-progressive-web-app)
26. [Keyboard Shortcuts](#26-keyboard-shortcuts)
27. [Toast Notification System](#27-toast-notification-system)
28. [Environment Configuration](#28-environment-configuration)
29. [Routing Structure](#29-routing-structure)

---

## 1. Application Overview

StudyFlow is a feature-rich, offline-first flashcard and study application. Users create study sets containing cards with terms and definitions, then study them through multiple interactive modes including flashcards, learn mode, matching, timed tests, spinning wheel, tower building, memory card flip, and multiplayer racing. The app works entirely offline using browser-local IndexedDB storage, with optional cloud sync via Supabase when configured. It supports rich text editing, embedded images (via clipboard paste, drag-and-drop upload, and file picker), OCR-based card import from photos, printable PDF worksheets, dark/light theming, spaced repetition scheduling, real-time multiplayer quiz sessions, folder-based organization, and a comprehensive analytics dashboard.

---

## 2. Technology Stack & Dependencies

### Core Framework
- React 19 with TypeScript (strict mode)
- Vite 7 as build tool and dev server
- React Router v7 for client-side routing

### Styling
- Tailwind CSS 4 with forms plugin
- CSS custom properties for design tokens
- Framer Motion for animations and page transitions

### State Management
- Zustand for global state (11 stores)
- React Query (@tanstack/react-query) for server state

### Data Storage
- Dexie (IndexedDB wrapper) for local offline storage
- Supabase (optional) for cloud database, auth, and realtime

### Rich Text Editing
- TipTap (ProseMirror-based) with StarterKit, Image, Highlight, and Placeholder extensions
- Custom image paste handler extension

### Drag & Drop
- @dnd-kit (core, sortable, utilities) for card reordering and match mode

### Spaced Repetition
- A spaced repetition library/algorithm for intelligent review scheduling

### OCR
- Tesseract.js for client-side OCR
- Optional Google Vision API for enhanced OCR

### Charts & Visualization
- Recharts for analytics charts (pie charts, bar charts)

### PDF Generation
- jsPDF for printable worksheet generation (dynamically imported to reduce bundle)

### Search
- Fuse.js for fuzzy search across study sets
- cmdk for command palette UI

### Other
- KaTeX for math equation rendering
- canvas-confetti for celebration animations
- use-debounce for input debouncing
- vite-plugin-pwa for service worker and offline support
- Lucide React for icons
- react-resizable-panels for split-pane editor

### Fonts
- Inter (weights 300–700) for UI text
- JetBrains Mono (weights 400–500) for monospace content

---

## 3. Design System & Visual Language

The design system uses CSS custom properties (design tokens) for all visual values. Colors should be chosen by the implementer to create a cohesive, modern, professional look. The app requires both a light theme and a dark theme with proper contrast ratios for accessibility.

### Required Color Tokens
The following semantic color tokens must be defined for both light and dark themes. Choose colors that look good, are accessible, and feel cohesive:

- **Primary**: Main brand color used for buttons, links, active states, and focus rings
- **Primary Hover**: Slightly darker/adjusted variant for hover states
- **Primary Light**: Very subtle tinted background for primary-accented areas
- **Success**: Green-family color for correct answers, positive feedback, confirmations
- **Warning**: Amber/yellow-family color for caution states, streak indicators
- **Danger**: Red-family color for errors, wrong answers, delete actions, destructive buttons
- **Background**: The page/app background color
- **Surface**: Card surfaces, panels, modals
- **Surface Raised**: Slightly elevated surfaces (sidebar, dropdowns)
- **Border**: Default border color
- **Border Light**: Subtle separators and dividers
- **Text**: Primary body text
- **Text Secondary**: Helper text, labels, secondary information
- **Text Tertiary**: Placeholder text, disabled states
- **Muted**: Muted/subdued background areas

### Component Structure

#### Buttons
The app uses a Button component with the following variants and sizes:

**Variants:**
- **Primary**: Solid fill with the primary color background and white text. Used for main call-to-action buttons (e.g., "Create Set", "Start Game", "Save"). Should have a visible hover state (slightly darker) and a focus ring.
- **Secondary**: Subtle background (muted/surface color) with primary or text-colored label. Used for secondary actions alongside a primary button.
- **Outline**: Transparent background with a border and text-colored label. Used for less-prominent actions, toggles, filter buttons.
- **Danger**: Solid fill with the danger color. Used exclusively for destructive actions (delete, remove). Should feel visually distinct and "warning-like."
- **Ghost**: No background, no border — just text. Used for the least prominent actions, toolbar items, close buttons.

**Sizes:**
- **sm**: Compact padding, smaller font. Used in toolbars, inline actions, tag chips.
- **default**: Standard padding and font size. Used for most buttons.
- **lg**: Extra padding, larger font. Used for hero CTAs, modal confirm buttons.
- **icon**: Square button (equal width/height) for icon-only buttons. Used for theme toggle, close, settings gear.

**All buttons should have:**
- Smooth hover transition (scale or background shift)
- Focus-visible ring for keyboard accessibility
- Disabled state (reduced opacity, no pointer events)
- Framer Motion integration for press/tap animations

#### Cards
The Card component is a surface container used throughout the app:
- **Default**: Standard surface with subtle shadow
- **Elevated**: Stronger shadow, used for focused/highlighted cards
- **Outlined**: Border instead of shadow, used for form sections
- **Ghost**: No shadow or border, just padding — used for inline groupings

Cards should have hover effects (shadow lift, slight scale) when interactive (clickable). Card border-radius should be generous (12–16px) for a modern feel.

#### Inputs
The Input component is used for all text fields:
- Label above the input
- Optional helper text below
- Error state: red border, error message below
- Optional icon (left-positioned)
- Focus state: primary-colored border + focus ring
- Consistent height matching button default size

#### Badges
Small pill-shaped labels used for tags, status indicators, and category labels. Should have a subtle background tint related to their semantic meaning.

#### Modals / Dialogs
- Centered overlay with semi-transparent backdrop
- Surface-colored panel with generous padding and rounded corners
- Title, body, and action buttons (confirm/cancel)
- Danger mode variant with danger-colored confirm button
- Escape key and backdrop click to close
- Entry/exit animations (scale + fade)

#### Skeleton Loading
Shimmer/pulse animation placeholders matching the shape of the content they replace. Used during lazy-loading and data fetching.

### Border Radius Scale
| Token | Value |
|-------|-------|
| xs | 4px |
| sm | 6px |
| md | 10px |
| lg | 12px |
| xl | 16px |
| card | 14px |
| button | 10px |
| full | 9999px |

### Shadow System
Define a scale of shadows from subtle to dramatic, for both light and dark themes:
- **xs**: Barely visible, for flat elements that need slight depth
- **sm**: Subtle, for resting cards and inputs
- **card**: Default card shadow
- **card-hover**: Elevated card shadow on hover
- **md**: Medium, for dropdowns and popovers
- **lg**: Strong, for floating elements
- **xl**: Very strong, for drag previews
- **modal**: Maximum depth, for modal dialogs
- **focus**: Colored ring shadow matching primary color (for focus states)

Dark theme shadows should be darker/more pronounced and may use a subtle primary color glow.

### Motion Tokens
| Token | Value |
|-------|-------|
| ease-out | cubic-bezier(0.16, 1, 0.3, 1) |
| ease-spring | cubic-bezier(0.34, 1.56, 0.64, 1) |
| ease-smooth | cubic-bezier(0.4, 0, 0.2, 1) |
| duration-instant | 100ms |
| duration-fast | 150ms |
| duration-normal | 200ms |
| duration-slow | 300ms |
| duration-slower | 500ms |

### CSS Animations (Keyframes)
- **fadeIn**: opacity 0→1
- **slideUp**: translateY(8px) + opacity 0 → translateY(0) + opacity 1
- **scaleIn**: scale(0.95) + opacity 0 → scale(1) + opacity 1

### Typography
- Font family: Inter for all UI text
- Monospace: JetBrains Mono for code-like content
- The type scale follows Tailwind defaults with Inter as the sans-serif font

### Scrollbar Styling
- Webkit: 6px wide, rounded, surface-raised color track, border color thumb
- Firefox: thin scrollbar with matching colors
- Both light and dark theme variants

### Accessibility
- `prefers-reduced-motion: reduce` disables all transitions and animations
- Focus-visible ring on all interactive elements
- Semantic HTML with ARIA labels throughout

---

## 4. Data Models

### Card
Each card represents a single flashcard with a term and definition side.

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique identifier |
| term | string (HTML) | Rich text content for the term side |
| definition | string (HTML) | Rich text content for the definition side |
| imageData | string? (base64) | Optional embedded image (max ~500KB) |
| audioData | string? (base64) | Optional embedded audio |
| difficulty | number | Difficulty rating (0–5) |
| repetition | number | Repetition count |
| interval | number | Interval in days until next review |
| efFactor | number | Easiness factor (default 2.5) |
| nextReviewDate | number | Timestamp (ms) of next scheduled review |
| history | ReviewLog[] | Array of all review events |
| fsrs | FSRSState? | Additional spaced repetition scheduling state |

### ReviewLog
Each review event records a single study interaction.

| Field | Type | Description |
|-------|------|-------------|
| date | number | Timestamp (ms) when review occurred |
| quality | number | Rating 0–5 (0=blackout, 1=incorrect, 2=incorrect but familiar, 3=correct with difficulty, 4=correct with hesitation, 5=perfect recall) |
| timeSpent | number | Milliseconds spent on this review |
| mode | string | Which study mode: 'flashcards', 'learn', 'match', or 'test' |

### FSRSState
Additional spaced repetition scheduling state.

| Field | Type | Description |
|-------|------|-------------|
| stability | number | Memory stability parameter |
| difficulty | number | Item difficulty parameter |
| state | number | 0=New, 1=Learning, 2=Review, 3=Relearning |
| lastReview | number | Timestamp (ms) of last review |

### StudySet
A collection of cards with metadata and study statistics.

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID v4) | Unique identifier |
| title | string | Set title |
| description | string | Set description |
| createdAt | number | Creation timestamp (ms) |
| updatedAt | number | Last modification timestamp (ms) |
| tags | string[] | Categorization tags |
| cards | Card[] | Array of all cards in the set |
| lastStudied | number | Timestamp of last study session |
| studyStats | object | { totalSessions: number, averageAccuracy: number, streakDays: number } |
| visibility | string | 'private' or 'public' |
| folderId | string? | Optional folder assignment |
| userId | string? | Cloud owner's user ID |
| cardCount | number? | Server-computed card count for browse views |

### Folder
Organizational container for study sets.

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique identifier |
| userId | string | Owner's user ID |
| name | string | Folder name |
| description | string | Folder description |
| parentFolderId | string? | Parent folder for nesting (nullable) |
| color | FolderColor | One of: blue, green, purple, red, orange, yellow, pink, teal, gray |
| createdAt | number | Creation timestamp (ms) |
| updatedAt | number | Last modification timestamp (ms) |
| itemCount | number? | Computed count of contained items |

### FolderItem
Maps a study set to a folder.

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique identifier |
| folderId | string | Parent folder ID |
| itemType | string | Always 'set' |
| itemId | string | Study set ID |
| addedAt | number | Timestamp when added |
| addedBy | string | User who added it |

---

## 5. Database Schema

### Local Database (IndexedDB via Dexie)

**Database Name:** `StudyFlowDB`

**Version 2 Schema:**

| Table | Indexes | Purpose |
|-------|---------|---------|
| sets | id (PK), updatedAt, createdAt, folderId | Stores complete StudySet documents with embedded cards |
| sessions | ++id (auto-increment PK), setId, startedAt | Study session logs |
| settings | ++id (auto-increment PK) | User preferences |
| folders | id (PK), userId, parentFolderId, updatedAt | Folder hierarchy |
| folderItems | id (PK), folderId, itemId | Set-to-folder mappings |

### Cloud Database (Supabase PostgreSQL)

#### study_sets table
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key → auth.users |
| title | TEXT | |
| description | TEXT | |
| tags | JSONB | Array of strings |
| cards | JSONB | Full Card[] array with all nested data |
| created_at | BIGINT | Millisecond timestamp |
| updated_at | BIGINT | Millisecond timestamp |
| last_studied | BIGINT | Millisecond timestamp |
| study_stats | JSONB | { totalSessions, averageAccuracy, streakDays } |
| visibility | TEXT | 'private' or 'public' |
| folder_id | UUID | Nullable, foreign key → folders |

Indexes: user_id, folder_id

#### password_history table
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key → auth.users |
| password_hash | TEXT | BCrypt hash |
| created_at | TIMESTAMPTZ | |

Only the last 5 password hashes per user are kept. Users can only read their own history via RLS.

#### failed_login_attempts table
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary key |
| email | TEXT | |
| attempted_at | TIMESTAMPTZ | |
| ip_address | INET | Nullable |

Automatically cleaned up after 1 hour. Used for rate limiting: 5 failed attempts within 30 minutes locks the account.

#### password_reset_requests table
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary key |
| email | TEXT | |
| requested_at | TIMESTAMPTZ | |
| ip_address | INET | Nullable |

Rate limited: maximum 5 reset requests per hour per email address.

#### folders table
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key → auth.users |
| name | TEXT | |
| description | TEXT | |
| parent_folder_id | UUID | Nullable, self-referential FK |
| color | TEXT | Enum value |
| created_at | BIGINT | Millisecond timestamp |
| updated_at | BIGINT | Millisecond timestamp |

Indexes: user_id, parent_folder_id

#### folder_items table
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary key |
| folder_id | UUID | Foreign key → folders |
| item_type | ENUM | 'set' or 'folder' |
| item_id | UUID | References study_sets |
| added_at | BIGINT | Millisecond timestamp |
| added_by | UUID | Foreign key → auth.users |

Unique constraint: (folder_id, item_id). Indexes: folder_id, item_id.

#### live_game_sessions table
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary key |
| game_code | TEXT | Unique, 6-digit code |
| host_user_id | UUID | Foreign key → auth.users |
| set_id | UUID | Reference to study set |
| set_snapshot | JSONB | Card array frozen at game start |
| status | TEXT | 'lobby', 'active', or 'finished' |
| question_count | INT | Total questions in game |
| current_question_index | INT | Current question being shown |
| created_at | TIMESTAMPTZ | |
| started_at | TIMESTAMPTZ | |
| finished_at | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ | 4-hour TTL |

Indexes: game_code, host_user_id, status, expires_at

#### live_game_participants table
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | UUID | Foreign key → live_game_sessions |
| nickname | TEXT | Player display name |
| player_token | TEXT | Unique, random UUID stored client-side |
| score | INT | Running total |
| streak | INT | Consecutive correct answers |
| is_host | BOOLEAN | |
| joined_at | TIMESTAMPTZ | |

Indexes: session_id, player_token

#### live_game_answers table
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | UUID | Foreign key |
| participant_id | UUID | Foreign key |
| question_index | INT | Which question (0-based) |
| chosen_option | INT | 0–3 index of selected option |
| is_correct | BOOLEAN | |
| time_taken_ms | INT | Response time |
| points_earned | INT | Points awarded |
| answered_at | TIMESTAMPTZ | |

Unique constraint: (session_id, participant_id, question_index)

### RLS Policies (Row Level Security)

All tables enforce row-level security:

- **study_sets**: Users can CRUD their own sets. Public sets (visibility='public') are readable by everyone.
- **folders**: Users can CRUD their own folders.
- **folder_items**: Accessible only if the user can view the parent folder. Only folder owners can add items.
- **live_game_sessions**: Readable by anyone (needed for guest join flow). Only the host can update.
- **live_game_participants**: Readable by anyone in the session. Players can insert/update their own records.
- **live_game_answers**: Same as participants.
- **password_history**: Users can only read their own records.

### Database Functions (RPCs)

| Function | Parameters | Returns | Purpose |
|----------|-----------|---------|---------|
| get_public_sets | none | study_sets[] with card_count | Lightweight public set listing |
| check_password_reuse | p_user_id, p_password | boolean | Check against last 5 passwords |
| validate_password_strength | p_password | validation result | Server-side password validation |
| is_account_locked | p_email | boolean | Check if 5+ failed logins in 30 min |
| record_failed_login | p_email, p_ip | void | Log failed login attempt |
| clear_failed_logins | p_email | void | Clear on successful login |
| can_request_password_reset | p_email | boolean | Check 5/hour rate limit |
| record_password_reset_request | p_email, p_ip | void | Log reset request |
| cleanup_stale_data | none | void | Background cleanup of expired data |
| generate_game_code | none | text | Generate unique 6-digit game code |
| cleanup_expired_sessions | none | void | Remove expired live game sessions |

---

## 6. Authentication System

### Sign Up Flow
1. User enters email and password
2. Password is validated in real-time against strength requirements:
   - Minimum 12 characters
   - At least 1 uppercase letter
   - At least 1 lowercase letter
   - At least 1 digit
   - At least 1 special character
3. User enters password confirmation (must match)
4. Email format is validated on blur
5. On submit, creates account via Supabase Auth
6. User is shown confirmation to check their email

### Sign In Flow
1. User enters email and password
2. System checks if account is locked (5 failed attempts in 30 minutes)
3. If locked, shows lockout message
4. On success, clears failed login records, sets user/session in auth store, loads study sets
5. On failure, records failed login attempt
6. Fires background cleanup of stale data

### Password Reset Flow
1. User enters email on forgot password page
2. System checks rate limit (5 requests per hour per email)
3. If allowed, sends reset email via Supabase Auth
4. User clicks email link, arrives at reset password page
5. Enters new password with real-time strength validation
6. System checks password reuse (rejects if matches any of last 5 passwords)
7. Password is updated, user redirected to sign in after 3 seconds

### Password Change (Settings)
1. User navigates to account settings (must be authenticated)
2. Enters current password (verified by attempting sign-in)
3. Enters new password with strength indicator
4. Enters confirmation (must match)
5. System checks password reuse against last 5
6. On success, password is updated

### Password Strength Indicator
Displays a visual meter showing:
- A colored bar that fills proportionally to strength (red → yellow → green)
- Text label: "Weak", "Fair", "Good", "Strong"
- Real-time requirement checklist showing which criteria are met

### Security Features
- Account lockout after 5 failed login attempts within 30 minutes
- Password reset rate limited to 5 per hour per email
- Password reuse prevention (last 5 passwords)
- Automatic cleanup of expired login attempt records (1 hour TTL)
- All authentication operations have 10-second timeout to prevent hanging

---

## 7. Application Layout & Navigation

### App Layout
The main layout consists of:
- **Sticky Header**: Contains app title/logo, navigation links, theme toggle, and auth button
- **Navigation Links** (header): "Your Study Sets" (home), "Explore" (public sets)
- **Mobile Menu**: Hamburger menu on small screens that slides out navigation
- **Content Area**: Main page content below header
- **Optional Sidebar**: Folder sidebar on applicable pages (home, folder detail)
- **Toast Container**: Fixed position notification area

### Page Transitions
All page transitions use Framer Motion's AnimatePresence with:
- **Enter**: Fade in (opacity 0→1) + slide up (y: 12→0) over 300ms
- **Exit**: Fade out (opacity 1→0) + slide down (y: 0→-12) over 200ms
- Mode: "wait" (exit completes before enter begins)

### Code Splitting
All page components are lazy-loaded using React.lazy with Suspense fallback showing a centered loading spinner.

---

## 8. Pages & Screens

### Home Page (/)
The main dashboard displaying the user's study sets.

**Layout:**
- Optional folder sidebar on the left (collapsible)
- Search bar at the top with fuzzy search (searches title, tags, and card terms)
- Action buttons: New Set, Theme Toggle, Stats link
- Grid of study set cards

**Study Set Cards display:**
- Title and description (truncated)
- Card count
- Tags as colored badges
- Delete button (with confirmation)
- Click navigates to set detail page

**Empty State:**
- Friendly message encouraging user to create their first set
- "Create Your First Set" button

### New Set Page (/sets/new)
Form for creating a new study set.

**Fields:**
- Title (text input, required)
- Description (text input, optional)

**On Submit:**
- Creates set with provided metadata
- Navigates to set detail page for card editing

### Set Detail Page (/sets/:id)
The main view/edit page for a study set.

**Header Section:**
- Editable title (click to edit inline)
- Editable description (click to edit inline)
- Tag management (add/remove tags)
- Auto-save indicator showing "Saving..." or "Saved"
- Back navigation

**Action Bar:**
- Study mode buttons: Flashcards, Learn, Match, Test
- Games button (opens games browser modal)
- Print button (opens print dialog)
- Photo Import button (OCR from image)
- Live Game host button (if Supabase configured)
- Move to Folder button
- Card Filter button

**Cards Section:**
- List of all cards rendered as EditableCard components
- Each card shows term and definition side by side
- Click a card to activate TipTap rich text editors for both sides
- Drag handle on each card for reordering (via @dnd-kit)
- Delete button on each card
- Image insertion buttons on each card
- Validation error indicators on cards with issues
- "Add Card" button at the bottom

### Editor Page (Studio Mode)
A full-screen, focused card editing experience.

**Layout:**
- Split-pane view (resizable)
- Left pane: Card stream (EditorStream) — vertical list of all cards with inline editing
- Right pane: Additional editing tools and context

**Features:**
- Active card tracking (highlighted in stream)
- Auto-save with debouncing (5-second delay)
- Validation badges showing error counts
- Unsaved changes warning on browser unload
- Save & Exit button returns to set detail

### Study Page (/sets/:id/study/:mode)
Router component that loads the appropriate study mode.

**Behavior:**
- Reads mode from URL parameter
- Filters out blank/incomplete cards (cards missing term or definition)
- Applies any active card filters from the filter store
- Renders the corresponding mode component: FlashcardMode, LearnMode, MatchMode, TestMode, or a game mode
- Shows error if too few valid cards for the selected mode

### Stats Page (/stats)
Analytics dashboard with study statistics.

*Detailed in [Section 19: Analytics & Statistics](#19-analytics--statistics)*

### Public Sets Page (/explore)
Browse publicly available study sets.

**Features:**
- Search bar with fuzzy search
- Grid of public set cards showing: title, description, card count, creator, visibility badge, tags
- Click to view set detail (read-only for non-owners)
- Empty state prompts creating the first public set

### Folder Detail Page (/folders/:id)
View and manage a folder's contents.

**Header:**
- Folder name (editable) with color indicator
- Description (editable)
- Breadcrumb path for nested folders

**Actions:**
- New Set button (creates set inside this folder)
- Rename, Change Color, Delete (via more menu)
- Search within folder
- Grid/List view toggle

**Content:**
- Grid of study sets within the folder
- Shows set count

### Sign In Page (/signin)
- Email and password fields
- Show/hide password toggle
- "Forgot Password?" link
- "Sign Up" link
- Toast notification on successful login

### Sign Up Page (/signup)
- Email field with format validation on blur
- Password field with real-time strength indicator
- Confirm password field with match validation
- Multiple validation error messages displayed below form
- "Sign In" link for existing users

### Forgot Password Page (/forgot-password)
- Email input field
- Rate limiting message if too many requests
- Success state: "Check your email" message
- "Back to Sign In" link

### Reset Password Page (/reset-password)
- New password field with strength indicator
- Confirm password field with match check
- Error display for validation issues
- Auto-redirect to sign in after 3 seconds on success

### Account Settings Page (/account/settings)
- Requires authentication (redirects to sign in if not logged in)
- Change Password form:
  - Current password (verified server-side)
  - New password with strength meter
  - Confirm new password with match validation
- Success message with form reset option

---

## 9. Card Editor System

### Inline Card Editor (EditableCard)
Each card in the set detail page is rendered as an inline editable component.

**Layout:**
- Two-pane horizontal layout: term on left, definition on right
- Drag handle on the far left for reordering
- Delete button on the far right (with confirmation)
- Validation error indicators below the card

**Unfocused State:**
- Displays rendered HTML content (read-only appearance)
- Click anywhere on the card to activate editing

**Focused/Active State:**
- Both term and definition become TipTap rich text editors
- Floating toolbar appears above the active editor
- Image insertion buttons appear

### Rich Text Editor (TipTap)
The text editor supports:
- **Bold**, *italic*, ~~strikethrough~~
- Highlighted text
- Images (embedded as base64, pasted from clipboard, uploaded from computer, or dragged and dropped)
- Placeholder text ("Enter term...", "Enter definition...")
- Custom image paste handler that intercepts clipboard images, compresses them, and embeds as base64

### Floating Toolbar
Appears above the active editor with buttons for:
- Bold, Italic, Strikethrough, Highlight
- Image insertion (opens file picker for uploading from computer)
- Undo/Redo

### Media Dropzone
Cards support drag-and-drop image upload:
- Drag an image file onto a card
- Image is compressed via canvas (max 500KB, JPEG format)
- Embedded as base64 in the HTML content

### Auto-Save
- Debounced with 5-second delay after last edit
- Validates all cards before saving
- If hard validation errors exist, save is blocked and user is notified via toast
- Shows visual indicator: "Saving..." during save, "Saved" after completion
- If IndexedDB storage quota is exceeded, automatically downloads a backup JSON file

### Card Reordering
- Drag handle on each card enables vertical reordering
- Uses @dnd-kit sortable for smooth drag-and-drop
- Order is persisted immediately on drop

---

## 10. Study Modes

### Flashcard Mode
Linear progression through all cards with flip-to-reveal interaction.

**Display:**
- Single large card centered on screen
- Progress indicator: "5 / 20" showing current position
- Card displays term side by default, click/tap to flip and reveal definition

**3D Flip Animation:**
- Card rotates on Y-axis (rotateY) with spring physics (stiffness: 280, damping: 26)
- Front and back faces rendered with backface-visibility: hidden
- Smooth 3D perspective transform

**Interactions:**
- **Click/Tap card**: Flip to reveal other side
- **Swipe right**: Mark as "Know it" (quality rating 5)
- **Swipe left**: Mark as "Study again" (quality rating 2)
- **Swipe down**: Skip card
- **Space bar**: Progressive word reveal — reveals the definition one word at a time on each press
- **Arrow keys**: Navigate to previous/next card
- **Keyboard 1/2/3**: Quick confidence ratings
- **Escape**: Exit with confirmation

**Spaced Repetition:**
- Records review quality in the background (fire-and-forget, doesn't block UI)
- Updates card's next review date based on the spaced repetition algorithm

**Completion:**
- Shows summary after last card
- Option to restart or exit

### Learn Mode
Spaced repetition study session with mixed question types.

**Session Setup:**
- Selects ~20 cards randomly from the set
- Distributes question types: approximately 40% multiple choice, 40% written, 20% true/false
- Builds equivalence groups for answer validation (handles duplicate/synonym cards)

**Question Types:**

**Written Answer:**
- Shows the prompt (term or definition)
- Free-text input field
- Submit with Enter key
- Graded by semantic matching with typo tolerance (Levenshtein distance)

**Multiple Choice:**
- Shows the prompt
- 4 option buttons (or more if multi-answer)
- Single-select mode: click one option to answer
- Multi-select mode: checkboxes, user must select ALL correct answers
- Wrong options drawn from other cards in the set, excluding equivalent answers

**True/False:**
- Shows a term-definition pair (may be correct or incorrect)
- Two buttons: True / False
- If the pair is incorrect, a random wrong definition is substituted

**After Each Question:**
- Instant feedback: correct (green) or incorrect (red)
- If wrong, shows the correct answer(s) including all equivalent answers
- If correct, shows confidence rating buttons: Easy / Medium / Hard
- Confidence selection triggers spaced repetition recording

**Completion:**
- Shows session summary
- Option to continue or exit

### Match Mode
Tile-matching game pairing terms with their definitions.

**Setup:**
- Uses up to 8 card pairs (16 tiles total)
- Tiles are shuffled and displayed in a grid

**Display:**
- 4-column responsive grid
- Each tile shows either a term or definition
- Timer showing elapsed time (starts on first interaction)
- Progress indicator: "X / Y pairs matched"

**Interactions (Desktop):**
- Drag a term tile onto a definition tile to attempt a match
- Hover effects: tiles scale up slightly with shadow

**Interactions (Mobile):**
- Tap first tile (selected, highlighted)
- Tap second tile to attempt match

**Matching Logic:**
- Text-based matching using content similarity
- Equivalence-aware: handles duplicate/synonym cards
- Image-only tiles fall back to card ID matching

**On Match:**
- Matched tiles animate out (fade + scale down)
- Pair is marked as complete

**On Mismatch:**
- Brief error indicator
- Tiles remain in place

**Completion:**
- Confetti celebration (80 particles, 60° spread)
- Final time displayed in MM:SS.T format
- Option to play again or exit

### Test Mode
Configurable quiz with scoring and results.

**Configuration Screen:**
- **Question Count**: Preset buttons (5, 10, 20, All, 2×All) or custom input, up to maximum available
- **Answer Direction**: Term→Definition, Definition→Term, or Both (random per question)
- **Question Types**: Checkboxes for Written, Multiple Choice, True/False
  - Nested option under Multiple Choice: "Multi-answer MC" (user must select ALL correct options)
- Start button

**During Test:**
- Progress indicator: "Question X of Y"
- Prompt displayed in colored card
- Question type rendered based on random selection from enabled types
- Same interaction patterns as Learn Mode for each question type
- Instant feedback after each answer (correct/incorrect with correct answer shown)

**Image-Aware Question Generation:**
- If a card's term is image-only (no text), written answer type is excluded for that question
- If both sides are image-only, only multiple choice and true/false are available
- Answer direction adapts: image-only sides become prompts, text sides become answers

**Results Screen:**
- **Circular Progress Indicator**: Animated SVG circle (100px diameter) with stroke-dashoffset animation
  - Circle fills clockwise proportional to accuracy
  - Percentage displayed in center with spring animation
- **Color Coding**: Green (≥80%), yellow (≥60%), red (<60%)
- **Missed Cards Grid**: Shows all incorrectly answered cards with term and definition side-by-side
- **"Study Missed Cards" Button**: Filters the set to only missed cards and returns to study mode selection
- **Export to PDF**: Generates a PDF of test results (jsPDF, dynamically imported)

---

## 11. Game Modes

### Game Browser
A modal accessible from the set detail page showing all available games.

**Display:**
- Grid of game cards
- Each card shows: game name, icon, description, category tag, required minimum card count
- Tags: quiz, memory, multiplayer, etc.
- Games with insufficient cards are disabled with explanation

**Registered Games:**

| ID | Name | Category | Min Cards | Icon | Description |
|----|------|----------|-----------|------|-------------|
| spinner | Spinner | quiz | 2 | Disc | Spin-the-wheel random card selection |
| block-builder | Block Builder | quiz | 4 | Blocks | Build a tower while avoiding lava |
| memory-card-flip | Memory Card Flip | memory | 2 | FlipVertical2 | Classic concentration matching game |
| race-to-finish | Race to Finish | quiz | 4 | Flag | Board race game for 1-4 players |

### Spinner Mode
A spinning wheel game for random card review.

**Display:**
- Large SVG wheel divided into colored segments (up to 12)
- Each segment colored with unique hue (HSL-based palette cycling)
- Segment labels: card terms truncated to 18 characters
- Thumbnail images embedded in segments if cards have images (circular clip paths)
- White pointer triangle at the top of the wheel
- "SPIN!" button below the wheel
- Progress: "X / Y done" with skipped count

**Spin Mechanic:**
- Click "SPIN!" to start
- Wheel animates with 4-second rotation using cubic-bezier easing [0.17, 0.67, 0.12, 0.99]
- 5–8 bonus full rotations before landing on the randomly selected segment
- Landing position is pre-calculated, animation spins to that exact angle

**After Spin:**
- Modal overlay appears showing the selected card
- Card shows term side initially
- Click to flip (3D rotation animation) to reveal definition
- "Got it" button removes the card from the wheel and continues
- "Skip" option available

**Completion:**
- All cards reviewed or skipped
- Exit confirmation if leaving early

**Reset:**
- Reset button restores all cards to the wheel

### Block Builder Mode
A tower-building quiz game with rising lava danger.

**Configuration Screen:**
- **Difficulty**: Easy, Medium, Hard (preset buttons)
- **Question Types**: Written, Multiple Choice, True/False (checkboxes)
- **Answer Direction**: Term→Definition, Definition→Term, Both
- **Question Count**: Numeric input with +/- buttons, or "Infinity" toggle for endless mode
- Start button

**Difficulty Settings:**

| Setting | Easy | Medium | Hard |
|---------|------|--------|------|
| Block penalty (wrong answer) | 0 blocks lost | 1 block lost | 2 blocks lost |
| Lava speed | Constant 3 px/s | Base 2.5 px/s + acceleration | Base 3 px/s + heavy acceleration (0.15) |

**Gameplay:**
- Answer questions correctly to add blocks to your tower
- Lava rises continuously from below (animated with requestAnimationFrame)
- Wrong answers cause block loss (penalty varies by difficulty)
- Tower must stay above the lava line

**Question Panel:**
- Progress: "Question X / Y"
- Same question types as Learn/Test modes (written, MC, T/F)
- Colored ring feedback (green for correct, red for wrong)
- Study-content rendering for HTML card content

**Scoring:**
- Base: 100 points per correct answer
- Speed bonus: Up to 50 points (decreases linearly over 15 seconds)
- Streak multiplier: 1× to 2× based on consecutive correct answers
- Difficulty multiplier: 1× (Easy), 1.5× (Medium), 2× (Hard)
- Score display animates on increase

**Tower Visualization (TowerView):**
- SVG-based scene with mountain background (parallax layers)
- Blocks stacked vertically with gradient colors (hue cycling through spectrum)
- Animated lava layer at bottom with wave effect (CSS animation, 2s infinite alternate)
- Lava bubbles: rise and scale with staggered 1.5–2s duration
- Camera follows tower top with spring physics (smooth vertical panning)
- Altitude markers along the side
- Snow zone appears near the summit
- Character emoji on tower top: bounces on correct answer, shakes on wrong answer
- At summit: helicopter animation appears (hovers, then flies away on win)
- Progress bar on right edge showing percentage to summit

**Game States:**
- **Config**: Settings screen
- **Playing**: Active gameplay with question panel and tower view
- **Won**: Reached summit — helicopter flies away, celebration
- **Lost**: Lava overtook tower — game over screen with final score

**Results Screen:**
- Final score with difficulty badge
- Questions answered (correct/total)
- Streak record
- Play again or exit options

### Memory Card Flip Mode
Classic concentration/matching game with term-definition pairs.

**Setup Screen:**
- Pair count selector: +/- buttons or direct number input
- Minimum 2 pairs, maximum based on available cards
- Shows total tiles calculation (pairs × 2)
- Start button

**Display:**
- Responsive grid layout (2–4 columns based on pair count)
- Cards with 3:4 aspect ratio
- **Face-down (front)**: Gradient blue background with white "?" symbol
- **Face-up (back)**: White background, small label ("T" for term or "D" for definition), content with responsive image scaling
- Move counter and elapsed time at top

**Flip Animation:**
- rotateY 180° with easing [0.4, 0, 0.2, 1]
- Smooth 3D transform with perspective

**Gameplay:**
1. Click a face-down card to flip it (reveals term or definition)
2. Click a second card to flip it
3. Maximum 2 cards flipped simultaneously
4. Cannot flip already-matched or currently-flipped cards
5. Input is locked during match-checking delay (prevents rapid clicks)

**Match Detection:**
- 600ms delay after second flip before checking match
- Content-based matching for text content (normalized comparison)
- Card ID matching for image-only content
- Equivalence-aware: detects synonymous answers

**On Match:**
- Matched pair fades out and scales down (0.4s animation)
- Pair counted as complete

**On Mismatch:**
- 800ms delay, then both cards flip back face-down
- Move still counted

**Results Screen:**
- Emoji rating based on performance (excellent → good)
- Stats grid: total moves, elapsed time, pairs matched, accuracy percentage
- Play again button
- Confetti celebration (80 particles)

### Race to Finish Mode
Multiplayer board racing game for 1–4 players.

**Configuration Screen:**
- **Player Count**: 1–4 players (click player buttons)
  - Player emojis: 🚀, 🔥, 🌿, ⚡
  - Player names auto-assigned: "Player 1", "Player 2", etc.
- **Path Length**: Input with +/- buttons and preset buttons (10, 15, 20, 30, 50, 75, 100)
  - Explanation text describes approximate game length
- **Answer Direction**: Term→Definition, Definition→Term, Both
- **Question Types**: Written, Multiple Choice, True/False
- Start button

**Game Board (SVG):**
- Procedurally generated path using seeded random number generator (deterministic per game)
- Nodes rendered as circles (26px radius) connected by smooth curved SVG paths (cubic bezier)
- **Start node**: Green with "GO" label
- **Finish node**: Amber with 🏁 emoji
- **Shortcut nodes**: Cyan with ⚡ symbol (appear on paths with 15+ cells)
- Shortcuts rendered as dashed cyan curves arcing between distant nodes
- Cell content alternates between terms and definitions from the card set
- Tooltip on node hover shows the cell's term or definition content

**Player Tokens:**
- Colored circle with player emoji centered above the current node
- Multiple players on the same cell offset horizontally to avoid overlap

**Camera/Scrolling:**
- Vertical scrolling follows current player with lerp-based smooth scroll (12% per frame)
- Board scrolls to keep the active player visible

**Turn Flow:**
1. **Question Phase**: Current player sees a question (same types as Test/Learn mode)
2. **Correct Answer**: Animated dice roll with result 1–6
3. **Moving Phase**: Player token hops cell-by-cell to destination (350ms per hop)
4. **Shortcut Check**: If landing on a shortcut cell, flash overlay (cyan, 0.15 opacity, 0.4s), then jump to shortcut destination (500ms)
5. **Wrong Answer**: Turn is skipped, next player
6. Round-robin turn order

**Dice Animation:**
- Visual dice showing random faces before settling on the rolled number
- Animated reveal of the final value

**Win Condition:**
- First player to reach or pass the final cell
- Player reaching the end triggers the results screen

**Results Screen:**
- Trophy emoji with bounce animation
- Heading: "You Finished!" (solo) or "Player X Wins!" (multiplayer)
- Player standings table sorted by position reached: rank, emoji, name, final cell
- Stats grid: accuracy percentage, total questions answered
- Celebration particles: 16 colored dots rising upward with opacity fade
- Play again or exit options

**Scoring/Tracking:**
- Accuracy tracked per player (correct / total answered)
- Final standings sorted by board position reached

---

## 12. Live Multiplayer System

### Overview
Real-time multiplayer quiz sessions where a host broadcasts questions to players via Supabase Realtime channels. Requires Supabase configuration.

### Host Flow

**Starting a Game:**
1. Host clicks "Go Live" from set detail page
2. System generates a unique 6-digit game code (via RPC)
3. Creates a live_game_sessions record with status "lobby"
4. Snapshots the current card set into set_snapshot (frozen at game start)
5. Host enters the lobby view

**Lobby View:**
- Displays the 6-digit game code prominently
- Shows list of joined players as PlayerChip components (name + avatar color)
- Player count indicator
- "Start Game" button (enabled when at least 1 player has joined)
- Avatar colors assigned by hashing player nickname (8 possible colors)

**Question View:**
- Shows the current question (term + image if present)
- 4 answer options displayed
- Answer count tracker (how many players have answered)
- Timer with CountdownRing animation
- "Reveal Answer" button

**Reveal View:**
- Highlights the correct answer in green
- Shows how many players got it right/wrong
- "Next Question" / "Show Leaderboard" button

**Leaderboard View:**
- Sorted player list by score (descending)
- Shows: rank, nickname, score, streak
- "Next Question" button

**Finished View:**
- Final leaderboard with all players
- Game summary statistics
- "End Game" button

### Player Flow

**Joining a Game:**
1. Player navigates to /live
2. Step 1: Enters 6-digit game code
3. Step 2: Enters nickname
4. System generates a unique player_token (stored in sessionStorage for reconnection)
5. Player joins the lobby and sees "Waiting for host to start..."

**Session Persistence:**
- Player token saved to sessionStorage
- On reconnect/refresh, attempts to restore session using saved token
- Can rejoin an active game without re-entering code

**Waiting View:**
- Shows "Waiting for next question..." message
- Animated loading indicator

**Question View:**
- Question prompt displayed
- 4 option buttons
- CountdownRing timer (circular animated countdown)
- Select an option to lock in answer
- Answer is submitted to live_game_answers table

**Reveal View:**
- Shows whether player's answer was correct (green checkmark / red X)
- Displays the correct answer
- Points earned for this question

**Leaderboard View:**
- Current standings
- Player's own position highlighted

### Scoring System
- **Base Points**: 1000 for correct answer
- **Time Bonus**: 0–500 points (decreases linearly with response time vs. time limit)
- **Streak Bonus**: 0–300 points based on consecutive correct answers
- Wrong answer: 0 points, streak resets

### Question Generation
- Questions built from the set_snapshot using equivalence groups
- 4 multiple-choice options per question
- Wrong options exclude equivalent answers to avoid ambiguity
- Questions shuffled for each game

### CountdownRing Component
- Circular SVG ring that depletes clockwise over the time limit
- Smooth animation using stroke-dashoffset
- Color changes as time runs low (blue → yellow → red)

### PlayerChip Component
- Rounded pill showing player nickname
- Background color derived from nickname hash (consistent across views)
- Optional score display
- Online/offline indicator

### GameCodeInput Component
- 6 individual digit input fields
- Auto-advances focus as digits are typed
- Supports paste of full 6-digit code
- Backspace navigates to previous field

---

## 13. Spaced Repetition System

The app uses a spaced repetition system to intelligently schedule when cards should be reviewed. The goal is to show cards at the optimal moment — just before the user would forget them — to maximize long-term retention with minimum study time.

### Core Requirements

The spaced repetition system must handle the following well:

- **New cards**: Cards that have never been studied should be introduced gradually and reviewed frequently at first
- **Learning cards**: Cards the user is actively learning should be reviewed at short, increasing intervals (minutes to hours to days)
- **Review cards**: Cards the user has learned should be reviewed at longer, expanding intervals (days to weeks to months)
- **Relearning cards**: Cards the user previously knew but got wrong should re-enter a shorter review cycle before returning to long intervals
- **Difficulty adaptation**: Cards that the user consistently struggles with should be shown more frequently; easy cards should be shown less often
- **Quality ratings**: The system accepts a quality rating from 0–5 after each review (0 = complete blackout, 5 = perfect recall) and adjusts the next interval accordingly
- **Consistent spacing**: Intervals should feel natural and well-spaced — not too aggressive (annoying) and not too lazy (leads to forgetting). The spacing should feel "right" across all timescales from minutes to months

### What Gets Tracked Per Card
- Next review date (when this card should next appear)
- Review interval (current spacing in days)
- Difficulty/easiness parameters that adapt over time
- State (new, learning, review, or relearning)
- Full review history (date, quality, time spent, mode)

### Integration Points
- Every study interaction (flashcard swipe, learn answer, test answer) records a ReviewLog entry
- ReviewLog entries include: date, quality (0–5), time spent, and which study mode was used
- The review recording is fire-and-forget (doesn't block the UI)
- Card's nextReviewDate is updated after each review
- Cards can be filtered by review status for focused study sessions (e.g., "due for review" vs. "new" vs. "all")

### Important Notes for Implementation
- Choose a well-regarded spaced repetition algorithm. The spacing must feel good in practice — cards should not come back too soon (annoying) or too late (user forgets). Research-backed algorithms like FSRS or SM-2 are good starting points, but what matters most is that the intervals feel natural and effective.
- The system should handle edge cases gracefully: cards reviewed ahead of schedule, cards reviewed after a long break, cards that are consistently easy or consistently hard.
- Performance matters: recording reviews should never block the UI or cause jank during study sessions.

---

## 14. OCR & Photo Import

### Photo Import Modal
A three-step workflow for converting images to flashcards:

**Step 1 — Upload:**
- File picker accepting image files only
- Drag-and-drop support
- Preview of selected image

**Step 2 — OCR Processing:**
- Progress bar showing OCR completion percentage
- Status text showing current processing stage
- Uses Tesseract.js for client-side OCR (runs entirely in-browser, no server needed)
  - Supports English (default language: 'eng')
  - First run downloads language data (~10MB)
- Optional: Google Vision API (requires GOOGLE_VISION_API_KEY) for better handwriting accuracy

**Step 3 — Preview & Edit:**
- Raw extracted text displayed in editable text area
- Parsed term-definition pairs shown below
- Each pair can be edited or deleted before confirming
- Confirm button adds all pairs as new cards to the set

### Text Parsing
The parser recognizes multiple formats in the extracted text:
- "term - definition" (dash separator)
- "term: definition" (colon separator)
- Tab-separated pairs
- Numbered lists: "1. term - definition" or "1) term - definition"

---

## 15. Image Handling

### How Images Get Into Cards
Users can add images to cards through three methods:

**1. Clipboard Paste:**
- When the user copies an image and pastes (Ctrl/Cmd+V) inside the TipTap editor, the custom image paste handler intercepts it
- The image is automatically compressed and embedded as base64 in the card's HTML content
- Works with screenshots, copied images from other apps, and web content

**2. Drag and Drop:**
- Users can drag image files from their file system directly onto a card
- The Media Dropzone component handles the drop event
- Image is compressed via canvas and embedded as base64

**3. File Upload (File Picker):**
- The floating toolbar has an image insertion button
- Clicking it opens a standard file picker dialog for selecting an image from the computer
- Selected image is compressed and embedded as base64

### Image Processing Pipeline
All images, regardless of how they enter the app, go through the same processing:
1. Image is loaded into a canvas element
2. Compressed with maximum width constraint
3. Iterative quality reduction to stay under 500KB
4. Output format: JPEG
5. Converted to base64 data URL
6. Embedded directly in the card's HTML content as an `<img>` tag with a `src` data URL

### Image Display Constraints
- In the inline card editor: images are constrained to max 100px × 64px for compact display
- In study content (flashcards, learn mode, etc.): images are constrained to max 280px × 140px
- Images are given `loading="lazy"` attribute for performance
- Race to Finish game has responsive image grid scaling for 1–4+ images

---

## 16. Printable PDF Generation

### Print Dialog
Accessible from the set detail page, generates downloadable PDF worksheets.

**Available Activities:**

#### 1. Test (Written Exam)
- Generates a formal test document
- Configurable: question count, answer direction, question types (written, MC, T/F)
- Multi-answer MC option
- Includes answer key on separate page
- Header with set title and date

#### 2. Line Matching
- Terms listed on the left, definitions on the right (shuffled)
- Students draw lines connecting matching pairs
- Answer key provided on back page
- Minimum 2 cards required

#### 3. Flashcards
- Cut-out flashcards printed in a grid
- Term on front, definition on back (designed to be cut and folded)
- Supports embedded images
- Minimum 1 card required

#### 4. Matching Game
- Cut-out cards for a physical matching game
- Separate term cards and definition cards
- Designed to be cut apart and matched by hand
- Minimum 2 cards required

#### 5. Cut & Glue
- Definitions printed in a column on the left
- Terms printed separately (cut-out strips)
- Students cut out terms and glue them next to the correct definitions
- Minimum 2 cards required

#### 6. Lift the Flap
- Questions printed with fold-over flaps
- Lift the flap to reveal the answer underneath
- Designed to be cut and folded
- Minimum 2 cards required

### Common Configuration Options
- **Answer Direction**: Term→Definition, Definition→Term, or Both (random per item)
- **Count**: How many cards to include (limited by set size)
- Direction help text explains what each option means

### PDF Generation
- Uses jsPDF library (dynamically imported to save ~290KB from initial bundle)
- Supports embedded images (base64 and URL images converted via canvas)
- All text content has HTML stripped for clean printing
- Generated as downloadable PDF file

---

## 17. Folder Organization System

### Folder Structure
- Folders have a name, description, and color
- Colors available: blue, green, purple, red, orange, yellow, pink, teal, gray
- Folders can be nested (parent-child relationships via parentFolderId)
- Each study set can belong to one folder (via folderId)

### Folder Sidebar
Displayed on the home page and folder detail page:
- Tree view of all folders
- Folder icons colored by folder color
- Click folder to filter study sets or navigate to folder detail
- Expandable/collapsible for nested folders
- "All Sets" option to show unfiltered view

### Folder Operations
- **Create Folder**: Name, optional description, color picker
- **Rename Folder**: Inline editing
- **Change Color**: Color picker with 9 options
- **Delete Folder**: Confirmation required (does not delete contained sets, they become unassigned)
- **Move Set to Folder**: Dialog showing folder tree, click to move

### Move to Folder Dialog
- Shows all available folders in a tree structure
- Highlights current folder assignment
- Click a folder to move the set
- "Remove from folder" option to unassign

---

## 18. Command Palette

### Activation
- **Keyboard shortcut**: Ctrl+K (Windows/Linux) or Cmd+K (Mac)
- **Forward slash**: Pressing "/" when not in an input field

### Display
- Full-screen overlay with semi-transparent backdrop
- Centered floating panel with search input
- Results list below the input

### Functionality
- **Fuzzy search** across all study sets (searches title, tags, and card terms)
- Uses Fuse.js with threshold 0.4
- Shows up to 8 results
- Empty state shows recent/all sets (first 8)

### Quick Actions
- **Home**: Navigate to dashboard
- **New Set**: Navigate to set creation
- **Stats**: Navigate to analytics

### Interaction
- Type to search
- Click a result to navigate
- Escape to close
- Click backdrop to close

---

## 19. Analytics & Statistics

### Stats Page (/stats)

**Animated Counters:**
Three top-level stat cards with numbers that count up on page load:
1. **Total Reviews**: Sum of all ReviewLog entries across all sets
2. **Time Studied**: Formatted duration (hours/minutes) of total timeSpent
3. **Best Streak**: Longest streak across all sets

**Reviews by Mode (Pie Chart):**
- Recharts PieChart showing distribution of reviews across study modes
- Segments: Flashcards, Learn, Match, Test
- Color-coded segments
- Legend with counts

**Study Heatmap:**
- 12-week grid (84 cells) similar to GitHub's contribution graph
- Each cell represents one day
- Color intensity based on number of reviews that day
- Tooltip on hover showing date and review count
- Day-of-week labels on the left

**Last 28 Days Activity (Bar Chart):**
- Recharts BarChart showing daily review counts
- X-axis: dates (formatted)
- Y-axis: review count
- Bars colored with primary color

**Accessible Data Tables:**
- Hidden visually but available to screen readers
- Same data as the charts in tabular format
- Proper table headers and data cells

---

## 20. Theming

### Theme Options
- **Light** (default)
- **Dark**

### Theme Toggle
- Button in the header with sun/moon icon
- Click to toggle between light and dark
- Theme preference persisted to localStorage
- Applied via "dark" class on the document root element

### CSS Variable System
All colors, shadows, borders, and surfaces defined as CSS custom properties:
- Light theme values are the defaults
- Dark theme overrides applied within `.dark` selector or `prefers-color-scheme: dark` media query

### Initialization
- On app load, checks localStorage for saved preference
- Falls back to system preference (`prefers-color-scheme: dark`)
- If no preference found, defaults to light

---

## 21. Validation System

### Card-Level Validation

**Hard Errors (block save/study):**
| Error | Condition |
|-------|-----------|
| EMPTY_CONTENT | Term or definition is completely empty (no text, no images) |
| MAX_LENGTH | Content exceeds maximum character limit |

**Soft Warnings (displayed but don't block):**
| Warning | Condition |
|---------|-----------|
| SUSPICIOUSLY_SIMILAR | Term and definition are nearly identical |
| URL_AS_CONTENT | Content appears to be just a URL |
| ALL_CAPS_DETECTED | Entire content is in uppercase |

### Set-Level Validation

**Blocking Errors:**
| Error | Condition |
|-------|-----------|
| MIN_CARDS | Set has fewer than the minimum required cards for the selected mode |

**Warnings (dismissible):**
| Warning | Condition |
|---------|-----------|
| DUPLICATE_TERMS | Multiple cards have the same or very similar terms |
| TAG_MISSING | Set has no tags assigned |
| MAX_CARDS | Set exceeds recommended maximum card count |

### Validation Flow
1. **On card edit**: Single card validated immediately, errors shown inline
2. **On auto-save**: All cards + set validated; hard errors block save
3. **On study mode entry**: Checks minimum cards and blocks if insufficient
4. **Warnings**: Displayed as badges/indicators, can be acknowledged/dismissed

### Validation Badge
- Shows count of current validation errors
- Color-coded: red for hard errors, yellow for warnings
- Displayed on the set detail page and editor page

### Content Helpers
- `stripHtml(html)`: Extracts plain text from HTML
- `hasContent(card)`: Checks if card has any meaningful content (text or images)
- `hasTermContent(card)` / `hasDefinitionContent(card)`: Side-specific checks
- `isImageOnly(content)`: True if content contains only image tags, no text
- `hasTextContent(content)`: True if content has meaningful text content

---

## 22. Answer Equivalence System

### Purpose
When a study set has multiple cards with the same or similar terms/definitions, the equivalence system ensures that any correct answer from the equivalent group is accepted. This prevents false negatives when cards have synonymous content.

### Equivalence Groups
Cards are grouped by their normalized term and definition content:
- HTML stripped, lowercased, trimmed
- Cards with identical normalized terms or definitions are grouped together

### Functions

**Get Equivalent Answers:**
Given a card and direction (term or definition), returns all valid plain-text answers from the equivalence group. This means if three cards all have the term "dog", the answers for any of them include all three definitions.

**Get Wrong Option Pool:**
For multiple-choice generation, returns options from cards that are NOT in the same equivalence group. Prevents the "correct" answer from appearing as a "wrong" option.

**Find Correct Option Indices:**
For multi-answer multiple choice, identifies ALL options that are correct (from the equivalence group). Used when multiple options are valid answers.

**Build Multi-Answer Options:**
Creates a multiple-choice option set that may include multiple correct answers from the equivalence group, requiring the user to select all correct ones.

**Grade Written Answer (Multi):**
Grades a free-text answer against all equivalent correct answers using:
- Case-insensitive comparison
- Whitespace normalization
- Levenshtein distance for typo tolerance

### Where It's Used
- Learn Mode (all question types)
- Test Mode (all question types)
- Match Mode (tile matching)
- Memory Card Flip (pair matching)
- Block Builder (all question types)
- Race to Finish (all question types)
- Live Game (question generation)

---

## 23. Offline-First Architecture

### Design Principle
The app is designed to work completely offline. All core functionality operates on local browser storage. Cloud features are optional enhancements.

### Local Storage (IndexedDB)
- All study sets stored as complete documents in IndexedDB via Dexie
- Cards embedded directly in the set document (denormalized for offline access)
- No network requests required for basic CRUD operations
- Study sessions, settings, folders all stored locally

### Graceful Degradation
- If Supabase is not configured, the app runs entirely offline
- No authentication required for local-only usage
- All study modes work without network

### Storage Quota Handling
- If IndexedDB storage quota is exceeded during save:
  - User is notified via toast
  - Automatic backup download is triggered (JSON file)
  - Prevents data loss

---

## 24. Cloud Sync

### When Enabled
Cloud sync activates when both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured.

### Sync Behavior

**On Login / App Load:**
1. Fetch all user's sets from Supabase
2. Merge with local IndexedDB sets
3. Local-only sets (not yet synced) are preserved
4. Cloud sets update local copies

**On Set Create/Update:**
1. Save to local IndexedDB first (immediate)
2. Sync to Supabase in background
3. Uses upsert with deduplication on updatedAt timestamp
4. 10-second timeout on all cloud operations

**On Set Delete:**
1. Delete from local IndexedDB
2. Delete from Supabase in background

**Conflict Resolution:**
- Cloud sets merged with local unsynced sets
- lastSyncedAt map tracks when each set was last synced
- Skips re-uploading sets that haven't changed since last sync

### Public Sets
- Fetched via RPC `get_public_sets()` (lightweight, returns card count instead of full cards)
- Displayed on the Explore page
- Full card data fetched on demand when viewing a specific public set

---

## 25. Progressive Web App

### Service Worker
- Generated by vite-plugin-pwa
- Auto-update strategy: checks for updates and applies automatically
- Caches static assets (HTML, CSS, JS, fonts, images)

### Manifest
- App name: "StudyFlow"
- Installable on mobile devices
- Standalone display mode (no browser chrome)

### Offline Support
- All cached pages and assets available offline
- IndexedDB data persists across sessions
- Study modes work without network
- Service worker serves cached content when offline

### Configuration in vercel.json
Rewrites all non-asset routes to index.html for SPA routing:
- Excludes: /assets, /favicon, /manifest, /sw, /workbox, /registerSW

---

## 26. Keyboard Shortcuts

### Global Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + K | Open command palette |
| / (not in input) | Open command palette / focus search |
| Escape | Exit current study mode (with confirmation) |

### Flashcard Mode
| Shortcut | Action |
|----------|--------|
| Space | Progressive word reveal (definition words one at a time) |
| ← Arrow | Previous card |
| → Arrow | Next card |
| 1 | Rate: Know it |
| 2 | Rate: Somewhat know it |
| 3 | Rate: Don't know it |
| Click/Tap | Flip card |

### Learn Mode
| Shortcut | Action |
|----------|--------|
| Enter | Submit written answer |

### General
| Shortcut | Action |
|----------|--------|
| Escape | Close modals, exit modes |

---

## 27. Toast Notification System

### Toast Types
- **Success**: Green accent, checkmark icon
- **Error**: Red accent, X icon
- **Info**: Blue accent, info icon
- **Warning**: Yellow accent, warning icon

### Behavior
- Toasts appear in a fixed position (typically bottom-right or top-right)
- Auto-dismiss after configurable duration (default varies by type)
- Manual dismiss via close button
- Queue system: multiple toasts stack vertically
- Animated entrance and exit (slide + fade)

### Usage Examples
- "Set saved successfully" (success)
- "Failed to sync to cloud" (error)
- "Card validation errors detected" (warning)
- "Backup downloaded" (info)

---

## 28. Environment Configuration

### Required for Full Features
| Variable | Purpose | Required? |
|----------|---------|-----------|
| VITE_SUPABASE_URL | Supabase project URL | For cloud sync & auth |
| VITE_SUPABASE_ANON_KEY | Supabase public anon key | For cloud sync & auth |

### Optional Enhancements
| Variable | Purpose |
|----------|---------|
| GOOGLE_VISION_API_KEY | Google Vision OCR API key (better handwriting recognition) |

### Injection Mechanism
Environment variables are injected into the browser at build time via a custom Vite plugin:
- Plugin reads .env file at build time
- Injects values as `window.__VARIABLE_NAME__` properties
- Supabase client reads from window globals first, falls back to import.meta.env
- The app works without ANY environment variables (fully offline mode)

---

## 29. Routing Structure

### Route Map

| Path | Page | Description |
|------|------|-------------|
| `/` | HomePage | Main dashboard with study set grid |
| `/signin` | SignInPage | Email/password login |
| `/signup` | SignUpPage | Account registration |
| `/forgot-password` | ForgotPasswordPage | Request password reset |
| `/reset-password` | ResetPasswordPage | Set new password |
| `/account/settings` | AccountSettingsPage | Change password (protected) |
| `/sets/new` | NewSetPage | Create new study set |
| `/sets/:id` | SetDetailPage | View/edit a study set |
| `/sets/:id/study/:mode` | StudyPage | Study mode router |
| `/sets/:id/edit` | Redirect | Legacy redirect → /sets/:id |
| `/explore` | PublicSetsPage | Browse public study sets |
| `/stats` | StatsPage | Analytics dashboard |
| `/folders/:id` | FolderDetailPage | View folder contents |
| `/live` | JoinPage | Join a live game session |
| `/live/host/:sessionId` | HostPage | Host a live game |
| `/live/play` | PlayerGamePage | Player game interface |

### Valid Study Modes (URL parameter)
- `flashcards` → FlashcardMode
- `learn` → LearnMode
- `match` → MatchMode
- `test` → TestMode
- `spinner` → SpinnerMode
- `block-builder` → BlockBuilderMode
- `memory-card-flip` → MemoryCardFlipMode
- `race-to-finish` → RaceToFinishMode

### Route Configuration
- All routes use React Router v7 BrowserRouter
- All page components are lazy-loaded via React.lazy
- Suspense fallback: centered loading spinner
- AnimatePresence wraps route transitions
- SPA fallback configured in vercel.json (all non-asset routes → index.html)

---

## End of Specification

This document covers every feature, data model, interaction pattern, visual detail, and system behavior of the StudyFlow application.
