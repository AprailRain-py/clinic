# Clinic

A small clinic prescription manager built with Next.js 15 (App Router), Auth.js v5,
Drizzle ORM, and SQLite (better-sqlite3 with FTS5 for medicine search).

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 9+
- A Google Cloud project for OAuth credentials (see below)

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create an environment file and fill it in:

   ```bash
   cp .env.example .env.local
   ```

   - `AUTH_SECRET` — generate with `openssl rand -base64 32`
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — see the next section

3. Push the database schema (creates `./data/clinic.db`):

   ```bash
   pnpm db:push
   ```

4. Seed the medicines catalogue:

   ```bash
   pnpm db:seed
   ```

   If a data agent has produced `../data/data/medicines.json`, it will be imported
   automatically. Otherwise a built-in fallback list (~100 common medicines across
   allopathic, ayurvedic, and homeopathic systems) is used.

5. Run the dev server:

   ```bash
   pnpm dev
   ```

   Open http://localhost:3000. You'll be redirected to `/login`.

## Google OAuth setup

Create OAuth credentials at the [Google Cloud Console](https://console.cloud.google.com/):

1. **APIs & Services → OAuth consent screen**: configure for "External", add your
   email as a test user.
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorised JavaScript origin: `http://localhost:3000`
   - Authorised redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Copy the **Client ID** and **Client Secret** into `AUTH_GOOGLE_ID` /
   `AUTH_GOOGLE_SECRET` in `.env.local`.

## Useful scripts

- `pnpm dev` — start the dev server
- `pnpm build` — production build
- `pnpm start` — start the production server
- `pnpm lint` — lint
- `pnpm db:push` — apply schema to SQLite (via drizzle-kit)
- `pnpm db:seed` — (re)populate the `medicines` table + FTS index

## Project layout

- `src/app/` — App Router pages and API routes
- `src/auth.ts` — Auth.js configuration (Google provider, database sessions)
- `src/lib/db/schema.ts` — Drizzle schema (NextAuth + patients/visits/medicines)
- `src/lib/db/client.ts` — better-sqlite3 client + FTS5 bootstrap
- `src/components/prescription-editor/` — stub prescription editor (the real
  standalone editor lives at `../prescription-editor/`; integration is a separate
  task)
- `scripts/seed-medicines.ts` — medicine catalogue seeder

## Data

SQLite file at `./data/clinic.db`. Safe to delete to reset everything; re-run
`pnpm db:push` + `pnpm db:seed` afterwards.
