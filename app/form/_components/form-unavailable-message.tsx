interface FormUnavailableMessageProps {
  year?: { nome: string; data_inicio: string; data_fim: string };
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function FormUnavailableMessage({ year }: FormUnavailableMessageProps) {
  return (
    <section
      aria-labelledby="form-unavailable-title"
      className="rounded-md border border-border bg-surface px-8 py-12 text-center"
    >
      <h2
        id="form-unavailable-title"
        className="font-display text-xl font-semibold text-fg"
      >
        {year ? "Abertura das inscrições" : "Formulário indisponível"}
      </h2>
      {year ? (
        <p className="mx-auto mt-3 max-w-[42ch] text-[15px] text-fg">
          O formulário de solicitação de bolsa para o ano letivo {year.nome}{" "}
          será aberto em{" "}
          <time dateTime={year.data_inicio}>{formatDate(year.data_inicio)}</time>.
        </p>
      ) : (
        <p className="mx-auto mt-3 max-w-[42ch] text-[15px] text-muted">
          A data de abertura das próximas inscrições ainda não foi cadastrada.
        </p>
      )}
      {!year && (
        <p className="mx-auto mt-3 max-w-[42ch] text-[15px] text-muted">
          Entre em contato com a secretaria da escola para mais informações.
        </p>
      )}
    </section>
  );
}
