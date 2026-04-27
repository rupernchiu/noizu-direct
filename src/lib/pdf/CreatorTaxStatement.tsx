/**
 * Creator-facing tax & earnings statement PDF.
 *
 * Single-page A4 layout that mirrors the on-screen sections in
 * `/dashboard/finance/tax`. Conditional rendering rule (spec §3.4):
 * sections with zero totals are NOT rendered at all. The footer carries an
 * escrow-disclosure placeholder — Phase 8 ships the canonical text.
 */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { TaxStatementResult } from '@/lib/tax-statement'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { marginBottom: 20, borderBottom: '2px solid #7c3aed', paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: 10, color: '#666666', marginTop: 4 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: '#666666' },
  section: { marginTop: 18 },
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTop: '1px solid #e5e7eb',
    fontSize: 11,
    fontWeight: 'bold',
  },
  helper: { fontSize: 9, color: '#888888', marginTop: 4, marginBottom: 4 },
  divider: { borderBottom: '1px solid #e5e7eb', marginTop: 8, marginBottom: 8 },
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
  col1: { flex: 2 },
  col2: { flex: 1, textAlign: 'right' },
  col3: { flex: 1, textAlign: 'right' },
  col4: { flex: 1, textAlign: 'right' },
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
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}$${(abs / 100).toFixed(2)}`
}

interface Props {
  data: TaxStatementResult
  generatedAt: string
}

export function CreatorTaxStatement({ data, generatedAt }: Props) {
  const { period, creator, earnings, withheldAtPayout, collectedFromBuyers, collectedByPlatform, salesByCountry } = data

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tax & Earnings Statement</Text>
          <Text style={styles.subtitle}>noizu.direct</Text>
          <View style={styles.meta}>
            <Text>
              {creator.legalFullName ?? creator.name}
              {creator.country ? ` · ${creator.countryName ?? creator.country}` : ''}
            </Text>
            <Text>{period.label}</Text>
          </View>
        </View>

        {/* EARNINGS SUMMARY — always shown when there are any orders */}
        {earnings.orderCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Earnings Summary</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Gross sales ({earnings.orderCount} orders)</Text>
              <Text style={styles.value}>{fmt(earnings.grossUsd)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Platform commission</Text>
              <Text style={styles.value}>−{fmt(earnings.commissionUsd)}</Text>
            </View>
            {earnings.commissionTaxUsd > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Tax on commission (paid by you)</Text>
                <Text style={styles.value}>−{fmt(earnings.commissionTaxUsd)}</Text>
              </View>
            )}
            {earnings.withheldPphUsd > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>
                  Withheld {creator.originTaxLabel ?? 'tax'}
                </Text>
                <Text style={styles.value}>−{fmt(earnings.withheldPphUsd)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text>Net to your account</Text>
              <Text>{fmt(earnings.netUsd)}</Text>
            </View>
          </View>
        )}

        {/* WITHHELD AT PAYOUT — only when total > 0 */}
        {withheldAtPayout && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Withheld at Payout</Text>
            <Text style={styles.helper}>
              noizu.direct withheld and remits this on your behalf to {withheldAtPayout.countryName}'s tax authority.
            </Text>
            <View style={styles.row}>
              <Text style={styles.label}>{withheldAtPayout.label} ({withheldAtPayout.country})</Text>
              <Text style={styles.value}>{fmt(withheldAtPayout.totalUsd)}</Text>
            </View>
          </View>
        )}

        {/* COLLECTED FROM BUYERS ON YOUR BEHALF — only when total > 0 */}
        {collectedFromBuyers && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Collected From Buyers On Your Behalf</Text>
            <Text style={styles.helper}>
              You opted in to collect {collectedFromBuyers.label}. Pass-through in your payout — you owe this to your
              tax authority.
            </Text>
            <View style={styles.row}>
              <Text style={styles.label}>
                {collectedFromBuyers.label} · {collectedFromBuyers.orderCount} order
                {collectedFromBuyers.orderCount === 1 ? '' : 's'}
              </Text>
              <Text style={styles.value}>{fmt(collectedFromBuyers.totalUsd)}</Text>
            </View>
          </View>
        )}

        {/* COLLECTED BY noizu.direct — informational, only when something exists */}
        {collectedByPlatform.hasAny && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Collected by noizu.direct</Text>
            <Text style={styles.helper}>Informational. Not your money — noizu.direct files this directly.</Text>
            {collectedByPlatform.destinationTax.map((d) => (
              <View key={d.country} style={styles.row}>
                <Text style={styles.label}>
                  Destination {d.label} ({d.countryName})
                </Text>
                <Text style={styles.value}>{fmt(d.totalUsd)}</Text>
              </View>
            ))}
            {collectedByPlatform.serviceFeeTax > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Tax on noizu.direct service fee (buyer side)</Text>
                <Text style={styles.value}>{fmt(collectedByPlatform.serviceFeeTax)}</Text>
              </View>
            )}
          </View>
        )}

        {/* SALES BY BUYER COUNTRY */}
        {salesByCountry.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sales by Buyer Country</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.col1}>Country</Text>
                <Text style={styles.col2}>Orders</Text>
                <Text style={styles.col3}>Gross</Text>
                <Text style={styles.col4}>Net</Text>
              </View>
              {salesByCountry.map((r) => (
                <View key={r.country} style={styles.tableRow}>
                  <Text style={styles.col1}>{r.countryName}</Text>
                  <Text style={styles.col2}>{r.orderCount}</Text>
                  <Text style={styles.col3}>{fmt(r.grossUsd)}</Text>
                  <Text style={styles.col4}>{fmt(r.netUsd)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {earnings.orderCount === 0 && (
          <View style={styles.section}>
            <Text style={styles.helper}>No paid orders in this period.</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            noizu.direct provides escrow and payment-handling. Goods are sold and shipped by the creator. For tax
            filing questions, consult a local accountant.
          </Text>
          <Text>Generated {generatedAt}</Text>
        </View>
      </Page>
    </Document>
  )
}
