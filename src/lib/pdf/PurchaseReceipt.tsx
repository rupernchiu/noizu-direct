import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { marginBottom: 20, borderBottom: '2px solid #7c3aed', paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: 10, color: '#666666', marginTop: 4 },
  section: { marginTop: 16 },
  label: { fontSize: 9, color: '#666666', marginBottom: 2 },
  value: { fontSize: 11, color: '#1a1a2e', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  total: { fontSize: 14, fontWeight: 'bold', color: '#7c3aed', marginTop: 10 },
  badge: { backgroundColor: '#22c55e', color: 'white', padding: '3 8', borderRadius: 4, fontSize: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  divider: { borderBottom: '1px solid #e5e7eb', marginTop: 10, marginBottom: 10 },
  footer: { marginTop: 30, fontSize: 8, color: '#999999', lineHeight: 1.4 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#666666',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemLabel: { fontSize: 11, color: '#1a1a2e' },
  itemValue: { fontSize: 11, color: '#1a1a2e' },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  feeLabel: { fontSize: 10, color: '#666666' },
  feeValue: { fontSize: 10, color: '#666666' },
  taxNote: { fontSize: 8, color: '#999999', marginTop: 1, marginBottom: 4, paddingLeft: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb' },
})

export interface PurchaseReceiptProps {
  invoiceNumber: string
  date: string
  buyerName: string
  buyerEmail: string
  productTitle: string
  creatorName: string
  /** Listing-price subtotal in USD cents (creator's portion before shipping). */
  amountUsd: number
  /** Buyer service fee in USD cents (noizu.direct's portion). */
  processingFee: number
  /** Final total paid in USD cents. */
  total: number
  currency: string
  orderId: string
  /** Optional: shipping fulfilled by creator, in USD cents. Hidden when 0/undefined. */
  shippingUsd?: number
  /** Optional: discount applied to creator's portion, in USD cents. Hidden when 0/undefined. */
  discountUsd?: number
  /** Phase 8 — creator's own sales tax (Layer 1.5, agency-collect). */
  creatorSalesTaxUsd?: number
  creatorSalesTaxRate?: number | null  // decimal, e.g. 0.06
  creatorSalesTaxLabel?: string | null
  /** Phase 8 — platform fee tax (Layer 3, buyer side). */
  platformFeeBuyerTaxUsd?: number
  platformFeeBuyerTaxRate?: number | null  // decimal, e.g. 0.06
  /** Layer 2 destination tax (deemed-supplier). */
  destinationTaxUsd?: number
  destinationTaxRatePercent?: number | null
  destinationTaxCountry?: string | null
  /** Phase 2.1 self-declared creator markup (legacy). Suppressed when sales-tax line is rendering. */
  creatorTaxUsd?: number
  creatorTaxRatePercent?: number | null
  /** Phase 2.3 — B2B reverse-charge note. */
  reverseChargeApplied?: boolean
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatPercentDecimal(rate: number | null | undefined): string {
  if (rate == null) return ''
  const pct = rate * 100
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(2).replace(/\.?0+$/, '')}%`
}

function formatPercent(rate: number | null | undefined): string {
  if (rate == null) return ''
  return Number.isInteger(rate) ? `${rate}%` : `${rate.toFixed(2).replace(/\.?0+$/, '')}%`
}

export function PurchaseReceipt(props: PurchaseReceiptProps) {
  const {
    invoiceNumber,
    date,
    buyerName,
    buyerEmail,
    productTitle,
    creatorName,
    amountUsd,
    processingFee,
    total,
    orderId,
    shippingUsd = 0,
    discountUsd = 0,
    creatorSalesTaxUsd = 0,
    creatorSalesTaxRate = null,
    creatorSalesTaxLabel = null,
    platformFeeBuyerTaxUsd = 0,
    platformFeeBuyerTaxRate = null,
    destinationTaxUsd = 0,
    destinationTaxRatePercent = null,
    destinationTaxCountry = null,
    creatorTaxUsd = 0,
    creatorTaxRatePercent = null,
    reverseChargeApplied = false,
  } = props

  // Phase 8 — escrow framing. Each line renders only when its amount > 0.
  const hasShipping = shippingUsd > 0
  const hasDiscount = discountUsd > 0
  const hasService = processingFee > 0
  const hasCreatorSalesTax = creatorSalesTaxUsd > 0
  const hasPlatformFeeBuyerTax = platformFeeBuyerTaxUsd > 0
  const hasDestinationTax = destinationTaxUsd > 0
  // Legacy Phase 2.1 markup — render only when the new sales-tax line ISN'T
  // showing, to avoid double-attribution (both encode the same money).
  const hasLegacyCreatorTax = creatorTaxUsd > 0 && !hasCreatorSalesTax

  const creatorPortion = amountUsd + shippingUsd
  const subtotalLine = creatorPortion + processingFee - discountUsd
  const creatorSalesTaxBase = amountUsd + shippingUsd
  const creatorSalesTaxLabelText = creatorSalesTaxLabel ?? 'Sales tax'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>noizu.direct</Text>
          <Text style={styles.subtitle}>Purchase Receipt</Text>
        </View>

        {/* Invoice meta */}
        <View style={styles.metaRow}>
          <View>
            <Text style={styles.label}>Invoice Number</Text>
            <Text style={styles.value}>{invoiceNumber}</Text>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{date}</Text>
            <Text style={styles.label}>Order ID</Text>
            <Text style={styles.value}>{orderId}</Text>
          </View>
          <View>
            <Text style={styles.badge}>PAID</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{buyerName}</Text>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{buyerEmail}</Text>
        </View>

        <View style={styles.divider} />

        {/* FROM CREATOR section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{`From creator (${creatorName})`}</Text>
          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>{productTitle}</Text>
            <Text style={styles.itemValue}>{formatCents(amountUsd)}</Text>
          </View>
          {hasShipping && (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Shipping (fulfilled by creator)</Text>
              <Text style={styles.feeValue}>{formatCents(shippingUsd)}</Text>
            </View>
          )}
          {hasDiscount && (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Discount</Text>
              <Text style={styles.feeValue}>− {formatCents(discountUsd)}</Text>
            </View>
          )}
        </View>

        {/* FROM noizu.direct section */}
        {hasService && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>From noizu.direct (escrow & payment service)</Text>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Service fee</Text>
              <Text style={styles.feeValue}>{formatCents(processingFee)}</Text>
            </View>
          </View>
        )}

        <View style={styles.divider} />

        {/* Subtotal */}
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Subtotal</Text>
          <Text style={styles.feeValue}>{formatCents(subtotalLine)}</Text>
        </View>

        {/* Conditional tax lines */}
        {hasCreatorSalesTax && (
          <>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>
                {`Seller's ${creatorSalesTaxLabelText}${
                  creatorSalesTaxRate != null ? ` (${formatPercentDecimal(creatorSalesTaxRate)})` : ''
                } on ${formatCents(creatorSalesTaxBase)}`}
              </Text>
              <Text style={styles.feeValue}>{formatCents(creatorSalesTaxUsd)}</Text>
            </View>
            <Text style={styles.taxNote}>
              Collected by noizu.direct on behalf of the creator and remitted under their tax ID.
            </Text>
          </>
        )}
        {hasPlatformFeeBuyerTax && (
          <>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>
                {`Service-fee tax${
                  platformFeeBuyerTaxRate != null ? ` (${formatPercentDecimal(platformFeeBuyerTaxRate)})` : ''
                } on ${formatCents(processingFee)}`}
              </Text>
              <Text style={styles.feeValue}>{formatCents(platformFeeBuyerTaxUsd)}</Text>
            </View>
            <Text style={styles.taxNote}>
              noizu.direct&apos;s escrow service includes this tax, remitted to the local tax authority.
            </Text>
          </>
        )}
        {hasDestinationTax && (
          <>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>
                {`${destinationTaxCountry ? `${destinationTaxCountry} ` : ''}Tax${
                  destinationTaxRatePercent != null ? ` (${formatPercent(destinationTaxRatePercent)})` : ''
                }`}
              </Text>
              <Text style={styles.feeValue}>{formatCents(destinationTaxUsd)}</Text>
            </View>
            <Text style={styles.taxNote}>
              Collected by noizu.direct as deemed supplier and remitted to the local tax authority.
            </Text>
          </>
        )}
        {hasLegacyCreatorTax && (
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>
              {`Creator tax${
                creatorTaxRatePercent != null ? ` (${formatPercent(creatorTaxRatePercent)})` : ''
              }`}
            </Text>
            <Text style={styles.feeValue}>{formatCents(creatorTaxUsd)}</Text>
          </View>
        )}
        {reverseChargeApplied && (
          <Text style={styles.taxNote}>
            Reverse-charge B2B (no tax collected; buyer self-accounts).
          </Text>
        )}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.total}>Total</Text>
          <Text style={styles.total}>{formatCents(total)}</Text>
        </View>

        {/* Footer (escrow disclosure) */}
        <View style={styles.footer}>
          <Text>
            noizu.direct provides escrow and payment-handling for this transaction. Goods are sold and shipped by the creator.
          </Text>
          <Text>
            Tax line items are itemized and clearly attributed to the responsible party. Lines that don&apos;t apply to your purchase aren&apos;t shown.
          </Text>
          <Text style={{ marginTop: 6 }}>For support, contact support@noizu.direct</Text>
        </View>
      </Page>
    </Document>
  )
}
