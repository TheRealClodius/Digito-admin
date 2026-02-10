# Digito Admin Dashboard

A Next.js web dashboard for managing Digito event data, including clients, events, exhibitor stands, sessions, happenings, participants, and user whitelists. Built with Next.js 16, shadcn/ui, and Firebase, sharing the same `digito-poc` Firebase project as the Flutter mobile app.

## Features

- **Client & Event Management** - Multi-tenant admin for multiple clients and events
- **Exhibitor Stands** - Manage exhibitor booths with media, descriptions, and locations
- **Sessions & Happenings** - Schedule formal sessions (talks, workshops) and informal happenings (demos, performances)
- **Participants** - Track speakers, hosts, panelists, and brand representatives
- **Posts & Media** - Upload and manage event content
- **Whitelist Management** - Control event access with email-based whitelisting
- **AI Writing Assistant** - Powered by Google Gemini, helps improve descriptions with:
  - Improve clarity and readability
  - Shorten text (make concise)
  - Expand with more detail
  - Fix grammar and spelling
- **Role-Based Access** - Supports SuperAdmin, ClientAdmin, and EventAdmin roles
- **Real-time Sync** - Changes instantly reflect in the Flutter mobile app
- **Comprehensive Testing** - 500+ tests with Vitest and React Testing Library

## Prerequisites

- **Node.js** 18+ and npm/pnpm
- **Firebase Project** - Access to the `digito-poc` Firebase project (or your own)
- **Google Gemini API Key** - (Optional) For AI writing features
- **Firebase Service Account** - For admin operations (see setup below)

## Environment Setup

### Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Firebase Client Configuration (PUBLIC - exposed to browser)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Gemini AI (SERVER-SIDE ONLY - for AI writing features)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash-lite
```

See [`.env.example`](.env.example) for a template with all variables documented.

### Getting Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (or create a new one)
3. Go to **Project Settings** → **General**
4. Scroll to "Your apps" → Select or add a **Web app**
5. Copy the config values to your `.env.local`

### Getting a Gemini API Key

The AI writing assistant requires a Google Gemini API key:

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Create or select a Google Cloud project
3. Click **"Create API key"**
4. Copy the key to `GEMINI_API_KEY` in `.env.local`

**Note:** AI features gracefully degrade if `GEMINI_API_KEY` is not configured.

### Service Account Key (for admin operations)

Download your Firebase service account key:

1. Go to **Firebase Console** → **Project Settings** → **Service Accounts**
2. Click **"Generate New Private Key"**
3. Save the JSON file as `service-account-key.json` in the project root
4. **Never commit this file** (it's in `.gitignore`)

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The dashboard will be available at [http://localhost:3000](http://localhost:3000)

## Development

### Available Scripts

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run all tests once
npm run test:watch   # Run tests in watch mode
npm run test:rules   # Test Firestore security rules (requires emulator)
```

### Testing Firestore Rules

To test Firestore security rules locally:

```bash
# Terminal 1: Start the Firestore emulator
firebase emulators:start --only firestore

# Terminal 2: Run rules tests
npm run test:rules
```

## Project Structure

```
digito-admin/
├── src/
│   ├── actions/              # Next.js Server Actions
│   │   └── ai.ts            # Gemini AI text improvement
│   ├── app/                 # Next.js App Router pages
│   │   ├── (dashboard)/     # Protected dashboard routes
│   │   └── login/           # Public auth page
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── layout/          # Sidebar, header, context selector
│   │   ├── forms/           # Entity CRUD forms
│   │   ├── tables/          # Data tables
│   │   └── ai-copy-tools.tsx # AI writing assistant UI
│   ├── contexts/            # React contexts (EventContext, ThemeContext)
│   ├── hooks/               # Custom React hooks
│   │   ├── use-ai-improve.ts
│   │   ├── use-auth.ts
│   │   ├── use-collection.ts
│   │   └── use-upload.ts
│   ├── lib/
│   │   ├── ai.ts            # AI actions & prompts configuration
│   │   ├── firebase.ts      # Firebase client SDK setup
│   │   ├── firestore.ts     # Firestore CRUD utilities
│   │   ├── schemas.ts       # Zod validation schemas
│   │   └── utils.ts         # Shared utilities
│   ├── i18n/                # Translations (English, Italian)
│   ├── types/               # TypeScript type definitions
│   └── test/                # Test setup and mocks
├── scripts/
│   └── seed-admins.ts       # Seed superadmin users
├── firestore.rules          # Firestore security rules
├── storage.rules            # Storage security rules
└── firebase.json            # Firebase configuration
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 16 (App Router) | React meta-framework with SSR |
| **UI** | shadcn/ui + Tailwind CSS 4 | Component library + styling |
| **Backend** | Firebase (Firestore + Auth + Storage) | Database, authentication, file storage |
| **AI** | Google Gemini (`gemini-2.5-flash-lite`) | Text improvement features |
| **Forms** | React Hook Form + Zod 4 | Form state + validation |
| **Testing** | Vitest + React Testing Library | Unit and integration tests |
| **Type Safety** | TypeScript 5 | Static type checking |
| **Icons** | Lucide React | Icon library |
| **Notifications** | Sonner | Toast notifications |
| **Date Handling** | date-fns | Date formatting |

## Authentication & Authorization

### User Roles

- **SuperAdmin** - Full access to all clients and events
- **ClientAdmin** - Access to specific client(s) and their events
- **EventAdmin** - Access to specific event(s)

### First-Time Setup: Creating a SuperAdmin

```bash
# 1. Ensure users exist in Firebase Auth (they must sign in once first)
# 2. Set the ADMIN_EMAILS environment variable with comma-separated emails
# 3. Run the seed script

ADMIN_EMAILS=admin@example.com,admin2@example.com npx tsx scripts/seed-admins.ts
```

This sets custom claims and creates `userPermissions` documents for the specified users.

## Firebase Collections

The dashboard reads/writes to the following Firestore structure:

```
userPermissions/{userId}          # Admin role and scoping
superAdmins/{uid}                 # Legacy superadmin tracking
clients/{clientId}
  └── events/{eventId}
      ├── whitelist/{docId}       # Email-based event access
      ├── users/{uid}             # User profiles (created by Flutter app)
      ├── brands/{brandId}        # Exhibitor stands/booths
      ├── sessions/{sessionId}    # Formal program sessions
      ├── happenings/{happeningId} # Informal events
      ├── participants/{participantId} # Speakers, hosts, etc.
      ├── posts/{postId}          # Event content/media
      └── stands/{standId}        # Physical booth locations (future)
```

**Note:** The `brands` collection is displayed as "Stands" in the UI (exhibitor booths), reflecting the business terminology for physical booth locations at events.

## AI Writing Assistant

The AI writing assistant is available in all form description fields. It provides four operations:

- **Improve Clarity** - Enhances readability while maintaining meaning
- **Shorten** - Makes text more concise
- **Expand** - Adds detail and context
- **Fix Grammar** - Corrects grammar, spelling, and punctuation

**Implementation:**
- Server Action: `src/actions/ai.ts` - Calls Gemini API
- Hook: `src/hooks/use-ai-improve.ts` - Manages state
- Component: `src/components/ai-copy-tools.tsx` - UI with dropdown menu
- Configuration: `src/lib/ai.ts` - Action definitions and prompts

**Testing:**
- 38 tests in `ai.test.ts` - Server action and Gemini integration
- 18 tests in `ai-copy-tools.test.tsx` - Component UI states
- 9 tests in `use-ai-improve.test.ts` - Hook state management

## Security

- **Firestore Rules** - Role-based access control with admin scoping
- **Storage Rules** - Admins can write, authenticated users can read
- **Environment Variables** - Sensitive keys (Gemini API) are server-side only
- **Service Account** - Never committed to git (in `.gitignore`)
- **Auth Guards** - Dashboard layout enforces authentication and admin check

## Data Flow

```
Admin Dashboard (Next.js)
    ↓ writes
Firebase (Firestore + Storage)
    ↓ reads
Flutter App (Mobile)
    ↓ reads via Firestore tools
AI Agent (FastAPI + Gemini)
```

All three applications share the same Firebase project and see the same data in real-time.

## Troubleshooting

### AI Features Not Working

- Verify `GEMINI_API_KEY` is set in `.env.local`
- Check API key is valid at [Google AI Studio](https://aistudio.google.com/apikey)
- Ensure billing is enabled on your Google Cloud project
- Check browser console for errors

### Firebase Connection Errors

- Verify all `NEXT_PUBLIC_FIREBASE_*` variables are set
- Check Firebase project is active (not deleted)
- Ensure Firestore and Storage are enabled in Firebase Console
- Check security rules allow admin access

### Build Errors

- Run `npm install` to ensure dependencies are installed
- Delete `.next` folder and rebuild: `rm -rf .next && npm run build`
- Check TypeScript errors: `npx tsc --noEmit`

## Contributing

1. Follow the TDD workflow (see [`CLAUDE.md`](CLAUDE.md))
2. Write tests first, then implement
3. Run tests before committing: `npm test`
4. Follow the Notion-inspired design language (see [`design direction.md`](design%20direction.md))

## Related Documentation

- **[CLAUDE.md](CLAUDE.md)** - Development guidelines (TDD workflow)
- **[admin-dashboard.md](admin-dashboard.md)** - Comprehensive implementation plan
- **[design direction.md](design%20direction.md)** - UI/UX design philosophy
- **[TODO.md](TODO.md)** - Security & performance improvements tracker

## License

Private - Proprietary software for Digito event management.

---

**Built with ❤️ by the Digito team**
