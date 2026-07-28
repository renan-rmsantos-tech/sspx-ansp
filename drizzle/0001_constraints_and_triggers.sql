-- Custom SQL migration file, put your code below! --

-- CHECK constraints: os valores permitidos também são validados no Zod, mas
-- mantê-los no banco impede que um bug numa action grave um estado inválido.

ALTER TABLE "applications" ADD CONSTRAINT "applications_status_check"
  CHECK ("status" IN ('pendente', 'aprovada', 'rejeitada'));

ALTER TABLE "decision_templates" ADD CONSTRAINT "decision_templates_tipo_check"
  CHECK ("tipo" IN ('aprovacao', 'rejeicao'));

ALTER TABLE "donor_pledges" ADD CONSTRAINT "donor_pledges_frequencia_check"
  CHECK ("frequencia" IN ('unica', 'mensal'));

ALTER TABLE "donor_pledges" ADD CONSTRAINT "donor_pledges_duracao_check"
  CHECK ("duracao" IS NULL OR "duracao" IN ('um_ano', 'indeterminado'));

ALTER TABLE "donor_pledges" ADD CONSTRAINT "donor_pledges_valor_check"
  CHECK ("valor" > 0);

ALTER TABLE "donor_pledges" ADD CONSTRAINT "donor_pledges_meio_pagamento_check"
  CHECK ("meio_pagamento" IN ('cartao', 'boleto', 'transferencia', 'pix'));

ALTER TABLE "donor_pledges" ADD CONSTRAINT "donor_pledges_lembrete_canal_check"
  CHECK ("lembrete_canal" IS NULL OR "lembrete_canal" IN ('whatsapp', 'email'));

-- Apenas um ano letivo ativo. O índice parcial único (definido no schema) já
-- barra dois INSERTs com ativo=true; este trigger cobre o UPDATE, desativando
-- o ano anterior antes que o índice seja verificado.
CREATE OR REPLACE FUNCTION enforce_single_active_school_year()
RETURNS trigger AS $$
BEGIN
  IF new.ativo = true THEN
    UPDATE school_years
    SET ativo = false
    WHERE ativo = true AND id <> new.id;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_single_active_school_year
  BEFORE INSERT OR UPDATE OF ativo ON school_years
  FOR EACH ROW
  WHEN (new.ativo = true)
  EXECUTE FUNCTION enforce_single_active_school_year();
