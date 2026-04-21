/**
 * Shared error utilities — eliminuje duplikację getErrorMessage() w całym projekcie
 */

/** Wyciąga string z dowolnego błędu (Error, string, unknown) */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}

/** Standardowa odpowiedź sukcesu */
export function ok<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

/** Standardowa odpowiedź błędu */
export function err(error: unknown): { success: false; error: string } {
  return { success: false, error: getErrorMessage(error) };
}

/** Wrapper try/catch → { success, data/error } */
export async function tryCatch<T>(
  fn: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await fn();
    return ok(data);
  } catch (e) {
    return err(e);
  }
}
