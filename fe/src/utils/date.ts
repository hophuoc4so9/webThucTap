const pad2 = (value: number) => String(value).padStart(2, "0");

const parseMonthYear = (value: string): { year: number; month: number } | null => {
  const trimmed = value.trim();
  const monthYear = trimmed.match(/^(\d{2})\/(\d{4})$/);
  if (monthYear) {
    return { month: Number(monthYear[1]), year: Number(monthYear[2]) };
  }

  const yearMonth = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (yearMonth) {
    return { year: Number(yearMonth[1]), month: Number(yearMonth[2]) };
  }

  return null;
};

const parseDateParts = (value: string): { year: number; month: number; day: number } | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  }

  const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    return {
      year: Number(slashMatch[3]),
      month: Number(slashMatch[2]),
      day: Number(slashMatch[1]),
    };
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  };
};

export function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  const parts = parseDateParts(value);
  if (!parts) return "";
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function toEndOfDayIso(value?: string | null): string {
  const dateValue = value?.trim();
  if (!dateValue) return "";
  return `${dateValue}T23:59:59.999`;
}

export function formatDateDisplay(value?: string | null): string {
  if (!value) return "";
  const parts = parseDateParts(value);
  if (!parts) return value;
  return `${pad2(parts.day)}/${pad2(parts.month)}/${parts.year}`;
}

export function toMonthInputValue(value?: string | null): string {
  if (!value) return "";
  const monthYear = parseMonthYear(value);
  if (monthYear) return `${monthYear.year}-${pad2(monthYear.month)}`;

  const dateParts = parseDateParts(value);
  if (!dateParts) return "";
  return `${dateParts.year}-${pad2(dateParts.month)}`;
}

export function toMonthDisplayValue(value?: string | null): string {
  if (!value) return "";
  const monthYear = parseMonthYear(value);
  if (monthYear) return `${pad2(monthYear.month)}/${monthYear.year}`;

  const dateParts = parseDateParts(value);
  if (!dateParts) return value;
  return `${pad2(dateParts.month)}/${dateParts.year}`;
}

export function parseDeadlineForComparison(value?: string | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T23:59:59.999`);
  }

  const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    return new Date(
      Number(slashMatch[3]),
      Number(slashMatch[2]) - 1,
      Number(slashMatch[1]),
      23,
      59,
      59,
      999,
    );
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}