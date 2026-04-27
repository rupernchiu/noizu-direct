/**
 * Annual PPh Final 0.5% withholding certificate (Indonesia).
 *
 * Issued to creators whose payout country is ID and who had at least one
 * withheld order in the requested year. Included as a creator self-serve
 * download from the tax statement page.
 */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { PphCertificateData } from '@/lib/tax-statement'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { marginBottom: 20, borderBottom: '2px solid #1a1a2e', paddingBottom: 10 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: 10, color: '#666666', marginTop: 4 },
  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, fontSize: 10 },
  label: { color: '#444444' },
  value: { color: '#1a1a2e' },
  bigValue: { fontSize: 14, fontWeight: 'bold', color: '#1a1a2e' },
  table: { marginTop: 6 },
  tableHeader: {
    flexDirection: 'row',
    fontSize: 9,
    color: '#666666',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: { flexDirection: 'row', fontSize: 10, color: '#1a1a2e', paddingVertical: 3 },
  tableTotalRow: {
    flexDirection: 'row',
    fontSize: 10,
    color: '#1a1a2e',
    paddingTop: 6,
    borderTop: '1px solid #e5e7eb',
    fontWeight: 'bold',
  },
  col1: { flex: 2 },
  col2: { flex: 1, textAlign: 'right' },
  col3: { flex: 1.5, textAlign: 'right' },
  col4: { flex: 1.5, textAlign: 'right' },
  divider: { borderBottom: '1px solid #e5e7eb', marginTop: 10, marginBottom: 10 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#888888',
    textAlign: 'center',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 8,
  },
})

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

interface Props {
  data: PphCertificateData
  generatedAt: string
}

export function PPhCertificate({ data, generatedAt }: Props) {
  const { creator, year, totalWithheldUsd, totalGrossUsd, totalOrders, monthlyBreakdown } = data
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Pemotongan PPh Final 0.5% — Creator Tax Withholding Certificate</Text>
          <Text style={styles.subtitle}>noizu.direct · Tax year {year}</Text>
        </View>

        {/* Creator block */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Creator</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Full name</Text>
            <Text style={styles.value}>{creator.legalFullName ?? creator.name}</Text>
          </View>
          {creator.taxId && (
            <View style={styles.row}>
              <Text style={styles.label}>Tax registration ID (NPWP)</Text>
              <Text style={styles.value}>{creator.taxId}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Country</Text>
            <Text style={styles.value}>{creator.countryName} ({creator.country})</Text>
          </View>
        </View>

        {/* Headline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Total Withheld for {year}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Gross sales subject to withholding</Text>
            <Text style={styles.value}>{fmt(totalGrossUsd)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Order count</Text>
            <Text style={styles.value}>{totalOrders}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>PPh Final (0.5%) withheld</Text>
            <Text style={styles.bigValue}>{fmt(totalWithheldUsd)}</Text>
          </View>
        </View>

        {/* Monthly breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Month</Text>
              <Text style={styles.col2}>Orders</Text>
              <Text style={styles.col3}>Gross</Text>
              <Text style={styles.col4}>Withheld</Text>
            </View>
            {monthlyBreakdown.map((m) => (
              <View key={m.month} style={styles.tableRow}>
                <Text style={styles.col1}>{m.monthLabel}</Text>
                <Text style={styles.col2}>{m.orderCount}</Text>
                <Text style={styles.col3}>{fmt(m.grossUsd)}</Text>
                <Text style={styles.col4}>{fmt(m.withheldUsd)}</Text>
              </View>
            ))}
            <View style={styles.tableTotalRow}>
              <Text style={styles.col1}>Total</Text>
              <Text style={styles.col2}>{totalOrders}</Text>
              <Text style={styles.col3}>{fmt(totalGrossUsd)}</Text>
              <Text style={styles.col4}>{fmt(totalWithheldUsd)}</Text>
            </View>
          </View>
        </View>

        {/* Filing reference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Filing Reference</Text>
          <Text style={{ fontSize: 9, color: '#666666' }}>
            Filed under noizu.direct via [tax agent name TBD]. Amounts denominated in USD; for IDR-equivalent
            filings, apply the daily Airwallex FX rate from the transaction date.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            This certificate is provided for your records. Refer to your local tax advisor for filing requirements.
          </Text>
          <Text>Generated {generatedAt}</Text>
        </View>
      </Page>
    </Document>
  )
}
