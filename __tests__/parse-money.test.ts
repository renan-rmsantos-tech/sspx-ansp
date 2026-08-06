import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney } from "@/app/form/_components/form-types";

describe("parseMoney", () => {
  it("parses plain integers", () => {
    expect(parseMoney("1200")).toBe(1200);
  });

  it("parses decimal comma", () => {
    expect(parseMoney("1234,56")).toBe(1234.56);
  });

  it("parses thousands dot with decimal comma", () => {
    expect(parseMoney("1.234,56")).toBe(1234.56);
  });

  it("treats a lone dot followed by 3 digits as thousands separator", () => {
    expect(parseMoney("1.500")).toBe(1500);
  });

  it("parses decimal dot", () => {
    expect(parseMoney("1234.56")).toBe(1234.56);
  });

  it("parses multiple thousands separators", () => {
    expect(parseMoney("1.234.567,89")).toBe(1234567.89);
  });

  it("strips currency symbols and spaces", () => {
    expect(parseMoney("R$ 1.500,00")).toBe(1500);
  });

  it("returns 0 for empty or invalid input", () => {
    expect(parseMoney("")).toBe(0);
    expect(parseMoney("abc")).toBe(0);
  });
});

describe("formatMoney", () => {
  it("formats with R$ and decimal comma", () => {
    expect(formatMoney(1234.5)).toBe("R$ 1234,50");
  });
});
