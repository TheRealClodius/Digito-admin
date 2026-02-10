# Firestore Data Structure — Digito Admin

This document describes the exact data structure for **clients**, **events**, **users**, and **whitelist** in Firestore, derived from `firestore.rules`, type definitions, and application code.

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
        │   └── {document=**}         ← Optional nested docs (e.g. profile, favorites)
        │
        ├── brands/{docId}
        ├── stands/{docId}
        ├── sessions/{docId}
        ├── happenings/{docId}
        ├── participants/{docId}
        └── posts/{docId}
```

---

## 1. Clients

**Path:** `clients/{clientId}`

**Access:** Superadmin only (read + write)

| Field        | Type     | Required | Description                    |
|-------------|----------|----------|--------------------------------|
| `name`      | string   | yes      | Client name                    |
| `description` | string | no       | Optional description           |
| `logoUrl`   | string   | no       | Logo image URL                 |
| `createdAt` | Timestamp| yes      | Server timestamp on create     |

**Type:** `Client` (see `src/types/client.ts`)

---

## 2. Events

**Path:** `clients/{clientId}/events/{eventId}`

**Access:** Any authenticated user (read). Superadmin only (write).

| Field         | Type      | Required | Description                    |
|---------------|-----------|----------|--------------------------------|
| `clientId`    | string    | yes      | Parent client ID (denormalized)|
| `name`        | string    | yes      | Event name                     |
| `description` | string    | no       | Event description              |
| `venue`       | string    | no       | Venue location                 |
| `startDate`   | Timestamp | yes      | Event start                    |
| `endDate`     | Timestamp | yes      | Event end                      |
| `logoUrl`     | string    | no       | Event logo                     |
| `bannerUrl`   | string    | no       | Banner image                   |
| `websiteUrl`  | string    | no       | Event website                  |
| `instagramUrl`| string    | no       | Instagram link                 |
| `chatPrompt`  | string    | no       | Chat prompt text               |
| `imageUrls`   | string[]  | no       | Gallery images                 |
| `isActive`    | boolean   | yes      | Whether event is active        |
| `createdAt`   | Timestamp | yes      | Server timestamp on create     |

**Type:** `Event` (see `src/types/event.ts`)

---

## 3. Whitelist

**Path:** `clients/{clientId}/events/{eventId}/whitelist/{whitelistId}`

**Access:** Any authenticated user (read). Superadmin only (write).

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

| Field | Type | Description |
|-------|------|-------------|
| *(any)* | — | User-defined profile fields |

Used for global user profile data.

---

### 4b. Event-scoped users (attendee profiles)

**Path:** `clients/{clientId}/events/{eventId}/users/{userId}`  
**Optional nested:** `.../users/{userId}/{document=**}`

**Access:** Owner ( Firebase Auth UID ) or superadmin.

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | Matches whitelist entry |
| `name` | string | Display name |
| `company` | string | *Locked* if in whitelist `lockedFields` |
| `accessTier` | enum | Synced from whitelist when locked |
| *(other)* | — | Custom profile fields |

**Relationship with whitelist:**
- Whitelist defines who can access the event (by email).
- When a user signs in, their profile is created/updated under `users/{userId}`.
- Admins edit whitelist; `lockedFields` are synced to the matching user doc (by email).

---

## 5. Admin Permissions (userPermissions)

**Path:** `userPermissions/{userId}`

**Access:** User can read own; superadmin can read/write.

| Field       | Type      | Required | Description                                |
|-------------|-----------|----------|--------------------------------------------|
| `userId`    | string    | yes      | Firebase Auth UID                          |
| `email`     | string    | yes      | For display/debugging                      |
| `role`      | enum     | yes      | `"superadmin"` \| `"client-admin"` \| `"event-admin"` |
| `clientIds` | string[] \| null | no | `null` = all; `[]` = none; `["id1","id2"]` = scoped |
| `eventIds`  | string[] \| null | no | Same semantics as `clientIds`              |
| `createdAt` | Timestamp | yes      | When created                               |
| `updatedAt` | Timestamp | yes      | When last updated                          |
| `createdBy` | string    | yes      | UID of creator                             |
| `updatedBy` | string    | yes      | UID of last updater                        |

**Note:** Firestore rules currently use `isSuperAdmin()` (custom claim). `hasClientAccess` / `hasEventAccess` use `userPermissions` for future scoped admin roles.

---

## 6. superAdmins (legacy)

**Path:** `superAdmins/{uid}`

**Access:** Owner read; superadmin write.

| Field  | Type   | Description   |
|--------|--------|---------------|
| `email`| string | Admin email  |

Kept for backward compatibility; `seed-admins.ts` still writes here.

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
│  • clientIds, eventIds       • email only           • Auth UID = doc id            │
│  • role: superadmin|client|event                                                    │
│                                                                                   │
│  clients/{clientId}                                                                │
│  ──────────────────                                                                 │
│  • name, description, logoUrl, createdAt                                           │
│  │                                                                                 │
│  └── events/{eventId}                                                               │
│      • name, venue, startDate, endDate, isActive, ...                               │
│      │                                                                             │
│      ├── whitelist/{whitelistId}     ← WHO can attend (by email)                   │
│      │   • email, accessTier, company, lockedFields                                │
│      │                                                                             │
│      ├── users/{userId}              ← Attendee profiles (by Auth UID)             │
│      │   • email, name, company, accessTier (synced from whitelist when locked)    │
│      │   • Owner = user; superadmin can read/write                                 │
│      │                                                                             │
│      ├── brands, stands, sessions, happenings, participants, posts                │
│      └── (event content subcollections)                                             │
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

## Is the Structure Correct?

| Aspect | Assessment |
|--------|------------|
| **Clients → Events** | ✅ Correct. Events belong to clients. |
| **Event subcollections** | ✅ Correct. brands, stands, sessions, etc. are event-scoped. |
| **Whitelist** | ✅ Correct. Per-event; defines who can attend. |
| **Whitelist ↔ Users sync** | ✅ Correct. Locked fields synced by email. |
| **Root users vs event users** | ⚠️ Two different concepts: global profile vs per-event attendee. |
| **userPermissions** | ⚠️ Rules use `isSuperAdmin()` claim; scope rules (`hasClientAccess`, `hasEventAccess`) exist but are not yet enforced. |

**Potential issues:**
1. **Event users doc id:** Event users use Firebase Auth UID as doc id. Whitelist matches by email. If the same person uses different auth methods, email match may fail — acceptable if auth is unified (e.g. Google only).
