import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useState } from "react";

import { PageHeader } from "@/app/admin/_components/page-header";
import { Section } from "@/app/admin/_components/section";
import { StatusPill } from "@/app/admin/_components/status-pill";
import { CountBadge } from "@/app/admin/_components/count-badge";
import { Notice } from "@/app/admin/_components/notice";
import { RecordRow } from "@/app/admin/_components/record-row";
import { SegmentedFilter } from "@/app/admin/_components/segmented-filter";
import { DataGrid, DataItem } from "@/app/admin/_components/data-grid";
import { EmptyState } from "@/app/admin/_components/empty-state";
import { StatTile } from "@/app/admin/_components/stat-tile";
import { ActionBar } from "@/app/admin/_components/action-bar";
import { Field } from "@/app/admin/_components/field";
import { SearchInput } from "@/app/admin/_components/search-input";
import { InlineConfirm } from "@/app/admin/_components/inline-confirm";
import { STATUS_LABELS, STATUS_TONES } from "@/app/admin/_components/status-labels";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

afterEach(cleanup);

describe("PageHeader", () => {
  // UT-110
  it("renderiza h1, descrição e ação", () => {
    render(<PageHeader title="Solicitações de bolsa" description="Acompanhe as famílias." action={<button>Nova</button>} />);
    expect(screen.getByRole("heading", { level: 1, name: "Solicitações de bolsa" })).toBeInTheDocument();
    expect(screen.getByText("Acompanhe as famílias.").tagName).toBe("P");
    expect(screen.getByRole("button", { name: "Nova" })).toBeInTheDocument();
  });
});

describe("Section", () => {
  // UT-111
  it("liga section[aria-labelledby] ao h2", () => {
    const { container } = render(
      <Section title="Precisa de atenção" description="Hoje" aside={<span>à parte</span>}>
        <p>conteúdo</p>
      </Section>
    );
    const section = container.querySelector("section")!;
    const heading = screen.getByRole("heading", { level: 2, name: "Precisa de atenção" });
    expect(section.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(screen.getByText("Hoje")).toBeInTheDocument();
    expect(screen.getByText("à parte")).toBeInTheDocument();
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });
});

describe("StatusPill", () => {
  // UT-112
  it("mostra texto e ponto decorativo; dot={false} remove o ponto", () => {
    const { rerender } = render(
      <StatusPill tone="warn" data-testid="status-badge" className="extra">
        Aguardando decisão
      </StatusPill>
    );
    const pill = screen.getByTestId("status-badge");
    expect(pill).toHaveTextContent("Aguardando decisão");
    expect(pill.className).toContain("extra");
    expect(pill.querySelector("span[aria-hidden]")).not.toBeNull();

    rerender(
      <StatusPill tone="accent" dot={false} data-testid="status-badge">
        Mensal
      </StatusPill>
    );
    expect(screen.getByTestId("status-badge").querySelector("span[aria-hidden]")).toBeNull();
  });

  it("tem vocabulário fechado para a situação da solicitação", () => {
    expect(STATUS_LABELS).toEqual({ pendente: "Aguardando decisão", aprovada: "Aprovada", rejeitada: "Rejeitada" });
    expect(STATUS_TONES).toEqual({ pendente: "warn", aprovada: "success", rejeitada: "danger" });
  });
});

describe("CountBadge", () => {
  it("renderiza o contador", () => {
    render(<CountBadge aria-label="3 pendentes">3</CountBadge>);
    expect(screen.getByLabelText("3 pendentes")).toHaveTextContent("3");
  });
});

describe("Notice", () => {
  // UT-113
  it("usa role alert para danger e status para os demais", () => {
    const { rerender } = render(
      <Notice tone="danger" title="Não foi possível salvar" action={<button>Tentar de novo</button>}>
        Confira a conexão.
      </Notice>
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Confira a conexão.");
    const title = screen.getByText("Não foi possível salvar");
    expect(title.tagName).toBe("P");
    expect(title.className).toContain("font-semibold");
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();

    rerender(<Notice tone="success">Texto salvo.</Notice>);
    expect(screen.getByRole("status")).toHaveTextContent("Texto salvo.");

    rerender(<Notice tone="warn">Atenção.</Notice>);
    expect(screen.getByRole("status")).toBeInTheDocument();

    rerender(<Notice>Informação.</Notice>);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("aceita role explícito e data-testid", () => {
    render(
      <Notice tone="success" role="alert" data-testid="decision-info">
        Aprovada.
      </Notice>
    );
    expect(screen.getByTestId("decision-info")).toHaveAttribute("role", "alert");
  });
});

describe("RecordRow", () => {
  // UT-114
  it("abre e fecha sem controle externo, com aria-expanded e aria-controls", () => {
    render(
      <RecordRow
        title="Família Carvalho"
        meta={<span>Colégio São José</span>}
        status={<StatusPill tone="warn">Aguardando decisão</StatusPill>}
        data-testid="application-card-1"
        toggleTestId="card-toggle"
        detailTestId="card-detail"
      >
        <p>detalhe</p>
      </RecordRow>
    );
    const toggle = screen.getByTestId("card-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("detalhe")).toBeNull();
    expect(screen.queryByTestId("card-detail")).toBeNull();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const detail = screen.getByTestId("card-detail");
    expect(toggle.getAttribute("aria-controls")).toBe(detail.id);
    expect(detail).toHaveTextContent("detalhe");
    expect(screen.getByTestId("application-card-1")).toContainElement(detail);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("detalhe")).toBeNull();
  });

  it("defaultOpen abre ao montar", () => {
    render(
      <RecordRow title="t" meta="m" defaultOpen>
        <p>já aberto</p>
      </RecordRow>
    );
    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();
    expect(screen.getByText("já aberto")).toBeInTheDocument();
  });

  // UT-115
  it("controlado: chama onOpenChange sem alterar sozinho", () => {
    const onOpenChange = vi.fn();
    render(
      <RecordRow title="t" meta="m" open={false} onOpenChange={onOpenChange}>
        <p>detalhe</p>
      </RecordRow>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("detalhe")).toBeNull();
  });

  it("controlado: segue o estado do pai", () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <RecordRow title="t" meta="m" open={open} onOpenChange={setOpen}>
          <p>detalhe</p>
        </RecordRow>
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("detalhe")).toBeInTheDocument();
  });
});

describe("SegmentedFilter", () => {
  // UT-116
  it("expõe group, aria-pressed, contagens e testids", () => {
    const onChange = vi.fn();
    render(
      <SegmentedFilter
        label="Filtrar por situação"
        value="pendente"
        onChange={onChange}
        testIdPrefix="filter"
        options={[
          { value: "todas", label: "Todas", count: 4 },
          { value: "pendente", label: "Aguardando decisão", count: 2, tone: "warn" },
          { value: "aprovada", label: "Aprovadas", count: 1, tone: "success" },
        ]}
      />
    );
    expect(screen.getByRole("group", { name: "Filtrar por situação" })).toBeInTheDocument();
    expect(screen.getByTestId("filter-pendente")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("filter-todas")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Todas 4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aguardando decisão 2" })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("filter-aprovada"));
    expect(onChange).toHaveBeenCalledWith("aprovada");
  });

  it("sem testIdPrefix não gera data-testid", () => {
    render(<SegmentedFilter label="f" value="a" onChange={() => {}} options={[{ value: "a", label: "A" }]} />);
    expect(screen.getByRole("button", { name: "A" })).not.toHaveAttribute("data-testid");
  });
});

describe("DataGrid / DataItem", () => {
  // UT-117
  it("renderiza dl > div > dt + dd e usa — para valor ausente", () => {
    const { container } = render(
      <DataGrid cols={2}>
        <DataItem label="Escola" value="Colégio São José" />
        <DataItem label="Telefone" value={null} data-testid="telefone" />
      </DataGrid>
    );
    const dl = container.querySelector("dl")!;
    expect(dl).not.toBeNull();
    const items = dl.querySelectorAll(":scope > div");
    expect(items).toHaveLength(2);
    expect(items[0].querySelector("dt")).toHaveTextContent("Escola");
    expect(items[0].querySelector("dd")).toHaveTextContent("Colégio São José");
    expect(screen.getByTestId("telefone").querySelector("dd")).toHaveTextContent("—");
  });
});

describe("EmptyState", () => {
  // UT-118
  it("mostra título, descrição e ação opcional", () => {
    const { rerender } = render(<EmptyState title="Nenhuma solicitação aqui" description="Mude o filtro." />);
    expect(screen.getByText("Nenhuma solicitação aqui")).toBeInTheDocument();
    expect(screen.getByText("Mude o filtro.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();

    rerender(
      <EmptyState title="Nenhuma" description="d" action={<Button variant="outline">Limpar filtros</Button>} />
    );
    expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeInTheDocument();
  });
});

describe("StatTile", () => {
  // UT-119
  it("mostra rótulo, valor, dica e ponto só quando tone não é neutral", () => {
    const { container, rerender } = render(<StatTile label="Esperado" value="R$ 1.730,00" hint="3 pagamentos" />);
    const label = screen.getByText("Esperado");
    expect(label.className).toContain("uppercase");
    expect(screen.getByText("R$ 1.730,00")).toBeInTheDocument();
    expect(screen.getByText("3 pagamentos")).toBeInTheDocument();
    expect(container.querySelector("span[aria-hidden]")).toBeNull();

    rerender(<StatTile label="Em aberto" value="R$ 1.380,00" tone="warn" />);
    expect(container.querySelector("span[aria-hidden]")).not.toBeNull();
  });
});

describe("ActionBar", () => {
  // UT-120
  it("renderiza botões e nota", () => {
    render(
      <ActionBar note="PDFs e ações secundárias.">
        <Button variant="outline">Imprimir ficha</Button>
        <Button variant="destructive">Excluir</Button>
      </ActionBar>
    );
    expect(screen.getByRole("button", { name: "Imprimir ficha" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
    expect(screen.getByText("PDFs e ações secundárias.")).toBeInTheDocument();
  });
});

describe("Field", () => {
  // UT-121
  it("liga label, aria-describedby e aria-invalid ao controle", () => {
    const { rerender } = render(
      <Field label="Dia de vencimento" hint="De 1 a 31.">
        {(a11y) => <Input {...a11y} type="number" />}
      </Field>
    );
    const input = screen.getByLabelText("Dia de vencimento");
    expect(input).toHaveAttribute("aria-describedby", screen.getByText("De 1 a 31.").id);
    expect(input).not.toHaveAttribute("aria-invalid");

    rerender(
      <Field label="Dia de vencimento" hint="De 1 a 31." error="Informe um dia entre 1 e 31.">
        {(a11y) => <Input {...a11y} type="number" />}
      </Field>
    );
    const invalid = screen.getByLabelText("Dia de vencimento");
    expect(invalid).toHaveAttribute("aria-invalid", "true");
    const error = screen.getByText("Informe um dia entre 1 e 31.");
    expect(invalid).toHaveAttribute("aria-describedby", error.id);
    expect(screen.queryByText("De 1 a 31.")).toBeNull();
  });

  it("sem dica nem erro não define aria-describedby e aceita id fixo", () => {
    render(
      <Field label="Rodapé" id="institutional-footer">
        {(a11y) => <textarea {...a11y} />}
      </Field>
    );
    const control = screen.getByLabelText("Rodapé");
    expect(control).toHaveAttribute("id", "institutional-footer");
    expect(control).not.toHaveAttribute("aria-describedby");
  });
});

describe("SearchInput", () => {
  // UT-122
  it("é um searchbox com label sr-only e chama onChange com o valor", () => {
    const onChange = vi.fn();
    render(
      <SearchInput value="" onChange={onChange} label="Buscar solicitações" placeholder="Nome ou escola" data-testid="search-input" />
    );
    const input = screen.getByRole("searchbox", { name: "Buscar solicitações" });
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveAttribute("placeholder", "Nome ou escola");
    expect(screen.getByTestId("search-input")).toBe(input);
    expect(screen.getByText("Buscar solicitações").className).toContain("sr-only");

    fireEvent.change(input, { target: { value: "São José" } });
    expect(onChange).toHaveBeenCalledWith("São José");
  });
});

describe("InlineConfirm", () => {
  // UT-123
  it("mostra a pergunta e dispara confirmar/cancelar", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <InlineConfirm
        question="Excluir este cadastro?"
        confirmLabel="Sim, excluir"
        onConfirm={onConfirm}
        onCancel={onCancel}
        confirmTestId="donor-delete-confirm"
        cancelTestId="donor-delete-cancel"
        data-testid="confirm-dialog"
      />
    );
    expect(screen.getByRole("group", { name: "Excluir este cadastro?" })).toBeInTheDocument();
    expect(screen.getByTestId("confirm-dialog")).toHaveTextContent("Excluir este cadastro?");

    fireEvent.click(screen.getByTestId("donor-delete-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Sim, excluir" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Não" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("donor-delete-cancel")).toHaveTextContent("Não");
  });

  it("pending desabilita o botão de confirmar", () => {
    const onConfirm = vi.fn();
    render(<InlineConfirm question="Excluir?" confirmLabel="Sim" cancelLabel="Voltar" onConfirm={onConfirm} onCancel={() => {}} pending />);
    const confirm = screen.getByRole("button", { name: "Sim" });
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
  });
});

describe("buttonVariants", () => {
  // UT-124
  it("outline e ghost usam hover:bg-bg e não hover:bg-muted", () => {
    for (const variant of ["outline", "ghost"] as const) {
      const classes = buttonVariants({ variant });
      expect(classes).toContain("hover:bg-bg");
      expect(classes).not.toContain("hover:bg-muted");
    }
  });

  it("as demais variantes seguem o shadcn", () => {
    expect(buttonVariants({ variant: "default" })).toContain("bg-primary");
    expect(buttonVariants({ variant: "destructive" })).toContain("bg-destructive/10");
    expect(buttonVariants({ variant: "secondary" })).toContain("bg-secondary");
  });
});

/**
 * Abas do shadcn (base-ui) no jsdom: `fireEvent.click` no trigger basta para
 * trocar a aba, tanto não controlada quanto controlada (`value`/`onValueChange`).
 * Reutilizar este padrão nos testes de páginas com abas.
 */
describe("shadcn Tabs (base-ui) no jsdom", () => {
  function TabsHarness({ onValueChange }: { onValueChange?: (value: string) => void }) {
    const [value, setValue] = useState("resumo");
    return (
      <Tabs
        value={value}
        onValueChange={(next) => {
          setValue(next as string);
          onValueChange?.(next as string);
        }}
      >
        <TabsList aria-label="Detalhe da solicitação">
          <TabsTrigger value="resumo" data-testid="detail-tab-resumo">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="decisao" data-testid="detail-tab-decisao">
            Decisão
          </TabsTrigger>
        </TabsList>
        <TabsContent value="resumo">Conteúdo do resumo</TabsContent>
        <TabsContent value="decisao">Conteúdo da decisão</TabsContent>
      </Tabs>
    );
  }

  it("troca de aba com fireEvent.click e expõe tablist/tab/tabpanel", () => {
    const onValueChange = vi.fn();
    render(<TabsHarness onValueChange={onValueChange} />);
    expect(screen.getByRole("tablist", { name: "Detalhe da solicitação" })).toBeInTheDocument();
    expect(screen.getByTestId("detail-tab-resumo")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Conteúdo do resumo");

    fireEvent.click(screen.getByTestId("detail-tab-decisao"));
    expect(onValueChange).toHaveBeenCalledWith("decisao");
    expect(screen.getByTestId("detail-tab-decisao")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Conteúdo da decisão");
  });
});
