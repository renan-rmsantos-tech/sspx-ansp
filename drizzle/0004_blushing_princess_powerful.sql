-- Antes de criar os índices únicos, remove eventuais duplicatas acumuladas
-- pelo padrão consultar-depois-inserir: mantém a linha mais recente
-- (updated_at, com id como desempate) e descarta as demais.
DELETE FROM "contract_templates" WHERE "id" NOT IN (
  SELECT "id" FROM "contract_templates"
  ORDER BY "updated_at" DESC, "id" DESC LIMIT 1
);--> statement-breakpoint
DELETE FROM "document_header" WHERE "id" NOT IN (
  SELECT "id" FROM "document_header"
  ORDER BY "updated_at" DESC, "id" DESC LIMIT 1
);--> statement-breakpoint
DELETE FROM "decision_templates" WHERE "id" NOT IN (
  SELECT DISTINCT ON ("tipo") "id" FROM "decision_templates"
  ORDER BY "tipo", "updated_at" DESC, "id" DESC
);--> statement-breakpoint
CREATE UNIQUE INDEX "contract_templates_singleton_idx" ON "contract_templates" USING btree ((true));--> statement-breakpoint
CREATE UNIQUE INDEX "decision_templates_tipo_idx" ON "decision_templates" USING btree ("tipo");--> statement-breakpoint
CREATE UNIQUE INDEX "document_header_singleton_idx" ON "document_header" USING btree ((true));
