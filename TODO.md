# Digito Admin Dashboard — Security & Performance TODO

> Generated from the security & performance audit of Feb 2026.
> Each task is scoped so an AI agent (or developer) can pick it up independently.

---

## P0 — Critical Security

### [ ] 1. Sign out non-admin users after failed admin check
- **Files:** `src/app/login/page.tsx` (lines 27-29, 49-51)
- **Problem:** When a user signs in but fails the `checkSuperAdmin` check, they are redirected to `/unauthorized` but their Firebase Auth session stays active. They retain a valid token that grants Firestore read access to all data.
- **Task:** Call `signOut()` from `@/lib/auth` before `router.push("/unauthorized")` in both `handleGoogleSignIn` and `handleSubmit`. Also add the same guard in `src/app/(dashboard)/layout.tsx` (line 39) so the layout itself signs out non-admins.
- **Test:** Write a test that asserts `signOut` is called when `checkSuperAdmin` returns false.

### [ ] 2. Restrict Firestore read rules to admins
- **File:** `firestore.rules`
- **Problem:** All collections under `/clients/{clientId}/**` allow `read: if request.auth != null`. Any authenticated user (not just admins) can read every client, event, brand, session, participant, whitelist entry, etc.
- **Task:** Change read rules for admin-managed collections to `allow read: if isSuperAdmin();`. Keep `read: if request.auth != null` only for collections that end-users legitimately need (e.g., whitelist for the auth flow, event content for the public app).
- **Test:** Deploy rules to the emulator and write security rule tests asserting non-admin users are denied read access.

### [ ] 3. Implement cascade deletes
- **Files:** `src/app/(dashboard)/clients/page.tsx`, `src/app/(dashboard)/clients/[clientId]/events/page.tsx`, all `events/[eventId]/*` page delete handlers, `src/lib/firestore.ts`
- **Problem:** Delete confirmation dialogs promise cascading (e.g., "will also remove all events under this client") but `handleDelete` only calls `deleteDocument()` on the single document. Subcollections and Storage files are orphaned.
- **Task (option A — preferred):** Create Firebase Cloud Functions (`onDelete` triggers) for `clients/{clientId}` and `clients/{clientId}/events/{eventId}` that recursively delete subcollections and associated Storage files.
- **Task (option B — client-side):** Create a `deleteClientCascade(clientId)` and `deleteEventCascade(clientId, eventId)` utility in `src/lib/firestore.ts` that fetches all subcollection docs and deletes them in a batched write before deleting the parent.
- **Test:** Write integration tests verifying that deleting a client removes its events, and deleting an event removes brands/sessions/happenings/participants/posts/whitelist.

---

## P1 — High Priority

### [ ] 4. Replace wildcard subcollection rule with explicit rules
- **File:** `firestore.rules` (lines 40-43)
- **Problem:** The `match /{subcollection}/{docId}` wildcard matches any current and future subcollection under an event. If a new sensitive subcollection is added (e.g., `payments`), it inherits permissive read access automatically.
- **Task:** Replace the wildcard with explicit `match` blocks for each known subcollection: `brands`, `posts`, `sessions`, `stands`, `happenings`, `participants`. Remove the redundant `/whitelist/{whitelistId}` rule that is already covered by the wildcard.
- **Test:** Write emulator rule tests confirming that an unknown subcollection path is denied access.

### [ ] 5. Move `firebase-admin` to devDependencies
- **File:** `package.json` (line 37)
- **Problem:** `firebase-admin` is in `dependencies` instead of `devDependencies`. It's only used by `scripts/seed-admins.ts` (a CLI script), never by the Next.js app. Bundlers may attempt to include it in the client build, increasing bundle size and potentially leaking server-side APIs.
- **Task:** Move `"firebase-admin": "^13.6.1"` from `dependencies` to `devDependencies`. Verify `npm run build` still succeeds.
- **Test:** Run `next build` and confirm no import errors.

### [ ] 6. Replace 5 real-time listeners on Event Overview with count queries
- **File:** `src/app/(dashboard)/events/[eventId]/page.tsx` (lines 33-49)
- **Problem:** The overview page opens 5 `onSnapshot` listeners (brands, sessions, happenings, participants, whitelist) downloading every document in each collection just to display `.length` counts. This wastes bandwidth, Firestore reads, and memory.
- **Task:** Replace `useCollection` calls with `getCountFromServer()` (Firestore v10+) wrapped in a new `useCollectionCount` hook. This returns only the count without downloading documents.
- **Test:** Write a test for the new `useCollectionCount` hook verifying it returns the correct count.

### [ ] 7. Remove or integrate TanStack Query
- **Files:** `package.json` (line 32), `src/app/providers.tsx` (lines 1-19)
- **Problem:** `@tanstack/react-query` is installed and a `QueryClientProvider` wraps the entire app, but no component ever calls `useQuery` or `useMutation`. This adds ~13KB to the bundle for zero benefit.
- **Task (option A):** Remove `@tanstack/react-query` from `package.json` and remove the `QueryClientProvider` from `providers.tsx`.
- **Task (option B):** Refactor `useCollection`/`useDocument` to use `useQuery` with Firestore fetchers, gaining caching, deduplication, and background refetching.
- **Test:** Verify the app builds and all existing tests pass after the change.

---

## P2 — Medium Priority

### [ ] 8. Extract generic CRUD page component to eliminate ~1000 lines of duplication
- **Files:** `src/app/(dashboard)/events/[eventId]/brands/page.tsx`, `happenings/page.tsx`, `participants/page.tsx`, `posts/page.tsx`, `sessions/page.tsx`, `whitelist/page.tsx`, `clients/page.tsx`
- **Problem:** All 7 CRUD pages follow the exact same ~150-line template: unwrap params, build path, 4x useState, handleNew/Edit/Submit/Delete, JSX with header+table+Sheet+AlertDialog. This is ~1000 lines of near-identical code.
- **Task:** Create a generic `useCrudPage<T>` hook (or `CrudPage` component) that accepts: collection path, table component, form component, entity-to-defaultValues mapper, and optional submit transformer (for Timestamp conversion). Refactor all 7 pages to use it.
- **Test:** Ensure all existing page tests still pass after refactoring.

### [ ] 9. Use canonical Zod schemas in form components
- **Files:** `src/lib/schemas.ts`, `src/components/forms/brand-form.tsx`, `client-form.tsx`, `post-form.tsx`, `whitelist-form.tsx`, `session-form.tsx`, `happening-form.tsx`, `participant-form.tsx`
- **Problem:** `schemas.ts` defines canonical schemas with proper validation (e.g., `.url()` on websiteUrl), but form components define their own weaker inline schemas. For example, `brand-form.tsx` accepts any string for `websiteUrl` while `schemas.ts` requires a valid URL.
- **Task:** Remove inline schemas from form components and import + use the canonical schemas from `schemas.ts`. Adjust form defaultValues to match schema expectations. Fix `event-form.tsx` to also use a Zod resolver instead of plain `{ required }` rules.
- **Test:** Verify forms reject invalid URLs and other data that the canonical schemas would reject.

### [ ] 10. Create a shared AuthProvider context to deduplicate `useAuth` listeners
- **Files:** `src/hooks/use-auth.ts`, `src/app/(dashboard)/layout.tsx`, `src/components/layout/header.tsx`
- **Problem:** Both the dashboard layout and the header call `useAuth()` independently, each creating their own `onAuthStateChanged` listener. Every component that needs auth data sets up a redundant subscription.
- **Task:** Create an `AuthProvider` context (similar to `ThemeProvider`) that calls `onAuthStateChanged` once and provides `user` and `loading` via context. Refactor `useAuth` to consume this context. Wrap the app in `AuthProvider` in `providers.tsx`.
- **Test:** Write a test verifying `onAuthStateChanged` is called only once even when multiple components use `useAuth`.

### [ ] 11. Clean up Storage files on image replacement and document deletion
- **Files:** `src/hooks/use-upload.ts`, `src/components/image-upload.tsx`, all form components, all page delete handlers
- **Problem:** When an image is replaced (e.g., updating a brand logo), the old file stays in Firebase Storage. When a document with images is deleted, its files are never cleaned up. Orphaned files accumulate indefinitely.
- **Task:** In `ImageUpload`, when `onChange` is called with a new URL and the old `value` was a Firebase Storage URL, call `deleteFile` on the old URL. In page delete handlers, before deleting the document, read its image URL fields and delete associated storage files.
- **Test:** Write a test that mocks `deleteObject` and verifies it's called when an image is replaced.

### [ ] 12. Fix `constraints` missing from `useCollection` dependency array
- **File:** `src/hooks/use-collection.ts` (line 61)
- **Problem:** The `constraints` array is used in the `useEffect` body but excluded from the dependency array. If callers pass new constraint objects on re-render, the hook uses stale constraints. Including raw constraints in deps would cause infinite loops.
- **Task:** Either: (a) serialize constraints to a stable key (JSON.stringify or a custom hash) and use that as a dep, or (b) require callers to memoize constraints with `useMemo` and include them in deps, or (c) accept a constraint-builder function instead.
- **Test:** Write a test that changes constraints and verifies the hook re-subscribes.

---

## P3 — Low Priority / Quality of Life

### [ ] 13. Add React Error Boundaries
- **Files:** `src/app/layout.tsx`, `src/app/(dashboard)/layout.tsx`
- **Problem:** There are no error boundaries. A runtime error in any component (e.g., `.toDate()` on null) crashes the entire app with a white screen.
- **Task:** Create an `ErrorBoundary` component and wrap the dashboard layout children. Display a user-friendly fallback with a "reload" button. Optionally add per-page boundaries around table/form sections.
- **Test:** Write a test that renders a component that throws and verifies the fallback is displayed.

### [ ] 14. Persist EventContext across page refreshes
- **File:** `src/contexts/event-context.tsx`
- **Problem:** The selected client and event are stored in React state only. A page refresh or navigation to a bookmarked URL loses the selection.
- **Task (option A):** Sync `selectedClientId`/`selectedEventId` to `sessionStorage` and read on mount.
- **Task (option B):** Encode the selection in URL search params (`?client=X&event=Y`) so it's bookmarkable and survives refreshes.
- **Test:** Write a test that sets context, simulates a remount, and verifies the selection is restored.

### [ ] 15. Add table pagination or virtualization for large collections
- **Files:** All table components in `src/components/tables/`
- **Problem:** All tables render every row in the DOM. For collections with hundreds of entries (whitelist, participants), this creates a large DOM tree.
- **Task:** Add client-side pagination (simplest) or integrate `@tanstack/react-virtual` for virtualized rendering. Start with the whitelist and participants tables which are most likely to have many rows.
- **Test:** Write a test that renders 500 rows and verifies only a page-worth are in the DOM.

### [ ] 16. Sanitize filenames in storage upload paths
- **Files:** `src/hooks/use-upload.ts`, form components that call `upload(file, ...)`
- **Problem:** `file.name` from the user's filesystem is used unsanitized in the storage path. Special characters could cause encoding issues.
- **Task:** Create a `sanitizeFilename` utility that strips non-alphanumeric characters (except dots and hyphens) and truncates to a max length. Alternatively, generate a UUID-based filename and preserve only the extension.
- **Test:** Write a test with filenames containing `../`, spaces, unicode, and long strings, verifying they are sanitized.

### [ ] 17. Add `updatedAt` timestamp to document updates
- **File:** `src/lib/firestore.ts` (line 33)
- **Problem:** `updateDocument` uses `setDoc` with merge but does not add an `updatedAt: serverTimestamp()` field. There is no way to know when a record was last modified.
- **Task:** Add `updatedAt: serverTimestamp()` to the data spread in `updateDocument`.
- **Test:** Write a test that calls `updateDocument` and verifies `updatedAt` is included in the written data.

### [ ] 18. Validate route parameters before building Firestore paths
- **Files:** `src/app/(dashboard)/clients/[clientId]/events/page.tsx`, all `events/[eventId]/*` pages
- **Problem:** Route params (`clientId`, `eventId`) are used directly in Firestore paths with no format validation.
- **Task:** Create a `isValidFirestoreId(id: string): boolean` utility that checks for non-empty string, no slashes, no whitespace, and reasonable length. Use it to guard path construction; if invalid, render an error state instead of querying Firestore.
- **Test:** Write a test with various malformed IDs verifying the guard catches them.

### [ ] 19. Remove hardcoded admin emails from source code
- **File:** `scripts/seed-admins.ts` (lines 22-25)
- **Problem:** Admin email addresses are hardcoded and committed to the repository.
- **Task:** Read admin emails from an environment variable (e.g., `ADMIN_EMAILS=a@b.com,c@d.com`) or a `.env` file that is gitignored.
- **Test:** Verify the script reads from env and errors gracefully if the variable is missing.

### [ ] 20. Fix empty Created column in ClientsTable
- **File:** `src/components/tables/clients-table.tsx` (lines 76-78)
- **Problem:** The Created column renders `<TableCell title={formatDate(client)} />` — the date is a tooltip attribute only, with no visible text. Users see an empty cell.
- **Task:** Change to `<TableCell>{formatDate(client)}</TableCell>`.
- **Test:** Write a test that verifies the date text is visible in the rendered table.
