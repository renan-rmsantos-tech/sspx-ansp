import { describe, expect, it } from "vitest";
import { serializeConferenceCsv } from "@/lib/donor-conference-csv";

describe("conference CSV", () => {
  it("escapes formulas, quotes and newlines and retains exact totals without private fields", () => {
    const row = { competencia: "2026-10", donor_name: '=SUM(1,1) "A"\nB', frequency: "mensal", due_date: "2026-10-10", expected_value: "100.00", received_value: "80.00", outstanding: "20.00", receipt_state: "pendente", has_receipt: false, status: "divergente", credit_date: null, confirmed_at: null, confirmed_by: null, cpf: "SECRETCPF", email: "SECRETEMAIL", receipt_path: "SECRETPATH", note: "SECRETNOTE" };
    const csv = serializeConferenceCsv({ rows: [row] } as never);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain(`"'=SUM(1,1) ""A""\nB"`);
    expect(csv).toContain('"100.00","80.00","20.00"');
    expect(csv).toContain('"Comprovante pendente","Divergente"');
    for (const secret of ["SECRETCPF", "SECRETEMAIL", "SECRETPATH", "SECRETNOTE"]) expect(csv).not.toContain(secret);
  });
});

describe("CSV edge cases", () => {
  it.each(["=1+1", "+cmd", "-cmd", "@cmd", "\t=1", "\r=1"])("neutralizes %j", name => {
    const csv = serializeConferenceCsv({ rows: [{ donor_name: name }] } as never);
    expect(csv).toContain(`"'${name}"`);
  });
  it("writes an empty month as headers only", () => {
    const csv = serializeConferenceCsv({ rows: [] } as never);
    expect(csv.split("\r\n")).toHaveLength(2);
  });
  it("distinguishes uploaded evidence and confirmed credit", () => {
    const csv = serializeConferenceCsv({ rows: [{ frequency: "mensal", receipt_state: "enviado", status: "confirmado" }] } as never);
    expect(csv).toContain('"Comprovante enviado","Confirmado no extrato"');
  });
});
