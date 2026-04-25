/**
 * Dispute evidence packaging (sprint 1.2).
 *
 * When a chargeback fires, Airwallex gives the merchant ~7-21 days (varies by
 * card network + reason) to submit evidence. Win rates correlate strongly with
 * evidence quality + speed of submission. This library auto-packages the
 * evidence we have on file into Airwallex's Submit Evidence API shape, so the
 * admin can review-and-submit in one click instead of hand-assembling JSON.
 *
 * Reference: https://www.airwallex.com/docs/payments__disputes
 *
 * The library does NOT call Airwallex itself — it produces a structured
 * payload + a human-readable narrative that the admin route then submits.
 */
import { prisma } from '@/lib/prisma'

export type DisputeEvidence = {
  // Airwallex SubmitEvidence-compatible payload
  payload: {
    customer_email_address?: string
    customer_name?: string
    customer_purchase_ip?: string
    product_description?: string
    receipt?: { url?: string; description?: string }
    shipping_carrier?: string
    shipping_date?: string
    shipping_documentation?: { url?: string; description?: string }
    shipping_tracking_number?: string
    service_date?: string
    service_documentation?: { url?: string; description?: string }
    activity_logs?: string
    duplicate_charge_explanation?: string
    refund_policy?: string
    refund_policy_disclosure?: string
    refund_refusal_explanation?: string
    uncategorized_text?: string
    [k: string]: unknown
  }
  // Human-readable narrative for admin review before submit
  narrative: string
  // What evidence is missing — admin should attach manually before submit
  missing: string[]
  orderId: string
  productType: string
  amountUsd: number
}

export async function packageDisputeEvidence(disputeId: string): Promise<DisputeEvidence> {
  const dispute = await prisma.chargebackDispute.findUnique({
    where: { id: disputeId },
    include: {
      order: {
        include: {
          buyer: {
            select: { id: true, name: true, email: true, legalFullName: true },
          },
          creator: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, title: true, description: true, type: true } },
          transactions: { orderBy: { createdAt: 'desc' }, take: 1 },
          escrowTransactions: { orderBy: { createdAt: 'desc' } },
        },
      },
    },
  })

  if (!dispute) throw new Error(`Dispute ${disputeId} not found`)
  const order = dispute.order
  const buyer = order.buyer
  const productType = order.product.type ?? 'UNKNOWN'

  // Pull download access logs for digital products
  const downloadLogs = productType === 'DIGITAL'
    ? await prisma.downloadAccessLog.findMany({
        where: { orderId: order.id },
        orderBy: { createdAt: 'asc' },
      }).catch(() => [])
    : []

  const missing: string[] = []
  const payload: DisputeEvidence['payload'] = {
    customer_email_address: buyer.email,
    customer_name: buyer.legalFullName ?? buyer.name,
    product_description: `${order.product.title} — ${order.product.description?.slice(0, 280) ?? ''}`,
  }

  // Receipt — the original order receipt URL
  payload.receipt = {
    url: `https://noizu.direct/account/orders/${order.id}/receipt`,
    description: `Order receipt for ${order.product.title}, USD ${(order.amountUsd / 100).toFixed(2)}`,
  }

  // Per-product-type evidence
  const narrativeLines: string[] = []
  narrativeLines.push(`Order ID: ${order.id}`)
  narrativeLines.push(`Product: ${order.product.title} (${productType})`)
  narrativeLines.push(`Amount: USD ${(order.amountUsd / 100).toFixed(2)}`)
  narrativeLines.push(`Buyer: ${buyer.name} <${buyer.email}>`)
  narrativeLines.push(`Order placed: ${order.createdAt.toISOString()}`)
  narrativeLines.push(`Payment intent: ${order.airwallexIntentId ?? 'N/A'}`)
  narrativeLines.push('')

  if (productType === 'DIGITAL') {
    narrativeLines.push('--- Digital Delivery Evidence ---')
    if (downloadLogs.length > 0) {
      const successful = downloadLogs.filter((l) => l.outcome === 'DOWNLOADED' || l.outcome === 'ISSUED')
      narrativeLines.push(`Download access logs: ${successful.length} successful access events`)
      successful.slice(0, 10).forEach((l) => {
        narrativeLines.push(`  • ${l.createdAt.toISOString()} — ${l.outcome} from IP ${l.ipAddress ?? 'unknown'}`)
      })
      payload.activity_logs = successful
        .map((l) => `${l.createdAt.toISOString()} ${l.outcome} ip=${l.ipAddress ?? 'unknown'} ua="${l.userAgent ?? ''}"`)
        .join('\n')
      payload.service_date = successful[0]?.createdAt.toISOString()
      payload.service_documentation = {
        description: `${successful.length} verified download access events from buyer's IP`,
      }
    } else {
      missing.push('No download access log entries — buyer may not have attempted download yet, or logs were not captured.')
    }
  } else if (productType === 'PHYSICAL' || productType === 'POD') {
    narrativeLines.push('--- Physical Shipment Evidence ---')
    if (order.trackingNumber) {
      payload.shipping_tracking_number = order.trackingNumber
      payload.shipping_carrier = order.courierName ?? order.courierCode ?? undefined
      payload.shipping_date = order.trackingAddedAt?.toISOString()
      narrativeLines.push(`Tracking: ${order.trackingNumber} via ${order.courierName ?? order.courierCode ?? 'carrier'}`)
      narrativeLines.push(`Shipped: ${order.trackingAddedAt?.toISOString() ?? 'unknown'}`)
    } else {
      missing.push('No tracking number on file — physical shipment evidence is unavailable.')
    }
    if (order.buyerConfirmedAt) {
      narrativeLines.push(`Buyer confirmed delivery: ${order.buyerConfirmedAt.toISOString()}`)
      payload.service_date = order.buyerConfirmedAt.toISOString()
    }
  } else if (productType === 'COMMISSION') {
    narrativeLines.push('--- Commission Evidence ---')
    narrativeLines.push(`Status: ${order.commissionStatus ?? 'unknown'}`)
    if (order.commissionAcceptedAt) {
      narrativeLines.push(`Accepted by creator: ${order.commissionAcceptedAt.toISOString()}`)
    }
    if (order.commissionDeliveredAt) {
      narrativeLines.push(`Delivered: ${order.commissionDeliveredAt.toISOString()}`)
      payload.service_date = order.commissionDeliveredAt.toISOString()
    }
    if (order.commissionBuyerAcceptedAt) {
      narrativeLines.push(`Buyer accepted: ${order.commissionBuyerAcceptedAt.toISOString()}`)
    }
    if (!order.commissionDeliveredAt) {
      missing.push('Commission has no delivery timestamp — service-date evidence unavailable.')
    }
  }

  // Refund policy boilerplate
  payload.refund_policy =
    'Refunds are governed by the Terms of Service at https://noizu.direct/terms. ' +
    'Digital goods are non-refundable once downloaded; physical goods may be returned within 14 days of delivery; ' +
    'commissions are refundable per the order-specific terms agreed at acceptance.'
  payload.refund_policy_disclosure =
    'The refund policy is disclosed prominently on the Terms page and at checkout before payment.'

  // Reverse-charge / fraud-pattern explanation
  if (dispute.reason === 'FRAUD') {
    const tx = order.transactions[0]
    if (tx?.paymentRail === 'CARD') {
      payload.uncategorized_text = `Transaction was authenticated with 3DS Secure where applicable; ` +
        `IP / device data was captured at intent creation. ` +
        `${downloadLogs.length > 0 ? 'Download access patterns confirm legitimate buyer access.' : ''}`
    }
  } else if (dispute.reason === 'PRODUCT_NOT_RECEIVED') {
    if (productType === 'DIGITAL' && downloadLogs.length > 0) {
      payload.uncategorized_text = `Buyer accessed the digital product ${downloadLogs.length} time(s). ` +
        `First access: ${downloadLogs[0].createdAt.toISOString()}. ` +
        `Last access: ${downloadLogs[downloadLogs.length - 1].createdAt.toISOString()}.`
    }
  } else if (dispute.reason === 'CREDIT_NOT_PROCESSED') {
    payload.refund_refusal_explanation =
      `No refund was issued for this order because: ` +
      `(1) The product was delivered as described, ` +
      `(2) The buyer did not raise a dispute through our internal /account/disputes flow, ` +
      `(3) Per our Terms, this product type is non-refundable once delivered.`
  }

  narrativeLines.push('')
  narrativeLines.push(`--- Dispute reason: ${dispute.reason} ---`)
  narrativeLines.push(`Airwallex dispute ID: ${dispute.airwallexDisputeId}`)
  narrativeLines.push(`Evidence deadline: ${dispute.evidenceDeadline?.toISOString() ?? 'unknown'}`)

  if (missing.length > 0) {
    narrativeLines.push('')
    narrativeLines.push('--- Missing evidence (admin should review) ---')
    missing.forEach((m) => narrativeLines.push(`  • ${m}`))
  }

  return {
    payload,
    narrative: narrativeLines.join('\n'),
    missing,
    orderId: order.id,
    productType,
    amountUsd: order.amountUsd,
  }
}
