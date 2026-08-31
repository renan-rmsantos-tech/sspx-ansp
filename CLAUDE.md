---
title: ANSP Scholarship System
description: Guidance for AI agents working on the Arca Nossa Senhora da Providência scholarship application system (Next.js 16, Postgres, Drizzle).
---

# CLAUDE.md

This file is the single source of truth for AI agent guidance in this repository. `AGENTS.md` is a symbolic link to this file.

## Project Overview

Scholarship application system ("Solicitação de Bolsa para Família Necessitada") for **Arca Nossa Senhora da Providência (ANSP)** — the nonprofit association (mantenedora) behind Colégio São José / ACIPEC / FSSPX in Itatiba-SP.

Next.js 16 App Router application: a public multi-step form, an admin review panel, a public donor sign-up page, and PDF generation for decisions and contracts. Deployed to the shared DigitalOcean droplet behind Traefik — see `docs/plano-deploy-droplet.md`. Production URL: https://ansp.apps.rmsantos.tech

## Architecture

- **Data**: Postgres via Drizzle ORM (`postgres.js` driver). Schema in `lib/db/schema.ts`, migrations in `drizzle/` (6 migrations). Drizzle field names deliberately match the DB column names (`snake_case`) because server actions return rows straight to components and PDF renderers.
- **Auth**: iron-session cookie, admin accounts in `admin_users` (scrypt hashes, `lib/auth/password.ts`). `proxy.ts` guards `/admin`; every admin server action calls `requireAuth()` independently. There is no row-level security — authorization lives entirely in the application. Dev bypass: `AUTH_BYPASS=true` with `admin@admin.com` / `admin123` (ignored in production).
- **Storage**: documents are written to `STORAGE_DIR` through the driver in `lib/storage/`. Upload and download go through `/api/uploads` and `/api/documents`, authorized by HMAC tickets (`lib/storage/tickets.ts`) signed with `SESSION_SECRET`. Upload and download tickets use separate derived keys. Max upload: 10 MB.
- **Bootstrap**: `scripts/bootstrap.ts` runs on every start; it is idempotent and never overwrites existing rows or passwords.
- **PDFs**: `@react-pdf/renderer` in `lib/pdf/` — application, decision, contract, and donor receipts share `document-header.tsx`.
- **Templates**: decision and contract text use token replacement (`lib/templates/token-replacer.ts`, `contract-tokens.ts`).

Any page that reads the database must be dynamic — `app/form/page.tsx` sets `force-dynamic`; admin pages get it implicitly from `cookies()`. Do not wrap `cookies()` in a `try/catch` that swallows errors: that hides Next's dynamic-rendering signal and the page will fail at build time.

Form submission runs inside a database transaction. Upload paths are server-generated (`pending/{uuid}/...`); files move to `applications/` or `donors/` on successful submission.

## Routes

| Area | Path | Key files |
|------|------|-----------|
| Landing | `/` | `app/page.tsx` |
| Scholarship form | `/form` | `app/form/page.tsx`, `app/form/_actions/form-actions.ts`, 6 step components |
| Donor sign-up | `/benfeitor` | `app/benfeitor/page.tsx`, `app/benfeitor/_actions/donor-actions.ts` |
| Admin login | `/login` | `app/login/page.tsx`, `app/login/_actions/auth-actions.ts` |
| Admin panel | `/admin/*` | `app/admin/_actions/admin-actions.ts`, layout with sidebar/topbar |
| Upload API | `PUT /api/uploads` | Ticket scope `upload` |
| Download API | `GET /api/documents` | Ticket scope `download` |
| Health | `GET /api/health` | Used by deploy hook; validates app + Postgres |

Admin sections: solicitações, benfeitores, ano letivo, cabeçalho (PDF header), textos (decision templates), contrato (contract template).

## Repository Structure

```
app/                 # Next.js routes (form, admin, benfeitor, login, api)
lib/                 # db, auth, storage, pdf, validations, templates
drizzle/             # SQL migrations
scripts/             # bootstrap, backup, post-receive deploy hook, cleanup
docs/
├── design/          # Open Design prototypes, assets and previews (reference only)
│   └── opendesign/
├── examples/        # Original paper form, contract template, sample PDFs
└── plano-deploy-droplet.md
proxy.ts             # Next.js 16 proxy guard for /admin/* (no middleware.ts)
```

## Schema (key tables)

`admin_users`, `school_years` (only one `ativo=true`), `applications` (status: pendente/aprovada/rejeitada), `students`, `other_children`, `vehicles`, `collaboration`, `benefactors`, `documents`, `decision_templates`, `contract_templates`, `document_header`, `donor_pledges`.

## UX/UI and Design

Leia `PRODUCT.md`, `DESIGN.md` e `COPY.md` antes de trabalho de UX/UI ou copy. O catálogo e os protótipos ficam em `docs/design/opendesign/`; são referência visual, não código de produção. A fonte executável dos tokens é `app/globals.css` e os componentes em `app/` e `components/` prevalecem em qualquer divergência.

## Development

```bash
cp .env.example .env
npm run db:start          # Postgres on port 5433
npm run db:migrate && npm run db:bootstrap
npm run dev
```

Key env vars: `DATABASE_URL`, `SESSION_SECRET` (≥32 chars), `STORAGE_DIR`, `ADMIN_EMAIL`/`ADMIN_PASSWORD`, `APP_HOST` (production routing only).

Production start: `npm start` = migrate → bootstrap → `next start`.

## Testing

`npm test` (Vitest) is the deploy gate — it runs inside the Docker build, so a failing suite means the image is never produced and the previous container keeps serving.

Server actions are tested against `__tests__/helpers/fake-db.ts`, a stand-in for the Drizzle client. Configure a table's reads with `queryFor("<schemaExportName>").findFirst/findMany` and assert writes via the `inserted`/`updated`/`deleted` arrays.

## Deploy

- **Dockerfile**: `npm ci` → `npm test` → `npm run build` → `CMD npm start`
- **Production compose**: `compose.traefik.yaml` (Traefik labels, volume for uploads, `internal` + `proxy` networks)
- **Push-to-deploy**: `git push production main` → `scripts/post-receive.sh` → build with health check at `/api/health`, automatic rollback on failure
- **Backup**: `scripts/backup.sh` — weekly cron on droplet (Postgres dump + uploads, GPG-encrypted)

## Domain Context

- **ACIPEC**: Associação Civil Para a Educação Católica (CNPJ 62.611.908/0001-99)
- The scholarship form collects: parent info, student/grade/tuition data, sworn family income declaration, monthly expenses, vehicle ownership, volunteer availability, and legal terms
- The data is sensitive (family income declarations, ID documents) — treat backups, document URLs, and log output accordingly
- Language: all UI is Brazilian Portuguese (pt-BR)
