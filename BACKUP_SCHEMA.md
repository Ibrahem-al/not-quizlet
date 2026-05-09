# StudyFlow Backup File Schema

This document describes the exact JSON structure of the `studyflow-backup.json` file produced by the Export feature and consumed by the Import feature.

---

## File Format

- **File name**: `studyflow-backup.json`
- **MIME type**: `application/json`
- **Encoding**: UTF-8
- **Top-level structure**: A JSON **array** of StudySet objects

```json
[
  { /* StudySet object */ },
  { /* StudySet object */ },
  ...
]
```

The file contains every study set the user has. Each set is a self-contained document with all of its cards, review history, and metadata embedded directly inside it.

---

## Import Validation

When importing a backup file, each object in the array is validated before being accepted. An object is only imported if **all three** of these conditions are true:

1. It has an `id` property (truthy)
2. It has a `title` property (truthy)
3. It has a `cards` property that is an array

Objects that fail this check are silently skipped. The import uses an upsert strategy — if a set with the same `id` already exists locally, it is replaced with the imported version.

---

## StudySet Object

Each element in the top-level array is a StudySet with this shape:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | UUID v4 unique identifier for the set |
| `title` | string | Yes | Display title of the study set |
| `description` | string | Yes | Description text (can be empty string) |
| `createdAt` | number | Yes | Unix timestamp in milliseconds when the set was created |
| `updatedAt` | number | Yes | Unix timestamp in milliseconds of the last modification |
| `tags` | string[] | Yes | Array of tag strings for categorization |
| `cards` | Card[] | Yes | Array of Card objects (see below) |
| `lastStudied` | number | Yes | Unix timestamp in milliseconds of the last study session (0 if never studied) |
| `studyStats` | object | Yes | Study statistics object (see below) |
| `visibility` | string | Yes | `"private"` or `"public"` |
| `sharingMode` | string | Yes | `"private"`, `"restricted"`, `"link"`, or `"public"` |
| `userId` | string | No | Owner's user ID (set by cloud sync, may be absent for local-only sets) |
| `folderId` | string | No | ID of the folder this set belongs to (absent if not in a folder) |
| `effectivePermissions` | string | No | `"owner"`, `"editor"`, or `"viewer"` (computed field, may be absent) |
| `cardCount` | number | No | Server-computed card count (used for public browse, may be absent) |

### studyStats Object

| Field | Type | Description |
|-------|------|-------------|
| `totalSessions` | number | Total number of study sessions completed |
| `averageAccuracy` | number | Average accuracy across all sessions (0–1 or 0–100 depending on data) |
| `streakDays` | number | Current or best streak in days |

---

## Card Object

Each element in the `cards` array has this shape:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | UUID unique identifier for the card |
| `term` | string | Yes | The term/front side — stored as an HTML string supporting rich text and embedded `<img>` tags |
| `definition` | string | Yes | The definition/back side — same format as term |
| `imageData` | string | No | Base64-encoded image data (data URL format, max ~500KB). May be absent or undefined |
| `audioData` | string | No | Base64-encoded audio data. May be absent or undefined |
| `difficulty` | number | Yes | Difficulty rating, 0–5 scale |
| `repetition` | number | Yes | Number of consecutive successful repetitions |
| `interval` | number | Yes | Current review interval in days |
| `efFactor` | number | Yes | Easiness factor (default 2.5, minimum 1.3) |
| `nextReviewDate` | number | Yes | Unix timestamp in milliseconds for when this card is next due for review |
| `history` | ReviewLog[] | Yes | Array of all past review events (see below) |
| `fsrs` | FSRSState | No | FSRS scheduling state. If present, FSRS algorithm is used; if absent, legacy SM-2 fields are used |

### Important Notes on Card Content

- `term` and `definition` are **HTML strings**, not plain text. They may contain tags like `<p>`, `<strong>`, `<em>`, `<img src="data:image/jpeg;base64,...">`, etc.
- Embedded images inside `term`/`definition` HTML are stored as base64 data URLs directly in the `src` attribute of `<img>` tags
- `imageData` is a separate field from images embedded in the HTML — it's a legacy/additional image attachment

---

## ReviewLog Object

Each element in a card's `history` array:

| Field | Type | Description |
|-------|------|-------------|
| `date` | number | Unix timestamp in milliseconds when the review occurred |
| `quality` | number | Quality rating from 0–5: `0` = complete blackout, `1` = incorrect but recognized on reveal, `2` = incorrect but felt familiar, `3` = correct with significant difficulty, `4` = correct with some hesitation, `5` = perfect recall |
| `timeSpent` | number | Milliseconds the user spent on this particular review |
| `mode` | string | Which study mode was used: `"flashcards"`, `"learn"`, `"match"`, or `"test"` |

---

## FSRSState Object

Optional object on each card. When present, the spaced repetition system uses FSRS scheduling instead of the legacy SM-2 fields.

| Field | Type | Description |
|-------|------|-------------|
| `stability` | number | Memory stability parameter (higher = more stable memory, longer intervals) |
| `difficulty` | number | Item difficulty (0–10 scale) |
| `state` | number | Card state: `0` = New, `1` = Learning, `2` = Review, `3` = Relearning |
| `lastReview` | number | Unix timestamp in milliseconds of the most recent review |

---

## Complete Example

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Spanish Vocabulary",
    "description": "Common Spanish words and phrases",
    "createdAt": 1710000000000,
    "updatedAt": 1710500000000,
    "tags": ["spanish", "vocabulary", "beginner"],
    "lastStudied": 1710400000000,
    "studyStats": {
      "totalSessions": 12,
      "averageAccuracy": 0.85,
      "streakDays": 3
    },
    "visibility": "private",
    "sharingMode": "private",
    "folderId": "f1f2f3f4-a1b2-c3d4-e5f6-789012345678",
    "cards": [
      {
        "id": "c1c2c3c4-d5d6-e7e8-f9f0-abcdef123456",
        "term": "<p>Hola</p>",
        "definition": "<p>Hello</p>",
        "difficulty": 0,
        "repetition": 5,
        "interval": 14,
        "efFactor": 2.6,
        "nextReviewDate": 1711700000000,
        "history": [
          {
            "date": 1710100000000,
            "quality": 5,
            "timeSpent": 2300,
            "mode": "flashcards"
          },
          {
            "date": 1710400000000,
            "quality": 4,
            "timeSpent": 3100,
            "mode": "learn"
          }
        ],
        "fsrs": {
          "stability": 14.2,
          "difficulty": 3.1,
          "state": 2,
          "lastReview": 1710400000000
        }
      },
      {
        "id": "c2c3c4c5-d6d7-e8e9-f0f1-bcdef1234567",
        "term": "<p><strong>Gato</strong></p><p><img src=\"data:image/jpeg;base64,/9j/4AAQ...\" /></p>",
        "definition": "<p>Cat</p>",
        "imageData": "data:image/jpeg;base64,/9j/4AAQ...",
        "difficulty": 2,
        "repetition": 2,
        "interval": 3,
        "efFactor": 2.36,
        "nextReviewDate": 1710700000000,
        "history": [
          {
            "date": 1710300000000,
            "quality": 3,
            "timeSpent": 5400,
            "mode": "test"
          }
        ]
      }
    ]
  }
]
```

---

## Size Considerations

- Each card with an embedded image can add up to ~500KB (base64 encoded) to the file
- A set with 100 cards and no images is typically 50–200KB
- A set with 100 cards each containing an image could be 50MB+
- The backup file contains ALL sets, so total size is the sum of all sets
- Review history grows over time — heavily studied cards may have hundreds of ReviewLog entries
