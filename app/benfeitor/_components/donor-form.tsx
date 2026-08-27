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
import {
  PRIORADO_NENHUMA,
  PRIORADOS_CAPELAS_GROUPS,
} from "@/lib/data/priorados-capelas";
import {
  formatAddressFromViaCep,
  formatCep,
  lookupCep,
} from "@/lib/cep/viacep";

type Frequencia = "unica" | "mensal";
type Duracao = "um_ano" | "indeterminado";

const VALOR_PRESETS = {
  mensal: [80, 100, 200],
  unica: [300, 500, 800],
} as const;

type ValorPreset = (typeof VALOR_PRESETS)[Frequencia][number] | "outro";

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
  const [valorPreset, setValorPreset] = useState<ValorPreset>(80);
  const [valorOutro, setValorOutro] = useState("");
  const [dataPagamento, setDataPagamento] = useState("");
  const [lembreteEmail, setLembreteEmail] = useState(false);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepHint, setCepHint] = useState<string | null>(null);
  const [prioradoCapela, setPrioradoCapela] = useState("");
  const [recibo, setRecibo] = useState<UploadedFile[]>([]);
  const [observacoes, setObservacoes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const submittingRef = useRef(false);

  const valor = useMemo(() => {
    if (valorPreset === "outro") {
      const n = Number(valorOutro.replace(",", "."));
      return isNaN(n) ? 0 : n;
    }
    return valorPreset;
  }, [valorPreset, valorOutro]);

  const handleCepBlur = useCallback(async () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setCepHint(null);
      return;
    }

    setCepLoading(true);
    setCepHint(null);
    const result = await lookupCep(digits);
    setCepLoading(false);

    if (!result.ok) {
      setCepHint(result.error);
      return;
    }

    setCep(formatCep(result.address.cep));
    const suggestion = formatAddressFromViaCep(result.address);
    if (suggestion) {
      setEndereco((prev) => (prev.trim() ? prev : suggestion));
      setCepHint("Endereço preenchido pelo CEP. Complete com o número, se necessário.");
    }
  }, [cep]);

  const handleSubmit = useCallback(async () => {
    const localErrors: Record<string, string> = {};
    if (!nome.trim()) localErrors.nome = "Informe seu nome.";
    if (!cpf.trim()) localErrors.cpf = "Informe seu CPF.";
    else if (!isValidCPF(cpf)) localErrors.cpf = "CPF inválido.";
    if (!email.trim()) localErrors.email = "Informe seu e-mail.";
    if (!telefone.trim()) localErrors.telefone = "Informe seu telefone.";
    if (!endereco.trim()) localErrors.endereco = "Informe seu endereço.";
    if (!cep.trim()) localErrors.cep = "Informe seu CEP.";
    if (!prioradoCapela) localErrors.priorado_capela = "Selecione o priorado ou capela.";
    if (valor <= 0) localErrors.valor = "Informe um valor maior que zero.";
    if (frequencia === "mensal" && !duracao)
      localErrors.duracao = "Selecione a duração.";
    if (frequencia === "unica" && !dataPagamento)
      localErrors.data_pagamento = "Informe a data do pagamento.";

    const reciboOk = recibo.find((f) => f.path && !f.uploading && !f.error);
    if (frequencia === "unica" && !reciboOk)
      localErrors.recibo_path = "Envie o recibo de pagamento.";

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
      priorado_capela: prioradoCapela,
      frequencia,
      duracao: frequencia === "mensal" ? duracao ?? undefined : undefined,
      valor,
      data_pagamento: frequencia === "unica" ? dataPagamento : undefined,
      lembrete_canal:
        frequencia === "mensal" && lembreteEmail ? "email" : null,
      recibo_path: frequencia === "unica" ? reciboOk?.path : undefined,
      recibo_nome: frequencia === "unica" ? reciboOk?.name : undefined,
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
    prioradoCapela,
    frequencia,
    duracao,
    valor,
    dataPagamento,
    lembreteEmail,
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
          Recebemos seu cadastro de benfeitor. Em breve entraremos em contato para
          combinar os detalhes da sua doação. Saiba que você já está incluído na missa
          mensal rezada por nossos benfeitores.
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
        Preencha os dados abaixo. Campos marcados são obrigatórios, exceto observações.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <FieldLabel>Pagamento</FieldLabel>
          <div className="flex flex-wrap gap-2">
            <OptionButton
              active={frequencia === "unica"}
              onClick={() => {
                setFrequencia("unica");
                if (valorPreset !== "outro") setValorPreset(VALOR_PRESETS.unica[0]);
              }}
            >
              Uma vez
            </OptionButton>
            <OptionButton
              active={frequencia === "mensal"}
              onClick={() => {
                setFrequencia("mensal");
                if (valorPreset !== "outro") setValorPreset(VALOR_PRESETS.mensal[0]);
              }}
            >
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
            {VALOR_PRESETS[frequencia].map((v) => (
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

        {frequencia === "unica" && (
          <>
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
              <FieldLabel>Comprovante de pagamento</FieldLabel>
              <p className="mb-2 text-sm text-muted">
                Após realizar o Pix ou a transferência, envie o comprovante (imagem ou PDF).
              </p>
              <FileUpload
                label="para enviar o comprovante de pagamento"
                category="recibo_pagamento"
                files={recibo}
                onChange={setRecibo}
                required
                error={errors.recibo_path}
              />
            </div>
          </>
        )}

        {frequencia === "mensal" && (
          <div>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={lembreteEmail}
                onChange={(e) => setLembreteEmail(e.target.checked)}
                className="mt-1"
                data-testid="donor-lembrete-email"
              />
              <span className="text-sm text-fg">
                Receber lembrete mensal por e-mail
                <span className="mt-0.5 block text-muted">
                  Enviaremos um aviso próximo à data da contribuição. WhatsApp em breve.
                </span>
              </span>
            </label>
          </div>
        )}

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
              Telefone
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
          <div>
            <label htmlFor="donor-cep" className="mb-2 block text-sm font-medium text-fg">
              CEP
            </label>
            <input
              id="donor-cep"
              type="text"
              inputMode="numeric"
              value={cep}
              onChange={(e) => {
                setCep(formatCep(e.target.value));
                setCepHint(null);
              }}
              onBlur={() => void handleCepBlur()}
              placeholder="00000-000"
              className={inputClass}
              data-testid="donor-cep"
            />
            {cepLoading && (
              <p className="mt-1 text-xs text-muted">Consultando CEP…</p>
            )}
            {cepHint && !errors.cep && (
              <p className="mt-1 text-xs text-muted">{cepHint}</p>
            )}
            <ErrorText msg={errors.cep} />
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
          <div className="sm:col-span-2">
            <label htmlFor="donor-priorado" className="mb-2 block text-sm font-medium text-fg">
              Priorado / Capela que frequenta
            </label>
            <select
              id="donor-priorado"
              value={prioradoCapela}
              onChange={(e) => setPrioradoCapela(e.target.value)}
              className={inputClass}
              data-testid="donor-priorado"
            >
              <option value="">Selecione…</option>
              <option value={PRIORADO_NENHUMA}>Nenhuma</option>
              {PRIORADOS_CAPELAS_GROUPS.map((group) => (
                <optgroup key={group.estado} label={group.estado}>
                  {group.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ErrorText msg={errors.priorado_capela} />
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
