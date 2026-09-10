# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A React + Vite web app for Santa Rita College of Pampanga's intramurals/sportsfest/PRISAA sports events: student registration, team & sports management, match scheduling, match record-keeping, and live team rankings. Backend is entirely Firebase (Auth, Firestore, Storage) — there is no custom server.

## Commands

```
npm run dev        # start Vite dev server
npm run build       # production build
npm run preview     # preview a production build
npm run lint         # eslint .
```

There is no test suite configured in this repo.

`.env` (gitignored) must define `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` — see `.env.example`. `src/firebase.js` warns (not throws) on missing config and every `firestoreService.js` function separately no-ops/warns if `db` never initialized, so the app can still boot without Firebase.

`reset-sports-schedules.cjs` is an out-of-band Node admin script (run with `node reset-sports-schedules.cjs [--yes]`) that wipes sports/teams/schedules/registrations via `firebase-admin`. It needs a local `serviceAccountKey.json` (gitignored, never commit it) from Firebase Console → Project Settings → Service Accounts. Defaults to a dry run.

## Roles and auth (the architectural core)

Role is **not** a user-settable field — it's resolved from Firestore on every login/signup by email membership, not stored as a claim. Grant/revoke staff access by adding/removing a doc there (Firebase console), never in app code.

| Collection (doc id = lowercase email) | Resolves to |
|---|---|
| `superadmins` | `superadmin` |
| `admins` | `admin` |
| `moderators` | `moderator` |
| (not found in any) | `student` |

- Resolution logic: `resolveStaffRole()` in `src/components/AuthContext.jsx` — single source of truth for privilege, exposed app-wide as `userRole` / `isAdmin`.
- Route gating: `src/App.jsx` (declares `allowedRoles` per route) + `src/components/ProtectedRoute.jsx` (enforces it).
- Nav visibility: `src/components/Sidebar/Sidebar.jsx` duplicates the same role checks independently — **update both** when changing who can access a page.
- Signup requires clicking the Firebase email-verification link before `login()` succeeds; staff signup checks the same 3 collections via `findStaffAllowlistEntry()` in `firestoreService.js`.

## Data model (Firestore), all in `src/services/firestoreService.js`

Every read/write goes through this one file — comments there are the authoritative field-by-field spec; read them before adding a field. Don't call `firebase/firestore` directly from a page.

| Path | Holds | Note |
|---|---|---|
| `users/{uid}` | signup profile | name, email, gender, gradeLevel, section, role, isAdmin |
| `registrations/{autoId}` | one player's event sign-up | staff-only read (PII); event choice driven by `EVENT_TYPES`/`getEventKey`/`getEventLabel` — extend that list, don't hardcode a new one |
| `sportsTeamsConfig/{level}`, `matchSchedules/{level}`, `matchRecords/{level}`, `teamRankings/{level}` | per-level (`elementary`\|`highSchool`\|`college`) config/state | each is one doc holding a whole array/map — always fetch-modify-`setDoc(merge:true)`, no atomic per-element update |
| `siteCounters/liveCounters` | public player + event counts | the *only* collection students can read directly; `AdminSchedulePage` recomputes it from real `registrations` on every load, self-correcting any drift — keep it separate from `stats` |

Moderator and Admin deliberately share `matchRecords/{level}` and `teamRankings/{level}` — a moderator's confirmed result is instantly visible to admin ranking views.

## Routing / layout structure

`src/App.jsx` splits into two layout trees under `BrowserRouter`:
- `/` → `PublicLayout` (`src/components/Landing/`) — no auth.
- everything else → `AuthenticatedLayout` (sidebar + `<Outlet>`), each route wrapped in `ProtectedRoute allowedRoles=[...]`. `/admin` and `/schedule-admin` both render `AdminSchedulePage`.

`LoginModal` mounts once at the `App` root, driven by `AuthContext`'s `authModal` state (`openAuthModal`/`switchScreen`/`closeAuthModal`) — any component can trigger it without prop-drilling.

## Conventions to follow

- Component folders pair a `.jsx` with a same-named `.css` (e.g. `Sidebar/Sidebar.jsx` + `Sidebar.css`); styles are not colocated as CSS-in-JS or modules.
- Firestore reads/writes only ever happen through `src/services/firestoreService.js` — pages do not call `firebase/firestore` directly. Follow that pattern for new collections.
- Cross-cutting per-event or per-level constants (`EVENT_TYPES`, the `elementary/highSchool/college` level keys) are defined once and imported everywhere, rather than re-listed per page — extend the existing list instead of hardcoding a new one in a page.
