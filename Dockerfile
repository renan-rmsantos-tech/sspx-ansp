# syntax=docker/dockerfile:1.7
FROM node:22-slim

# @react-pdf/renderer depende de fontkit/pdfkit; a imagem slim (glibc) evita as
# incompatibilidades de binários que a alpine (musl) provoca na geração de PDF.
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Portão de testes do push-to-deploy (scripts/post-receive.sh): substitui o job
# de testes do GitHub Actions, bloqueado no nível da conta. Se a suíte quebra, a
# imagem não é gerada, o `compose up` aborta e o container antigo segue servindo.
# Roda antes do NODE_ENV=production porque precisa das devDependencies.
RUN npm test

ENV NODE_ENV=production

# O build não acessa o banco: lib/db só conecta na primeira query, e o
# NEXT_PHASE dispensa o DATABASE_URL durante o "collecting page data".
RUN npm run build

# Documentos enviados no formulário. Volume nomeado no compose — precisa
# sobreviver ao redeploy.
ENV STORAGE_DIR=/data/uploads
RUN mkdir -p /data/uploads

EXPOSE 3000

# `npm start` roda as migrações e o bootstrap idempotente antes do next start.
CMD ["npm", "start"]
