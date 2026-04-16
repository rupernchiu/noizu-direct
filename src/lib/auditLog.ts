/**
 * Audit log helper.
 * Call logAuditEvent() from any admin action that modifies sensitive data.
 * For suspend/ban/dispute-resolve actions, `reason` is required.
 */

import { prisma } from './prisma'

const REASON_REQUIRED_ACTIONS = new Set([
  'creators.suspend',
  'creators.delete',
  'disputes.resolve',
  'payouts.approve',
  'payouts.reject',
  'orders.cancel',
])

export interface AuditEventInput {
  actorId: string | null
  actorName: string
  action: string        // e.g. "creators.suspend"
  entityType: string    // e.g. "Creator"
  entityId: string
  entityLabel?: string  // human-readable identifier e.g. "@sakura_arts"
  reason?: string       // mandatory for sensitive actions
  beforeJson?: string
  afterJson?: string
  ipAddress?: string
}

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  if (REASON_REQUIRED_ACTIONS.has(input.action) && !input.reason?.trim()) {
    throw new Error(`Reason is required for action "${input.action}"`)
  }

  await prisma.auditEvent.create({
    data: {
      actorId:     input.actorId,
      actorName:   input.actorName,
      action:      input.action,
      entityType:  input.entityType,
      entityId:    input.entityId,
      entityLabel: input.entityLabel ?? null,
      reason:      input.reason ?? null,
      beforeJson:  input.beforeJson ?? null,
      afterJson:   input.afterJson ?? null,
      ipAddress:   input.ipAddress ?? null,
    },
  })
}
