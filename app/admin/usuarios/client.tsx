"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createSecretariatUser,
  resetSecretariatPassword,
  setSecretariatUserActive,
} from "../_actions/staff-actions";
import { EmptyState } from "../_components/empty-state";
import { Field } from "../_components/field";
import { Notice } from "../_components/notice";
import { PageHeader } from "../_components/page-header";
import { Section } from "../_components/section";
import { StatusPill } from "../_components/status-pill";

type User = { id: string; email: string; ativo: boolean; created_at: string };

const INPUT_CLASS = "h-10 bg-surface";

function formatCreatedAt(iso: string): string | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("pt-BR");
}

export function UsuariosClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    const result = await createSecretariatUser(email, password);
    setCreating(false);
    if (!result.success || !result.data) {
      setFormError(result.error ?? "Não foi possível criar o acesso.");
      return;
    }
    setUsers((current) => [...current, result.data]);
    setEmail("");
    setPassword("");
    setFormError(null);
  }

  async function toggle(user: User) {
    const result = await setSecretariatUserActive(user.id, !user.ativo);
    if (result.success) {
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? { ...item, ativo: !item.ativo } : item))
      );
      setListError(null);
    } else {
      setListError(result.error ?? "Não foi possível atualizar o acesso.");
    }
  }

  async function reset(user: User) {
    const next = window.prompt(`Nova senha para ${user.email} (mínimo 8 caracteres):`);
    if (!next) return;
    const result = await resetSecretariatPassword(user.id, next);
    if (!result.success) setListError(result.error ?? "Não foi possível redefinir a senha.");
    else setListError(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        description="Acessos individuais da Secretaria. A Secretaria vê solicitações e benfeitores, sem decidir nem configurar."
      />

      <Section title="Novo acesso">
        <Card className="gap-4 rounded-lg border border-border bg-surface p-5 ring-0">
          <form onSubmit={(event) => void create(event)} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
              <Field label="E-mail">
                {(a11y) => (
                  <Input
                    {...a11y}
                    type="email"
                    name="email"
                    autoComplete="off"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nome@exemplo.com"
                    className={INPUT_CLASS}
                  />
                )}
              </Field>
              <Field label="Senha inicial" hint="Mínimo de 8 caracteres. Peça para trocar no primeiro acesso.">
                {(a11y) => (
                  <Input
                    {...a11y}
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={INPUT_CLASS}
                  />
                )}
              </Field>
              <Button type="submit" size="lg" disabled={creating} className="sm:mt-[1.625rem]">
                {creating ? "Criando…" : "Criar acesso"}
              </Button>
            </div>
            {formError && <Notice tone="danger">{formError}</Notice>}
          </form>
        </Card>
      </Section>

      <Section title="Acessos existentes">
        {users.length === 0 ? (
          <EmptyState
            title="Nenhum acesso da Secretaria cadastrado."
            description="Crie o primeiro acesso pelo formulário acima."
          />
        ) : (
          <Card className="gap-0 rounded-lg border border-border bg-surface py-0 ring-0">
            <ul className="divide-y divide-border/60">
              {users.map((user) => {
                const createdAt = formatCreatedAt(user.created_at);
                return (
                  <li
                    key={user.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                    data-testid={`user-row-${user.id}`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-fg">{user.email}</p>
                      {createdAt && <p className="text-sm text-muted">Criado em {createdAt}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusPill tone={user.ativo ? "success" : "neutral"}>
                        {user.ativo ? "Ativo" : "Inativo"}
                      </StatusPill>
                      <Button type="button" variant="outline" size="sm" onClick={() => void reset(user)}>
                        Redefinir senha
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => void toggle(user)}>
                        {user.ativo ? "Desativar" : "Reativar"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
        {listError && <Notice tone="danger">{listError}</Notice>}
        <Notice>
          Quem está inativo não consegue entrar, mas o histórico de observações continua registrado em seu nome.
        </Notice>
      </Section>
    </div>
  );
}
