"use client";

import { useCallback, useRef, useState } from "react";
import { ProgressBar } from "./progress-bar";
import { Step1Applicant } from "./step-1-applicant";
import { Step2Students } from "./step-2-students";
import { Step3Income } from "./step-3-income";
import { Step4Expenses } from "./step-4-expenses";
import { Step5Vehicles } from "./step-5-vehicles";
import { Step6Review } from "./step-6-review";
import { SuccessScreen } from "./success-screen";
import { submitApplication } from "../_actions/form-actions";
import { INITIAL_FORM_DATA, parseMoney } from "./form-types";
import type { FormData } from "./form-types";
import { MSG_OBRIGATORIO } from "./field-ui";
import { isValidCPF } from "@/lib/validations/cpf";
import type { ApplicationSubmission } from "@/lib/validations/application-schema";

const TOTAL_STEPS = 6;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const M = MSG_OBRIGATORIO;
const MSG_ENVIANDO = "Aguarde o envio do arquivo terminar";

// Um campo de documentos só é válido com ao menos um upload CONCLUÍDO —
// placeholder "Enviando..." ou item com erro não contam como arquivo enviado.
function docError(files: { path: string; uploading?: boolean; error?: string }[]):
  | string
  | null {
  if (files.some((f) => f.uploading)) return MSG_ENVIANDO;
  if (files.some((f) => f.path && !f.error)) return null;
  return M;
}

function validateStep1(data: FormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.pai_nome.trim()) errors.pai_nome = M;
  if (!data.pai_rg.trim()) errors.pai_rg = M;
  if (!data.pai_cpf.trim()) {
    errors.pai_cpf = M;
  } else if (!isValidCPF(data.pai_cpf)) {
    errors.pai_cpf = "CPF inválido";
  }
  if (!data.pai_profissao.trim()) errors.pai_profissao = M;
  if (!data.mae_nome.trim()) errors.mae_nome = M;
  if (!data.mae_cpf.trim()) {
    errors.mae_cpf = M;
  } else if (!isValidCPF(data.mae_cpf)) {
    errors.mae_cpf = "CPF inválido";
  }
  if (!data.mae_profissao.trim()) errors.mae_profissao = M;
  const docPai = docError(data.doc_pai);
  if (docPai) errors.doc_pai = docPai;
  const docMae = docError(data.doc_mae);
  if (docMae) errors.doc_mae = docMae;
  const docCertidao = docError(data.certidao_casamento);
  if (docCertidao) errors.certidao_casamento = docCertidao;
  if (!data.endereco.trim()) errors.endereco = M;
  if (!data.cep.trim()) errors.cep = M;
  if (!data.telefone.trim()) errors.telefone = M;
  const docComprovante = docError(data.comprovante_endereco);
  if (docComprovante) errors.comprovante_endereco = docComprovante;
  if (!data.email.trim()) {
    errors.email = M;
  } else if (!EMAIL_RE.test(data.email.trim())) {
    errors.email = "E-mail inválido";
  }
  // Quando há outros filhos, nome, CPF e data de nascimento são obrigatórios.
  for (let i = 0; i < data.outros_filhos.length; i++) {
    const c = data.outros_filhos[i];
    if (!c.nome.trim()) errors[`filho_${i}_nome`] = M;
    if (!c.cpf.trim()) {
      errors[`filho_${i}_cpf`] = M;
    } else if (!isValidCPF(c.cpf)) {
      errors[`filho_${i}_cpf`] = "CPF inválido";
    }
    if (!c.nascimento) errors[`filho_${i}_nascimento`] = M;
  }
  return errors;
}

function validateStep2(data: FormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (data.alunos.length === 0) {
    errors.alunos = "Adicione pelo menos um aluno";
  }
  // Ao adicionar um aluno, todos os campos (inclusive os documentos) são obrigatórios.
  for (let i = 0; i < data.alunos.length; i++) {
    const a = data.alunos[i];
    if (!a.nome.trim()) errors[`aluno_${i}_nome`] = M;
    if (!a.cpf.trim()) {
      errors[`aluno_${i}_cpf`] = M;
    } else if (!isValidCPF(a.cpf)) {
      errors[`aluno_${i}_cpf`] = "CPF inválido";
    }
    if (!a.serie.trim()) errors[`aluno_${i}_serie`] = M;
    if (!a.mensalidade.trim()) errors[`aluno_${i}_mensalidade`] = M;
    const rgErr = docError(a.docRg);
    if (rgErr) errors[`aluno_${i}_docRg`] = rgErr;
    const certErr = docError(a.docCertidao);
    if (certErr) errors[`aluno_${i}_docCertidao`] = certErr;
  }
  const desconto = data.desconto_solicitado.trim();
  if (desconto === "") {
    errors.desconto_solicitado = M;
  } else if (
    isNaN(Number(desconto)) ||
    Number(desconto) < 0 ||
    Number(desconto) > 100
  ) {
    errors.desconto_solicitado = "Desconto deve estar entre 0 e 100";
  }
  return errors;
}

function validateStep3(data: FormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.pessoas_domicilio || Number(data.pessoas_domicilio) < 1) {
    errors.pessoas_domicilio = M;
  }
  const irErr = docError(data.extrato_ir);
  if (irErr) errors.extrato_ir = irErr;
  return errors;
}

function validateStep4(data: FormData): Record<string, string> {
  const errors: Record<string, string> = {};
  // Os valores de despesa são opcionais; o extrato bancário é obrigatório.
  const extratoErr = docError(data.extratos_bancarios);
  if (extratoErr) errors.extratos_bancarios = extratoErr;
  return errors;
}

function validateStep5(data: FormData): Record<string, string> {
  const errors: Record<string, string> = {};
  // Veículos são opcionais; mas ao adicionar um, marca, modelo e ano são obrigatórios.
  for (let i = 0; i < data.veiculos.length; i++) {
    const v = data.veiculos[i];
    if (!v.marca.trim()) errors[`veiculo_${i}_marca`] = M;
    if (!v.modelo.trim()) errors[`veiculo_${i}_modelo`] = M;
    if (!v.ano.trim()) errors[`veiculo_${i}_ano`] = M;
  }
  // As 10 indicações de benfeitores são obrigatórias (nome e e-mail válido).
  for (let i = 0; i < data.indicacao_benfeitores.length; i++) {
    const b = data.indicacao_benfeitores[i];
    if (!b.nome.trim()) {
      errors[`benfeitor_${i}_nome`] = M;
    }
    if (!b.email.trim()) {
      errors[`benfeitor_${i}_email`] = M;
    } else if (!EMAIL_RE.test(b.email.trim())) {
      errors[`benfeitor_${i}_email`] = "E-mail inválido";
    }
  }
  return errors;
}

export function ScholarshipForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    ...INITIAL_FORM_DATA,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Guarda síncrona: `submitting` só bloqueia o botão após o re-render, e um
  // duplo clique rápido dispararia duas submissões (e duas solicitações).
  const submittingRef = useRef(false);

  const updateFormData = useCallback((partial: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    let stepErrors: Record<string, string> = {};

    switch (currentStep) {
      case 1:
        stepErrors = validateStep1(formData);
        break;
      case 2:
        stepErrors = validateStep2(formData);
        break;
      case 3:
        stepErrors = validateStep3(formData);
        break;
      case 4:
        stepErrors = validateStep4(formData);
        break;
      case 5:
        stepErrors = validateStep5(formData);
        break;
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }, [currentStep, formData]);

  const nextStep = useCallback(() => {
    if (!validateCurrentStep()) return;
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep, validateCurrentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    if (!accepted) {
      setAcceptError(true);
      setTimeout(() => setAcceptError(false), 2000);
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;

    setSubmitting(true);
    setSubmitError("");

    const payload: ApplicationSubmission = {
      escola: formData.escola,
      pai: {
        nome: formData.pai_nome,
        rg: formData.pai_rg,
        cpf: formData.pai_cpf,
        profissao: formData.pai_profissao || undefined,
        documentos: formData.doc_pai.filter((f) => f.path).map((f) => f.path),
      },
      mae: {
        nome: formData.mae_nome,
        cpf: formData.mae_cpf,
        profissao: formData.mae_profissao || undefined,
        documentos: formData.doc_mae.filter((f) => f.path).map((f) => f.path),
      },
      certidao_casamento: formData.certidao_casamento
        .filter((f) => f.path)
        .map((f) => f.path),
      endereco: formData.endereco,
      cep: formData.cep || undefined,
      telefone: formData.telefone,
      email: formData.email || undefined,
      comprovante_endereco: formData.comprovante_endereco
        .filter((f) => f.path)
        .map((f) => f.path),
      outros_filhos: formData.outros_filhos
        .filter((c) => c.nome.trim())
        .map((c) => ({
          nome: c.nome,
          cpf: c.cpf || undefined,
          nascimento: c.nascimento,
        })),
      alunos: formData.alunos.map((a) => ({
        nome: a.nome,
        cpf: a.cpf || undefined,
        serie: a.serie,
        mensalidade: parseMoney(a.mensalidade),
        documentos: [
          ...a.docRg.filter((f) => f.path).map((f) => f.path),
          ...a.docCertidao.filter((f) => f.path).map((f) => f.path),
        ],
      })),
      desconto_solicitado: parseMoney(formData.desconto_solicitado),
      renda: {
        pai: parseMoney(formData.renda_pai) || undefined,
        mae: parseMoney(formData.renda_mae) || undefined,
        outros: parseMoney(formData.renda_outros) || undefined,
        pessoas: Number(formData.pessoas_domicilio) || 1,
      },
      extrato_ir: formData.extrato_ir
        .filter((f) => f.path)
        .map((f) => f.path),
      despesas: {
        aluguel: parseMoney(formData.despesa_aluguel) || undefined,
        servicos: parseMoney(formData.despesa_servicos) || undefined,
        tv: parseMoney(formData.despesa_tv) || undefined,
        celular_plano: parseMoney(formData.despesa_celular_plano) || undefined,
        celular_parcelas:
          parseMoney(formData.despesa_celular_parcelas) || undefined,
        internet: parseMoney(formData.despesa_internet) || undefined,
      },
      extratos_bancarios: formData.extratos_bancarios
        .filter((f) => f.path)
        .map((f) => f.path),
      veiculos: formData.veiculos.filter((v) => v.marca.trim()),
      colaboracao: {
        limpeza: formData.colaboracao.limpeza
          ? {
              ativo: true,
              vezes_semana: Number(formData.colaboracao.limpeza_vezes_semana) || undefined,
            }
          : undefined,
        mutirao: formData.colaboracao.mutirao
          ? {
              ativo: true,
              sabados: Number(formData.colaboracao.mutirao_sabados) || undefined,
            }
          : undefined,
        arrecadacao: formData.colaboracao.arrecadacao || undefined,
        benfeitores: formData.colaboracao.benfeitores || undefined,
        outros: formData.colaboracao.outros || undefined,
      },
      indicacao_benfeitores: formData.indicacao_benfeitores.filter(
        (b) => b.nome.trim()
      ),
    };

    try {
      const result = await submitApplication(payload);

      if (result.success) {
        setSubmitted(true);
      } else if (result.errors?._form?.[0]) {
        setSubmitError(result.errors._form[0]);
      } else if (result.errors) {
        // Campos inválidos detectados pelo servidor: lista quais para não esconder o erro.
        const campos = Object.values(result.errors).flat();
        setSubmitError(
          campos.length > 0
            ? `Dados inválidos: ${[...new Set(campos)].join("; ")}.`
            : "Erro ao enviar. Verifique os dados e tente novamente."
        );
      } else {
        setSubmitError("Erro ao enviar. Verifique os dados e tente novamente.");
      }
    } catch {
      // Falha de rede/runtime na Server Action: sem isso o botão ficaria
      // preso em "Enviando..." para sempre.
      setSubmitError("Erro de conexão ao enviar. Tente novamente.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [accepted, formData]);

  if (submitted) {
    return <SuccessScreen />;
  }

  return (
    <div>
      <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      <form
        onSubmit={(e) => e.preventDefault()}
        noValidate
        data-testid="scholarship-form"
      >
        {currentStep === 1 && (
          <Step1Applicant
            data={formData}
            onChange={updateFormData}
            errors={errors}
          />
        )}
        {currentStep === 2 && (
          <Step2Students
            data={formData}
            onChange={updateFormData}
            errors={errors}
          />
        )}
        {currentStep === 3 && (
          <Step3Income
            data={formData}
            onChange={updateFormData}
            errors={errors}
          />
        )}
        {currentStep === 4 && (
          <Step4Expenses
            data={formData}
            onChange={updateFormData}
            errors={errors}
          />
        )}
        {currentStep === 5 && (
          <Step5Vehicles
            data={formData}
            onChange={updateFormData}
            errors={errors}
          />
        )}
        {currentStep === 6 && (
          <Step6Review
            data={formData}
            accepted={accepted}
            onAcceptedChange={(v) => {
              setAccepted(v);
              if (v) setAcceptError(false);
            }}
            acceptError={acceptError}
          />
        )}

        {submitError && (
          <p className="mt-4 text-center text-sm text-danger" role="alert">
            {submitError}
          </p>
        )}

        <div className="mt-8 flex justify-between gap-3 max-sm:flex-col">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="rounded-md border border-border bg-surface px-7 py-3 text-sm font-medium tracking-wide text-fg transition-colors hover:bg-bg max-sm:w-full max-sm:text-center"
              data-testid="btn-prev"
            >
              Voltar
            </button>
          )}
          {currentStep < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={nextStep}
              className="ml-auto rounded-md bg-accent px-7 py-3 text-sm font-medium tracking-wide text-white transition-colors hover:bg-accent/90 active:translate-y-px max-sm:ml-0 max-sm:w-full max-sm:text-center"
              data-testid="btn-next"
            >
              Próximo
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="ml-auto rounded-md bg-accent px-7 py-3 text-sm font-medium tracking-wide text-white transition-colors hover:bg-accent/90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 max-sm:ml-0 max-sm:w-full max-sm:text-center"
              data-testid="btn-submit"
            >
              {submitting ? "Enviando..." : "Enviar Solicitação"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
