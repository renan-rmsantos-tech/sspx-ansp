const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

export type RecurrencePledge = {
  id: string;
  created_at: string | Date;
  frequencia: "unica" | "mensal";
  duracao: "um_ano" | "indeterminado" | null;
  dia_vencimento: number | null;
};

export type DonorOccurrence = {
  pledgeId: string;
  competence: string;
  dueDate: string;
  index: number;
  /** Needed to discard reminder dates before the pledge existed. */
  registrationDate: string;
};

export type ReminderKind = "10d" | "5d";

export type DonorReminderSchedule = {
  occurrence: DonorOccurrence;
  kind: ReminderKind;
  scheduledDate: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SAO_PAULO_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Interpret a timestamp instant as a São Paulo calendar date. */
export function saoPauloDate(value: string | Date): string {
  // postgres.js can return "YYYY-MM-DD HH:mm:ss+00" for timestamptz.
  const normalized =
    value instanceof Date
      ? null
      : value
          .replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T")
          .replace(/([+-]\d{2})$/, "$1:00");
  if (normalized !== null && !/(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized)) {
    throw new RangeError("Pledge timestamp must include a time zone");
  }
  const instant = value instanceof Date ? value : new Date(normalized!);
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError("Invalid pledge timestamp");
  }

  const parts = dateFormatter.formatToParts(instant);
  const part = (type: "year" | "month" | "day") =>
    parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function monthNumber(month: string): number | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : null;
}

function monthString(number: number): string {
  return `${Math.floor(number / 12)}-${String((number % 12) + 1).padStart(2, "0")}`;
}

function dateForMonth(month: string, day: number): string {
  const [year, calendarMonth] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, calendarMonth, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function firstDueMonth(registrationDate: string, day: number): number {
  const month = registrationDate.slice(0, 7);
  const registrationMonth = monthNumber(month)!;
  return registrationDate <= dateForMonth(month, day)
    ? registrationMonth
    : registrationMonth + 1;
}

/** One payment per due month, beginning on or after registration. */
export function occurrenceForMonth(
  pledge: RecurrencePledge,
  month: string
): DonorOccurrence | null {
  const requestedMonth = monthNumber(month);
  if (
    requestedMonth === null ||
    pledge.frequencia !== "mensal" ||
    !Number.isInteger(pledge.dia_vencimento) ||
    pledge.dia_vencimento === null ||
    pledge.dia_vencimento < 1 ||
    pledge.dia_vencimento > 31 ||
    !pledge.duracao
  ) {
    return null;
  }

  const registrationDate = saoPauloDate(pledge.created_at);
  const index = requestedMonth - firstDueMonth(registrationDate, pledge.dia_vencimento);
  if (index < 0 || (pledge.duracao === "um_ano" && index >= 12)) {
    return null;
  }

  return {
    pledgeId: pledge.id,
    competence: month,
    dueDate: dateForMonth(month, pledge.dia_vencimento),
    index,
    registrationDate,
  };
}

/** The next due occurrence on or after a São Paulo date. */
export function nextOccurrence(
  pledge: RecurrencePledge,
  today: Date
): DonorOccurrence | null {
  if (
    pledge.frequencia !== "mensal" ||
    !Number.isInteger(pledge.dia_vencimento) ||
    pledge.dia_vencimento === null ||
    pledge.dia_vencimento < 1 ||
    pledge.dia_vencimento > 31
  ) {
    return null;
  }

  const todayDate = saoPauloDate(today);
  const registrationDate = saoPauloDate(pledge.created_at);
  const firstMonth = firstDueMonth(registrationDate, pledge.dia_vencimento);
  let candidateMonth = Math.max(firstMonth, monthNumber(todayDate.slice(0, 7))!);
  if (dateForMonth(monthString(candidateMonth), pledge.dia_vencimento) < todayDate) {
    candidateMonth += 1;
  }
  return occurrenceForMonth(pledge, monthString(candidateMonth));
}

function calendarDaysBefore(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day - days));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

/** Null when the reminder would have been scheduled before registration. */
export function scheduledReminder(
  occurrence: DonorOccurrence,
  kind: ReminderKind
): DonorReminderSchedule | null {
  const scheduledDate = calendarDaysBefore(
    occurrence.dueDate,
    kind === "10d" ? 10 : 5
  );
  return scheduledDate < occurrence.registrationDate
    ? null
    : { occurrence, kind, scheduledDate };
}
