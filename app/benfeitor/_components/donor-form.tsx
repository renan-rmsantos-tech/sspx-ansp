"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { registerDonorPledge } from "../_actions/donor-actions";
import type { DonorPledge } from "@/lib/validations/donor-schema";
import { isValidCPF } from "@/lib/validations/cpf";
import {
  FileUpload,
  type UploadedFile,
} from "@/app/form/_components/file-upload";

type Frequencia = "unica" | "mensal";
type Duracao = "um_ano" | "indeterminado";
type Canal = "whatsapp" | "email";

const VALOR_PRESETS = [40, 80, 160] as const;

const inputClass =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent";

function OptionButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-accent bg-accent text-white"
          : "border-border bg-surface text-fg hover:bg-bg"
      }`}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-sm font-medium text-fg">{children}</span>;
}

function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-danger">{msg}</p>;
}

export function DonorForm() {
  const [frequencia, setFrequencia] = useState<Frequencia>("mensal");
  const [duracao, setDuracao] = useState<Duracao | null>("um_ano");
  const [valorPreset, setValorPreset] = useState<number | "outro">(80);
  const [valorOutro, setValorOutro] = useState("");
  const [dataPagamento, setDataPagamento] = useState("");
  const [canal, setCanal] = useState<Canal | null>(null);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cep, setCep] = useState("");
  const [recibo, setRecibo] = useState<UploadedFile[]>([]);
  const [observacoes, setObservacoes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // Guarda síncrona contra duplo clique: `submitting` só desabilita o botão
  // após o re-render, tarde demais para uma segunda chamada imediata.
  const submittingRef = useRef(false);

  const valor = useMemo(() => {
    if (valorPreset === "outro") {
      const n = Number(valorOutro.replace(",", "."));
      return isNaN(n) ? 0 : n;
    }
    return valorPreset;
  }, [valorPreset, valorOutro]);

  const handleSubmit = useCallback(async () => {
    const localErrors: Record<string, string> = {};
    if (!nome.trim()) localErrors.nome = "Informe seu nome.";
    if (!cpf.trim()) localErrors.cpf = "Informe seu CPF.";
    else if (!isValidCPF(cpf)) localErrors.cpf = "CPF inválido.";
    if (!email.trim()) localErrors.email = "Informe seu e-mail.";
    if (!telefone.trim()) localErrors.telefone = "Informe seu telefone.";
    if (!endereco.trim()) localErrors.endereco = "Informe seu endereço.";
    if (!cep.trim()) localErrors.cep = "Informe seu CEP.";
    if (valor <= 0) localErrors.valor = "Informe um valor maior que zero.";
    if (!dataPagamento) localErrors.data_pagamento = "Informe a data do pagamento.";
    if (!canal) localErrors.lembrete_canal = "Selecione um canal de lembrete.";
    if (frequencia === "mensal" && !duracao)
      localErrors.duracao = "Selecione a duração.";

    const reciboOk = recibo.find((f) => f.path && !f.uploading && !f.error);
    if (!reciboOk) localErrors.recibo_path = "Envie o recibo de pagamento.";

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;

    setSubmitting(true);
    setErrors({});

    const payload: DonorPledge = {
      nome: nome.trim(),
      cpf: cpf.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      endereco: endereco.trim(),
      cep: cep.trim(),
      frequencia,
      duracao: frequencia === "mensal" ? duracao ?? undefined : undefined,
      valor,
      data_pagamento: dataPagamento,
      lembrete_canal: canal as Canal,
      recibo_path: reciboOk!.path,
      recibo_nome: reciboOk!.name,
      observacoes: observacoes.trim() || undefined,
    };

    try {
      const result = await registerDonorPledge(payload);

      if (result.success) {
        setDone(true);
        return;
      }

      const flat: Record<string, string> = {};
      for (const [key, msgs] of Object.entries(result.errors ?? {})) {
        flat[key] = msgs[0];
      }
      setErrors(flat);
    } catch {
      setErrors({ _form: "Erro de conexão ao enviar. Tente novamente." });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [
    nome,
    cpf,
    email,
    telefone,
    endereco,
    cep,
    frequencia,
    duracao,
    valor,
    dataPagamento,
    canal,
    recibo,
    observacoes,
  ]);

  if (done) {
    return (
      <div
        className="rounded-xl border border-success/40 bg-success/5 p-8 text-center"
        data-testid="donor-success"
      >
        <h2 className="font-display text-[22px] font-semibold text-accent">
          Que Deus o recompense!
        </h2>
        <p className="mx-auto mt-3 max-w-[46ch] text-[15px] text-muted-foreground">
          Recebemos seu cadastro de benfeitor. Em breve entraremos em contato pelo canal informado para
          combinar os detalhes da sua doação. Saiba que você já está incluído na missa mensal rezada por
          nossos benfeitores.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md border border-accent px-5 py-2.5 text-sm font-medium text-accent hover:bg-bg"
        >
          Voltar ao início
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      noValidate
      className="rounded-xl border border-border bg-surface p-6 max-sm:p-5"
      data-testid="donor-form"
    >
      <h2 className="font-display text-[20px] font-semibold text-fg">Seja um benfeitor</h2>
      <p className="mt-1 text-sm text-muted">
        Preencha os dados abaixo. Um lembrete será enviado todo mês, próximo à data de pagamento.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <FieldLabel>Pagamento</FieldLabel>
          <div className="flex flex-wrap gap-2">
            <OptionButton active={frequencia === "unica"} onClick={() => setFrequencia("unica")}>
              Uma vez
            </OptionButton>
            <OptionButton active={frequencia === "mensal"} onClick={() => setFrequencia("mensal")}>
              Mensal
            </OptionButton>
          </div>
        </div>

        {frequencia === "mensal" && (
          <div>
            <FieldLabel>Duração</FieldLabel>
            <div className="flex flex-wrap gap-2">
              <OptionButton active={duracao === "um_ano"} onClick={() => setDuracao("um_ano")}>
                Por um ano
              </OptionButton>
              <OptionButton
                active={duracao === "indeterminado"}
                onClick={() => setDuracao("indeterminado")}
              >
                Indeterminado
              </OptionButton>
            </div>
            <ErrorText msg={errors.duracao} />
          </div>
        )}

        <div>
          <FieldLabel>Valor {frequencia === "mensal" ? "(por mês)" : ""}</FieldLabel>
          <div className="flex flex-wrap items-center gap-2">
            {VALOR_PRESETS.map((v) => (
              <OptionButton key={v} active={valorPreset === v} onClick={() => setValorPreset(v)}>
                R$ {v}
              </OptionButton>
            ))}
            <OptionButton active={valorPreset === "outro"} onClick={() => setValorPreset("outro")}>
              Outro valor
            </OptionButton>
            {valorPreset === "outro" && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted">R$</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  inputMode="decimal"
                  value={valorOutro}
                  onChange={(e) => setValorOutro(e.target.value)}
                  placeholder="0,00"
                  className={`${inputClass} w-32`}
                  aria-label="Outro valor"
                />
              </div>
            )}
          </div>
          <ErrorText msg={errors.valor} />
        </div>

        <div>
          <label htmlFor="donor-data" className="mb-2 block text-sm font-medium text-fg">
            Data do pagamento
          </label>
          <input
            id="donor-data"
            type="date"
            value={dataPagamento}
            onChange={(e) => setDataPagamento(e.target.value)}
            className={`${inputClass} max-w-[220px]`}
          />
          <ErrorText msg={errors.data_pagamento} />
        </div>

        <div>
          <FieldLabel>Recibo de pagamento</FieldLabel>
          <p className="mb-2 text-sm text-muted">
            Após realizar o Pix ou a transferência, envie o comprovante (imagem ou PDF).
          </p>
          <FileUpload
            label="para enviar o recibo de pagamento"
            category="recibo_pagamento"
            files={recibo}
            onChange={setRecibo}
            required
            error={errors.recibo_path}
          />
        </div>

        <div>
          <FieldLabel>Receber lembrete por</FieldLabel>
          <div className="flex flex-wrap gap-2">
            <OptionButton active={canal === "whatsapp"} onClick={() => setCanal("whatsapp")}>
              WhatsApp
            </OptionButton>
            <OptionButton active={canal === "email"} onClick={() => setCanal("email")}>
              E-mail
            </OptionButton>
          </div>
          <ErrorText msg={errors.lembrete_canal} />
        </div>

        <hr className="border-border" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="donor-nome" className="mb-2 block text-sm font-medium text-fg">
              Nome completo
            </label>
            <input
              id="donor-nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={inputClass}
            />
            <ErrorText msg={errors.nome} />
          </div>
          <div>
            <label htmlFor="donor-cpf" className="mb-2 block text-sm font-medium text-fg">
              CPF
            </label>
            <input
              id="donor-cpf"
              type="text"
              inputMode="numeric"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className={inputClass}
            />
            <ErrorText msg={errors.cpf} />
          </div>
          <div>
            <label htmlFor="donor-email" className="mb-2 block text-sm font-medium text-fg">
              E-mail
            </label>
            <input
              id="donor-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            <ErrorText msg={errors.email} />
          </div>
          <div>
            <label htmlFor="donor-tel" className="mb-2 block text-sm font-medium text-fg">
              Telefone / WhatsApp
            </label>
            <input
              id="donor-tel"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className={inputClass}
            />
            <ErrorText msg={errors.telefone} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="donor-endereco" className="mb-2 block text-sm font-medium text-fg">
              Endereço completo
            </label>
            <input
              id="donor-endereco"
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, número, bairro, cidade — UF"
              className={inputClass}
            />
            <ErrorText msg={errors.endereco} />
          </div>
          <div>
            <label htmlFor="donor-cep" className="mb-2 block text-sm font-medium text-fg">
              CEP
            </label>
            <input
              id="donor-cep"
              type="text"
              inputMode="numeric"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              placeholder="00000-000"
              className={inputClass}
            />
            <ErrorText msg={errors.cep} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="donor-obs" className="mb-2 block text-sm font-medium text-fg">
              Observações <span className="text-muted">(opcional)</span>
            </label>
            <textarea
              id="donor-obs"
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {errors._form && (
          <p className="text-sm text-danger" data-testid="donor-form-error">
            {errors._form}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-accent px-7 py-3 text-sm font-medium tracking-wide text-white transition-colors hover:bg-accent/90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
          data-testid="donor-submit"
        >
          {submitting ? "Enviando..." : "Quero ser benfeitor"}
        </button>

        <Link
          href="/"
          className="flex w-full items-center justify-center rounded-md border border-border bg-surface px-7 py-3 text-sm font-medium text-accent transition-colors hover:bg-bg"
        >
          Voltar à página principal
        </Link>
      </div>
    </form>
  );
}
