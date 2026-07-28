# ANSP — Sistema de Solicitação de Bolsa

Sistema web de solicitação de bolsa de estudo para famílias necessitadas, desenvolvido para a **Arca Nossa Senhora da Providência (ANSP)** — associação mantenedora dos colégios da Tradição Católica no Brasil (Colégio São José / ACIPEC / FSSPX, Itatiba-SP).

## O que faz

- **Formulário público** — formulário online de 6 etapas que substitui o processo em papel, coletando dados dos pais, alunos, renda, despesas, veículos, compromissos de voluntariado e documentos comprobatórios
- **Painel administrativo** — interface para o comitê de bolsas revisar solicitações, aprovar/rejeitar com percentual de desconto, gerenciar anos letivos e personalizar modelos de carta de decisão
- **Cadastro de benfeitores** — página pública de intenção de doação (única ou mensal)
- **Documentos em PDF** — carta de decisão, contrato de concessão, ficha da solicitação e ficha do benfeitor

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **Postgres** + **Drizzle ORM** (`postgres.js`)
- **iron-session** para a autenticação do painel admin
- Documentos enviados no formulário gravados em disco (volume Docker em produção)
- **Tailwind CSS 4** + **shadcn/ui**, **Zod** para validação, **Vitest** para testes
- Deploy no **droplet DigitalOcean**, atrás do Traefik compartilhado — ver [`docs/plano-deploy-droplet.md`](docs/plano-deploy-droplet.md)

## Pré-requisitos

- Node.js 20+ e npm 10+
- [Docker](https://docs.docker.com/get-docker/) (para o Postgres local)

## Setup local

```bash
git clone <repo-url>
cd sspx-ansp
npm install
cp .env.example .env
```

O `.env.example` já vem com os valores do Postgres local. Troque apenas o
`SESSION_SECRET` se quiser (qualquer string de 32+ caracteres serve em dev).

```bash
npm run db:start     # sobe o Postgres (docker-compose.dev.yml) na porta 5433
npm run db:migrate   # aplica as migrations de drizzle/
npm run db:bootstrap # cria o admin e os registros iniciais (idempotente)
npm run dev
```

Acesse:

- Formulário público: <http://localhost:3000/form>
- Login admin: <http://localhost:3000/login>
- Painel admin: <http://localhost:3000/admin>

## Credenciais de acesso

**Desenvolvimento** — com `AUTH_BYPASS=true`, o login aceita credenciais fixas
sem consultar a tabela `admin_users`:

| Campo | Valor |
|-------|-------|
| Email | `admin@admin.com` |
| Senha | `admin123` |

A sessão criada é a mesma de produção (iron-session); só a verificação da senha
é curto-circuitada. **Nunca use `AUTH_BYPASS` em produção.**

**Produção** — o primeiro admin é criado pelo bootstrap a partir de
`ADMIN_EMAIL`/`ADMIN_PASSWORD`. Se o email já existir, a senha é preservada:
para trocá-la, atualize o hash em `admin_users` (veja `lib/auth/password.ts`).
Não há cadastro público — apenas o formulário de bolsa e a página de benfeitor
são acessíveis sem autenticação.

## Variáveis de ambiente

| Variável | Para que serve |
|---|---|
| `DATABASE_URL` | Conexão com o Postgres |
| `SESSION_SECRET` | Cookie de sessão **e** assinatura dos tickets de upload/download (mín. 32 caracteres) |
| `STORAGE_DIR` | Diretório dos documentos enviados (`/data/uploads` em produção) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin criado no bootstrap |
| `AUTH_BYPASS` | Login fixo de desenvolvimento |
| `APP_HOST` | Hostname público — lido pelo `compose.traefik.yaml`, não pela aplicação |

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Migrations + bootstrap + serve o build de produção |
| `npm run lint` | Linting com ESLint |
| `npm test` | Executa os testes |
| `npm run test:coverage` | Testes com relatório de cobertura |
| `npm run db:start` / `db:stop` | Sobe/para o Postgres local |
| `npm run db:generate` | Gera uma migration a partir de `lib/db/schema.ts` |
| `npm run db:migrate` | Aplica as migrations pendentes |
| `npm run db:bootstrap` | Cria o admin e os registros iniciais (idempotente) |

## Armazenamento de documentos

Os documentos do formulário (RG, comprovantes, extratos) não são públicos. O
fluxo substitui as signed URLs que o Supabase Storage fornecia:

1. A server action `createUploadUrl` escolhe o caminho de destino e o assina
   num **ticket HMAC** derivado do `SESSION_SECRET`.
2. O navegador faz `PUT /api/uploads?ticket=…`; a rota só grava no caminho que
   está dentro do ticket, então o cliente não escolhe onde escrever.
3. No painel, `getDocumentUrl` emite um ticket de download válido por 5 minutos,
   consumido por `GET /api/documents?ticket=…`.

Tickets de upload e download são assinados com chaves distintas — um não vale
pelo outro.

## Estrutura do projeto

```
app/
├── form/            # Formulário público (6 etapas)
├── admin/           # Painel administrativo
├── benfeitor/       # Cadastro público de benfeitores
├── login/           # Tela de autenticação
└── api/             # health check, upload e download de documentos

lib/
├── db/              # Schema Drizzle e cliente do Postgres
├── auth/            # Sessão (iron-session), hash de senha, bypass de dev
├── storage/         # Driver de arquivos e tickets assinados
├── pdf/             # Documentos gerados (decisão, contrato, ficha)
├── validations/     # Schemas Zod e validação de CPF
└── templates/       # Substituição de tokens

drizzle/             # Migrations SQL versionadas
scripts/             # bootstrap, backup e hook de deploy
design/              # Protótipos HTML (referência visual)
docs/                # Brand spec, plano de deploy e formulário original
```
