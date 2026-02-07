# Digito Admin Dashboard — Implementation Plan

A Next.js web dashboard for managing all Digito client data, event assets, schedules, and user access. Built with shadcn/ui, backed by the same Firebase project (`digito-poc`) as the Flutter app.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Firestore Schema Extensions](#3-firestore-schema-extensions)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Dashboard Pages & UI](#5-dashboard-pages--ui)
6. [Page-by-Page Specification](#6-page-by-page-specification)
7. [Firebase Storage Strategy](#7-firebase-storage-strategy)
8. [Firestore Security Rules Updates](#8-firestore-security-rules-updates)
9. [Project Structure](#9-project-structure)
10. [Implementation Phases](#10-implementation-phases)
11. [Future: v1.1 Client-Level Admin](#11-future-v11-client-level-admin)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                  Admin Dashboard                      │
│              (Next.js + shadcn/ui)                    │
│                                                       │
│  Super-Admin authenticates via Firebase Auth           │
│  Reads/writes directly to Firestore & Storage         │
│  Hosted on Firebase Hosting                           │
└────────────┬────────────────────┬─────────────────────┘
             │                    │
             ▼                    ▼
     ┌──────────────┐   ┌─────────────────┐
     │  Cloud        │   │  Firebase        │
     │  Firestore    │   │  Storage         │
     │  (digito-poc) │   │  (digito-poc)    │
     └──────┬───────┘   └────────┬────────┘
            │                     │
            ▼                     ▼
     ┌──────────────────────────────────────┐
     │         Flutter App (Digito)          │
     │    Reads same Firestore + Storage     │
     └──────────────────────────────────────┘
            │
            ▼
     ┌──────────────────────────────────────┐
     │      AI Agent (FastAPI + Gemini)      │
     │  Reads Firestore via tools — sees     │
     │  everything the dashboard writes      │
     └──────────────────────────────────────┘
```

The dashboard writes data. The Flutter app and AI agent read it. No API layer needed — all three share the same Firestore database.

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 16 (App Router) | SSR, file-based routing, server components, Turbopack default |
| **UI Library** | shadcn/ui + Tailwind CSS 4 | Beautiful defaults, copy-paste components, no vendor lock |
| **Firebase SDK** | `firebase` JS SDK v12 (client-side) | Direct Firestore/Storage/Auth access |
| **Auth** | Firebase Auth (email/password) | Same project, custom claims for admin role |
| **Forms** | React Hook Form + Zod 4 | Type-safe validation |
| **Date/Time** | `date-fns` | Lightweight, tree-shakable |
| **File Upload** | Firebase Storage + `react-dropzone` | Drag-and-drop with preview |
| **State** | React Server Components + `useSWR` or TanStack Query for client | Minimal client state, Firestore as source of truth |
| **Icons** | Lucide (ships with shadcn) | Consistent icon set |
| **Hosting** | Firebase Hosting | Single project, auto-SSL, CDN |
| **Package Manager** | pnpm | Fast, disk-efficient |

---

## 3. Firestore Schema Extensions

These are **new collections** that extend the existing schema. The Flutter app's existing collections (`brands`, `sessions`, `posts`, `whitelist`, `users`) remain unchanged.

### 3.1 New Collection: `stands`

Physical booth/stall locations at the event. Brands are assigned to stands.

**Path:** `clients/{clientId}/events/{eventId}/stands/{standId}`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Stand display name (e.g., "A-12", "Hall B Stand 5") |
| `description` | string | no | About this stand location |
| `hallOrZone` | string | no | Hall/area grouping (e.g., "Hall A", "Innovation Zone") |
| `size` | string | no | Stand size category: `small`, `medium`, `large`, `custom` |
| `brandId` | string | no | Assigned brand ID (FK to `brands/{brandId}`) |
| `imageUrl` | string | no | Stand photo or layout image |
| `createdAt` | timestamp | yes | Creation timestamp |

**Relationship:** A stand can be assigned to one brand. A brand can occupy one or more stands. The existing `brand.stallNumber` field is kept for backwards compatibility in the Flutter app — the dashboard writes both the stand document AND updates `brand.stallNumber` when assigning.

### 3.2 New Collection: `happenings`

Live events, performances, demos, or other time-bound activities that aren't formal sessions/talks. Think product launches, live demos, DJ sets, cocktail hours.

**Path:** `clients/{clientId}/events/{eventId}/happenings/{happeningId}`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | yes | Happening title |
| `description` | string | no | What this happening is about |
| `startTime` | timestamp | yes | Start time |
| `endTime` | timestamp | yes | End time |
| `location` | string | no | Where it takes place |
| `type` | string | yes | `demo`, `performance`, `launch`, `networking`, `reception`, `other` |
| `hostName` | string | no | Host/presenter name |
| `hostAvatarUrl` | string | no | Host photo |
| `imageUrl` | string | no | Cover image |
| `brandId` | string | no | Associated brand (if brand-hosted) |
| `isHighlighted` | boolean | no | Featured happening (default: false) |
| `requiresAccess` | boolean | no | Requires special access tier (default: false) |
| `accessTier` | string | no | Required tier if `requiresAccess` is true |
| `createdAt` | timestamp | yes | Creation timestamp |

**vs Sessions:** Sessions = formal program (talks, panels, workshops with speakers). Happenings = informal/experiential (demos, parties, activations). Both have time ranges and locations but serve different UX purposes.

### 3.3 New Collection: `participants`

Named individuals associated with the event — speakers, panelists, hosts, brand representatives. Richer than the existing `speakerName`/`speakerBio` fields on sessions.

**Path:** `clients/{clientId}/events/{eventId}/participants/{participantId}`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `firstName` | string | yes | First name |
| `lastName` | string | yes | Last name |
| `email` | string | no | Contact email |
| `role` | string | yes | `speaker`, `panelist`, `host`, `brand_rep`, `moderator`, `performer`, `other` |
| `company` | string | no | Company/organization |
| `title` | string | no | Job title |
| `bio` | string | no | Biography / about |
| `avatarUrl` | string | no | Profile photo |
| `websiteUrl` | string | no | Personal/company website |
| `linkedinUrl` | string | no | LinkedIn profile |
| `brandId` | string | no | Associated brand (for brand reps) |
| `sessionIds` | string[] | no | Sessions they participate in |
| `happeningIds` | string[] | no | Happenings they participate in |
| `isHighlighted` | boolean | no | Featured participant (default: false) |
| `createdAt` | timestamp | yes | Creation timestamp |

**Relationship to existing sessions:** When a participant is linked to a session, the dashboard also writes `speakerName`, `speakerBio`, `speakerAvatarUrl` on the session document for backwards compatibility with the Flutter app. The `participants` collection is the source of truth; session fields are denormalized copies.

### 3.4 New Collection: `superAdmins`

**Path:** `superAdmins/{uid}`

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | Admin email |
| `displayName` | string | Admin display name |
| `createdAt` | timestamp | When admin was added |

This is a root-level collection (not nested under clients). Only documents in this collection can access the dashboard.

### 3.5 Updated Hierarchy

```
superAdmins/{uid}                          ← NEW (root level)

clients/{clientId}
├── name, logoUrl, description, createdAt
│
└── events/{eventId}
    ├── clientId, name, description, venue, logos, banners, dates, urls, isActive
    │
    ├── whitelist/{docId}
    │   └── email, accessTier, company, lockedFields, addedAt
    │
    ├── users/{uid}/                        (read-only in dashboard)
    │   ├── profile fields...
    │   ├── attending/{sessionId}
    │   ├── favorites/{favoriteId}
    │   └── chats/{chatSessionId}/messages/{messageId}
    │
    ├── brands/{brandId}
    │   └── name, logoUrl, description, imageUrl, videoUrl, websiteUrl,
    │       stallNumber, isHighlighted
    │
    ├── stands/{standId}                   ← NEW
    │   └── name, description, hallOrZone, size, brandId, imageUrl, createdAt
    │
    ├── posts/{postId}
    │   └── imageUrl, description, createdAt, authorName, authorAvatarUrl
    │
    ├── sessions/{sessionId}
    │   └── title, description, speaker*, startTime, endTime, location,
    │       type, requiresAccess, accessTier, imageUrl
    │
    ├── happenings/{happeningId}           ← NEW
    │   └── title, description, startTime, endTime, location, type,
    │       hostName, hostAvatarUrl, imageUrl, brandId, isHighlighted,
    │       requiresAccess, accessTier, createdAt
    │
    └── participants/{participantId}       ← NEW
        └── firstName, lastName, email, role, company, title, bio,
            avatarUrl, websiteUrl, linkedinUrl, brandId, sessionIds,
            happeningIds, isHighlighted, createdAt
```

---

## 4. Authentication & Authorization

### Super-Admin Flow

1. Admin navigates to dashboard URL
2. Firebase Auth sign-in screen (email/password)
3. After auth, dashboard checks `superAdmins/{uid}` document exists
4. If not found → "Access Denied" screen
5. If found → full dashboard access

### Implementation

```
// Pseudo-flow in Next.js middleware / layout
const user = auth.currentUser
if (!user) → redirect to /login
const adminDoc = await getDoc(doc(db, 'superAdmins', user.uid))
if (!adminDoc.exists()) → redirect to /unauthorized
// proceed to dashboard
```

### Seeding the First Admin

The first super-admin is created manually via Firebase Console:
1. Create a Firebase Auth user (email/password)
2. Add a document to `superAdmins/{uid}` with their email

### v1.1: Client-Level Admin (Future)

See [Section 11](#11-future-v11-client-level-admin).

---

## 5. Dashboard Pages & UI

### Navigation Structure

Wide-screen sidebar layout. No mobile optimization needed.

```
┌─────────────────────────────────────────────────────────┐
│  DIGITO ADMIN                              [user] [out] │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  Dashboard   │  Main Content Area                       │
│              │                                          │
│  Clients     │  (changes based on sidebar selection)    │
│   └ [list]   │                                          │
│              │                                          │
│  ── context ─│─ (after selecting a client + event) ──── │
│              │                                          │
│  Event       │                                          │
│   Overview   │                                          │
│   Brands     │                                          │
│   Stands     │                                          │
│   Sessions   │                                          │
│   Happenings │                                          │
│   Participants│                                         │
│   Posts      │                                          │
│   Whitelist  │                                          │
│   Users (RO) │                                          │
│              │                                          │
│  Settings    │                                          │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

### Context Selector

At the top of the sidebar (below logo), a two-step breadcrumb/dropdown:

```
[Client: Salone del Mobile ▾] → [Event: SDM 2026 ▾]
```

Once both are selected, the event-scoped sidebar items appear. Switching client resets event selection.

### shadcn Components Used

| Component | Usage |
|-----------|-------|
| `Sidebar` | Main navigation |
| `Breadcrumb` | Client > Event context |
| `DataTable` | All list views (brands, sessions, whitelist, etc.) |
| `Dialog` / `Sheet` | Create/edit forms |
| `Form` + `Input` + `Textarea` | All form fields |
| `Select` + `Combobox` | Dropdowns (type selectors, brand assignment) |
| `DatePicker` + `TimePicker` | Event dates, session times |
| `Card` | Dashboard overview stats |
| `Badge` | Access tiers, session types, status indicators |
| `Avatar` | Participant/speaker photos |
| `Tabs` | Sub-sections within pages |
| `AlertDialog` | Delete confirmations |
| `Toast` / `Sonner` | Success/error notifications |
| `DropdownMenu` | Row actions (edit, delete, duplicate) |
| `Switch` | Boolean toggles (isActive, isHighlighted, requiresAccess) |
| `Skeleton` | Loading states |
| `Command` | Quick search / command palette (Cmd+K) |

---

## 6. Page-by-Page Specification

### 6.1 Login Page (`/login`)

- Email + password form
- Firebase Auth `signInWithEmailAndPassword`
- On success → check `superAdmins` → redirect to `/`
- Minimal branded page (Digito logo, dark background)

### 6.2 Dashboard Home (`/`)

Overview stats after selecting a client + event:

| Stat Card | Source |
|-----------|--------|
| Total Brands | `brands` collection count |
| Total Sessions | `sessions` collection count |
| Total Happenings | `happenings` collection count |
| Whitelisted Users | `whitelist` collection count |
| Registered Users | `users` collection count |
| Total Participants | `participants` collection count |

Plus:
- **Event status badge** (upcoming / live / ended)
- **Quick actions**: "Add Brand", "Add Session", "Add Whitelist Entry"
- **Recent activity** (last 5 documents modified, any collection — via `createdAt` ordering)

### 6.3 Clients Page (`/clients`)

**List View:**
- DataTable: name, logo (avatar), description (truncated), # of events, created date
- Row actions: Edit, Delete (with confirmation)
- "New Client" button → opens Sheet

**Create/Edit Sheet:**
| Field | Type | Required |
|-------|------|----------|
| Name | Input | yes |
| Description | Textarea | no |
| Logo | Image upload (drag-drop) | no |

### 6.4 Events Page (`/clients/[clientId]/events`)

**List View:**
- DataTable: name, venue, dates, status badge (upcoming/live/ended), isActive toggle
- Row actions: Edit, Delete, "Open in Dashboard" (sets event context)

**Create/Edit Sheet:**
| Field | Type | Required |
|-------|------|----------|
| Name | Input | yes |
| Description | Textarea | no |
| Venue | Input | no |
| Start Date | DateTimePicker | yes |
| End Date | DateTimePicker | yes |
| Website URL | Input | no |
| Instagram URL | Input | no |
| Logo | Image upload | no |
| Banner | Image upload | no |
| Is Active | Switch | no (default: true) |

### 6.5 Brands Page (`/events/[eventId]/brands`)

Scoped to the selected client + event context.

**List View:**
- DataTable: logo (thumbnail), name, stall number, highlighted badge, has media indicator
- Filters: highlighted only, has video, search by name
- Row actions: Edit, Delete, Duplicate

**Create/Edit Sheet (wide — use Dialog for this one):**
| Field | Type | Required |
|-------|------|----------|
| Name | Input | yes |
| Description | Textarea (rich text optional) | no |
| Website URL | Input | no |
| Stall Number | Input | no |
| Is Highlighted | Switch | no |
| Logo | Image upload | no |
| Hero Image | Image upload | no |
| Promo Video | Video upload / URL input | no |

**Asset preview:** Show thumbnail previews of uploaded logo, image, and video inline in the form.

### 6.6 Stands Page (`/events/[eventId]/stands`)

**List View:**
- DataTable: name, hall/zone, size badge, assigned brand (linked), image thumbnail
- Filters: by hall/zone, unassigned only
- Row actions: Edit, Delete, Assign Brand

**Create/Edit Sheet:**
| Field | Type | Required |
|-------|------|----------|
| Name | Input | yes |
| Description | Textarea | no |
| Hall / Zone | Input (or Select from existing values) | no |
| Size | Select (small/medium/large/custom) | no |
| Assign Brand | Combobox (search brands) | no |
| Image | Image upload | no |

**Side effect:** When a brand is assigned to a stand, the dashboard also updates `brands/{brandId}.stallNumber` with the stand name for Flutter app compatibility.

### 6.7 Sessions Page (`/events/[eventId]/sessions`)

**List View:**
- DataTable: title, speaker, date, time range, type badge, location, access badge
- Sort: by start time (default), by title
- Filters: by type, by date, requires access
- Row actions: Edit, Delete, Duplicate

**Create/Edit Dialog (wider form):**
| Field | Type | Required |
|-------|------|----------|
| Title | Input | yes |
| Description | Textarea | no |
| Start Time | DateTimePicker | yes |
| End Time | DateTimePicker | yes |
| Location | Input | no |
| Type | Select (talk/workshop/panel/networking/other) | yes |
| Speaker | Combobox (search participants) or manual entry | no |
| Speaker Name | Input (auto-filled from participant) | no |
| Speaker Bio | Textarea (auto-filled from participant) | no |
| Speaker Avatar | Image upload (auto-filled from participant) | no |
| Requires Access | Switch | no |
| Access Tier | Select (regular/premium/vip/staff) — shown when requiresAccess is on | no |
| Cover Image | Image upload | no |

**Participant linking:** When a participant is selected from the combobox, their name/bio/avatar auto-fill the speaker fields. Manual override is still possible. The `participantId` link is stored but the session document keeps its own denormalized speaker fields for the Flutter app.

### 6.8 Happenings Page (`/events/[eventId]/happenings`)

**List View:**
- DataTable: title, type badge, date, time range, host, location, brand link, highlighted badge
- Filters: by type, by date, highlighted
- Row actions: Edit, Delete, Duplicate

**Create/Edit Dialog:**
| Field | Type | Required |
|-------|------|----------|
| Title | Input | yes |
| Description | Textarea | no |
| Start Time | DateTimePicker | yes |
| End Time | DateTimePicker | yes |
| Location | Input | no |
| Type | Select (demo/performance/launch/networking/reception/other) | yes |
| Host Name | Input | no |
| Host Avatar | Image upload | no |
| Associated Brand | Combobox (search brands) | no |
| Is Highlighted | Switch | no |
| Requires Access | Switch | no |
| Access Tier | Select — shown when requiresAccess is on | no |
| Cover Image | Image upload | no |

### 6.9 Participants Page (`/events/[eventId]/participants`)

**List View:**
- DataTable: avatar, full name, role badge, company, # sessions, # happenings, highlighted badge
- Filters: by role, by brand association
- Row actions: Edit, Delete

**Create/Edit Dialog:**
| Field | Type | Required |
|-------|------|----------|
| First Name | Input | yes |
| Last Name | Input | yes |
| Email | Input | no |
| Role | Select (speaker/panelist/host/brand_rep/moderator/performer/other) | yes |
| Company | Input | no |
| Job Title | Input | no |
| Bio | Textarea | no |
| Avatar | Image upload | no |
| Website URL | Input | no |
| LinkedIn URL | Input | no |
| Associated Brand | Combobox (search brands) | no |
| Sessions | Multi-select combobox (search sessions) | no |
| Happenings | Multi-select combobox (search happenings) | no |
| Is Highlighted | Switch | no |

**Side effects:** When sessions are linked, the dashboard updates `sessions/{sessionId}.speakerName`, `.speakerBio`, `.speakerAvatarUrl` to keep the Flutter app compatible.

### 6.10 Posts Page (`/events/[eventId]/posts`)

**List View:**
- Grid view (image gallery style) + optional DataTable toggle
- Shows: image thumbnail, description (truncated), author, date
- Row actions: Edit, Delete

**Create/Edit Sheet:**
| Field | Type | Required |
|-------|------|----------|
| Image | Image upload (drag-drop, preview) | yes |
| Description / Caption | Textarea | no |
| Author Name | Input | no |
| Author Avatar | Image upload | no |

### 6.11 Whitelist Page (`/events/[eventId]/whitelist`)

**List View:**
- DataTable: email, access tier badge, company, locked fields, added date
- Filters: by access tier
- Search: by email
- Row actions: Edit, Delete

**Add Entry Sheet:**
| Field | Type | Required |
|-------|------|----------|
| Email | Input (validated, auto-lowercase) | yes |
| Access Tier | Select (regular/premium/vip/staff) | no (default: regular) |
| Company | Input | no |
| Locked Fields | Multi-select (email, company) | no |

**Duplicate detection:** Before adding, check if email already exists in whitelist. Show warning if so.

### 6.12 Users Page (`/events/[eventId]/users`) — Read-Only

**List View:**
- DataTable: name, email, company, qualification, access tier (from whitelist join), profile version
- Search: by name, email
- **No create/edit/delete** — user profiles are owned by users
- Expand row to see: favorites count, attending sessions count, chat sessions count

### 6.13 Settings Page (`/settings`)

- Current admin info (email, display name)
- Manage super admins (list, add by email — creates Firebase Auth user + superAdmins doc)
- Danger zone: nothing yet, placeholder for v1.1

---

## 7. Firebase Storage Strategy

### Upload Paths

All uploads from the dashboard follow this convention:

```
admin-uploads/{clientId}/{eventId}/{collection}/{docId}/{filename}
```

Examples:
```
admin-uploads/abc123/event456/brands/brand789/logo.jpg
admin-uploads/abc123/event456/brands/brand789/hero.jpg
admin-uploads/abc123/event456/brands/brand789/promo.mp4
admin-uploads/abc123/event456/sessions/sess123/cover.jpg
admin-uploads/abc123/event456/sessions/sess123/speaker-avatar.jpg
admin-uploads/abc123/event456/happenings/hap456/cover.jpg
admin-uploads/abc123/event456/participants/part789/avatar.jpg
admin-uploads/abc123/event456/posts/post123/image.jpg
admin-uploads/abc123/event456/stands/stand456/image.jpg
admin-uploads/abc123/client-logo.jpg               (client-level assets)
admin-uploads/abc123/event456/event-logo.jpg        (event-level assets)
admin-uploads/abc123/event456/event-banner.jpg
```

### Upload Flow

1. User drops/selects file in the form
2. Client-side preview shown immediately (local blob URL)
3. On form submit, upload to Firebase Storage at the structured path
4. Get download URL
5. Write download URL to the Firestore document
6. If replacing an existing file, delete the old file from Storage

### File Constraints

| Type | Max Size | Formats |
|------|----------|---------|
| Images | 10 MB | JPG, PNG, WebP, GIF |
| Videos | 100 MB | MP4, WebM |
| Logos | 5 MB | JPG, PNG, WebP, SVG |

Client-side validation before upload. Show progress bar during upload.

---

## 8. Firestore Security Rules Updates

The existing rules allow any authenticated user to read event data. The dashboard needs **write** access for admins. Updated rules:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: check if user is a super admin
    function isSuperAdmin() {
      return request.auth != null
        && exists(/databases/$(database)/documents/superAdmins/$(request.auth.uid));
    }

    // Super admin collection — only readable by self
    match /superAdmins/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if isSuperAdmin();
    }

    // Users can read/write their own root profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Clients — read for all authed, write for admins
    match /clients/{clientId} {
      allow read: if request.auth != null;
      allow write: if isSuperAdmin();

      match /events/{eventId} {
        allow read: if request.auth != null;
        allow write: if isSuperAdmin();

        // Whitelist — read for all authed (needed for auth flow), write for admins
        match /whitelist/{whitelistId} {
          allow read: if request.auth != null;
          allow write: if isSuperAdmin();
        }

        // Event content (brands, posts, sessions, stands, happenings, participants)
        // Read for all authed, write for admins
        match /{subcollection}/{docId} {
          allow read: if request.auth != null;
          allow write: if isSuperAdmin();
        }

        // User data — owned by the user, read-only for admins
        match /users/{userId}/{document=**} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
          allow read: if isSuperAdmin();
        }
      }
    }
  }
}
```

### Storage Rules Update

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Admin uploads — only super admins can write
    match /admin-uploads/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      // Note: Storage rules can't do Firestore lookups.
      // Admin write restriction enforced at application level.
      // For production, use Firebase Admin SDK via Cloud Functions instead.
    }

    // Chat images — existing rule
    match /chat-images/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 9. Project Structure

The dashboard lives in its own repo (`digito-admin`), separate from the Flutter app.

```
digito-admin/
├── .env.local                       # Firebase config (not committed)
├── .firebaserc                      # Firebase project alias
├── firebase.json                    # Hosting config
├── next.config.ts
├── tailwind.config.ts
├── package.json
├── tsconfig.json
│
├── public/
│   └── logo.svg
│
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout (sidebar, auth guard)
│   │   ├── page.tsx                 # Dashboard home
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── unauthorized/
│   │   │   └── page.tsx
│   │   ├── clients/
│   │   │   ├── page.tsx             # Client list
│   │   │   └── [clientId]/
│   │   │       └── events/
│   │   │           └── page.tsx     # Event list for client
│   │   ├── events/
│   │   │   └── [eventId]/
│   │   │       ├── page.tsx         # Event overview (stats)
│   │   │       ├── brands/
│   │   │       │   └── page.tsx
│   │   │       ├── stands/
│   │   │       │   └── page.tsx
│   │   │       ├── sessions/
│   │   │       │   └── page.tsx
│   │   │       ├── happenings/
│   │   │       │   └── page.tsx
│   │   │       ├── participants/
│   │   │       │   └── page.tsx
│   │   │       ├── posts/
│   │   │       │   └── page.tsx
│   │   │       ├── whitelist/
│   │   │       │   └── page.tsx
│   │   │       └── users/
│   │   │           └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/                      # shadcn components (auto-generated)
│   │   ├── layout/
│   │   │   ├── app-sidebar.tsx      # Main sidebar navigation
│   │   │   ├── context-selector.tsx # Client + Event breadcrumb selector
│   │   │   └── header.tsx           # Top bar with user menu
│   │   ├── forms/
│   │   │   ├── client-form.tsx
│   │   │   ├── event-form.tsx
│   │   │   ├── brand-form.tsx
│   │   │   ├── stand-form.tsx
│   │   │   ├── session-form.tsx
│   │   │   ├── happening-form.tsx
│   │   │   ├── participant-form.tsx
│   │   │   ├── post-form.tsx
│   │   │   └── whitelist-form.tsx
│   │   ├── tables/
│   │   │   ├── clients-table.tsx
│   │   │   ├── events-table.tsx
│   │   │   ├── brands-table.tsx
│   │   │   ├── stands-table.tsx
│   │   │   ├── sessions-table.tsx
│   │   │   ├── happenings-table.tsx
│   │   │   ├── participants-table.tsx
│   │   │   ├── posts-grid.tsx
│   │   │   ├── whitelist-table.tsx
│   │   │   └── users-table.tsx
│   │   ├── image-upload.tsx         # Reusable drag-drop image uploader
│   │   ├── video-upload.tsx         # Video upload with preview
│   │   └── stats-card.tsx           # Dashboard stat card
│   │
│   ├── lib/
│   │   ├── firebase.ts              # Firebase app init + exports (db, auth, storage)
│   │   ├── auth.ts                  # Auth helpers (signIn, signOut, checkAdmin)
│   │   ├── schemas.ts               # Zod schemas for all entities
│   │   └── utils.ts                 # Shared utilities
│   │
│   ├── hooks/
│   │   ├── use-auth.ts              # Auth state hook
│   │   ├── use-admin-check.ts       # Super-admin verification
│   │   ├── use-collection.ts        # Generic Firestore collection hook (list, realtime)
│   │   ├── use-document.ts          # Generic Firestore document hook
│   │   ├── use-upload.ts            # File upload hook (progress, URL)
│   │   └── use-event-context.ts     # Current client+event context
│   │
│   ├── types/
│   │   ├── client.ts
│   │   ├── event.ts
│   │   ├── brand.ts
│   │   ├── stand.ts
│   │   ├── session.ts
│   │   ├── happening.ts
│   │   ├── participant.ts
│   │   ├── post.ts
│   │   ├── whitelist-entry.ts
│   │   ├── user-profile.ts
│   │   └── index.ts
│   │
│   └── contexts/
│       └── event-context.tsx        # React context for selected client+event
│
└── docs/
    └── (this file, mirrored)
```

---

## 10. Implementation Phases

### Phase 1 — Scaffold & Auth ✅

- [x] Initialize Next.js 16 project with App Router (Turbopack)
- [x] Install and configure Tailwind CSS 4 + shadcn/ui (18 components, manually created — registry blocked)
- [x] Set up Firebase JS SDK v12 (placeholder `.env.local`, not yet connected)
- [x] Build login page (email/password form → Firebase Auth)
- [x] Implement super-admin auth check (`superAdmins` collection lookup)
- [x] Build root layout with sidebar shell (`(dashboard)` route group + auth guard)
- [x] Build context selector (client + event dropdowns)
- [x] Create all TypeScript types (11 entity files with FormData variants)
- [x] Create Zod 4 validation schemas for all entities
- [x] Create custom hooks (useAuth, useAdminCheck, useCollection, useDocument, useUpload, useEventContext)
- [x] Create EventContext provider (client + event selection state)
- [x] Create page stubs for all 14 routes with loading/empty states
- [x] Create reusable components (ImageUpload with drag-drop, StatsCard)
- [ ] Deploy to Firebase Hosting (confirm it works end-to-end)

> **Note:** Firebase project access not yet configured. `.env.local` has placeholder values.
> System font stack used instead of Google Fonts (Geist) due to environment restrictions.

### Phase 2 — Client & Event CRUD

- [ ] Clients list page with DataTable
- [ ] Client create/edit form in Sheet
- [ ] Client delete with confirmation
- [ ] Events list page (scoped to selected client)
- [ ] Event create/edit form with DateTimePickers
- [ ] Event delete with confirmation
- [ ] Image upload component (reusable) — _shell created, needs Storage wiring_
- [ ] Wire up Firebase Storage uploads for logos/banners

### Phase 3 — Core Event Content

- [ ] Brands page: DataTable + create/edit Dialog + image/video upload
- [ ] Sessions page: DataTable + create/edit Dialog + DateTimePickers
- [ ] Posts page: Grid view + create/edit with image upload
- [ ] Whitelist page: DataTable + add entry form + duplicate detection
- [ ] Users page: Read-only DataTable with search

### Phase 4 — New Entities

- [ ] Stands page: DataTable + create/edit + brand assignment
- [ ] Happenings page: DataTable + create/edit Dialog
- [ ] Participants page: DataTable + create/edit + session/happening linking
- [ ] Wire up denormalization (participant → session speaker fields)
- [ ] Wire up stand → brand.stallNumber sync

### Phase 5 — Dashboard Home & Polish

- [ ] Dashboard overview page (stat cards, quick actions) — _stat cards created, needs live data_
- [ ] Command palette (Cmd+K) for quick navigation and search
- [ ] Toast notifications for all CRUD operations
- [ ] Loading skeletons on all pages — _skeletons in place on all page stubs_
- [ ] Error boundaries and empty states — _empty states in place on all page stubs_
- [ ] Delete confirmation dialogs everywhere
- [ ] Update Firestore security rules (deploy via `firebase deploy --only firestore:rules`)
- [ ] Update Storage security rules

### Phase 6 — Settings & Deployment

- [ ] Settings page (admin info, manage super admins) — _stub created_
- [ ] Final Firebase Hosting deployment config
- [ ] Test end-to-end: create client → event → brands/sessions → verify in Flutter app
- [ ] Verify AI agent can read all new data via its Firestore tools

---

## 11. Future: v1.1 Client-Level Admin

Not in scope for v1.0 but planned:

### New Collection: `clientAdmins`

**Path:** `clients/{clientId}/admins/{uid}`

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | Admin email |
| `displayName` | string | Admin name |
| `permissions` | string[] | e.g., `['brands', 'sessions', 'whitelist']` |
| `createdAt` | timestamp | Added date |

### Changes Required

- Auth check becomes: `isSuperAdmin() OR isClientAdmin(clientId)`
- Sidebar shows only the client(s) the admin has access to
- Permission-based UI: hide sidebar items the admin can't manage
- Super admin can create client admins from the Clients page
- Client admins can only see/edit data within their assigned client's events

### Updated Security Rules (v1.1)

```javascript
function isClientAdmin(clientId) {
  return request.auth != null
    && exists(/databases/$(database)/documents/clients/$(clientId)/admins/$(request.auth.uid));
}

// Events — write for super admin OR client admin
match /events/{eventId} {
  allow write: if isSuperAdmin() || isClientAdmin(clientId);
}
```

---

## Reference: Existing Flutter Models → Dashboard TypeScript Types

The dashboard TypeScript types must produce Firestore documents that the Flutter app's `fromJson` factories can parse. Key mappings:

| Flutter Field | Firestore Type | TS Type | Notes |
|---------------|---------------|---------|-------|
| `DateTime` | `Timestamp` | `Timestamp` from firebase/firestore | Use `Timestamp.fromDate()` |
| `bool` | `boolean` | `boolean` | Always write explicit `true`/`false` |
| `String?` | `string \| null` | `string \| null` | Write `null` not `undefined` for explicit clearing |
| `SessionType` | `string` | `'talk' \| 'workshop' \| ...` | Must match enum `.name` values exactly |
| `UserAccessRole` | `string` | `'regular' \| 'premium' \| 'vip' \| 'staff'` | Lowercase, matches enum `.name` |

### Critical Compatibility Rules

1. **Never change existing field names** — the Flutter app's `fromJson` will break
2. **Use `Timestamp` not ISO strings** for date fields — Flutter parses `Timestamp` first
3. **Use `merge: true`** (`setDoc` with `{ merge: true }`) — never overwrite entire documents
4. **Boolean defaults** — always explicitly set `isHighlighted: false`, `requiresAccess: false`, `isActive: true`
5. **New collections are safe** — the Flutter app ignores collections it doesn't query
