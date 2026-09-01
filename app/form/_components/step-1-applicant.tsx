"use client";

import { useId } from "react";
import type { FormData, OtherChild } from "./form-types";
import { FileUpload } from "./file-upload";
import type { UploadedFile } from "./file-upload";
import { RequiredMark, FieldError, fieldBorder } from "./field-ui";

interface Step1Props {
  data: FormData;
  onChange: (data: Partial<FormData>) => void;
  errors: Record<string, string>;
}

export function Step1Applicant({ data, onChange, errors }: Step1Props) {
  const updateField = (field: keyof FormData, value: string) => {
    onChange({ [field]: value });
  };

  const updateFiles = (field: keyof FormData, files: UploadedFile[]) => {
    onChange({ [field]: files });
  };

  const addChild = () => {
    onChange({
      outros_filhos: [
        ...data.outros_filhos,
        { nome: "", cpf: "", nascimento: "" },
      ],
    });
  };

  const removeChild = (index: number) => {
    onChange({
      outros_filhos: data.outros_filhos.filter((_, i) => i !== index),
    });
  };

  const updateChild = (
    index: number,
    field: keyof OtherChild,
    value: string
  ) => {
    const updated = [...data.outros_filhos];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ outros_filhos: updated });
  };

  return (
    <div data-testid="step-1">
      <div className="rounded-lg border border-border bg-surface p-8 max-sm:p-5">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Dados dos Solicitantes
        </h2>
        <p className="mb-6 text-sm text-muted">
          Informações pessoais dos pais ou responsáveis.
        </p>

        <div className="mb-5">
          <label
            htmlFor="escola-select"
            className="mb-1.5 block text-[13px] font-medium tracking-wide text-fg"
          >
            Escola<RequiredMark />
          </label>
          {/* Por enquanto há apenas uma escola; o campo fica fixo e não editável.
              Futuramente outras escolas poderão ser adicionadas aqui. */}
          <select
            id="escola-select"
            value={data.escola}
            disabled
            aria-readonly="true"
            className="w-full cursor-not-allowed rounded-md border border-border bg-bg px-3.5 py-2.5 text-[15px] text-muted outline-none"
            data-testid="escola-select"
          >
            <option value="Colégio São José">Colégio São José</option>
          </select>
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-[13px] font-medium tracking-wide text-fg">
            Declaração de vaga do colégio
            <RequiredMark />
          </label>
          <p className="mb-2 text-xs text-muted">
            Envie o documento emitido pelo colégio confirmando a disponibilidade
            da vaga.
          </p>
          <FileUpload
            label="para enviar a declaração de vaga do colégio"
            category="declaracao_vaga"
            files={data.declaracao_vaga}
            onChange={(f) => updateFiles("declaracao_vaga", f)}
            required
            error={errors.declaracao_vaga}
          />
        </div>

        <div className="my-6 h-px bg-border" />

        <Field
          label="Nome e sobrenome do pai"
          required
          value={data.pai_nome}
          onChange={(v) => updateField("pai_nome", v)}
          error={errors.pai_nome}
          testId="pai-nome"
        />
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <Field
            label="RG do pai"
            required
            value={data.pai_rg}
            onChange={(v) => updateField("pai_rg", v)}
            error={errors.pai_rg}
            testId="pai-rg"
          />
          <Field
            label="CPF do pai"
            required
            value={data.pai_cpf}
            onChange={(v) => updateField("pai_cpf", v)}
            error={errors.pai_cpf}
            placeholder="000.000.000-00"
            testId="pai-cpf"
          />
        </div>
        <Field
          label="Profissão do pai"
          required
          value={data.pai_profissao}
          onChange={(v) => updateField("pai_profissao", v)}
          error={errors.pai_profissao}
          testId="pai-profissao"
        />
        <div className="mb-5">
          <label className="mb-1.5 block text-[13px] font-medium tracking-wide text-fg">
            Documento do pai (RG ou CPF)
            <RequiredMark />
          </label>
          <FileUpload
            label="para enviar foto do RG ou CPF do pai"
            category="rg_pai"
            files={data.doc_pai}
            onChange={(f) => updateFiles("doc_pai", f)}
            required
            error={errors.doc_pai}
          />
        </div>

        <div className="my-6 h-px bg-border" />

        <Field
          label="Nome e sobrenome da mãe"
          required
          value={data.mae_nome}
          onChange={(v) => updateField("mae_nome", v)}
          error={errors.mae_nome}
          testId="mae-nome"
        />
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <Field
            label="CPF da mãe"
            required
            value={data.mae_cpf}
            onChange={(v) => updateField("mae_cpf", v)}
            error={errors.mae_cpf}
            placeholder="000.000.000-00"
            testId="mae-cpf"
          />
          <Field
            label="Profissão da mãe"
            required
            value={data.mae_profissao}
            onChange={(v) => updateField("mae_profissao", v)}
            error={errors.mae_profissao}
            testId="mae-profissao"
          />
        </div>
        <div className="mb-5">
          <label className="mb-1.5 block text-[13px] font-medium tracking-wide text-fg">
            Documento da mãe (RG ou CPF)
            <RequiredMark />
          </label>
          <FileUpload
            label="para enviar foto do RG ou CPF da mãe"
            category="rg_mae"
            files={data.doc_mae}
            onChange={(f) => updateFiles("doc_mae", f)}
            required
            error={errors.doc_mae}
          />
        </div>

        <div className="my-6 h-px bg-border" />

        <div className="mb-5">
          <label className="mb-1.5 block text-[13px] font-medium tracking-wide text-fg">
            Certidão de Casamento
            <RequiredMark />
          </label>
          <FileUpload
            label="para enviar a Certidão de Casamento"
            category="certidao"
            files={data.certidao_casamento}
            onChange={(f) => updateFiles("certidao_casamento", f)}
            required
            error={errors.certidao_casamento}
          />
        </div>

        <div className="my-6 h-px bg-border" />

        <Field
          label="Endereço completo"
          required
          value={data.endereco}
          onChange={(v) => updateField("endereco", v)}
          error={errors.endereco}
          testId="endereco"
        />
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <Field
            label="CEP"
            required
            value={data.cep}
            onChange={(v) => updateField("cep", v)}
            error={errors.cep}
            placeholder="00000-000"
            testId="cep"
          />
          <Field
            label="Telefone"
            required
            value={data.telefone}
            onChange={(v) => updateField("telefone", v)}
            error={errors.telefone}
            placeholder="(00) 00000-0000"
            testId="telefone"
          />
        </div>
        <Field
          label="E-mail"
          required
          type="email"
          value={data.email}
          onChange={(v) => updateField("email", v)}
          error={errors.email}
          placeholder="exemplo@email.com"
          testId="email"
        />

        <div className="mb-5">
          <label className="mb-1.5 block text-[13px] font-medium tracking-wide text-fg">
            Comprovante de Endereço
            <RequiredMark />
          </label>
          <FileUpload
            label="para enviar comprovante de endereço"
            category="comprovante_endereco"
            files={data.comprovante_endereco}
            onChange={(f) => updateFiles("comprovante_endereco", f)}
            required
            error={errors.comprovante_endereco}
          />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-surface p-8 max-sm:p-5">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Outros Filhos
        </h2>
        <p className="mb-6 text-sm text-muted">
          Informe os demais filhos que não estão na escola. Ao adicionar um
          filho, nome, CPF e data de nascimento são obrigatórios.
        </p>

        {data.outros_filhos.length > 0 && (
          <div className="mb-2 grid grid-cols-[1fr_160px_140px_32px] gap-2.5 text-[11px] font-medium uppercase tracking-widest text-muted max-sm:hidden">
            <span>
              Nome completo<RequiredMark />
            </span>
            <span>
              CPF<RequiredMark />
            </span>
            <span>
              Nascimento<RequiredMark />
            </span>
            <span />
          </div>
        )}

        <div data-testid="filhos-list">
          {data.outros_filhos.map((child, i) => {
            const nomeError = errors[`filho_${i}_nome`];
            const cpfError = errors[`filho_${i}_cpf`];
            const nascError = errors[`filho_${i}_nascimento`];
            return (
              <div key={i} className="mb-2.5">
                <div className="grid grid-cols-[1fr_160px_140px_32px] items-start gap-2.5 max-sm:grid-cols-1">
                  <input
                    type="text"
                    placeholder="Nome completo"
                    aria-label={`Nome completo do filho ${i + 1}`}
                    aria-invalid={nomeError ? true : undefined}
                    value={child.nome}
                    onChange={(e) => updateChild(i, "nome", e.target.value)}
                    className={`w-full rounded-md border px-3 py-2.5 text-[15px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${fieldBorder(!!nomeError)}`}
                    data-testid={`filho-nome-${i}`}
                  />
                  <input
                    type="text"
                    placeholder="CPF"
                    aria-label={`CPF do filho ${i + 1}`}
                    aria-invalid={cpfError ? true : undefined}
                    value={child.cpf}
                    onChange={(e) => updateChild(i, "cpf", e.target.value)}
                    className={`w-full rounded-md border px-3 py-2.5 text-[15px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${fieldBorder(!!cpfError)}`}
                    data-testid={`filho-cpf-${i}`}
                  />
                  <input
                    type="date"
                    aria-label={`Data de nascimento do filho ${i + 1}`}
                    aria-invalid={nascError ? true : undefined}
                    value={child.nascimento}
                    onChange={(e) => updateChild(i, "nascimento", e.target.value)}
                    className={`w-full rounded-md border px-3 py-2.5 text-[15px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${fieldBorder(!!nascError)}`}
                    data-testid={`filho-nascimento-${i}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeChild(i)}
                    className="grid h-9 w-9 place-items-center rounded-md border border-border bg-surface text-lg text-muted transition-colors hover:border-danger hover:text-danger"
                    title="Remover"
                    data-testid="remove-child"
                  >
                    &times;
                  </button>
                </div>
                <FieldError error={nomeError || cpfError || nascError} />
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={addChild}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-gold/10 px-4 py-2 text-[13px] font-medium tracking-wide text-gold transition-colors hover:bg-gold/20"
          data-testid="add-child"
        >
          + Adicionar filho
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  testId,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  testId?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="mb-5">
      <label
        htmlFor={id}
        className="mb-1.5 block text-[13px] font-medium tracking-wide text-fg"
      >
        {label}
        {required && <RequiredMark />}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-md border px-3.5 py-2.5 text-[15px] text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 ${fieldBorder(!!error)}`}
        data-testid={testId}
      />
      <FieldError error={error} id={errorId} />
    </div>
  );
}
