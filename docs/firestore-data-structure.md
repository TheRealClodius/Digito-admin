# Firestore Data Structure — Digito Admin

This document describes the exact data structure for all Firestore collections, derived from `firestore.rules`, type definitions, application code, and verified against production data (2026-02-17).

---

## Hierarchy Diagram

```
Firestore Root
│
├── userPermissions/{userId}          ← Admin permissions (who can access what)
├── superAdmins/{uid}                 ← Legacy: superadmin lookup by uid
├── users/{userId}                    ← Root user profile (auth'd users)
│
└── clients/{clientId}                ← Top-level client (e.g. "Acme Corp")
    │
    └── events/{eventId}              ← Event under a client
        │
        ├── whitelist/{whitelistId}   ← Allowed attendees + access tier
        ├── users/{userId}            ← Event-scoped user profile (attendee data)
        │   ├── feedback/{feedbackId} ← User feedback (from AI chat agent)
        │   ├── favorites/{docId}     ← User's favorited items
        │   ├── chats/{docId}         ← Chat messages
        │   └── chatMeta/{docId}      ← Chat session metadata
        │
        ├── brands/{docId}            ← Companies/exhibitors
        ├── stands/{docId}            ← Physical booth locations (planned)
        ├── sessions/{docId}          ← Talks, workshops, panels
        ├── happenings/{docId}        ← Side events (demos, performances, launches)
        ├── participants/{docId}      ← Speakers, hosts, brand reps
        └── posts/{docId}             ← Social feed posts
```

---

## 1. Clients

**Path:** `clients/{clientId}`

**Access:** SuperAdmin (read + write). ClientAdmin/EventAdmin with `clientIds` match (read only).

| Field        | Type     | Required | Description                    |
|-------------|----------|----------|--------------------------------|
| `name`      | string   | yes      | Client name                    |
| `description` | string | no       | Optional description           |
| `logoUrl`   | string   | no       | Logo image URL                 |
| `createdAt` | Timestamp| yes      | Server timestamp on create     |
| `updatedAt` | Timestamp| no       | Server timestamp on update     |

**Type:** `Client` (see `src/types/client.ts`)

---

## 2. Events

**Path:** `clients/{clientId}/events/{eventId}`

**Access:** Admins with event access (read). SuperAdmin + ClientAdmin with client access (write).

| Field         | Type      | Required | Description                    |
|---------------|-----------|----------|--------------------------------|
| `clientId`    | string    | yes      | Parent client ID (denormalized)|
| `name`        | string    | yes      | Event name                     |
| `description` | string    | no       | Event description              |
| `venue`       | string    | no       | Venue location                 |
| `startDate`   | string    | yes      | Event start (ISO datetime, e.g. `"2026-02-05T13:55"`) |
| `endDate`     | string    | yes      | Event end (ISO datetime, e.g. `"2026-02-10T13:55"`) |
| `logoUrl`     | string    | no       | Event logo                     |
| `bannerUrl`   | string    | no       | Banner image                   |
| `websiteUrl`  | string    | no       | Event website                  |
| `instagramUrl`| string    | no       | Instagram link                 |
| `chatPrompt`  | string    | no       | Chat prompt text               |
| `imageUrls`   | string[]  | no       | Gallery images (optional, may not be set) |
| `isActive`    | boolean   | yes      | Whether event is active        |
| `createdAt`   | Timestamp | no       | Server timestamp on create (may be absent on older docs) |
| `updatedAt`   | Timestamp | no       | Server timestamp on update     |

**Note:** TypeScript type declares `startDate`/`endDate` as `Timestamp`, but actual Firestore data stores them as ISO datetime strings. The admin form saves them as strings.

**Type:** `Event` (see `src/types/event.ts`)

---

## 3. Whitelist

**Path:** `clients/{clientId}/events/{eventId}/whitelist/{whitelistId}`

**Access:** Any authenticated user (read). Admins with `canWriteEventContent` (write).

| Field         | Type     | Required | Description                                  |
|---------------|----------|----------|----------------------------------------------|
| `email`       | string   | yes      | Email (stored lowercase)                     |
| `accessTier`  | enum     | no       | `"regular"` \| `"premium"` \| `"vip"` \| `"staff"` |
| `company`     | string   | no       | Company name                                 |
| `lockedFields`| string[] | no       | Fields admins lock (e.g. `["email","company"]`) |
| `addedAt`     | Timestamp| yes      | When added to whitelist                      |
| `createdAt`   | Timestamp| —        | Server timestamp (from addDoc)               |
| `updatedAt`   | Timestamp| —        | Server timestamp on update                   |

**Relationship:** Whitelist entries are linked to event users by **email**. When an admin updates a whitelist entry, `batchUpdateWhitelistAndUser` syncs `lockedFields` to the matching document in `users` subcollection.

**Type:** `WhitelistEntry` (see `src/types/whitelist-entry.ts`)

---

## 4. Users (two different collections)

### 4a. Root users (app-level profile)

**Path:** `users/{userId}`

**Access:** Owner only (read + write). `userId` = Firebase Auth UID.

| Field      | Type      | Required | Description                    |
|------------|-----------|----------|--------------------------------|
| `language` | string    | no       | User's preferred language (e.g. `"it"`, `"en"`) |
| `updatedAt`| Timestamp | no       | Server timestamp on update     |

Used for global user settings (language preference, etc.). Created by the Flutter app.

---

### 4b. Event-scoped users (attendee profiles)

**Path:** `clients/{clientId}/events/{eventId}/users/{userId}`

**Access:** Owner (Firebase Auth UID) or superadmin.

| Field            | Type      | Required | Description                                    |
|------------------|-----------|----------|------------------------------------------------|
| `email`          | string    | yes      | Matches whitelist entry                        |
| `firstName`      | string    | yes      | First name                                     |
| `lastName`       | string    | yes      | Last name                                      |
| `company`        | string    | no       | *Locked* if in whitelist `lockedFields`        |
| `phoneNumber`    | string    | no       | Phone number (nullable)                        |
| `qualification`  | string    | no       | Job title / qualification                      |
| `aboutYou`       | string    | no       | User bio / about text                          |
| `accessTier`     | enum      | no       | Synced from whitelist when locked              |
| `profileVersion` | number    | no       | Profile version counter                        |
| `isActive`       | boolean   | no       | Whether the profile is active                  |
| `updatedAt`      | Timestamp | no       | Last update timestamp                          |

**Nested subcollections:**

#### Feedback — `...users/{userId}/feedback/{feedbackId}`

See [Section 13: Feedback](#13-feedback-user-subcollection).

#### Favorites — `...users/{userId}/favorites/{docId}`

| Field    | Type      | Required | Description                       |
|----------|-----------|----------|-----------------------------------|
| `itemId` | string    | yes      | ID of the favorited item          |
| `type`   | string    | yes      | Type of item (e.g. `"brand"`)     |
| `addedAt`| Timestamp | yes      | When the item was favorited       |

#### ChatMeta — `...users/{userId}/chatMeta/{docId}`

| Field       | Type      | Required | Description                    |
|-------------|-----------|----------|--------------------------------|
| `sessionId` | string    | yes      | Active chat session ID         |
| `updatedAt` | Timestamp | yes      | Last update timestamp          |

#### Chats — `...users/{userId}/chats/{docId}`

Chat message documents. Structure managed by the Flutter app.

**Relationship with whitelist:**
- Whitelist defines who can access the event (by email).
- When a user signs in, their profile is created/updated under `users/{userId}`.
- Admins edit whitelist; `lockedFields` are synced to the matching user doc (by email).

---

## 5. Admin Permissions (userPermissions)

**Path:** `userPermissions/{userId}`

**Access:** User can read own; superadmin can read/write all.

| Field       | Type      | Required | Description                                |
|-------------|-----------|----------|--------------------------------------------|
| `userId`    | string    | yes      | Firebase Auth UID                          |
| `email`     | string    | yes      | For display/debugging                      |
| `role`      | enum     | yes      | `"superadmin"` \| `"clientAdmin"` \| `"eventAdmin"` |
| `clientIds` | string[] \| null | no | `null` = all; `[]` = none; `["id1","id2"]` = scoped |
| `eventIds`  | string[] \| null | no | Same semantics as `clientIds`              |
| `createdAt` | Timestamp | yes      | When created                               |
| `updatedAt` | Timestamp | yes      | When last updated                          |
| `createdBy` | string    | yes      | UID of creator (audit trail)               |
| `updatedBy` | string    | yes      | UID of last updater (audit trail)          |

### Role Hierarchy & Permissions

| Role | Custom Claim | Scope | Can Assign Roles | Access Level |
|------|-------------|-------|------------------|--------------|
| **superadmin** | `superadmin: true` | All clients & events | clientAdmin, eventAdmin | Full read/write on all collections |
| **clientAdmin** | `role: "clientAdmin"` | Assigned `clientIds` | eventAdmin (own clients only) | Read/write on assigned clients, their events, and event content |
| **eventAdmin** | `role: "eventAdmin"` | Assigned `clientIds` + `eventIds` | None | Read/write on event content (whitelist, brands, sessions, etc.) |

### Firestore Rules Enforcement

Permissions are enforced at two levels:

1. **Custom claims** (no Firestore read) — `isSuperAdmin()`, `hasRoleClaim('clientAdmin')`, `isAnyAdmin()`
2. **Scoped access** (1 Firestore read, cached) — `hasClientAccess(clientId)`, `hasEventAccess(clientId, eventId)`, `canWriteEventContent(clientId, eventId)`

Key access patterns:
- **Clients** — SuperAdmin: read/write. ClientAdmin/EventAdmin with `clientIds` match: read only.
- **Events** — SuperAdmin + ClientAdmin (with client access): read/write. EventAdmin (with event access): read only.
- **Event content** (whitelist, brands, sessions, etc.) — Any admin with `canWriteEventContent`: read/write.
- **Event creation/deletion** — SuperAdmin and ClientAdmin only (EventAdmin cannot create/delete events).

---

## 6. superAdmins (legacy)

**Path:** `superAdmins/{uid}`

**Access:** Owner read; superadmin write.

| Field  | Type   | Description   |
|--------|--------|---------------|
| `email`| string | Admin email  |

Kept for backward compatibility; `seed-admins.ts` still writes here.

---

## 7. Sessions

**Path:** `clients/{clientId}/events/{eventId}/sessions/{sessionId}`

**Access:** Any admin with `canWriteEventContent` (read/write).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | yes | Session title |
| `description` | string | no | Session description |
| `startTime` | string | yes | Start time (ISO datetime) |
| `endTime` | string | yes | End time (ISO datetime) |
| `location` | string | no | Room/area |
| `type` | enum | yes | `"talk"` \| `"workshop"` \| `"panel"` \| `"networking"` \| `"other"` |
| `speakerName` | string | no | Speaker name (denormalized from participant) |
| `speakerBio` | string | no | Speaker bio (denormalized from participant) |
| `speakerAvatarUrl` | string | no | Speaker photo URL |
| `participantId` | string | no | Linked participant ID |
| `requiresAccess` | boolean | yes | Whether session requires special access (default: false) |
| `accessTier` | enum \| null | no | `"regular"` \| `"premium"` \| `"vip"` \| `"staff"` — shown when requiresAccess is true |
| `imageUrl` | string | no | Cover image URL |
| `createdAt` | Timestamp | no | Server timestamp on create (may be absent on older docs) |
| `updatedAt` | Timestamp | no | Server timestamp on update |

**Flutter contract:** The Flutter app reads `requiresAccess` (boolean) and `accessTier` (string, nullable). These field names must match exactly.

**Type:** `Session` (see `src/types/session.ts`)

---

## 8. Brands

**Path:** `clients/{clientId}/events/{eventId}/brands/{brandId}`

**Access:** Any admin with `canWriteEventContent` (read/write).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Brand/company name |
| `description` | string | no | Brand description |
| `logoUrl` | string | no | Brand logo URL |
| `imageUrl` | string | no | Brand cover image URL |
| `videoUrl` | string | no | Brand video URL |
| `websiteUrl` | string | no | Brand website |
| `instagramUrl` | string | no | Instagram link |
| `stallNumber` | string | no | Booth location (e.g. `"Pav 9, Stand H03"`) |
| `isHighlighted` | boolean | yes | Whether brand is featured/highlighted |
| `createdAt` | Timestamp | yes | Server timestamp on create |

**UI note:** Displayed as "Stands" in the admin navigation. The `brands` Firestore collection maps to the "Stands" UI section.

**Type:** `Brand` (see `src/types/brand.ts`)

---

## 9. Happenings

**Path:** `clients/{clientId}/events/{eventId}/happenings/{happeningId}`

**Access:** Any admin with `canWriteEventContent` (read/write).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | yes | Happening title |
| `description` | string | no | Happening description |
| `startTime` | string | yes | Start time (ISO datetime) |
| `endTime` | string | yes | End time (ISO datetime) |
| `location` | string | no | Location/venue |
| `type` | enum | yes | `"demo"` \| `"performance"` \| `"launch"` \| `"networking"` \| `"reception"` \| `"other"` |
| `hostName` | string | no | Host name |
| `hostAvatarUrl` | string | no | Host photo URL |
| `imageUrl` | string | no | Cover image URL |
| `brandId` | string | no | Linked brand ID |
| `isHighlighted` | boolean | yes | Whether happening is featured |
| `requiresAccess` | boolean | yes | Whether access tier is required |
| `accessTier` | enum \| null | no | `"regular"` \| `"premium"` \| `"vip"` \| `"staff"` |
| `createdAt` | Timestamp | yes | Server timestamp on create |

**Type:** `Happening` (see `src/types/happening.ts`)

---

## 10. Posts

**Path:** `clients/{clientId}/events/{eventId}/posts/{postId}`

**Access:** Any admin with `canWriteEventContent` (read/write).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `imageUrl` | string | yes | Post image URL |
| `description` | string | no | Post caption/text |
| `authorName` | string | no | Author display name |
| `authorAvatarUrl` | string | no | Author avatar URL (nullable) |
| `createdAt` | Timestamp | yes | Server timestamp on create |
| `updatedAt` | Timestamp | no | Server timestamp on update |

**Type:** `Post` (see `src/types/post.ts`)

---

## 11. Participants

**Path:** `clients/{clientId}/events/{eventId}/participants/{participantId}`

**Access:** Any admin with `canWriteEventContent` (read/write).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `firstName` | string | yes | First name |
| `lastName` | string | yes | Last name |
| `email` | string | yes | Email address |
| `role` | enum | yes | `"speaker"` \| `"panelist"` \| `"host"` \| `"brand_rep"` \| `"moderator"` \| `"performer"` \| `"other"` |
| `company` | string | no | Company name |
| `title` | string | no | Job title |
| `bio` | string | no | Bio text |
| `avatarUrl` | string | no | Photo URL |
| `websiteUrl` | string | no | Website |
| `linkedinUrl` | string | no | LinkedIn URL |
| `brandId` | string | no | Linked brand ID |
| `sessionIds` | string[] | no | Linked session IDs |
| `happeningIds` | string[] | no | Linked happening IDs |
| `isHighlighted` | boolean | yes | Whether participant is featured |
| `accessTier` | enum | yes | `"regular"` \| `"premium"` \| `"vip"` \| `"staff"` |
| `lockedFields` | string[] | no | Fields locked by admin |
| `addedAt` | Timestamp | yes | When added |
| `createdAt` | Timestamp | yes | Server timestamp on create |

**Status:** Collection exists in types and Firestore rules but has 0 documents in production (as of 2026-02-17).

**Type:** `Participant` (see `src/types/participant.ts`)

---

## 12. Stands

**Path:** `clients/{clientId}/events/{eventId}/stands/{standId}`

**Access:** Any admin with `canWriteEventContent` (read/write).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Stand name |
| `description` | string | no | Stand description |
| `hallOrZone` | string | no | Hall or zone location |
| `size` | enum | no | `"small"` \| `"medium"` \| `"large"` \| `"custom"` |
| `brandId` | string | no | Linked brand ID |
| `imageUrl` | string | no | Stand image URL |
| `createdAt` | Timestamp | yes | Server timestamp on create |

**Status:** Collection exists in types and Firestore rules but has 0 documents in production (as of 2026-02-17). Planned for physical booth location management separate from brands.

**Type:** `Stand` (see `src/types/stand.ts`)

---

## 13. Feedback (user subcollection)

**Path:** `clients/{clientId}/events/{eventId}/users/{userId}/feedback/{feedbackId}`

**Access:** Owner (read/write, if active). Admins with `canWriteEventContent` (read only).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `feedbackText` | string | yes | The user's feedback message |
| `timestamp` | string | yes | ISO 8601 timestamp (e.g. `"2026-02-06T19:31:45.978310+00:00"`) |
| `chatSessionId` | string | yes | ID of the AI chat session that collected the feedback |

**Source:** Created by the Flutter app's AI chat agent when users provide feedback via the feedback tool.

**Admin access:** SuperAdmins can view aggregated feedback via the admin dashboard at `/events/{eventId}/feedback`. The dashboard enriches feedback with user profile data (name, email, company) server-side via the `GET /api/feedback` route.

**Type:** `FeedbackEntry` (see `src/types/feedback.ts`)

---

## Visual Summary

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           FIRESTORE ROOT                                          │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  userPermissions/{userId}     superAdmins/{uid}     users/{userId}                │
│  ───────────────────────     ─────────────────     ─────────────               │
│  • Admin access control       • Legacy superadmin    • Root user profile           │
│  • clientIds, eventIds       • email only           • language, updatedAt          │
│  • role: superadmin|clientAdmin|eventAdmin                                            │
│                                                                                   │
│  clients/{clientId}                                                                │
│  ──────────────────                                                                 │
│  • name, description, logoUrl, createdAt, updatedAt                               │
│  │                                                                                 │
│  └── events/{eventId}                                                               │
│      • name, venue, startDate, endDate, isActive, ...                               │
│      │                                                                             │
│      ├── whitelist/{whitelistId}     ← WHO can attend (by email)                   │
│      │   • email, accessTier, company, lockedFields                                │
│      │                                                                             │
│      ├── users/{userId}              ← Attendee profiles (by Auth UID)             │
│      │   • email, firstName, lastName, company, qualification, aboutYou            │
│      │   • accessTier (synced from whitelist when locked)                          │
│      │   └── feedback/, favorites/, chats/, chatMeta/                              │
│      │                                                                             │
│      ├── brands/{docId}              ← Companies/exhibitors ("Stands" in UI)       │
│      ├── sessions/{docId}            ← Talks, workshops, panels                    │
│      ├── happenings/{docId}          ← Side events (demos, performances)           │
│      ├── posts/{docId}               ← Social feed posts                           │
│      ├── participants/{docId}        ← Speakers, hosts (empty, planned)            │
│      └── stands/{docId}              ← Physical booths (empty, planned)            │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Whitelist ↔ Users Relationship

```
                    ┌─────────────────────────────────────────┐
                    │  whitelist/{whitelistId}                │
                    │  ───────────────────────                │
                    │  email: "jane@example.com"              │
                    │  accessTier: "vip"                       │
                    │  company: "Acme Inc"                     │
                    │  lockedFields: ["email", "company"]      │
                    └────────────────┬────────────────────────┘
                                     │
                     sync (batchUpdateWhitelistAndUser)
                     by email match
                                     │
                                     ▼
                    ┌─────────────────────────────────────────┐
                    │  users/{userId}                          │
                    │  ─────────────────                       │
                    │  email: "jane@example.com"  ← matched    │
                    │  company: "Acme Inc"        ← synced     │
                    │  accessTier: "vip"          ← synced     │
                    │  (userId = Firebase Auth UID)            │
                    └─────────────────────────────────────────┘
```

---

## Known Discrepancies

| Aspect | Note |
|--------|------|
| **Event date types** | TypeScript type declares `startDate`/`endDate` as `Timestamp`, but Firestore stores them as ISO datetime strings (e.g. `"2026-02-05T13:55"`). The admin form saves strings. |
| **Event `createdAt`** | Declared in type but absent on some production docs — likely not set by the create form. |
| **Stands / Participants** | Types and rules exist but collections are empty in production (planned features). |

---

**Potential issues:**
1. **Event users doc id:** Event users use Firebase Auth UID as doc id. Whitelist matches by email. If the same person uses different auth methods, email match may fail — acceptable if auth is unified (e.g. Google only).
