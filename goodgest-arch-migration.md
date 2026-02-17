# Architecture Migration Plan: Firebase → MongoDB Atlas + AWS Amplify Gen 2 + Cognito

## Context

The Goodgest admin dashboard ("Master") is a Next.js 16.1.6 + shadcn/ui app currently using Firebase for everything: Auth, Firestore, Storage. The Goodgest ecosystem already uses MongoDB Atlas as the database for all event web apps, each with its own MongoDB database identified by an "event code" (e.g., `2025089`, `2026003`). This admin app must be migrated to align with the existing architecture: MongoDB Atlas for data, Cognito for auth, Cloudflare R2 for file storage, deployment on AWS Amplify Gen 2.

**Reference prototype**: existing Amplify Gen 2 implementation at `goodgest-management-webapp/aws-amplify/digito-26-amplify/` (Nuxt + Cognito + Mongoose). Connection patterns, Lambda triggers, and user sync flows can be adapted from there.

---

## Phase 0: Foundation — MongoDB + Dependencies (no breaking changes)

**Goal**: Add MongoDB infrastructure and new dependencies without touching existing Firebase code. The app continues to work on Firebase throughout this phase.

### 0.1 New dependencies

```bash
pnpm add mongodb @tanstack/react-query aws-amplify aws-jwt-verify @aws-sdk/client-cognito-identity-provider
pnpm add -D @aws-amplify/backend @aws-amplify/backend-cli aws-cdk-lib constructs @types/aws-lambda
```

> **Decision: native `mongodb` driver instead of Mongoose.** The event databases have a different schema from Firestore and the admin app must dynamically access N databases. The native driver with `MongoClient.db(name)` naturally handles multi-database on a single connection pool, while Mongoose requires one model registration per connection.

### 0.2 MongoDB connection layer

**New file: `src/lib/mongodb.ts`**
- Singleton `MongoClient` with connection pooling (module-level cache for serverless reuse)
- `getAdminDb()` → master database (`goodgest-admin`)
- `getEventDb(eventCode: string)` → dynamic event database (e.g., `db("2025089")`)
- Pool: `maxPoolSize: 10`, `minPoolSize: 1`, `maxIdleTimeMS: 60000`
- Connection string from env var `MONGODB_URI`

**New file: `src/lib/mongodb-collections.ts`**
- Typed collection accessors for the master DB: `getAdminUsersCollection()`, `getClientsCollection()`, `getClientEventsCollection()`
- Generic helper for event collections: `getEventCollection(eventCode, collectionName)`

### 0.3 Master Database Schema (`goodgest-admin`)

```
Collection: adminUsers
{
  _id: ObjectId,
  cognitoSub: string,          // primary link to Cognito (immutable)
  email: string,               // lowercase, unique index
  role: "superadmin" | "clientAdmin" | "eventAdmin",
  clientIds: string[] | null,  // null = all, [] = none
  eventCodes: string[] | null, // null = all (for superadmin/clientAdmin)
  firstName: string,
  lastName: string,
  isActive: boolean,
  language: "en" | "it",
  createdAt: Date,
  updatedAt: Date,
  createdBy: string,           // cognitoSub of creator
  updatedBy: string,
}

Collection: clients
{
  _id: ObjectId,
  name: string,
  description: string | null,
  logoUrl: string | null,
  createdAt: Date,
  updatedAt: Date,
}

Collection: clientEvents (mapping client → events)
{
  _id: ObjectId,
  clientId: ObjectId,          // ref to clients
  eventCode: string,           // MongoDB database name (e.g., "2025089")
  eventName: string,           // cached display name
  isActive: boolean,
  createdAt: Date,
}
```

> **Note**: `eventIds` in the current model becomes `eventCodes` — the event code is the MongoDB database name and the primary identifier for event access.

### 0.4 TypeScript type updates

**Modify `src/types/permissions.ts`**:
- Rename `eventIds` → `eventCodes`
- Add `cognitoSub: string`
- Remove Firebase UID references in comments

**Modify `src/types/client.ts` and `src/types/event.ts`**:
- Replace `import { Timestamp } from "firebase/firestore"` with `Date | string`
- Add `eventCode: string` field to Event type

**New file: `src/types/admin-user.ts`** — MongoDB admin user type

### 0.5 React Query provider setup

**Modify `src/app/providers.tsx`**: add `QueryClientProvider` to the provider tree (outer wrapper, before AuthProvider).

**Files involved**:
- `src/lib/mongodb.ts` (new)
- `src/lib/mongodb-collections.ts` (new)
- `src/types/permissions.ts` (modify)
- `src/types/client.ts` (modify)
- `src/types/event.ts` (modify)
- `src/types/admin-user.ts` (new)
- `src/app/providers.tsx` (modify)
- `package.json` (modify)

---

## Phase 1: Authentication — Firebase Auth → Cognito

**Goal**: Replace Firebase Auth with Cognito while keeping the rest of the app on Firestore temporarily. This is the most critical phase as auth touches everything.

### 1.1 Amplify Gen 2 backend setup

Adapt from the existing prototype (`aws-amplify/digito-26-amplify/amplify/`):

**New directory: `amplify/`**
- `amplify/backend.ts` — backend definition with auth + Lambda triggers
- `amplify/auth/resource.ts` — Cognito User Pool with:
  - Email/password
  - Google OAuth
  - OTP passwordless (custom auth challenge via SES)
  - Callback URLs for the admin dashboard domain
- `amplify/auth/pre-signup/handler.ts` — Lambda: verify user exists in MongoDB `adminUsers` and is `isActive: true`
- `amplify/auth/post-confirmation/handler.ts` — Lambda: sync Cognito → MongoDB (create/update `cognitoSub`)
- Lambda define/create/verify auth challenge — adapted from prototype for OTP flow

**Differences from the prototype to apply**:
- Extend role model from `superadmin | admin` to `superadmin | clientAdmin | eventAdmin`
- Add `clientIds` and `eventCodes` to the user model
- Fix debug artifact in pre-signup handler (stray `console.log(process.env)` line)
- Use `pnpm` in `amplify.yml` instead of `npm`

### 1.2 Server-side auth infrastructure

**New file: `src/lib/cognito.ts`** (replaces `src/lib/firebase-admin.ts` for auth):
- `verifyCognitoToken(token)` — JWT verification with `aws-jwt-verify` (as in prototype `server/middleware/auth.ts`)
- Module-level cached verifier
- Returns `{ sub, email }`

**New file: `src/lib/api-auth.ts`** (replaces `src/app/api/event-users/auth-helper.ts`):
- `requireAuth(request)` → verify Bearer token + lookup `adminUsers` in MongoDB → `{ userId, email, role, permissions }`
- `requireRole(request, roles[])` → requireAuth + role check
- `requireEventAccess(request, eventCode)` → requireAuth + event access check
- Reuses functions from `permission-utils.ts` (which is framework-agnostic and needs zero changes)

### 1.3 Client-side auth

**Rewrite `src/lib/auth.ts`**:
- `signIn(email, password)` → `signIn()` from `aws-amplify/auth`
- `signInWithGoogle()` → `signInWithRedirect({ provider: 'Google' })`
- `signOut()` → `signOut()` from `aws-amplify/auth`
- `onAuthChange(callback)` → Amplify `Hub.listen('auth', ...)`
- `getCurrentUser()` → `getCurrentUser()` + `fetchAuthSession()` from Amplify
- Remove: `checkSuperAdmin`, `checkUserRole`, `getUserPermissions` (moved server-side)
- **No `name` field from auth** — Cognito is used strictly for authentication. Profile data (firstName, lastName) is entered by a superadmin when creating the user in MongoDB. The auth layer does not provide or manage user profile information.

**Rewrite `src/contexts/auth-context.tsx`**:
- Replace Firebase `onAuthStateChanged` with Amplify Hub listener
- User type from Firebase `User` to `{ sub: string, email: string }`
- Expose `getAccessToken()` for API calls

**Rewrite `src/contexts/permissions-context.tsx`**:
- Call `/api/auth/check-permissions` with Cognito access token
- Permission model (role, clientIds, eventCodes, isSuperAdmin, etc.) stays identical

**Update `src/hooks/use-auth.ts`**: wrapper on new auth context

**Update `src/app/login/page.tsx`**:
- Replace Firebase `signInWithGoogle()` with Amplify
- Enable email/password (already in code but disabled)
- SSO buttons become easily activatable with Cognito external providers

**Update `src/app/providers.tsx`**:
- Add `Amplify.configure()` (similar to prototype's `plugins/amplify.client.ts`)
- Remove Firebase init

### 1.4 New Next.js 16 proxy for route protection (MAJOR SECURITY IMPROVEMENT)

**New file: `src/proxy.ts`** — DOES NOT EXIST currently!

In Next.js 16, `middleware.ts` has been renamed to `proxy.ts`. The proxy runs on the **Node.js runtime** (not Edge) and executes before routes are rendered. It can redirect, rewrite, modify headers, or respond directly.

```typescript
// src/proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // 1. Check for Cognito session token (cookie set by Amplify)
  // 2. For (dashboard) routes: redirect to /login if not authenticated
  // 3. For /api/* routes: return 401 if no valid token (except public endpoints)
  // 4. Pass user info via request headers for downstream routes
}

export const config = {
  matcher: ['/(dashboard)(.*)', '/api/(.*)'],
}
```

> **Important**: `proxy.ts` should be used for optimistic checks (presence of session cookie → redirect). Full JWT verification and authorization should happen in API routes via `api-auth.ts`. The proxy is NOT a full auth solution, just the first line of defense.

### 1.5 API routes auth migration

All 8 current API routes verify Firebase tokens. They must switch to Cognito token verification + MongoDB permission lookup:

| Current route | Change |
|---|---|
| `src/app/api/check-permissions/route.ts` | Verify Cognito token + lookup MongoDB `adminUsers` (no more "auto-heal claims") |
| `src/app/api/set-user-role/route.ts` | Cognito token + create MongoDB user + `AdminCreateUser` Cognito if user doesn't exist |
| `src/app/api/remove-user-role/route.ts` | Cognito token + delete from MongoDB + optional Cognito disable |
| `src/app/api/feedback/route.ts` | Token verification only (data source changes in Phase 2) |
| `src/app/api/event-users/*` | Token verification + permissions from MongoDB |

### 1.6 User sync flow (Cognito ↔ MongoDB)

Three sync paths (as in the prototype, extended):
1. **Superadmin creates user** → POST `/api/admin/users` with `{ email, role, firstName, lastName, clientIds, eventCodes }` → server calls `AdminCreateUser` Cognito with `SUPPRESS` message action → creates `adminUsers` doc in MongoDB. Profile data (name, etc.) is entered by the superadmin at creation time, NOT inherited from the auth provider.
2. **Post-confirmation Lambda** → webhook → creates/updates `cognitoSub` in MongoDB
3. **Client-side sync** → POST `/api/auth/sync-user` → fallback JIT provisioning

**N:1 identity matching**: User logs in with Google, then email/password, then SSO Microsoft → all mapped to the same MongoDB doc via email (lowercase). The `cognitoSub` is updated but email is the matching key.

**Files involved**:
- `amplify/` (new directory — ~10 files)
- `src/lib/cognito.ts` (new)
- `src/lib/api-auth.ts` (new)
- `src/lib/auth.ts` (rewrite)
- `src/contexts/auth-context.tsx` (rewrite)
- `src/contexts/permissions-context.tsx` (rewrite)
- `src/hooks/use-auth.ts` (modify)
- `src/hooks/use-permissions.ts` (modify)
- `src/proxy.ts` (new)
- `src/app/login/page.tsx` (modify)
- `src/app/providers.tsx` (modify)
- `src/app/api/check-permissions/route.ts` (rewrite)
- `src/app/api/set-user-role/route.ts` (rewrite)
- `src/app/api/remove-user-role/route.ts` (rewrite)
- `src/app/api/event-users/auth-helper.ts` (rewrite)
- `src/app/api/event-users/deactivate/route.ts` (modify auth)
- `src/app/api/event-users/reactivate/route.ts` (modify auth)
- `src/app/api/event-users/delete/route.ts` (modify auth)

---

## Phase 2: Data Layer — Firestore → MongoDB API Routes + React Query

**Goal**: Replace all Firestore reads/writes with server-side API routes backed by MongoDB. This is the largest phase by file count.

### 2.1 Core problem: real-time listeners

The app uses Firestore `onSnapshot` for ALL reads via `useCollection` and `useDocument` hooks. MongoDB has no equivalent client-side real-time subscription.

**Solution: React Query (TanStack Query)**
- Automatic caching and deduplication
- Configurable background refetching (`staleTime`, `refetchInterval`)
- Optimistic updates for mutations
- Interface `{ data, isLoading, error }` compatible with current hooks
- For sections needing pseudo-realtime: `refetchInterval: 30000` (30s polling)

> For an admin dashboard, polling every 30s is more than adequate. Firestore's real-time was a luxury, not a necessity.

### 2.2 New CRUD API routes

Full RESTful structure. Every route uses `requireAuth`/`requireRole` from `api-auth.ts`:

**Master DB routes** (read/write on `goodgest-admin`):
```
/api/admin/users              GET (list), POST (create)
/api/admin/users/[userId]     GET, PUT, DELETE

/api/clients                  GET (list), POST (create)
/api/clients/[clientId]       GET, PUT, DELETE
/api/clients/[clientId]/events  GET (list from clientEvents), POST
```

**Event DB routes** (read/write on the specific event database):
```
/api/events/[eventCode]/brands           GET, POST
/api/events/[eventCode]/brands/[id]      GET, PUT, DELETE

/api/events/[eventCode]/sessions         GET, POST
/api/events/[eventCode]/sessions/[id]    GET, PUT, DELETE

/api/events/[eventCode]/happenings       GET, POST
/api/events/[eventCode]/happenings/[id]  GET, PUT, DELETE

/api/events/[eventCode]/participants     GET, POST
/api/events/[eventCode]/participants/[id] GET, PUT, DELETE

/api/events/[eventCode]/posts            GET, POST
/api/events/[eventCode]/posts/[id]       GET, PUT, DELETE

/api/events/[eventCode]/whitelist        GET, POST
/api/events/[eventCode]/whitelist/[id]   GET, PUT, DELETE

/api/events/[eventCode]/stands           GET, POST
/api/events/[eventCode]/stands/[id]      GET, PUT, DELETE

/api/events/[eventCode]/users            GET
/api/events/[eventCode]/users/[id]       GET, PUT (activate/deactivate)
/api/events/[eventCode]/users/[id]/feedback  GET

/api/events/[eventCode]/stats            GET (aggregate counts)
```

> **Note**: Collection names in the event databases may differ from Firestore. A configurable mapping or analysis of existing DBs is needed before implementing route handlers.

### 2.3 Hook rewrites

**`src/hooks/use-collection.ts`** → **`src/hooks/use-api-collection.ts`**:
- Uses React Query `useQuery`
- Accepts `apiPath`, `queryKey`, sort/filter params
- Returns `{ data, loading, error }` (same interface as before)

**`src/hooks/use-document.ts`** → **`src/hooks/use-api-document.ts`**:
- `useQuery` for a single document via GET endpoint

**`src/hooks/use-collection-count.ts`** → integrated into `use-api-collection.ts` or via `/api/events/[eventCode]/stats`

**`src/hooks/use-crud-page.ts`** → rewrite:
- Uses `useApiCollection` for reads
- Uses React Query `useMutation` for create/update/delete
- Optimistic updates for immediate UI feedback
- `invalidateQueries` after mutations to refetch

**`src/hooks/use-admin-management.ts`** → modify:
- Reads from `/api/admin/users` via React Query
- Writes via `/api/admin/users` POST/DELETE (already uses API routes, just update auth header)

**`src/hooks/use-aggregate-stats.ts`** → modify:
- Server-side aggregation with MongoDB `countDocuments()`
- Improvement over current (which only counts clients client-side)

**`src/hooks/use-feedback.ts`** → minimal change (already uses API route, just update auth)

### 2.4 EventContext → add eventCode

**Modify `src/contexts/event-context.tsx`**:
- Add `selectedEventCode: string | null`
- Add `setSelectedEvent(id, name, eventCode)`
- Persist to `sessionStorage`
- `eventCode` is the key field for all API calls to event databases

### 2.5 Page updates

Pages use `useCrudPage` or `useCollection` + table/form components. Since hook interfaces stay the same (`data/loading/error`), page changes are minimal:

- Replace Firestore collection paths with API URLs
- Remove `QueryConstraint` imports from `firebase/firestore`
- `WhitelistPage`: custom batch write becomes a single API endpoint
- `ClientsPage`/`EventsPage`: cascade delete handled server-side

**Pages with the most work**:
- `src/app/(dashboard)/events/[eventId]/whitelist/page.tsx` — custom batch logic
- `src/app/(dashboard)/clients/[clientId]/events/page.tsx` — cascade delete
- `src/app/(dashboard)/clients/page.tsx` — cascade delete

### 2.6 Remove `src/lib/firestore.ts`

Once all hooks use API routes, `addDocument`, `updateDocument`, `deleteDocument`, `deleteEventCascade`, `deleteClientCascade`, `batchUpdateWhitelistAndUser` become dead code. MongoDB equivalents live inside the API route handlers.

### 2.7 Remove Firebase Timestamp dependencies

All types importing `Timestamp` from `firebase/firestore` switch to `Date | string`. The file `src/lib/timestamps.ts` (`toDate()`) is already framework-agnostic and handles Date, ISO strings, and numeric timestamps.

**Files involved**:
- ~25 new API route files in `src/app/api/`
- `src/hooks/use-collection.ts` (rewrite → `use-api-collection.ts`)
- `src/hooks/use-document.ts` (rewrite → `use-api-document.ts`)
- `src/hooks/use-collection-count.ts` (rewrite)
- `src/hooks/use-crud-page.ts` (rewrite)
- `src/hooks/use-admin-management.ts` (modify)
- `src/hooks/use-aggregate-stats.ts` (modify)
- `src/hooks/use-feedback.ts` (modify)
- `src/contexts/event-context.tsx` (modify)
- `src/lib/firestore.ts` (delete)
- `src/lib/timestamps.ts` (unchanged — already agnostic)
- All ~16 dashboard pages (minimal changes)
- `src/components/layout/context-selector.tsx` (add eventCode)

---

## Phase 3: File Storage — Firebase Storage → Cloudflare R2

**Goal**: Replace Firebase Storage with Cloudflare R2 (S3-compatible object storage).

### 3.1 Cloudflare R2 setup

- Create R2 bucket on Cloudflare
- Configure custom domain or subdomain for public URLs
- R2 exposes S3-compatible API → use `@aws-sdk/client-s3` with Cloudflare endpoint

### 3.2 Rewrite `src/hooks/use-upload.ts`

Current: `firebase/storage` (`uploadBytesResumable`, `getDownloadURL`, `deleteObject`)

New: server-side API route that interacts with R2:
- `POST /api/upload` → generate presigned URL for direct client upload, or server-side upload
- `DELETE /api/upload` → delete file from R2
- Hook maintains the same interface: `{ upload, deleteFile, progress, uploading, error }`

### 3.3 Image URL migration

Existing Firestore documents have `firebasestorage.googleapis.com` URLs. For new data on MongoDB, URLs will be Cloudflare R2.

Strategy:
1. For existing event databases: image URLs are already managed by the Nuxt apps — not necessarily Firebase
2. For the master DB (new): all new uploads go to R2
3. Optional migration script to copy legacy images from Firebase to R2

### 3.4 Update `next.config.ts`

- Add R2/Cloudflare domain to `remotePatterns` for Next.js Image
- Update Content-Security-Policy headers
- Remove Firebase Storage domains (after full migration)

**Files involved**:
- `src/hooks/use-upload.ts` (rewrite)
- `src/app/api/upload/route.ts` (new)
- `next.config.ts` (modify)

---

## Phase 4: Security — Proxy + Server-side RBAC

**Goal**: Implement server-side route protection and RBAC enforcement. Most of this work is already covered in Phase 1 (`proxy.ts`, `api-auth.ts`). This phase consolidates and verifies.

### 4.1 Verify proxy.ts (created in Phase 1)

- Test that all `(dashboard)` routes require auth
- Test that API routes return 401 without a valid token
- Test that API routes return 403 for insufficient roles

### 4.2 Permission enforcement in API routes

`src/lib/permission-utils.ts` is already completely framework-agnostic (zero Firebase imports):
- `canManageAdmins(role)` — superadmin only
- `canAccessClient(permissions, clientId)` — checks `clientIds[]`
- `canAccessEvent(permissions, clientId, eventId)` — checks `eventCodes[]`
- `canWriteClient(role)` — superadmin only
- `canWriteEventContent(permissions, clientId, eventId)` — all roles (scoped)

These functions are called in every API route after authentication. **No changes needed to the file itself**, just verification they are used correctly in the new routes.

### 4.3 Dashboard layout guard (transition)

`src/app/(dashboard)/layout.tsx` currently does client-side auth check. With the server-side proxy in place, the layout guard becomes a UX fallback (shows loading), not the primary protection.

---

## Phase 5: Cleanup + Deployment

### 5.1 Remove Firebase

**Delete files**:
- `src/lib/firebase.ts`
- `src/lib/firebase-admin.ts`
- `src/lib/firestore.ts`
- `firebase.json`
- `firestore.rules`
- `storage.rules`
- `src/test/firestore-rules.test.ts`
- `vitest.emulator.config.ts`

**Remove packages**:
```bash
pnpm remove firebase firebase-admin @firebase/rules-unit-testing
```

### 5.2 Environment variables

**Remove**:
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
```

**Add**:
```
MONGODB_URI
MONGODB_ADMIN_DB_NAME
NEXT_PUBLIC_COGNITO_REGION
NEXT_PUBLIC_COGNITO_USER_POOL_ID
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID
COGNITO_DOMAIN
CLOUDFLARE_R2_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET_NAME
CLOUDFLARE_R2_PUBLIC_URL
WEBHOOK_SECRET
```

### 5.3 Amplify deployment config

- `amplify.yml` with build spec (`pnpm install && pnpm build`)
- Environment variables in Amplify Console
- Lambda trigger env vars
- Custom domain setup
- IAM Managed Policy for Cognito admin ops (manual step post-deploy, as in prototype)

### 5.4 Update documentation

- Update `admin-dashboard.md`
- Create `mongodb-data-structure.md` (replaces `firestore-data-structure.md`)
- Update `CLAUDE.md` (remove Firebase references, add MongoDB/Amplify)
- Update `.env.example`

---

## Phase 6: Testing (continuous throughout all phases)

### 6.1 Test infrastructure

- `src/test/firebase-mock.ts` → `src/test/auth-mock.ts` (mock Cognito)
- `src/test/mongodb-mock.ts` (new — mock MongoClient)
- `src/test/query-wrapper.tsx` (new — React Query provider for component tests)
- Update `src/test/setup.ts`

### 6.2 TDD during migration

For each step: test first → implement → verify tests pass.

Separate Firebase and MongoDB mocks coexist during the transition, enabling incremental migration without breaking all tests at once.

### 6.3 Tests that don't change

- `src/lib/permission-utils.ts` — zero Firebase dependencies, tests unchanged
- `src/lib/schemas.ts` — pure Zod, tests unchanged
- All pure UI components — tests unchanged
- `src/lib/timestamps.ts` — already agnostic

---

## Execution order and dependencies

```
Phase 0 (Foundation)         ← No dependencies, purely additive
  ↓
Phase 1 (Auth)               ← Depends on Phase 0
  ↓
Phase 2 (Data Layer)         ← Depends on Phase 1
  ↕ (parallel)
Phase 3 (Storage)            ← Independent, parallel to Phase 2
  ↕ (parallel)
Phase 4 (Security)           ← Depends on Phase 1, parallel to Phase 2
  ↓
Phase 5 (Cleanup)            ← Depends on all previous phases
```

Phase 6 (Testing) is cross-cutting and continuous.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| App breaks during auth migration | Feature flag: Firebase and Cognito coexist temporarily. Dual auth during transition |
| Loss of Firestore real-time | React Query with 30s polling is more than adequate for an admin dashboard |
| Event DB schema incompatible with Firestore | Analyze existing DBs BEFORE implementing route handlers. Native driver allows flexible reads without rigid schema |
| Firebase Storage URLs break | Keep Firebase project alive in read-only mode during transition. Gradual migration to R2 |
| 74 test files break simultaneously | Mock layer abstraction. Incremental migration per phase |
| Cognito IAM requires manual step | Clearly document in runbook. Automate with CDK where possible |

---

## End-to-end verification

After each phase, verify:
1. `pnpm test` — all tests pass
2. `pnpm build` — build succeeds
3. Login/logout works
4. CRUD on clients/events works
5. Image upload works
6. Roles and permissions enforced correctly
7. Protected routes return 401/403 as expected
