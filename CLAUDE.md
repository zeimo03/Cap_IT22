# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A React + Vite SPA for St. Rita's College's intramurals/sportsfest/PRISAA event management: student registration, sports & team configuration, match scheduling, match record-keeping, and team rankings. Firebase (Auth + Firestore + Storage) is the entire backend — there is no custom server.

## Commands

```
npm run dev       # start Vite dev server (also aliased as `npm start`)
npm run build     # production build
npm run preview   # preview the production build
npm run lint      # eslint .
```

There is no test suite configured in this repo.

Firebase config comes from `.env` (see `.env.example` for the required `VITE_FIREBASE_*` keys). Without it, `src/firebase.js` logs a warning and `auth`/`db`/`storage` are left undefined — most of the app degrades gracefully (empty lists) rather than crashing, since every Firestore helper in `src/services/firestoreService.js` checks `if (!db)` first.

`vite.config.js` sets `server.host: true`, so the dev server is reachable from other devices on the local network by default.

## Architecture

**Routing** (`src/App.jsx`): `/` is the public landing page (`PublicLayout`). Everything else sits under `AuthenticatedLayout` (sidebar + page transition wrapper) and is wrapped in `ProtectedRoute`, which redirects unauthenticated users to `/` and role-mismatched users to `/dashboard`. `/schedule-admin` is a legacy alias of `/admin`.

**Auth & roles** (`src/components/AuthContext.jsx`): Firebase Auth handles login/signup, but *authorization* is entirely Firestore-driven — there is no role field the client can set on itself. On every auth state change, the user's email (lowercased) is looked up across three collections in order: `superadmins` → `admins` → `moderators`; the first match wins, otherwise the role falls back to whatever `users/{uid}.role` says (default `student`). To grant staff access, add a doc to the relevant collection in Firebase Console with the email as the document ID — there's no UI for this. Email verification is enforced at login (`login()` signs the user back out and throws if `emailVerified` is false); `signup()` sends the verification email, writes the `users/{uid}` profile, then immediately signs the user back out.

**Data layer** (`src/services/firestoreService.js`): all Firestore/Storage reads and writes go through this one file — pages never call the Firestore SDK directly. Key conventions to preserve when extending it:
- Config-style data (sports/teams, match schedules, match records, team rankings) is stored one doc per school level at `<collection>/{level}` where `level` is `'elementary' | 'highSchool' | 'college'`, with the actual list nested inside (e.g. `matchSchedules/{level}.matches`). Nearly every page/admin screen is scoped by this level and lets the user switch between the three.
- List-valued docs are read-modify-written wholesale (read the array, splice/map/filter, `setDoc(..., { merge: true })`) rather than using Firestore array operators — see `upsertMatchSchedule`, `deleteMatchRecord`, etc. Follow this pattern for new list fields on the same docs.
- `registrations` is staff-only (contains addresses/emergency contacts) so the public landing page can't query it for counts. Public-safe aggregates are mirrored into `siteCounters/liveCounters` instead (`bumpEventRegistrationCount` on submit, `setEventRegistrationCounts`/`setLivePlayerCount` as an admin-triggered reconcile). When adding a new publicly-visible number derived from a staff-only collection, follow this same mirror-to-a-public-doc pattern rather than loosening Firestore rules.
- `EVENT_TYPES` in this file is the single source of truth for the Intramurals/Sportsfest/Prisaa event list — `RegistrationPage` and `AdminSchedulePage` both derive their dropdowns/filters from it.

**Reset script** (`reset-sports-schedules.cjs`): a standalone Node/`firebase-admin` script (not part of the Vite app) for wiping sports/teams config, match schedules, and all registrations between events/seasons. Requires a `serviceAccountKey.json` (gitignored, never commit it) in the repo root. Defaults to a dry run; pass `--yes` to actually write. Does not touch `users` or the staff allowlist collections.

**Page/role map**: `DashboardPage`, `ProfilePage`, `RegistrationPage`, `TeamAndSportsPage`, `MatchSchedulesPage`, `RankingPage` are open to any authenticated user. `AdminSchedulePage` (`/admin`, aliased `/schedule-admin`) requires `admin`/`superadmin` and is the real registrations/sports/schedules management console — treat it as the admin home, not a stub. `ModeratorPage` (match record entry) requires `moderator`/`superadmin`. `SuperAdminPage` (analytics) requires `superadmin` only.
