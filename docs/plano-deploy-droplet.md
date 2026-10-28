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
APP_HOST_WWW=www.ansp.apps.rmsantos.tech
APP_HOST_LEGACY=ansp.apps.rmsantos.tech
RESEND_API_KEY=<chave de envio restrita ao domínio>
RESEND_FROM="Arca Nossa Senhora da Providência <contato@arcaprovidencia.com.br>"
BACKUP_PASSPHRASE=<openssl rand -base64 32>
# AUTH_BYPASS deve ficar FORA do .env de produção.
```

### 3.4 Configurar e-mail de boas-vindas (Resend)

1. No painel do Resend, adicione o domínio que será usado no remetente e copie
   para o provedor DNS os registros que o próprio painel indicar. Verifique o
   domínio no Resend antes de tentar enviar. Se já houver um registro SPF,
   incorpore a autorização indicada pelo Resend ao registro existente em vez de
   criar um segundo SPF.
2. Crie uma API key com permissão de envio e, se disponível, restrinja-a ao
   domínio verificado. Guarde-a como segredo: não a envie por chat, não a
   coloque no Git e não a inclua em logs.
3. No `.env` de produção do droplet, defina `RESEND_API_KEY` e `RESEND_FROM`.
   O endereço após o nome de exibição precisa pertencer ao domínio verificado.
   O exemplo acima usa `contato@arcaprovidencia.com.br`; confirme que esse é o
   domínio institucional que a equipe deseja autenticar antes de usar esse
   endereço em produção.
4. Recrie o serviço para carregar as variáveis e valide o envio pela ação de
   teste de e-mail no painel administrativo:

   ```bash
   cd /opt/apps/projects/sspx-ansp
   docker compose -f compose.traefik.yaml up -d --force-recreate ansp
   docker compose -f compose.traefik.yaml logs --tail=100 ansp
   ```

O envio usa a API HTTPS do Resend (saída TCP 443); não é necessário instalar
Nodemailer no droplet nem liberar uma porta SMTP. Não passe a chave como
argumento de shell e não copie o conteúdo de `.env` para chamados ou logs.

### 3.5 Subir

```bash
docker compose -f compose.traefik.yaml up -d --build
docker compose -f compose.traefik.yaml logs -f ansp   # migrations + bootstrap
```

O `npm start` do container aplica as migrations e roda o bootstrap antes de
servir, então a primeira subida já cria as tabelas, o admin e os modelos de
decisão/contrato.

### 3.6 Verificar

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

Crons existentes e linha proposta para a fase 2 (usuário `renan`; logs em
`~/ansp-*.log`):

```cron
30 3 * * * docker exec sspx-ansp-ansp-1 npm run storage:cleanup >> /home/renan/ansp-cleanup.log 2>&1
0 4 * * 0 cd /opt/apps/projects/sspx-ansp && ./scripts/backup.sh >> /home/renan/ansp-backup.log 2>&1
# Instalar a linha abaixo somente após a liberação e verificação da fase 2:
0 12 * * * docker exec sspx-ansp-ansp-1 npm run donors:reminders >> /home/renan/ansp-reminders.log 2>&1
```

### Lembretes diários dos benfeitores — ativação da fase 2

A linha das 12:00 **UTC** acima ainda precisa ser instalada pelo operador com
`crontab -e`, no crontab de `renan`, depois da publicação revisada da fase 2.
O processo calcula a data de cada vencimento e a elegibilidade de 10/5 dias em
`America/Sao_Paulo`, independentemente do fuso do host. O comando roda no
container atual `sspx-ansp-ansp-1`, com as mesmas variáveis e o mesmo Postgres
do aplicativo; não executa migrations nem bootstrap. Não habilite essa linha
durante a publicação do código.

Antes de instalar a linha:

1. Publique a imagem revisada da fase 2 pelo fluxo de push-to-deploy acima;
   confirme o `npm test` e `npm run build` do Dockerfile, o health check e as
   migrations aplicadas. Verifique `docker compose -f compose.traefik.yaml ps`
   no droplet. Se o build ou o health check falhar, mantenha o cron desativado.
2. Confirme no container `RESEND_API_KEY`, `RESEND_FROM` com domínio verificado
   no Resend, `APP_HOST` público em HTTPS e `SESSION_SECRET` válido. Verifique
   os valores sem imprimir a chave ou o segredo em terminal, chamados ou logs.
   No painel **Lembretes dos benfeitores**, confira o modelo e envie **Teste**
   para uma caixa controlada. O assunto traz `[TESTE]` e o link de exemplo não
   funciona; esse teste confirma apenas o envio e a apresentação do e-mail.
3. Em ambiente de teste acessível por HTTPS, com a **mesma imagem e migrations**
   da fase 2 e Resend configurado, use uma inscrição mensal de teste com opção
   de e-mail e vencimento que gere um lembrete no dia local. Execute uma vez
   `npm run donors:reminders` no container de teste, abra o link recebido na
   caixa controlada e envie um PDF ou imagem de teste. Confira na página a
   confirmação de envio **sem declaração de pagamento recebido** e, na base de
   teste, que somente a ocorrência da competência do link ganhou comprovante;
   o valor recebido continua sem confirmação bancária. Abra também um link
   inválido para conferir a mensagem discreta. Repita o job no mesmo dia:
   `sent` deve ser zero e `already_sent` deve contar o envio anterior. Não
   copie o link, o ticket nem o nome do arquivo para chamados ou logs.
4. Antes de expor o fluxo, confira a configuração de logs do app e do Traefik:
   **oculte ou suprima URL completa, query string, bearer ticket, caminho do
   comprovante e nome do arquivo** em logs de requisição/proxy, inclusive em
   erros e traces. Nunca registre corpo de upload. O link é uma credencial de
   acesso temporária; só o destinatário do e-mail deve recebê-lo.
   O `compose.traefik.yaml` desativa os access logs somente do router ANSP com
   `traefik.http.routers.ansp.observability.accesslogs=false`, preservando os
   logs dos outros aplicativos. Após o deploy, confirme a label no container
   ANSP e faça uma requisição com caminho de teste sem credenciais; verifique
   que ela não aparece nos access logs do Traefik. As contagens do aplicativo
   e o health check em `/api/health` continuam disponíveis para monitoramento.

Após essas verificações, instale a linha exata acima e confira `crontab -l`.
No dia seguinte, `tail -n 10 /home/renan/ansp-reminders.log` deve mostrar uma
linha `[donors:reminders]` com `date` (data de São Paulo) e contagens
`candidates`, `sent`, `already_sent`, `failed`, `uncertain`, `in_progress`,
`expired` e `skipped_paid`. O npm também pode imprimir o nome do script; a
linha do aplicativo contém apenas data, contagens e categoria de falha
operacional. Nunca deve conter nome, e-mail, CPF, corpo da mensagem, URL,
ticket, caminho ou nome de comprovante. A aceitação `sent` é da API do Resend,
não comprova entrega na caixa de entrada. Monitore ausência da linha diária,
saída não zero e crescimento de `failed`/`uncertain`; encaminhe isso ao
responsável operacional no mesmo dia.

Se a execução falhar, corrija primeiro configuração, banco ou disponibilidade
do Resend. O job retorna código **não zero** se houver `failed`, `uncertain` ou
falha operacional. Enquanto ainda for o **mesmo dia em São Paulo**, execute
novamente `docker exec sspx-ansp-ansp-1 npm run donors:reminders` e confira
`echo $?` e as contagens. Um registro `sent` não é reenviado nessa repetição.
Depois da data programada não há envio retroativo automático. No painel
**Lembretes dos benfeitores**, use **Reenviar** apenas em registros `failed`
que ainda estejam no prazo e com opção de e-mail ativa. Para `uncertain`,
verifique primeiro o resultado no painel do Resend e marque-o como aceito ou
como falha definitiva antes de qualquer nova tentativa; não reenvie às cegas.
Se a execução diária faltar por completo, registre o incidente e avalie os
registros afetados no painel, pois a janela de 10/5 dias não é recuperada pelo
cron do dia seguinte.

**Restauração testada em 2026-08-06**: decifrado com a `BACKUP_PASSPHRASE` do
`.env`, dump restaurado sem erros numa base descartável (`CREATE DATABASE`
requer o superusuário `postgres_admin`), contagens de todas as tabelas
idênticas à base viva e os 15 arquivos do `uploads.tar` batendo com
`documents`. Repetir o teste após mudanças estruturais no schema ou no script.

**Off-site configurado (2026-08-06)**: o final do `backup.sh` envia o arquivo
cifrado para o DigitalOcean Spaces (`s3://rmsantos-backup/ansp/`, região
`nyc3`) usando o CLI da AWS via Docker (`amazon/aws-cli`) apontado para o
endpoint do Spaces — nada precisa ser instalado no droplet. Credenciais em
`SPACES_KEY`/`SPACES_SECRET`/`SPACES_BUCKET`/`SPACES_REGION` no `.env`; a
chave é restrita ao bucket (não lista nem cria buckets, nem altera lifecycle
rules), por isso a retenção remota (90 dias, `RETENTION_REMOTE_DAYS`) é feita
pelo próprio script comparando o timestamp embutido no nome do arquivo.
Ciclo completo testado: upload, download do bucket e decifragem com a
`BACKUP_PASSPHRASE`.

> A `BACKUP_PASSPHRASE` só existe no `.env` do droplet — guarde uma cópia num
> gerenciador de senhas: sem ela os backups (locais e do Spaces) são
> indecifráveis.

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
