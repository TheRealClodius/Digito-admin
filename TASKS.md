# Tasks

## Explorations

> Not decided yet

### Nuxt 3 + Tailwind Migration Analysis

**Question:** What would change structurally if we rebuilt this project as a Nuxt 3 app with Tailwind?

**Current stack:** Next.js 16 + React 19 + Tailwind v4 + Firebase + shadcn/ui

#### Zero-cost portables (no changes needed)
- Zod schemas, TypeScript types, translation JSONs
- Tailwind CSS (tokens, utilities, animations, dark mode)
- Firebase backend (Admin SDK, Firestore/Storage rules, scripts)
- AI prompts, permission utils, timestamp helpers
- Tiptap extensions (framework-agnostic)

#### Key structural changes

| Area | Current | Nuxt Equivalent | Effort |
|---|---|---|---|
| Components (~60 files) | React JSX `.tsx` | Vue SFCs `.vue` (`<template>` + `<script setup>`) | High |
| UI kit (21 components) | shadcn/ui (Radix) | shadcn-vue (Radix Vue) — 1:1 mapping | Medium |
| Routing | App Router `app/` | `pages/` + `layouts/` + `definePageMeta` | Low |
| State (6 contexts) | React Context + Provider nesting | Pinia stores (3-4), no provider tree | Low |
| Hooks (18) | React hooks | Vue composables — simpler (no dep arrays, no stale closures) | Medium |
| Forms (9) | react-hook-form + zod | VeeValidate + zod — simpler with `v-model` | Medium |
| Server routes (9) | Next.js API routes | Nitro `server/api/*.ts` — mechanical translation | Low |
| Server Actions | `"use server"` | Nitro server route (no direct equivalent) | Low |
| i18n | Custom (context + hook + types) | `@nuxtjs/i18n` module — eliminates 3 files | Eliminated |
| Theme | Custom (context + geo API) | `@nuxtjs/color-mode` module | Eliminated |
| Auth guard | Client-side layout guard (no middleware) | Server-side route middleware — stronger security | Low |
| Testing (~30 files) | Vitest + RTL | Vitest + `@testing-library/vue` — same assertions | Medium-High |

#### Nuxt modules that replace custom code (~650 lines saved)
- `@nuxtjs/i18n` → replaces language context, hook, types
- `@nuxtjs/color-mode` → replaces theme context + sunrise/sunset API routes
- `nuxt-vuefire` → replaces useCollection, useDocument, auth context
- Pinia persist plugin → replaces manual sessionStorage/localStorage sync
- VueUse → replaces useDebounce and other utility hooks
- `nuxt-security` → replaces manual CSP headers

#### Gains
- Simpler state management (no provider nesting, fine-grained reactivity)
- Server-side auth middleware (no flash of unauthorized content)
- ~650 lines of custom infrastructure eliminated by modules
- No stale closures, no dependency arrays, no `useCallback`/`useMemo`

#### Trade-offs
- One-time rewrite cost of ~60 components + ~30 test files
- Team must learn Vue/Nuxt ecosystem
- No new capabilities — same features, simpler internals

Full analysis: `.claude/plans/cheeky-churning-star.md`
