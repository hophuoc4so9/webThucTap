export function safeParse<T>(json: string | undefined | null, fallback: T): T {
  try {
    return JSON.parse(json || "") as T;
  } catch {
    return fallback;
  }
}
