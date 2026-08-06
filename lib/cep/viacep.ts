export interface ViaCepAddress {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

export function digitsOnlyCep(cep: string): string {
  return cep.replace(/\D/g, "");
}

export function formatCep(cep: string): string {
  const digits = digitsOnlyCep(cep).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatAddressFromViaCep(addr: ViaCepAddress): string {
  const street = [addr.logradouro, addr.bairro].filter(Boolean).join(", ");
  const cityUf = [addr.localidade, addr.uf].filter(Boolean).join(" — ");
  return [street, cityUf].filter(Boolean).join(", ");
}

export async function lookupCep(
  cep: string
): Promise<{ ok: true; address: ViaCepAddress } | { ok: false; error: string }> {
  const digits = digitsOnlyCep(cep);
  if (digits.length !== 8) {
    return { ok: false, error: "Informe um CEP com 8 dígitos." };
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { ok: false, error: "Não foi possível consultar o CEP. Tente novamente." };
    }
    const data = (await res.json()) as ViaCepAddress & { erro?: boolean };
    if (data.erro) {
      return { ok: false, error: "CEP não encontrado." };
    }
    return {
      ok: true,
      address: {
        cep: data.cep || formatCep(digits),
        logradouro: data.logradouro || "",
        bairro: data.bairro || "",
        localidade: data.localidade || "",
        uf: data.uf || "",
      },
    };
  } catch {
    return { ok: false, error: "Não foi possível consultar o CEP. Tente novamente." };
  }
}
