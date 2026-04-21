import { prisma } from '@/lib/prisma'
import { createAirwallexCustomer } from '@/lib/airwallex'

/**
 * Ensure the user has an Airwallex Customer record. Used by:
 *  - Subscription first charge (to tokenize card via PaymentConsent)
 *  - Optionally one-time gifts (so repeat buyers don't retype card)
 *
 * Stored on User.airwallexCustomerId; created lazily on first need.
 */
export async function ensureAirwallexCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, airwallexCustomerId: true },
  })
  if (!user) throw new Error('User not found')
  if (user.airwallexCustomerId) return user.airwallexCustomerId

  const customer = await createAirwallexCustomer({
    userId: user.id,
    email: user.email,
    name: user.name,
  })

  await prisma.user.update({
    where: { id: user.id },
    data: { airwallexCustomerId: customer.id },
  })
  return customer.id
}
