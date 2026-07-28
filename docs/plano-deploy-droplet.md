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
| 3. Primeira publicação no droplet | pendente — precisa de acesso SSH |
| 4. Push-to-deploy | pendente — depende da fase 3 |
| 5. Backup e operação | script pronto (`scripts/backup.sh`), cron pendente |

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

### 3.1 Definir o hostname

Confira no droplet qual padrão usar (`docker ps | grep traefik` e as labels dos
outros composes). Em uso hoje: subdomínio interno
(`catequese.apps.rmsantos.tech`) ou domínio dedicado
(`ajude-o-colegio-sao-jose.com`). Sugestão: **`bolsas.apps.rmsantos.tech`**, com
A-record apontando para o IP do droplet. Confirme com `dig +short <HOST>` antes
de subir — o Let's Encrypt depende do DNS já propagado.

### 3.2 Criar a database no Postgres compartilhado

O app não sobe banco próprio: usa o `acipec-postgres` (do `sspx-school`) pela
rede `internal`.

```bash
ssh renan@DROPLET
docker exec -it acipec-postgres psql -U postgres <<'SQL'
CREATE DATABASE acipec_ansp;
CREATE USER ansp WITH PASSWORD 'GERE_UMA_SENHA';   -- openssl rand -base64 24
GRANT ALL PRIVILEGES ON DATABASE acipec_ansp TO ansp;
\c acipec_ansp
GRANT ALL ON SCHEMA public TO ansp;
SQL
```

> Vale também acrescentar `acipec_ansp` ao `docker/init-databases.sh` do
> `sspx-school`, para que um droplet recriado do zero já nasça com ela.

### 3.3 Clonar e configurar

```bash
sudo mkdir -p /opt/apps/projects && sudo chown renan:renan /opt/apps/projects
git clone <URL_DO_REPO> /opt/apps/projects/sspx-ansp
cd /opt/apps/projects/sspx-ansp
cp .env.example .env
nano .env
```

No `.env` de produção:

```ini
DATABASE_URL=postgres://ansp:SENHA@acipec-postgres:5432/acipec_ansp
SESSION_SECRET=<openssl rand -base64 48>
STORAGE_DIR=/data/uploads
ADMIN_EMAIL=<email do comitê>
ADMIN_PASSWORD=<senha forte inicial>
APP_HOST=bolsas.apps.rmsantos.tech
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
| DNS | `dig +short bolsas.apps.rmsantos.tech` devolve o IP do droplet |
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
git config deploy.healthUrl https://bolsas.apps.rmsantos.tech/api/health
cp scripts/post-receive.sh .git/hooks/post-receive
chmod +x .git/hooks/post-receive
```

> Copie, **não** faça symlink — com `updateInstead` o work-tree é atualizado
> antes do hook rodar, e reescrever o script em execução corrompe o bash.

**Na sua máquina, uma vez:**

```bash
git remote add production renan@DROPLET:/opt/apps/projects/sspx-ansp
```

**No dia a dia:** `git push origin main` e depois `git push production main`
(build + testes + health check, com rollback automático).

O portão de testes fica no `Dockerfile` (`RUN npm test`, 233 testes): se a suíte
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
( crontab -l 2>/dev/null; echo "23 3 * * * cd /opt/apps/projects/sspx-ansp && ./scripts/backup.sh >> /var/log/ansp-backup.log 2>&1" ) | crontab -
```

**Teste a restauração** antes de considerar a fase concluída: descriptografar,
restaurar o dump num banco descartável e conferir que os caminhos em `documents`
batem com os arquivos do `uploads.tar`.

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
