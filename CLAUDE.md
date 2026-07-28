# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Scholarship application system ("Solicitação de Bolsa para Família Necessitada") for **Arca Nossa Senhora da Providência (ANSP)** — the nonprofit association (mantenedora) behind Colégio São José / ACIPEC / FSSPX in Itatiba-SP.

Next.js 16 App Router application: a public multi-step form, an admin review panel, a public donor sign-up page, and PDF generation for decisions and contracts. Deployed to the shared DigitalOcean droplet behind Traefik — see `docs/plano-deploy-droplet.md`.

## Architecture

- **Data**: Postgres via Drizzle ORM (`postgres.js` driver). Schema in `lib/db/schema.ts`, migrations in `drizzle/`. Drizzle field names deliberately match the DB column names (`snake_case`) because server actions return rows straight to components and PDF renderers.
- **Auth**: iron-session cookie, admin accounts in `admin_users` (scrypt hashes, `lib/auth/password.ts`). `proxy.ts` guards `/admin`; every admin server action calls `requireAuth()` independently. There is no row-level security — authorization lives entirely in the application.
- **Storage**: documents are written to `STORAGE_DIR` through the driver in `lib/storage/`. Upload and download go through `/api/uploads` and `/api/documents`, authorized by HMAC tickets (`lib/storage/tickets.ts`) signed with `SESSION_SECRET`. Upload and download tickets use separate derived keys.
- **Bootstrap**: `scripts/bootstrap.ts` runs on every start; it is idempotent and never overwrites existing rows or passwords.

Any page that reads the database must be dynamic — `app/form/page.tsx` sets `force-dynamic`; admin pages get it implicitly from `cookies()`. Do not wrap `cookies()` in a `try/catch` that swallows errors: that hides Next's dynamic-rendering signal and the page will fail at build time.

## Repository Structure

- `app/` — routes: `form/` (public form), `admin/`, `benfeitor/`, `login/`, `api/`
- `lib/` — `db/`, `auth/`, `storage/`, `pdf/`, `validations/`, `templates/`
- `drizzle/` — versioned SQL migrations (`0001` holds CHECK constraints and the single-active-school-year trigger)
- `scripts/` — `bootstrap.ts`, `backup.sh`, `post-receive.sh` (deploy hook, kept identical across droplet projects)
- `design/` — original static HTML prototypes, kept as visual reference
- `docs/` — `brand-spec.md`, `plano-deploy-droplet.md`, original paper form PDF

## Design System

The canonical source of truth is `docs/brand-spec.md`; tokens live in `app/globals.css`.

Key tokens: `--accent` (navy), `--gold` (gold), `--bg` (warm paper), `--surface` (white cards). OKLch color space throughout.

Typography: serif display (`Iowan Old Style` stack) for headings, system sans for body. No external font loading.

Design posture: institutional gravity with warmth — no shadows on cards (borders + whitespace), 8px radius, gold used sparingly, generous whitespace with a print-magazine feel.

## Testing

`npm test` (Vitest) is the deploy gate — it runs inside the Docker build, so a failing suite means the image is never produced and the previous container keeps serving.

Server actions are tested against `__tests__/helpers/fake-db.ts`, a stand-in for the Drizzle client. Configure a table's reads with `queryFor("<schemaExportName>").findFirst/findMany` and assert writes via the `inserted`/`updated`/`deleted` arrays.

## Domain Context

- **ACIPEC**: Associação Civil Para a Educação Católica (CNPJ 62.611.908/0001-99)
- The scholarship form collects: parent info, student/grade/tuition data, sworn family income declaration, monthly expenses, vehicle ownership, volunteer availability, and legal terms
- The data is sensitive (family income declarations, ID documents) — treat backups, document URLs, and log output accordingly
- Language: all UI is Brazilian Portuguese (pt-BR)
