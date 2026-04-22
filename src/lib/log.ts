/**
 * Side-effect helpers that log errors instead of silently swallowing them.
 *
 * Use `logFailure(context, promise)` when a non-fatal async side effect fails
 * and you want a breadcrumb in logs but don't want it to throw into the caller.
 */

export async function logFailure<T>(context: string, promise: Promise<T>): Promise<T | undefined> {
  try {
    return await promise
  } catch (err) {
    console.error(`[${context}]`, err)
    return undefined
  }
}

export function logFailureSync(context: string, err: unknown): void {
  console.error(`[${context}]`, err)
}
