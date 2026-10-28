import { DocumentFooterView, institutionalFooterPageStyle } from "./document-footer";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  DocumentHeaderView,
  resolveDocumentHeader,
  type DocumentHeaderData,
} from "./document-header";

// Dados completos da solicitação, já carregados do banco.
export interface ApplicationPdfData {
  header?: DocumentHeaderData | null;
  escola: string;
  status: string;
  data_envio?: string | null;
  ano_letivo?: string | null;
  pai_nome: string;
  pai_rg?: string | null;
  pai_cpf?: string | null;
  pai_profissao?: string | null;
  mae_nome: string;
  mae_cpf?: string | null;
  mae_profissao?: string | null;
  endereco: string;
  cep?: string | null;
  telefone: string;
  email?: string | null;
  renda_pai?: number | null;
  renda_mae?: number | null;
  renda_outros?: number | null;
  pessoas_domicilio?: number | null;
  despesa_aluguel?: number | null;
  despesa_servicos?: number | null;
  despesa_tv?: number | null;
  despesa_celular_plano?: number | null;
  despesa_celular_parcelas?: number | null;
  despesa_internet?: number | null;
  desconto_solicitado?: number | null;
  students: Array<{
    nome: string;
    cpf?: string | null;
    serie: string;
    mensalidade?: number | null;
  }>;
  other_children: Array<{
    nome: string;
    cpf?: string | null;
    nascimento?: string | null;
  }>;
  vehicles: Array<{ marca: string; modelo: string; ano: string }>;
  collaboration?: {
    limpeza?: boolean | null;
    limpeza_vezes_semana?: number | null;
    mutirao?: boolean | null;
    mutirao_sabados?: number | null;
    arrecadacao?: boolean | null;
    buscar_benfeitores?: boolean | null;
    outros?: string | null;
  } | null;
  benefactors: Array<{ nome: string; email?: string | null }>;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.4,
    color: "#1a1a1a",
  },
  docTitleBlock: {
    textAlign: "center",
    marginBottom: 18,
  },
  subtitle: {
    fontSize: 9,
    color: "#555",
    marginTop: 2,
  },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    marginTop: 6,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginTop: 16,
    marginBottom: 6,
    backgroundColor: "#f0ece2",
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  row: {
    flexDirection: "row",
    marginBottom: 3,
  },
  cellLabel: {
    width: "32%",
    color: "#555",
  },
  cellValue: {
    width: "68%",
  },
  twoCol: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  field: {
    width: "50%",
    flexDirection: "row",
    marginBottom: 3,
    paddingRight: 8,
  },
  fLabel: {
    color: "#555",
    marginRight: 4,
  },
  fValue: {
    fontFamily: "Helvetica-Bold",
  },
  tableHead: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #999",
    paddingBottom: 2,
    marginBottom: 2,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #ddd",
    paddingVertical: 2,
  },
  muted: {
    color: "#777",
  },
});

function fmtCurrency(v?: number | null): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

function fmtDate(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("pt-BR");
}

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fLabel}>{label}:</Text>
      <Text style={styles.fValue}>{value ?? "—"}</Text>
    </View>
  );
}

function ApplicationDocument({ data }: { data: ApplicationPdfData }) {
  const c = data.collaboration;
  const colaboracoes: string[] = [];
  if (c?.limpeza) colaboracoes.push(`Limpeza (${c.limpeza_vezes_semana ?? "?"}x/semana)`);
  if (c?.mutirao) colaboracoes.push(`Mutirão (${c.mutirao_sabados ?? "?"} sábados)`);
  if (c?.arrecadacao) colaboracoes.push("Arrecadação");
  if (c?.buscar_benfeitores) colaboracoes.push("Buscar benfeitores");
  if (c?.outros) colaboracoes.push(`Outros: ${c.outros}`);

  return (
    <Document title={`Solicitação - ${data.pai_nome}`}>
      <Page size="A4" style={[styles.page, institutionalFooterPageStyle(data.header)]}>
        <DocumentHeaderView header={resolveDocumentHeader(data.header)} />
        <View style={styles.docTitleBlock}>
          <Text style={styles.subtitle}>
            Solicitação de Bolsa para Família Necessitada
          </Text>
          <Text style={styles.title}>Dados da Solicitação</Text>
        </View>

        <View style={styles.twoCol}>
          <Field label="Escola" value={data.escola} />
          <Field label="Status" value={STATUS_LABELS[data.status] ?? data.status} />
          <Field label="Ano letivo" value={data.ano_letivo} />
          <Field label="Data de envio" value={fmtDate(data.data_envio)} />
          <Field label="Desconto solicitado" value={data.desconto_solicitado != null ? `${data.desconto_solicitado}%` : "—"} />
        </View>

        <Text style={styles.sectionTitle}>Dados do Solicitante</Text>
        <View style={styles.twoCol}>
          <Field label="Pai" value={data.pai_nome} />
          <Field label="RG" value={data.pai_rg} />
          <Field label="CPF" value={data.pai_cpf} />
          <Field label="Profissão" value={data.pai_profissao} />
          <Field label="Mãe" value={data.mae_nome} />
          <Field label="CPF (mãe)" value={data.mae_cpf} />
          <Field label="Profissão (mãe)" value={data.mae_profissao} />
          <Field label="Endereço" value={data.endereco} />
          <Field label="CEP" value={data.cep} />
          <Field label="Telefone" value={data.telefone} />
          <Field label="E-mail" value={data.email} />
        </View>

        <Text style={styles.sectionTitle}>Alunos</Text>
        {data.students.length > 0 ? (
          <View>
            <View style={styles.tableHead}>
              <Text style={{ width: "40%" }}>Nome</Text>
              <Text style={{ width: "22%" }}>CPF</Text>
              <Text style={{ width: "18%" }}>Série</Text>
              <Text style={{ width: "20%" }}>Mensalidade</Text>
            </View>
            {data.students.map((s, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={{ width: "40%" }}>{s.nome}</Text>
                <Text style={{ width: "22%" }}>{s.cpf || "—"}</Text>
                <Text style={{ width: "18%" }}>{s.serie}</Text>
                <Text style={{ width: "20%" }}>{fmtCurrency(s.mensalidade)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>Nenhum aluno registrado.</Text>
        )}

        {data.other_children.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Outros Filhos</Text>
            {data.other_children.map((ch, i) => (
              <Text key={i}>
                • {ch.nome} — {fmtDate(ch.nascimento)}
                {ch.cpf ? ` (CPF: ${ch.cpf})` : ""}
              </Text>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Renda e Despesas</Text>
        <View style={styles.twoCol}>
          <Field label="Renda do pai" value={fmtCurrency(data.renda_pai)} />
          <Field label="Renda da mãe" value={fmtCurrency(data.renda_mae)} />
          <Field label="Outras rendas" value={fmtCurrency(data.renda_outros)} />
          <Field label="Pessoas no domicílio" value={data.pessoas_domicilio} />
          <Field label="Aluguel" value={fmtCurrency(data.despesa_aluguel)} />
          <Field label="Serviços" value={fmtCurrency(data.despesa_servicos)} />
          <Field label="TV" value={fmtCurrency(data.despesa_tv)} />
          <Field label="Celular (plano)" value={fmtCurrency(data.despesa_celular_plano)} />
          <Field label="Celular (parcelas)" value={fmtCurrency(data.despesa_celular_parcelas)} />
          <Field label="Internet" value={fmtCurrency(data.despesa_internet)} />
        </View>

        {data.vehicles.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Veículos</Text>
            {data.vehicles.map((v, i) => (
              <Text key={i}>
                • {v.marca} {v.modelo} ({v.ano})
              </Text>
            ))}
          </>
        )}

        {colaboracoes.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Colaboração Voluntária</Text>
            {colaboracoes.map((line, i) => (
              <Text key={i}>• {line}</Text>
            ))}
          </>
        )}

        {data.benefactors.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Indicação de Benfeitores</Text>
            {data.benefactors.map((b, i) => (
              <Text key={i}>
                • {b.nome}
                {b.email ? ` (${b.email})` : ""}
              </Text>
            ))}
          </>
        )}
        <DocumentFooterView header={data.header} />
      </Page>
    </Document>
  );
}

export function renderApplicationPdf(data: ApplicationPdfData): Promise<Buffer> {
  return renderToBuffer(<ApplicationDocument data={data} />);
}
