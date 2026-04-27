/**
 * Admin destination-tax filing ledger PDF.
 *
 * Renders the per-country marketplace-facilitator filing report. One page
 * with a summary header followed by a transaction-level ledger. Long ledgers
 * paginate naturally via @react-pdf/renderer.
 */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { marginBottom: 14, borderBottom: '2px solid #1a1a2e', paddingBottom: 8 },
  title: { fontSize: 15, fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: 9, color: '#666666', marginTop: 3 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, fontSize: 8, color: '#666666' },
  section: { marginTop: 12 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3, fontSize: 9 },
  label: { color: '#444444' },
  value: { color: '#1a1a2e' },
  bigValue: { fontSize: 12, fontWeight: 'bold', color: '#1a1a2e' },
  tableHeader: {
    flexDirection: 'row',
    fontSize: 7,
    color: '#666666',
    borderBottom: '1px solid #1a1a2e',
    paddingBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 'bold',
  },
  tableRow: { flexDirection: 'row', fontSize: 7.5, color: '#1a1a2e', paddingVertical: 2, borderBottom: '0.5px solid #f3f4f6' },
  c1: { flex: 2.4 },                         // tx id
  c2: { flex: 1.6, textAlign: 'right' },     // date
  c3: { flex: 0.7 },                         // rail
  c4: { flex: 1.2, textAlign: 'right' },     // gross
  c5: { flex: 1.2, textAlign: 'right' },     // dest tax
  c6: { flex: 0.6, textAlign: 'right' },     // rate
  c7: { flex: 0.6, textAlign: 'center' },    // RC
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    right: 32,
    fontSize: 7,
    color: '#888888',
    textAlign: 'center',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 6,
  },
})

function fmt(cents: number | null | undefined): string {
  const v = cents ?? 0
  return `$${(v / 100).toFixed(2)}`
}

export interface AdminTaxLedgerRow {
  transactionId: string
  orderId: string
  createdAt: string
  paymentRail: string | null
  grossUsd: number
  destinationTaxUsd: number
  destinationTaxRate: number | null
  reverseChargeApplied: boolean
}

interface Props {
  data: {
    country: string
    countryName: string
    taxLabel: string
    ratePercent: number
    year: number
    totalGrossUsd: number
    totalDestinationTaxUsd: number
    txCount: number
    rows: AdminTaxLedgerRow[]
  }
  generatedAt: string
}

export function AdminTaxLedger({ data, generatedAt }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {data.countryName} ({data.country}) — {data.taxLabel} marketplace-facilitator return ledger
          </Text>
          <Text style={styles.subtitle}>noizu.direct · Fiscal year {data.year}</Text>
          <View style={styles.meta}>
            <Text>Rate: {data.ratePercent}%</Text>
            <Text>Generated {generatedAt}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Transaction count</Text>
            <Text style={styles.value}>{data.txCount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Gross sales</Text>
            <Text style={styles.value}>{fmt(data.totalGrossUsd)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>{data.taxLabel} collected (destination)</Text>
            <Text style={styles.bigValue}>{fmt(data.totalDestinationTaxUsd)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.c1}>Transaction</Text>
            <Text style={styles.c2}>Date (UTC)</Text>
            <Text style={styles.c3}>Rail</Text>
            <Text style={styles.c4}>Gross</Text>
            <Text style={styles.c5}>{data.taxLabel}</Text>
            <Text style={styles.c6}>%</Text>
            <Text style={styles.c7}>RC</Text>
          </View>
          {data.rows.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={{ flex: 1, color: '#888888', fontSize: 8 }}>No transactions in this period.</Text>
            </View>
          ) : (
            data.rows.map((r) => (
              <View key={r.transactionId} style={styles.tableRow}>
                <Text style={styles.c1}>{r.transactionId.slice(0, 24)}</Text>
                <Text style={styles.c2}>{r.createdAt.slice(0, 10)}</Text>
                <Text style={styles.c3}>{r.paymentRail ?? '—'}</Text>
                <Text style={styles.c4}>{fmt(r.grossUsd)}</Text>
                <Text style={styles.c5}>{fmt(r.destinationTaxUsd)}</Text>
                <Text style={styles.c6}>{r.destinationTaxRate ?? '—'}</Text>
                <Text style={styles.c7}>{r.reverseChargeApplied ? 'Y' : ''}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>
            Marketplace-facilitator ledger. Real authority forms ({data.taxLabel}, e.g. SST-02 / GST F5 / PPN PMSE) are
            filled by your registered tax agent using this report. RC = reverse-charge B2B order (tax not collected;
            buyer self-assesses).
          </Text>
        </View>
      </Page>
    </Document>
  )
}
