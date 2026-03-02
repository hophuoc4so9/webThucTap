export function isExpired(deadline?: string): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

export function safeParse<T>(json: string | undefined | null, fallback: T): T {
  try {
    return JSON.parse(json || "") as T;
  } catch {
    return fallback;
  }
}
