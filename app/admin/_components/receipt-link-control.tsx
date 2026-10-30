"use client";

import { useState } from "react";
import { Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { issueDonorReceiptRecoveryLink } from "../_actions/donor-receipt-actions";
import { Field } from "./field";

/**
 * Gera, para o administrador, o link pelo qual o benfeitor envia o comprovante
 * mensal pendente. O link aparece no lugar, com validade, para copiar.
 */
export function ReceiptLinkControl({ pledgeId, competencia }: { pledgeId: string; competencia: string }) {
  const [result, setResult] = useState<{ link: string; expiresAt: string } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      const response = await issueDonorReceiptRecoveryLink(pledgeId, competencia);
      if (response.status === "issued") setResult(response);
      else setMessage(response.status === "configuration" ? "Configuração do endereço indisponível." : "Esta ocorrência não aceita um novo link.");
    } catch {
      setMessage("Não foi possível gerar o link.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.link);
      setMessage("Link copiado.");
    } catch {
      setMessage("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-bg/60 p-4 text-sm" data-testid="receipt-link-control">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted">Sem comprovante do mês. Gere um link para o benfeitor enviar o comprovante.</p>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={generate}>
          <Link2 aria-hidden="true" /> Gerar link de comprovante
        </Button>
      </div>
      {result && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Field label="Link do comprovante" hint={`Válido até ${new Date(result.expiresAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`} className="min-w-0 flex-1">
            {(a11y) => (
              <Input
                {...a11y}
                readOnly
                value={result.link}
                onFocus={(event) => event.currentTarget.select()}
                className="bg-surface font-mono text-xs"
              />
            )}
          </Field>
          <Button type="button" variant="outline" size="sm" onClick={copy} className="h-8 sm:mb-6">
            <Copy aria-hidden="true" /> Copiar link
          </Button>
        </div>
      )}
      {message && (
        <p role="status" className="text-muted">
          {message}
        </p>
      )}
    </div>
  );
}
