# BMTC Quotation & LPO Control — webapp

Real authentication and user access control for BMTC Quotation & LPO
Control, backed by a real Postgres database. This is the start of the
Phase 2 backend referenced throughout the project's Security & Trust
roadmap and the LPO Fulfillment Agent blueprint — the published Claude
Artifact has no server, so anything requiring real accounts, a real
database, or server-held secrets has to live here instead.

## What's real here today

- Email + password login, hashed with bcrypt (12 rounds).
- Signed, httpOnly session cookies (JWT via `jose`), 8-hour expiry.
- Admin-only user management: add, deactivate/reactivate, reset password,
  delete. **Deactivating or deleting a user revokes their access on their
  very next request** — every protected page re-checks the database, not
  just the session cookie (see `lib/auth-guard.ts`).
- Account lockout after 5 failed login attempts (15 minutes).
- Forced password change on first login for accounts an Admin creates.
- Six roles matching the live app: Admin, Quotation Officer, Salesman,
  Line Manager, GM, CEO.

## What's NOT here yet

Quotations, pricing, the LPO match check, GP approvals, and the
hash-chained audit log all still live in the published Artifact
(`index.html` / `src/app-template.html` in the repo root). Porting that
business logic into this app — so it runs against the same real database
and real accounts instead of client-side-only state — is the next phase,
not something this change attempts.

## Local development

Requires a local Postgres instance.

```bash
npm install
cp .env.example .env   # then edit DATABASE_URL / AUTH_SECRET
npx prisma migrate dev
npm run db:seed        # creates the first Admin account, prints its
                        # one-time temporary password to the terminal
npm run dev
```

Sign in with the seeded Admin, you'll be asked to set a real password
immediately, then use **Manage users** to add everyone else.

## Deploying

1. Push this repo to GitHub (already done — this app lives in `webapp/`
   inside the main `quotation-` repo).
2. In Vercel: New Project → import the repo → set **Root Directory** to
   `webapp`.
3. Storage tab → add a Postgres database (Neon integration, a few clicks
   on Hobby) → this sets `DATABASE_URL` automatically.
4. Add `AUTH_SECRET` as a project environment variable — generate one
   with `openssl rand -base64 48`. Never reuse the `.env.example` dev
   value.
5. Deploy. Then run the migration and seed against the production
   database once:
   ```bash
   vercel env pull .env.production.local
   DATABASE_URL=<paste-the-production-url> npx prisma migrate deploy
   DATABASE_URL=<paste-the-production-url> npm run db:seed
   ```
   The seed script only ever creates an Admin if none exists yet, so it's
   safe to leave in the deploy pipeline if you'd rather not run it by
   hand.

## Security notes for anyone touching this code

- Every `"use server"` action re-verifies auth/role itself
  (`requireUser()` / `requireAdmin()`) — `proxy.ts` is a fast redirect
  layer only, not a trust boundary. Next.js's own docs are explicit that
  a proxy matcher can silently stop covering a route after a refactor, so
  don't rely on it alone. See `proxy.ts`'s own comment.
- The "last Admin" protections in `app/admin/users/actions.ts` run inside
  a Serializable transaction, not a plain read-then-write — two admins
  concurrently removing the other two remaining admins would otherwise
  both pass a naive count check and leave zero admins with no way back in.
- Login always runs bcrypt (against a dummy hash when the account doesn't
  exist or is inactive) and returns the same generic error for "no such
  user", "wrong password", and "account locked" — both the response time
  and the response text are deliberately identical, so neither can be
  used to enumerate which emails have real, active accounts.
- Known accepted risk: `npm audit` flags `deepmerge-ts` (via Prisma's own
  CLI config loader, `@prisma/config`) as high severity. This is a
  build/CLI-time dependency, not something bundled into the deployed
  serverless functions — only `@prisma/client` ships to production, not
  the `prisma` CLI. Re-check `npm audit --omit=dev` when bumping Prisma;
  the advisory currently affects all current 6.13+ releases upstream.
