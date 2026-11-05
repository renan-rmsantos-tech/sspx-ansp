"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { ScreenProps } from "../shell";
import { Button, Card, Field, Notice, PageHeader, Tabs, TextInput, Textarea } from "../ui";

type Tab = "boas-vindas" | "instrucoes" | "lembretes";

const TEMPLATES: Record<Tab, { titulo: string; quando: string; assunto: string; corpo: string }> = {
  "boas-vindas": {
    titulo: "Boas-vindas",
    quando: "Enviado uma vez, logo após o cadastro do benfeitor.",
    assunto: "Bem-vindo à Arca Nossa Senhora da Providência",
    corpo: "Prezado(a) {nome},\n\nAgradecemos sua generosidade. Sua contribuição ajuda famílias do Colégio São José a manter seus filhos em uma educação católica.\n\nQue Nossa Senhora da Providência o(a) abençoe.",
  },
  instrucoes: {
    titulo: "Instruções de pagamento mensal",
    quando: "Enviado após o cadastro mensal, com os dados bancários e o QR Code Pix.",
    assunto: "Como fazer sua contribuição mensal",
    corpo: "Prezado(a) {nome},\n\nSua contribuição de {valor} vence todo dia {dia}. Você pode pagar por Pix usando o QR Code abaixo ou por transferência.\n\nApós o pagamento, envie o comprovante pelo seu link pessoal.",
  },
  lembretes: {
    titulo: "Lembretes de vencimento",
    quando: "Enviados automaticamente 10 e 5 dias antes do vencimento, para quem optou por lembretes.",
    assunto: "Lembrete: contribuição vence em {dias} dias",
    corpo: "Prezado(a) {nome},\n\nSua contribuição mensal de {valor} vence em {data}. Agradecemos por manter seu compromisso com a Arca.",
  },
};

export function ComunicacoesScreen(_: ScreenProps) {
  const [tab, setTab] = useState<Tab>("boas-vindas");
  const [drafts, setDrafts] = useState(TEMPLATES);
  const [saved, setSaved] = useState(false);
  const t = drafts[tab];

  return (
    <div className="space-y-6">
      <PageHeader title="E-mails aos benfeitores" description="Textos das mensagens automáticas. As alterações valem para os próximos envios; o cabeçalho e o rodapé vêm de Cabeçalho e rodapé." odId="comunicacoes-header" />

      <Tabs<Tab>
        label="Tipo de e-mail"
        value={tab}
        onChange={(id) => { setTab(id); setSaved(false); }}
        tabs={[
          { id: "boas-vindas", label: "Boas-vindas" },
          { id: "instrucoes", label: "Instruções de pagamento" },
          { id: "lembretes", label: "Lembretes de vencimento" },
        ]}
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]" data-od-id={`email-${tab}`}>
          <form
            className="space-y-5"
            onSubmit={(e) => { e.preventDefault(); setSaved(true); }}
          >
            <Notice>{t.quando}</Notice>
            <Field label="Assunto">
              {(a11y) => <TextInput {...a11y} value={t.assunto} onChange={(e) => setDrafts({ ...drafts, [tab]: { ...t, assunto: e.target.value } })} />}
            </Field>
            <Field label="Mensagem" hint="Use {nome}, {valor}, {dia} e {data}; eles são trocados pelos dados do benfeitor.">
              {(a11y) => <Textarea {...a11y} rows={10} value={t.corpo} onChange={(e) => setDrafts({ ...drafts, [tab]: { ...t, corpo: e.target.value } })} />}
            </Field>
            {saved && <Notice tone="success">Texto salvo. Vale para os próximos envios.</Notice>}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="lg">Salvar texto</Button>
              <Button type="button" size="lg" variant="outline"><Send aria-hidden /> Enviar teste para mim</Button>
            </div>
          </form>

          <aside className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Como o benfeitor vê</h3>
            <Card padded={false} className="overflow-hidden">
              <div className="border-b border-border bg-accent px-5 py-4 text-center">
                <div className="font-heading text-sm font-semibold tracking-wide text-gold">ARCA N. S. DA PROVIDÊNCIA</div>
                <div className="mt-0.5 text-[11px] text-white/80">Associação mantenedora do Colégio São José</div>
              </div>
              <div className="space-y-3 px-5 py-4 text-sm leading-relaxed text-fg">
                <p className="font-semibold">{t.assunto.replace("{dias}", "10")}</p>
                {t.corpo.split("\n\n").map((p, i) => (
                  <p key={i} className="whitespace-pre-line text-muted">{p.replace("{nome}", "Maria Aparecida").replace("{valor}", "R$ 150,00").replace("{dia}", "10").replace("{data}", "10/11/2026")}</p>
                ))}
              </div>
              <div className="border-t border-border bg-bg px-5 py-3 text-center text-[11px] text-muted">ACIPEC · CNPJ 42.736.079/0001-63 · Itatiba-SP</div>
            </Card>
          </aside>
        </div>
      </Tabs>
    </div>
  );
}
