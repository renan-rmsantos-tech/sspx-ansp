import type { ConferenceData, ConferenceRow } from "./client";

/** Mês corrente em São Paulo nas fixtures; o seletor não passa dele. */
export const CURRENT_MONTH = "2026-11";

const ADMIN_ID = "0b8e4c1a-2f6d-4a3b-9c7e-5d1f8a6b2c90";

/** Campos do livro que a conferência devolve e que as linhas não variam. */
const ledgerDefaults = {
  credit_date: null,
  note: null,
  confirmed_at: null,
  confirmed_by: null,
  receipt_link_generated_by: null,
  receipt_link_generated_actor: null,
  receipt_link_generated_at: null,
  receipt_name: null,
  receipt_uploaded_at: null,
  received_value: "0.00",
  status: "pendente",
  legacy_one_time: false,
  missing_monthly_receipt: false,
  receipt_state: "pendente",
  has_receipt: false,
} satisfies Partial<ConferenceRow>;

const novemberRows: ConferenceRow[] = [
  {
    ...ledgerDefaults,
    id: "5a7d2e10-8b3c-4f61-a9d4-0c2e6b1f7a01",
    pledge_id: "1b6a8d35-9e27-4c53-a0f1-6c4e2d859d55",
    donor_name: "Luísa Fernanda Rocha",
    frequency: "unica",
    competencia: "2026-11",
    due_date: "2026-11-03",
    expected_value: "1200.00",
    outstanding: "1200.00",
    has_receipt: true,
    created_at: "2026-11-03T19:05:00.000Z",
    updated_at: "2026-11-03T19:05:00.000Z",
  },
  {
    ...ledgerDefaults,
    id: "5a7d2e10-8b3c-4f61-a9d4-0c2e6b1f7a02",
    pledge_id: "a2d94e17-5c08-4f6b-8e3a-7b1c9d204e22",
    donor_name: "João Batista Pereira",
    frequency: "mensal",
    competencia: "2026-11",
    due_date: "2026-11-05",
    expected_value: "80.00",
    outstanding: "80.00",
    receipt_state: "enviado",
    has_receipt: true,
    receipt_name: "pix-novembro.jpg",
    receipt_uploaded_at: "2026-11-02T22:14:00.000Z",
    created_at: "2026-10-23T18:20:00.000Z",
    updated_at: "2026-11-02T22:14:00.000Z",
  },
  {
    ...ledgerDefaults,
    id: "5a7d2e10-8b3c-4f61-a9d4-0c2e6b1f7a03",
    pledge_id: "6f1c2a40-3b7e-4c1d-9a52-1e8f0b7d3a11",
    donor_name: "Maria Aparecida Souza",
    frequency: "mensal",
    competencia: "2026-11",
    due_date: "2026-11-10",
    expected_value: "200.00",
    outstanding: "200.00",
    created_at: "2026-10-01T03:00:00.000Z",
    updated_at: "2026-10-01T03:00:00.000Z",
  },
  {
    ...ledgerDefaults,
    id: "5a7d2e10-8b3c-4f61-a9d4-0c2e6b1f7a04",
    pledge_id: "8c3e1f72-4a69-4b0d-b5e2-7f9d1a3c6e77",
    donor_name: "Ana Clara Lima",
    frequency: "mensal",
    competencia: "2026-11",
    due_date: "2026-11-01",
    expected_value: "1200.00",
    received_value: "1200.00",
    outstanding: "0.00",
    status: "confirmado",
    credit_date: "2026-11-01",
    confirmed_at: "2026-11-03T12:30:00.000Z",
    confirmed_by: ADMIN_ID,
    receipt_state: "enviado",
    has_receipt: true,
    receipt_name: "comprovante-novembro.pdf",
    receipt_uploaded_at: "2026-11-01T10:02:00.000Z",
    created_at: "2026-10-01T03:00:00.000Z",
    updated_at: "2026-11-03T12:30:00.000Z",
  },
  {
    ...ledgerDefaults,
    id: "5a7d2e10-8b3c-4f61-a9d4-0c2e6b1f7a05",
    pledge_id: "3e9a5c18-7b2d-4f40-8a61-2d4c7e9b1f88",
    donor_name: "Antônio Marcos Silva",
    frequency: "mensal",
    competencia: "2026-11",
    due_date: "2026-11-02",
    expected_value: "250.00",
    received_value: "200.00",
    outstanding: "50.00",
    status: "divergente",
    credit_date: "2026-11-02",
    confirmed_at: "2026-11-03T12:34:00.000Z",
    confirmed_by: ADMIN_ID,
    note: "Pix de R$ 200,00; o benfeitor avisou que completa a diferença na próxima semana.",
    created_at: "2026-10-01T03:00:00.000Z",
    updated_at: "2026-11-03T12:34:00.000Z",
  },
  {
    ...ledgerDefaults,
    id: "5a7d2e10-8b3c-4f61-a9d4-0c2e6b1f7a06",
    pledge_id: "c7e05b93-1a4d-4e2f-b6c8-3d9a5f716b33",
    donor_name: "Pedro Henrique Alves",
    frequency: "unica",
    competencia: "2026-11",
    due_date: "2026-11-01",
    expected_value: "500.00",
    outstanding: "500.00",
    status: "nao_identificado",
    confirmed_at: "2026-11-03T12:40:00.000Z",
    confirmed_by: ADMIN_ID,
    note: "Nenhum crédito de R$ 500,00 no extrato entre 01/11 e 03/11.",
    has_receipt: true,
    created_at: "2026-10-29T13:30:00.000Z",
    updated_at: "2026-11-03T12:40:00.000Z",
  },
];

/** Mensal de setembro ainda sem crédito nem comprovante: aparece nas pendências antigas. */
const overdueRows: ConferenceRow[] = [
  {
    ...ledgerDefaults,
    id: "5a7d2e10-8b3c-4f61-a9d4-0c2e6b1f7a07",
    pledge_id: "e9b3f6c2-7d15-4a80-9c4e-5f2b8a937c44",
    donor_name: "Carlos Eduardo Mendes",
    frequency: "mensal",
    competencia: "2026-09",
    due_date: "2026-09-15",
    expected_value: "150.00",
    outstanding: "150.00",
    missing_monthly_receipt: true,
    created_at: "2026-09-01T03:00:00.000Z",
    updated_at: "2026-09-01T03:00:00.000Z",
  },
];

/** Cobertura mensal desde março de 2026; os meses anteriores ficam fora da série. */
const series: ConferenceData["series"] = [
  { month: "2026-03", expected: "1450.00", received: "1450.00", receipt_pending: 0, receipt_sent: 4, overdue_missing_receipt: 0 },
  { month: "2026-04", expected: "1450.00", received: "1300.00", receipt_pending: 1, receipt_sent: 3, overdue_missing_receipt: 0 },
  { month: "2026-05", expected: "1530.00", received: "1530.00", receipt_pending: 0, receipt_sent: 5, overdue_missing_receipt: 0 },
  { month: "2026-06", expected: "2030.00", received: "1880.00", receipt_pending: 1, receipt_sent: 4, overdue_missing_receipt: 0 },
  { month: "2026-07", expected: "1830.00", received: "1830.00", receipt_pending: 0, receipt_sent: 5, overdue_missing_receipt: 0 },
  { month: "2026-08", expected: "1830.00", received: "1680.00", receipt_pending: 1, receipt_sent: 4, overdue_missing_receipt: 0 },
  { month: "2026-09", expected: "2330.00", received: "2180.00", receipt_pending: 1, receipt_sent: 4, overdue_missing_receipt: 1 },
  { month: "2026-10", expected: "1800.00", received: "1800.00", receipt_pending: 0, receipt_sent: 4, overdue_missing_receipt: 0 },
  { month: "2026-11", expected: "3430.00", received: "1400.00", receipt_pending: 2, receipt_sent: 2, overdue_missing_receipt: 0 },
];

/** Novembro em conferência: aguardando, com comprovante, conferido, divergente e não identificado. */
export const novemberConference: ConferenceData = {
  coverage_start: "2026-03",
  series,
  rows: novemberRows,
  overdue: overdueRows,
  totals: { expected: "3430.00", received: "1400.00", outstanding: "2030.00" },
};

/** Outubro já conferido: nada aguardando, em aberto zerado. */
export const octoberConference: ConferenceData = {
  coverage_start: "2026-03",
  series: series.filter((row) => row.month <= "2026-10"),
  rows: [
    {
      ...ledgerDefaults,
      id: "5a7d2e10-8b3c-4f61-a9d4-0c2e6b1f7a11",
      pledge_id: "8c3e1f72-4a69-4b0d-b5e2-7f9d1a3c6e77",
      donor_name: "Ana Clara Lima",
      frequency: "mensal",
      competencia: "2026-10",
      due_date: "2026-10-01",
      expected_value: "1200.00",
      received_value: "1200.00",
      outstanding: "0.00",
      status: "confirmado",
      credit_date: "2026-10-01",
      confirmed_at: "2026-10-02T12:00:00.000Z",
      confirmed_by: ADMIN_ID,
      receipt_state: "enviado",
      has_receipt: true,
      created_at: "2026-09-01T03:00:00.000Z",
      updated_at: "2026-10-02T12:00:00.000Z",
    },
    {
      ...ledgerDefaults,
      id: "5a7d2e10-8b3c-4f61-a9d4-0c2e6b1f7a12",
      pledge_id: "3e9a5c18-7b2d-4f40-8a61-2d4c7e9b1f88",
      donor_name: "Antônio Marcos Silva",
      frequency: "mensal",
      competencia: "2026-10",
      due_date: "2026-10-02",
      expected_value: "250.00",
      received_value: "250.00",
      outstanding: "0.00",
      status: "confirmado",
      credit_date: "2026-10-02",
      confirmed_at: "2026-10-03T12:00:00.000Z",
      confirmed_by: ADMIN_ID,
      receipt_state: "enviado",
      has_receipt: true,
      created_at: "2026-09-01T03:00:00.000Z",
      updated_at: "2026-10-03T12:00:00.000Z",
    },
    {
      ...ledgerDefaults,
      id: "5a7d2e10-8b3c-4f61-a9d4-0c2e6b1f7a13",
      pledge_id: "6f1c2a40-3b7e-4c1d-9a52-1e8f0b7d3a11",
      donor_name: "Maria Aparecida Souza",
      frequency: "mensal",
      competencia: "2026-10",
      due_date: "2026-10-10",
      expected_value: "200.00",
      received_value: "200.00",
      outstanding: "0.00",
      status: "confirmado",
      credit_date: "2026-10-09",
      confirmed_at: "2026-10-13T12:00:00.000Z",
      confirmed_by: ADMIN_ID,
      note: "Pix identificado pelo nome do titular.",
      receipt_state: "enviado",
      has_receipt: true,
      created_at: "2026-09-01T03:00:00.000Z",
      updated_at: "2026-10-13T12:00:00.000Z",
    },
    {
      ...ledgerDefaults,
      id: "5a7d2e10-8b3c-4f61-a9d4-0c2e6b1f7a14",
      pledge_id: "e9b3f6c2-7d15-4a80-9c4e-5f2b8a937c44",
      donor_name: "Carlos Eduardo Mendes",
      frequency: "mensal",
      competencia: "2026-10",
      due_date: "2026-10-15",
      expected_value: "150.00",
      received_value: "150.00",
      outstanding: "0.00",
      status: "confirmado",
      credit_date: "2026-10-15",
      confirmed_at: "2026-10-16T12:00:00.000Z",
      confirmed_by: ADMIN_ID,
      receipt_state: "enviado",
      has_receipt: true,
      created_at: "2026-09-01T03:00:00.000Z",
      updated_at: "2026-10-16T12:00:00.000Z",
    },
  ],
  overdue: overdueRows,
  totals: { expected: "1800.00", received: "1800.00", outstanding: "0.00" },
};

/** Março, o mês de lançamento, ainda sem pagamentos e sem pendências antigas. */
export const emptyConference: ConferenceData = {
  coverage_start: "2026-03",
  series: [{ month: "2026-03", expected: "0.00", received: "0.00", receipt_pending: 0, receipt_sent: 0, overdue_missing_receipt: 0 }],
  rows: [],
  overdue: [],
  totals: { expected: "0.00", received: "0.00", outstanding: "0.00" },
};

/** O que `getDonorPaymentConference` devolve para cada mês do seletor. */
export const conferenceByMonth: Record<string, ConferenceData> = {
  "2026-11": novemberConference,
  "2026-10": octoberConference,
  "2026-03": emptyConference,
};

/** Comprovante de Pix em SVG, para a prévia; a action real devolve uma URL com ticket. */
export const receiptPreview = {
  url:
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 0 360 480">' +
        '<rect width="360" height="480" fill="#ffffff"/>' +
        '<rect x="0" y="0" width="360" height="72" fill="#1f3a5f"/>' +
        '<text x="24" y="44" font-family="sans-serif" font-size="20" fill="#ffffff">Comprovante de Pix</text>' +
        '<text x="24" y="120" font-family="sans-serif" font-size="13" fill="#6b7280">Valor</text>' +
        '<text x="24" y="146" font-family="sans-serif" font-size="24" fill="#111827">R$ 80,00</text>' +
        '<text x="24" y="194" font-family="sans-serif" font-size="13" fill="#6b7280">Data</text>' +
        '<text x="24" y="216" font-family="sans-serif" font-size="16" fill="#111827">02/11/2026 19:14</text>' +
        '<text x="24" y="262" font-family="sans-serif" font-size="13" fill="#6b7280">De</text>' +
        '<text x="24" y="284" font-family="sans-serif" font-size="16" fill="#111827">João Batista Pereira</text>' +
        '<text x="24" y="330" font-family="sans-serif" font-size="13" fill="#6b7280">Para</text>' +
        '<text x="24" y="352" font-family="sans-serif" font-size="16" fill="#111827">Arca Nossa Senhora da Providência</text>' +
        "</svg>"
    ),
  type: "image/svg+xml",
};
