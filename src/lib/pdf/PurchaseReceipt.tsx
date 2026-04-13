import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { marginBottom: 20, borderBottom: '2px solid #7c3aed', paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: 10, color: '#666666', marginTop: 4 },
  section: { marginTop: 20 },
  label: { fontSize: 9, color: '#666666', marginBottom: 2 },
  value: { fontSize: 11, color: '#1a1a2e', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  total: { fontSize: 14, fontWeight: 'bold', color: '#7c3aed', marginTop: 10 },
  badge: { backgroundColor: '#22c55e', color: 'white', padding: '3 8', borderRadius: 4, fontSize: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  divider: { borderBottom: '1px solid #e5e7eb', marginTop: 10, marginBottom: 10 },
  footer: { marginTop: 40, fontSize: 9, color: '#999999', textAlign: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemLabel: { fontSize: 11, color: '#1a1a2e' },
  itemValue: { fontSize: 11, color: '#1a1a2e' },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  feeLabel: { fontSize: 10, color: '#666666' },
  feeValue: { fontSize: 10, color: '#666666' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb' },
})

interface PurchaseReceiptProps {
  invoiceNumber: string
  date: string
  buyerName: string
  buyerEmail: string
  productTitle: string
  creatorName: string
  amountUsd: number
  processingFee: number
  total: number
  currency: string
  orderId: string
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
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
  } = props

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>NOIZU-DIRECT</Text>
          <Text style={styles.subtitle}>Purchase Receipt</Text>
        </View>

        {/* Invoice number + date + PAID badge */}
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

        {/* Item */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Item</Text>
          <View style={styles.itemRow}>
            <View>
              <Text style={styles.itemLabel}>{productTitle}</Text>
              <Text style={styles.label}>Sold by {creatorName}</Text>
            </View>
            <Text style={styles.itemValue}>{formatCents(amountUsd)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Total */}
        <View style={styles.section}>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Subtotal</Text>
            <Text style={styles.feeValue}>{formatCents(amountUsd)}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Processing Fee</Text>
            <Text style={styles.feeValue}>{formatCents(processingFee)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.total}>Total</Text>
            <Text style={styles.total}>{formatCents(total)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for your purchase on NOIZU-DIRECT.</Text>
          <Text>For support, contact support@noizu.direct</Text>
        </View>
      </Page>
    </Document>
  )
}
