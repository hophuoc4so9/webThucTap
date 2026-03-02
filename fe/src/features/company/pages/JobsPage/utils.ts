export function isExpired(deadline?: string): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}
