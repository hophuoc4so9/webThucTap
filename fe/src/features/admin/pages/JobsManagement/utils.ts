import { parseDeadlineForComparison } from "@/utils/date";

export function isExpired(deadline?: string): boolean {
  const parsed = parseDeadlineForComparison(deadline);
  if (!parsed) return false;
  return parsed < new Date();
}

export function safeParse<T>(json: string | undefined | null, fallback: T): T {
  try {
    return JSON.parse(json || "") as T;
  } catch {
    return fallback;
  }
}
