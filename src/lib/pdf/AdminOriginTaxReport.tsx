/**
 * Admin DJP-filing report PDF (creator-origin / PPh withholding).
 *
 * Renders the per-creator breakdown the admin hands to their tax agent each
 * month for filing. Headline: total withheld; per-creator rows with order
 * count, gross, and withheld amount.
 */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { marginBottom: 16, borderBottom: '2px solid #1a1a2e', paddingBottom: 8 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: 9, color: '#666666', marginTop: 3 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: '#666666' },
  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3, fontSize: 10 },
  label: { color: '#444444' },
  value: { color: '#1a1a2e' },
  bigValue: { fontSize: 13, fontWeight: 'bold', color: '#1a1a2e' },
  table: { marginTop: 6 },
  tableHeader: {
    flexDirection: 'row',
    fontSize: 8,
    color: '#666666',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 'bold',
  },
  tableRow: { flexDirection: 'row', fontSize: 9, color: '#1a1a2e', paddingVertical: 3, borderBottom: '0.5px solid #f3f4f6' },
  tableTotalRow: {
    flexDirection: 'row',
    fontSize: 10,
    color: '#1a1a2e',
    paddingTop: 6,
    marginTop: 4,
    borderTop: '1px solid #1a1a2e',
    fontWeight: 'bold',
  },
  colCreator: { flex: 3 },
  colTaxId: { flex: 2 },
  colOrders: { flex: 0.8, textAlign: 'right' },
  colGross: { flex: 1.5, textAlign: 'right' },
  colWithheld: { flex: 1.5, textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 7,
    color: '#888888',
    textAlign: 'center',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 6,
  },
})

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export interface AdminOriginCreatorRow {
  creatorId: string
  creatorName: string
  displayName: string | null
  email: string | null
  taxId: string | null
  country: string
  orderCount: number
  grossUsd: number
  withheldUsd: number
}

interface Props {
  data: {
    period: { from: string; to: string; label: string; country: string; countryName: string }
    rule: { rate: number; label: string; ratePercent: number } | null
    totalGrossUsd: number
    totalWithheldUsd: number
    creatorCount: number
    orderCount: number
    creators: AdminOriginCreatorRow[]
  }
  generatedAt: string
}

export function AdminOriginTaxReport({ data, generatedAt }: Props) {
  const { period, rule, totalGrossUsd, totalWithheldUsd, creatorCount, orderCount, creators } = data
  const titleLabel = rule?.label ?? 'Creator-origin tax'
  const ratePct = rule?.ratePercent ?? 0
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {titleLabel} {ratePct ? `(${ratePct}%)` : ''} Withholding Report — {period.countryName}
          </Text>
          <Text style={styles.subtitle}>
            noizu.direct platform-filed withholding · Period: {period.label}
          </Text>
          <View style={styles.meta}>
            <Text>Generated {generatedAt}</Text>
            <Text>{period.country}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Creator count</Text>
            <Text style={styles.value}>{creatorCount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Order count</Text>
            <Text style={styles.value}>{orderCount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Gross sales subject to withholding</Text>
            <Text style={styles.value}>{fmt(totalGrossUsd)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Total {titleLabel} withheld</Text>
            <Text style={styles.bigValue}>{fmt(totalWithheldUsd)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Per-creator breakdown</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colCreator}>Creator</Text>
              <Text style={styles.colTaxId}>Tax ID</Text>
              <Text style={styles.colOrders}>Orders</Text>
              <Text style={styles.colGross}>Gross</Text>
              <Text style={styles.colWithheld}>Withheld</Text>
            </View>
            {creators.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={{ flex: 1, color: '#888888', fontSize: 9 }}>No withholding in this period.</Text>
              </View>
            ) : (
              creators.map((c) => (
                <View key={c.creatorId} style={styles.tableRow}>
                  <Text style={styles.colCreator}>
                    {c.displayName ?? c.creatorName} {c.email ? `· ${c.email}` : ''}
                  </Text>
                  <Text style={styles.colTaxId}>{c.taxId ?? '—'}</Text>
                  <Text style={styles.colOrders}>{c.orderCount}</Text>
                  <Text style={styles.colGross}>{fmt(c.grossUsd)}</Text>
                  <Text style={styles.colWithheld}>{fmt(c.withheldUsd)}</Text>
                </View>
              ))
            )}
            <View style={styles.tableTotalRow}>
              <Text style={styles.colCreator}>Total</Text>
              <Text style={styles.colTaxId}></Text>
              <Text style={styles.colOrders}>{orderCount}</Text>
              <Text style={styles.colGross}>{fmt(totalGrossUsd)}</Text>
              <Text style={styles.colWithheld}>{fmt(totalWithheldUsd)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            Filing-ready report — hand to a registered tax agent (konsultan pajak / SST agent / GST agent) for submission.
            Amounts in USD; convert to local currency at the daily Airwallex FX rate from the transaction date.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
