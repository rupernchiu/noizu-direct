import { prisma } from '@/lib/prisma'

/**
 * Wrap a cron job's body so each invocation records its outcome to
 * `CronHeartbeat`. Admins read those rows to see whether each scheduled job
 * is firing on its expected cadence — a stale `lastRanAt` means the
 * scheduler is broken or the CRON_SECRET rotated.
 *
 * Errors thrown by `fn` are recorded and re-thrown so the route still returns
 * a 500 to the scheduler (which will then retry).
 */
export async function withCronHeartbeat<T>(
  cronName: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now()
  let succeeded = false
  let errorMessage: string | null = null
  let result: T
  try {
    result = await fn()
    succeeded = true
    return result
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err)
    throw err
  } finally {
    const durationMs = Date.now() - startedAt
    try {
      await prisma.cronHeartbeat.upsert({
        where: { cronName },
        create: {
          cronName,
          lastRanAt: new Date(),
          lastSucceeded: succeeded,
          lastDurationMs: durationMs,
          lastError: errorMessage,
          totalRuns: 1,
          totalFailures: succeeded ? 0 : 1,
        },
        update: {
          lastRanAt: new Date(),
          lastSucceeded: succeeded,
          lastDurationMs: durationMs,
          lastError: errorMessage,
          totalRuns: { increment: 1 },
          totalFailures: succeeded ? undefined : { increment: 1 },
        },
      })
    } catch {
      // Heartbeat write must never block the cron's actual response. If the DB
      // is down we'd already have thrown above; if the heartbeat write itself
      // fails, swallow so the caller sees the original error (or success).
    }
  }
}
