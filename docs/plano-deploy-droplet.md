# Deploy do sspx-ansp no Droplet

O Supabase foi removido: o sistema roda com Postgres + Drizzle, sessão própria
(iron-session) e documentos em volume Docker, seguindo as convenções dos outros
projetos do droplet (`sspx-donation`, `sspx-catechism`): Docker Compose +
Traefik compartilhado e push-to-deploy via `git push production main`.

Runbook canônico do droplet: `sspx-catechism/infra/README.md` (§8 =
push-to-deploy). Este documento cobre só o que é específico do sspx-ansp.

## Estado

| Fase | Situação |
|---|---|
| 1. Remoção do Supabase (banco, auth, storage) | **feito** |
| 2. Dockerização (Dockerfile, compose, health check) | **feito** |
| 3. Primeira publicação no droplet | **feito** — no ar em https://ansp.apps.rmsantos.tech |
| 4. Push-to-deploy | **feito** — hook instalado, `deploy.healthUrl` configurado |
| 5. Backup e operação | **feito** — cron semanal (dom 04:00 UTC) instalado; restauração testada em 2026-08-06 (dump + uploads conferidos numa base descartável) |

## O que mudou (fases 1 e 2)

| Antes (Supabase) | Agora |
|---|---|
| `@supabase/ssr` + PostgREST | Drizzle ORM sobre `postgres.js` (`lib/db/`) |
| Migrations em `supabase/migrations/` + RLS + grants | `drizzle/` — RLS/grants descartados, CHECK constraints e o trigger de ano ativo preservados em `0001` |
| Supabase Auth (`signInWithPassword`) | iron-session + tabela `admin_users` com hash scrypt |
| Supabase Storage + signed URLs | volume Docker + tickets HMAC (`/api/uploads`, `/api/documents`) |
| `seed.sql` | `scripts/bootstrap.ts`, idempotente, executado no `npm start` |
| — | `GET /api/health` (valida Traefik → app → Postgres) |

A submissão do formulário agora roda dentro de uma **transação** — antes, uma
falha no meio deixava a solicitação pela metade. E quando o arquivo não pode ser
movido de `pending/` para `applications/`, a linha guarda o caminho de origem em
vez de apontar para um arquivo inexistente (era o que a migration de correção
`20260617000001` limpava).

**A RLS deixou de existir.** A autorização passou a ser inteiramente da
aplicação: `proxy.ts` protege `/admin` e cada server action administrativa chama
`requireAuth()` por conta própria (coberto por teste).

## Fase 3 — Primeira publicação

### 3.1 Hostname

**`ansp.apps.rmsantos.tech`** — mesmo padrão do `catequese.apps.rmsantos.tech`.

Não há DNS a criar: `*.apps.rmsantos.tech` é um wildcard que aponta para o
droplet (`64.225.15.219`), então o nome já resolve e o Let's Encrypt emite o
certificado na primeira subida. Confirme antes de publicar:

```bash
dig +short ansp.apps.rmsantos.tech    # deve terminar no IP do droplet
```

Se um dia o formulário passar a ser divulgado num domínio institucional, o
Traefik aceita os dois nomes no mesmo router (`Host(\`a\`) || Host(\`b\`)`) —
é editar a label e rodar `compose up -d`, sem downtime nem rebuild.

### 3.2 Criar a database no Postgres compartilhado

O app não sobe banco próprio: usa o Postgres compartilhado, que vive em
`/opt/apps/databases/postgres` (container `postgres-postgres-1`, imagem
`postgres:17-alpine`). Na rede `internal` ele atende pelo alias **`postgres`**,
e o superusuário é **`postgres_admin`** — foi assim que a `donation` foi
configurada.

O ANSP tem database e usuário próprios, sem compartilhar credencial com
nenhum outro app:

```bash
ssh renan@64.225.15.219
DBPW=$(openssl rand -hex 24)   # não ecoe este valor

docker exec -i postgres-postgres-1 psql -U postgres_admin -d postgres <<SQL
CREATE ROLE ansp LOGIN PASSWORD '$DBPW';
CREATE DATABASE ansp OWNER ansp;
SQL

docker exec -i postgres-postgres-1 psql -U postgres_admin -d ansp \
  -c "GRANT ALL ON SCHEMA public TO ansp;"

# Fecha o CONNECT que o Postgres concede a PUBLIC por padrão: sem isto, o
# usuário de qualquer outro app do droplet consegue abrir conexão nesta base.
docker exec -i postgres-postgres-1 psql -U postgres_admin -d postgres <<'SQL'
REVOKE CONNECT ON DATABASE ansp FROM PUBLIC;
GRANT CONNECT ON DATABASE ansp TO ansp;
SQL
```

Confira o resultado — só `ansp` e o superusuário devem responder `true`:

```bash
docker exec postgres-postgres-1 psql -U postgres_admin -d postgres -tAc \
  "select rolname, has_database_privilege(rolname,'ansp','CONNECT') from pg_roles where rolcanlogin;"
```

### 3.3 Clonar e configurar

O droplet autentica no GitHub por chave SSH (`~/.ssh/id_ed25519`), então use a
URL SSH — a HTTPS pede usuário e falha em sessão não interativa.

```bash
git clone git@github.com:renan-rmsantos-tech/sspx-ansp.git /opt/apps/projects/sspx-ansp
cd /opt/apps/projects/sspx-ansp
cp .env.example .env
nano .env
chmod 600 .env
```

No `.env` de produção:

```ini
DATABASE_URL=postgresql://ansp:SENHA@postgres:5432/ansp
SESSION_SECRET=<openssl rand -base64 48>
STORAGE_DIR=/data/uploads
ADMIN_EMAIL=<email do comitê>
ADMIN_PASSWORD=<senha forte inicial>
APP_HOST=ansp.apps.rmsantos.tech
BACKUP_PASSPHRASE=<openssl rand -base64 32>
# AUTH_BYPASS deve ficar FORA do .env de produção.
```

### 3.4 Subir

```bash
docker compose -f compose.traefik.yaml up -d --build
docker compose -f compose.traefik.yaml logs -f ansp   # migrations + bootstrap
```

O `npm start` do container aplica as migrations e roda o bootstrap antes de
servir, então a primeira subida já cria as tabelas, o admin e os modelos de
decisão/contrato.

### 3.5 Verificar

| Item | Comando / evidência esperada |
|---|---|
| DNS | `dig +short ansp.apps.rmsantos.tech` devolve o IP do droplet |
| TLS + Traefik | `curl -I https://<HOST>` com certificado válido |
| Health | `curl -fsS https://<HOST>/api/health` → `{"status":"ok","database":"ok"}` |
| Stack | `docker compose -f compose.traefik.yaml ps` → `ansp` Up |
| Guarda do admin | `curl -I https://<HOST>/admin` → 307 para `/login` |
| Login real | entrar com `ADMIN_EMAIL`/`ADMIN_PASSWORD` |
| Formulário | submeter uma solicitação de teste com anexo |
| Documento | abrir o anexo no painel (ticket de 5 min) |
| PDFs | exportar ficha, decisão e contrato de uma solicitação aprovada |
| Volume | `docker volume inspect sspx-ansp_uploads` e o arquivo de teste dentro |

## Fase 4 — Push-to-deploy

O `scripts/post-receive.sh` já está no repo, idêntico ao dos outros projetos.

**No droplet, uma vez:**

```bash
cd /opt/apps/projects/sspx-ansp
git config receive.denyCurrentBranch updateInstead
git config deploy.healthUrl https://ansp.apps.rmsantos.tech/api/health
cp scripts/post-receive.sh .git/hooks/post-receive
chmod +x .git/hooks/post-receive
```

> Copie, **não** faça symlink — com `updateInstead` o work-tree é atualizado
> antes do hook rodar, e reescrever o script em execução corrompe o bash.

**Na sua máquina, uma vez:**

```bash
git remote add production renan@64.225.15.219:/opt/apps/projects/sspx-ansp
```

**No dia a dia:** `git push origin main` e depois `git push production main`
(build + testes + health check, com rollback automático).

O portão de testes fica no `Dockerfile` (`RUN npm test`, 274 testes): se a suíte
quebra, a imagem não é gerada, o `compose up` aborta e o container antigo segue
servindo. Acrescente a linha do sspx-ansp na tabela "Reaproveitando em outros
projetos" do `sspx-catechism/infra/README.md`.

## Fase 5 — Backup

`scripts/backup.sh` salva **banco e documentos juntos** — um sem o outro não
restaura, porque `documents.storage_path` aponta para arquivos do volume. A
saída é cifrada com GPG (`BACKUP_PASSPHRASE`), já que são declarações de renda e
documentos de identidade.

```bash
cd /opt/apps/projects/sspx-ansp
./scripts/backup.sh
```

Crons instalados no droplet (usuário `renan`; logs em `~/ansp-*.log`):

```cron
30 3 * * * docker exec sspx-ansp-ansp-1 npm run storage:cleanup >> /home/renan/ansp-cleanup.log 2>&1
0 4 * * 0 cd /opt/apps/projects/sspx-ansp && ./scripts/backup.sh >> /home/renan/ansp-backup.log 2>&1
```

**Restauração testada em 2026-08-06**: decifrado com a `BACKUP_PASSPHRASE` do
`.env`, dump restaurado sem erros numa base descartável (`CREATE DATABASE`
requer o superusuário `postgres_admin`), contagens de todas as tabelas
idênticas à base viva e os 15 arquivos do `uploads.tar` batendo com
`documents`. Repetir o teste após mudanças estruturais no schema ou no script.

Para enviar off-site, o padrão do droplet é o DigitalOcean Spaces (ver §5 e §7
do runbook do catechism) — basta um `aws s3 cp` do arquivo cifrado ao final do
script.

## Operação do dia a dia

Todos no droplet, em `/opt/apps/projects/sspx-ansp`:

| Ação | Comando |
|---|---|
| Ver logs | `docker compose -f compose.traefik.yaml logs -f ansp` |
| Reiniciar | `docker compose -f compose.traefik.yaml restart ansp` |
| Status | `docker compose -f compose.traefik.yaml ps` |
| Atualizar | `git push production main` da sua máquina |
| Log dos deploys | `tail -f ~/deploy-sspx-ansp.log` |
| Backup manual | `./scripts/backup.sh` |
| Trocar senha de admin | atualize o hash em `admin_users` (`lib/auth/password.ts`) |

## Pontos de atenção

- **Sem RLS**: a segurança dos dados é 100% da aplicação. Ao criar uma nova
  server action administrativa, chamar `requireAuth()` não é opcional.
- **`SESSION_SECRET` é duplamente crítico**: assina a sessão **e** os tickets de
  acesso aos documentos. Trocá-lo desloga todo mundo e invalida os tickets em
  voo (nada se perde; as URLs abertas só param de funcionar).
- **O volume `uploads` precisa sobreviver ao redeploy** — nunca rode
  `docker compose down -v` neste projeto.
- **O build roda no próprio droplet** e compete por CPU com as apps no ar
  (limitação conhecida do runbook). Aceitável no volume atual.
