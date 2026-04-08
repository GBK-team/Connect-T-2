# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## JanSeva — Mumbai Citizen Services App

### Design System
- Colors: `#0C1A3A` → `#1E3A8A` → `#2563EB` (navy gradient), Gold accent `#F59E0B`, SOS red `#DC2626`
- Font: Inter (400/500/600/700 Bold)
- DO NOT change these values

### Architecture
- **No backend** — all data in AsyncStorage via Context providers
- `AuthContext` — user session + multi-user registry (janseva_users in AsyncStorage)
- `ComplaintContext` — grievance data
- `FeedContext` — community feed posts

### Auth Flow (phone-first)
1. User enters phone number
2. System checks `janseva_users` in AsyncStorage
3a. Phone found → "Welcome back" screen → login (no re-registration)
3b. Phone new → Select role → Enter name (+ward for nagarsevak) → Register + login
- Methods: `checkPhone(mobile)`, `register(userData)`, `loginWithPhone(mobile)`

### Navigation
- 5 tabs: Home | Complaints (edit icon) | **SOS** (red circle, centred, floating) | Feed | Profile
- Admin & Services are hidden screens (`href: null`) accessed via Profile card
- SOS is tab 3 of 5 (true centre)

### Key Files
- `artifacts/janseva/app/_layout.tsx` — Root layout, AuthGate, AppSplash overlay
- `artifacts/janseva/app/login.tsx` — Phone-first auth (register/login)
- `artifacts/janseva/app/(tabs)/_layout.tsx` — 5-tab nav with floating SOS
- `artifacts/janseva/context/AuthContext.tsx` — Auth + multi-user registry
- `artifacts/janseva/components/AppSplash.tsx` — Animated splash (LinearGradient + multi-phase)

### Splash Screen
- True `LinearGradient` background: `#060F24 → #0C1A3A → #1E3A8A → #1E40AF → #2563EB`
- Phase sequence: logo spring → text slide → dots stagger → ripple burst → fade out
- `useNativeDriver: Platform.OS !== "web"` — no warnings on web

### Roles
- `citizen` — submit/track complaints, view feed
- `nagarsevak` — ward officer, resolve complaints, admin panel
- `head_admin` — full control, all wards, admin panel
