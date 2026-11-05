/** Os erros que o `DonorForm` mensal mostra ao enviar o formulário vazio. */
export const emptyMonthlyErrors: Record<string, string> = {
  dia_vencimento: "Selecione um dia de pagamento: 1, 10, 15, 20 ou 30.",
  nome: "Informe seu nome.",
  cpf: "Informe seu CPF.",
  email: "Informe seu e-mail.",
  telefone: "Informe seu telefone.",
  cep: "Informe seu CEP.",
  residence_city: "Informe sua cidade.",
  residence_state: "Selecione uma UF válida.",
  residence_confirmed: "Confirme sua cidade e UF.",
  endereco: "Informe seu endereço.",
  priorado_capela: "Selecione o priorado ou capela.",
};
