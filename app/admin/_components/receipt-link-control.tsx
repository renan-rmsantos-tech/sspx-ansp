"use client";

import { useState } from "react";
import { issueDonorReceiptRecoveryLink } from "../_actions/donor-receipt-actions";

export function ReceiptLinkControl({ pledgeId, competencia }: { pledgeId: string; competencia: string }) {
  const [result, setResult] = useState<{ link: string; expiresAt: string } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function generate() {
    setBusy(true); setMessage(""); setResult(null);
    try {
      const response = await issueDonorReceiptRecoveryLink(pledgeId, competencia);
      if (response.status === "issued") setResult(response);
      else setMessage(response.status === "configuration" ? "Configuração do endereço indisponível." : "Esta ocorrência não aceita um novo link.");
    } catch { setMessage("Não foi possível gerar o link."); }
    finally { setBusy(false); }
  }
  async function copy() {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.link); setMessage("Link copiado."); }
    catch { setMessage("Não foi possível copiar. Selecione o link e copie manualmente."); }
  }
  return <div className="space-y-2 text-sm">
    <button type="button" disabled={busy} onClick={generate} className="rounded border border-border px-3 py-2">Gerar link de comprovante</button>
    {result && <div><label className="block">Link do comprovante<input readOnly value={result.link} onFocus={e => e.currentTarget.select()} className="mt-1 w-full rounded border border-border p-2" /></label><p>Válido até {new Date(result.expiresAt).toLocaleString("pt-BR")}</p><button type="button" onClick={copy} className="rounded border border-border px-3 py-2">Copiar link</button></div>}
    {message && <p role="status">{message}</p>}
  </div>;
}
