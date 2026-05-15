import { parseDeadlineForComparison } from "@/utils/date";

export function isExpired(deadline?: string): boolean {
  const parsed = parseDeadlineForComparison(deadline);
  if (!parsed) return false;
  return parsed < new Date();
}
