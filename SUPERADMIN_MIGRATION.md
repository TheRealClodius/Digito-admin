# Superadmin Authorization Migration Guide

## Overview

This document describes the superadmin authorization system implementation and migration process.

**Goal**: Lock superadmin access to exactly 2 emails with a foundation for future role-based access control.

---

## Implementation Status

### ✅ Completed Stages

#### Stage 1: Foundation (Commit: `512cdff`)
- ✅ Created `UserPermissions` types and tests
- ✅ Updated Firestore rules to accept `admin` OR `superadmin` (dual support)
- ✅ Updated Storage rules to accept both claims
- ✅ Updated seed script with hardcoded allowed emails
- ✅ Seed script creates `userPermissions` documents

#### Stage 2: Client-Side (Commit: `ed7160b`)
- ✅ Updated `checkSuperAdmin()` to accept both claims
- ✅ Added `getUserPermissions()` function
- ✅ Updated debug tools (check-admin-claim.ts script)
- ✅ Enhanced debug-auth page with permissions display
- ✅ All tests passing (11/11 auth, 5/5 permissions)

#### Stage 3: Migration Script (Commit: `94d0118`)
- ✅ Created `scripts/migrate-admin-to-superadmin.ts`
- ✅ Validates against hardcoded allowed emails
- ✅ Removes unauthorized admin claims
- ✅ Creates `userPermissions` documents

---

## Current Architecture

### Allowed Superadmins
```typescript
const ALLOWED_SUPERADMINS = [
  'andrei.clodius@goodgest.com',
  'ga.ibba@goodgest.com'
];
```

### Custom Claims (During Migration)
```json
{
  "admin": true,       // Legacy (for backward compatibility)
  "superadmin": true   // New claim
}
```

### Firestore Permissions
```typescript
// Collection: userPermissions/{userId}
{
  userId: string;
  email: string;
  role: 'superadmin' | 'client-admin' | 'event-admin';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  clientIds: null | string[];  // null = full access
  eventIds: null | string[];   // null = full access
  createdBy: string;
  updatedBy: string;
}
```

---

## Migration Instructions

### Step 1: Run Migration Script

```bash
npx tsx scripts/migrate-admin-to-superadmin.ts
```

**What it does:**
1. Scans all Firebase Auth users
2. For users with `admin: true` claim:
   - If email is in `ALLOWED_SUPERADMINS`: sets `superadmin: true` + creates `userPermissions`
   - If email is NOT allowed: removes `admin` claim (security enforcement)
3. Skips users who already have `superadmin: true`
4. Reports detailed results

### Step 2: Verify Migration

Check both superadmin users:
```bash
npx tsx scripts/check-admin-claim.ts andrei.clodius@goodgest.com
npx tsx scripts/check-admin-claim.ts ga.ibba@goodgest.com
```

**Expected output:**
```
========================================
Superadmin Check
========================================

📧 Email: andrei.clodius@goodgest.com
🆔 UID: <uid>

--- Custom Claims ---
{
  "admin": true,
  "superadmin": true
}

--- Claim Status ---
Has superadmin claim: ✅ YES
Has legacy admin claim: ✅ YES

🔐 Overall Status: ✅ SUPERADMIN

--- userPermissions Document ---
{
  "userId": "<uid>",
  "email": "andrei.clodius@goodgest.com",
  "role": "superadmin",
  "clientIds": null,
  "eventIds": null,
  ...
}
```

### Step 3: Manual Testing

1. **Login Test**:
   - Login with `andrei.clodius@goodgest.com` → ✅ Should succeed
   - Login with `ga.ibba@goodgest.com` → ✅ Should succeed
   - Login with unauthorized email → ❌ Should fail

2. **Debug Page Test**:
   - Navigate to `/debug-auth`
   - Verify shows:
     - ✅ Has superadmin claim: YES
     - ✅ Has legacy admin claim: YES
     - ✅ Overall Status: SUPERADMIN
     - ✅ Firestore Permissions document displayed

3. **Functionality Test**:
   - Test all CRUD operations (create/edit/delete events, posts, etc.)
   - Verify no permission errors

### Step 4: Monitor (24-48 hours)

Keep the dual-support system running for 24-48 hours to ensure:
- No issues with existing sessions
- Token refresh works correctly
- All integrations continue working

---

## Stage 4: Cleanup (Future)

**⚠️ Do NOT run Stage 4 immediately. Wait 24-48 hours after migration.**

After verification period, remove legacy `admin` claim support:

### 4.1 Update Security Rules

**firestore.rules**:
```javascript
function isSuperAdmin() {
  return request.auth != null
    && request.auth.token.superadmin == true;  // Remove: || request.auth.token.admin == true
}
```

**storage.rules**:
```javascript
allow write: if request.auth != null
  && request.auth.token.superadmin == true;  // Remove: || request.auth.token.admin == true
```

### 4.2 Update Seed Script

**scripts/seed-admins.ts**:
```typescript
// Remove dual claims, set only superadmin
await auth.setCustomUserClaims(user.uid, {
  superadmin: true  // Remove: admin: true
});
```

### 4.3 Update checkSuperAdmin()

**src/lib/auth.ts**:
```typescript
export async function checkSuperAdmin(user: User): Promise<boolean> {
  const tokenResult = await user.getIdTokenResult(true);
  return tokenResult.claims.superadmin === true;  // Remove: || tokenResult.claims.admin === true
}
```

### 4.4 Deploy & Verify

1. Deploy updated security rules
2. Deploy updated client code
3. Test login and functionality
4. Verify debug page shows only `superadmin: true`

---

## Rollback Plan

If issues arise during or after migration:

### Immediate Rollback (During Migration)
The system is already in dual-support mode, so no rollback needed. Both `admin` and `superadmin` claims work.

### Rollback After Stage 4 Cleanup
1. Revert security rules to check `admin OR superadmin`
2. Revert client code to check both claims
3. Run seed script to restore `admin: true` claims
4. Investigate and fix issues before attempting cleanup again

---

## Debug Tools

### Check User Claims
```bash
npx tsx scripts/check-admin-claim.ts <email>
```

Shows:
- Custom claims (admin, superadmin)
- Overall superadmin status
- Firestore userPermissions document

### Re-seed Superadmin
```bash
ADMIN_EMAILS=andrei.clodius@goodgest.com,ga.ibba@goodgest.com \
  npx tsx scripts/seed-admins.ts
```

Creates/updates:
- Custom claims (both admin and superadmin during migration)
- userPermissions document
- superAdmins collection entry

### Debug Auth Page
Navigate to `/debug-auth` in the dashboard to see:
- User info (email, UID)
- Token claims (raw JSON)
- Claim status (superadmin, admin, overall)
- Firestore permissions document
- Refresh token button

---

## Future: Role-Based Access Control

The foundation is ready for per-client and per-event roles:

### Future Roles

**Client Admin**:
```json
{
  "userId": "abc123",
  "role": "client-admin",
  "clientIds": ["client-1", "client-2"],
  "eventIds": null  // All events in allowed clients
}
```

**Event Admin**:
```json
{
  "userId": "def456",
  "role": "event-admin",
  "clientIds": ["client-1"],
  "eventIds": ["event-1", "event-2"]
}
```

### Implementation Steps (Future)
1. Create UI for managing user permissions
2. Update security rules to use `hasClientAccess()` and `hasEventAccess()` helpers
3. Update client-side to scope UI based on user permissions
4. Create admin management dashboard

---

## Security Notes

### Email Hardcoding
- Superadmin emails are hardcoded in **3 places**:
  1. `scripts/seed-admins.ts`
  2. `scripts/migrate-admin-to-superadmin.ts`
  3. *(Future)* Any admin management UI

- **Important**: Keep these lists in sync!

### Token Refresh
- Custom claims are cached in ID tokens (1-hour TTL)
- After setting claims, users must:
  1. Sign out and sign back in, OR
  2. Wait for token to expire (1 hour), OR
  3. Use "Refresh Token" button in debug page

### Unauthorized Access Prevention
- Migration script automatically removes `admin` claims from non-allowed emails
- Seed script rejects non-allowed emails
- Security rules enforce claim validation

---

## Commits Reference

- **Stage 1**: `512cdff` - Foundation with dual support
- **Stage 2**: `ed7160b` - Client-side updates
- **Stage 3**: `94d0118` - Migration script
- **Merge**: `07b9f73` - Local/remote merge with i18n fixes

---

## Support

For issues or questions:
1. Check `/debug-auth` page for current claim status
2. Run `npx tsx scripts/check-admin-claim.ts <email>` to verify claims
3. Check Firestore console for `userPermissions` collection
4. Review migration script output logs
