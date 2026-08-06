#!/usr/bin/env bash
#
# Backup do sspx-ansp: dump do Postgres + documentos enviados no formulário.
#
# Os dois precisam ser salvos juntos: o banco guarda `documents.storage_path`,
# e os arquivos vivem no volume `uploads`. Um sem o outro não restaura.
#
# Uso (no droplet, na raiz do repo):
#   ./scripts/backup.sh                 # grava em ~/backups/ansp
#   BACKUP_DIR=/mnt/x ./scripts/backup.sh
#
# Os dados são sensíveis (declarações de renda, RG, comprovantes), então o
# arquivo final é cifrado com GPG simétrico usando BACKUP_PASSPHRASE.
set -euo pipefail

COMPOSE_FILE=${COMPOSE_FILE:-compose.traefik.yaml}
BACKUP_DIR=${BACKUP_DIR:-$HOME/backups/ansp}
RETENTION_DAYS=${RETENTION_DAYS:-30}
STAMP=$(date -u '+%Y%m%dT%H%M%SZ')

# Reaproveita o .env do deploy, onde BACKUP_PASSPHRASE e DATABASE_URL já
# estão configurados — precisa vir antes das checagens abaixo.
if { [ -z "${BACKUP_PASSPHRASE:-}" ] || [ -z "${DATABASE_URL:-}" ]; } \
    && [ -f ./.env ]; then
  set -a; . ./.env; set +a
fi

if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  echo "ERRO: BACKUP_PASSPHRASE não definido (exporte ou coloque no .env)." >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERRO: DATABASE_URL não definido (exporte ou coloque no .env)." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "==> Dump do banco"
# A imagem precisa acompanhar a versão do Postgres compartilhado do droplet
# (hoje 17) — pg_dump aborta se for mais antigo que o servidor.
docker run --rm --network internal -e PGPASSWORD \
  -e DATABASE_URL="$DATABASE_URL" postgres:17-alpine \
  pg_dump --clean --if-exists --no-owner "$DATABASE_URL" > "$WORK/db.sql"

echo "==> Documentos do volume uploads"
docker compose -f "$COMPOSE_FILE" run --rm --no-deps -T \
  -v "$WORK:/backup" ansp tar -cf /backup/uploads.tar -C /data uploads

echo "==> Empacotando e cifrando"
tar -cz -C "$WORK" db.sql uploads.tar |
  gpg --batch --yes --symmetric --cipher-algo AES256 \
      --passphrase "$BACKUP_PASSPHRASE" \
      -o "$BACKUP_DIR/ansp-$STAMP.tar.gz.gpg"

echo "==> Removendo backups com mais de $RETENTION_DAYS dias"
find "$BACKUP_DIR" -name 'ansp-*.tar.gz.gpg' -mtime "+$RETENTION_DAYS" -delete

# Cópia off-site no DigitalOcean Spaces (protocolo S3), se configurado no .env.
# O arquivo já sai cifrado daqui, então o bucket só guarda o pacote trancado.
# Usa o CLI da AWS via Docker para não instalar nada no droplet. A retenção
# remota é feita aqui mesmo (a chave é restrita ao bucket e não pode criar
# lifecycle rules): o nome do arquivo embute o timestamp UTC, então basta
# comparar com o corte e apagar os antigos.
RETENTION_REMOTE_DAYS=${RETENTION_REMOTE_DAYS:-90}

aws_spaces() {
  docker run --rm \
    -e AWS_ACCESS_KEY_ID="$SPACES_KEY" \
    -e AWS_SECRET_ACCESS_KEY="$SPACES_SECRET" \
    -v "$BACKUP_DIR:/backup:ro" \
    amazon/aws-cli "$@" \
    --endpoint-url "https://$SPACES_REGION.digitaloceanspaces.com"
}

if [ -n "${SPACES_KEY:-}" ] && [ -n "${SPACES_SECRET:-}" ] \
    && [ -n "${SPACES_BUCKET:-}" ] && [ -n "${SPACES_REGION:-}" ]; then
  echo "==> Enviando ao Spaces (s3://$SPACES_BUCKET/ansp/)"
  aws_spaces s3 cp "/backup/ansp-$STAMP.tar.gz.gpg" \
    "s3://$SPACES_BUCKET/ansp/ansp-$STAMP.tar.gz.gpg"

  echo "==> Removendo do Spaces backups com mais de $RETENTION_REMOTE_DAYS dias"
  CUTOFF=$(date -u -d "$RETENTION_REMOTE_DAYS days ago" '+%Y%m%dT%H%M%SZ')
  aws_spaces s3 ls "s3://$SPACES_BUCKET/ansp/" | awk '{print $NF}' |
    grep -E '^ansp-[0-9TZ]+\.tar\.gz\.gpg$' | while read -r f; do
      stamp=${f#ansp-}; stamp=${stamp%.tar.gz.gpg}
      if [ "$stamp" \< "$CUTOFF" ]; then
        aws_spaces s3 rm "s3://$SPACES_BUCKET/ansp/$f"
      fi
    done
else
  echo "==> SPACES_* não configurado; pulando cópia off-site"
fi

echo "==> Concluído: $BACKUP_DIR/ansp-$STAMP.tar.gz.gpg"
ls -lh "$BACKUP_DIR/ansp-$STAMP.tar.gz.gpg"
