import type { Metadata } from 'next'
import { JsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Fees & Pricing | NOIZU-DIRECT',
  description: 'Transparent pricing for NOIZU-DIRECT. 0% platform fee during launch. 2.5% processing fee for buyers. 4% withdrawal fee for creators.',
  alternates: { canonical: 'https://noizu.direct/fees' },
  openGraph: {
    title: 'Fees & Pricing | NOIZU-DIRECT',
    description: 'Transparent fees: 0% platform fee, 2.5% buyer processing fee, 4% creator withdrawal fee.',
    url: 'https://noizu.direct/fees',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630, alt: 'NOIZU-DIRECT Fees' }],
  },
}

export default function FeesPage() {
  const feeTableSchema = {
    '@context': 'https://schema.org',
    '@type': 'Table',
    about: 'NOIZU-DIRECT fee structure',
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-4">Fees &amp; Pricing</h1>
        <p className="text-muted-foreground mb-8">
          NOIZU-DIRECT is committed to transparent, fair pricing. Here is a complete breakdown of all fees.
        </p>

        <JsonLd data={feeTableSchema} />

        <div className="bg-surface border border-border rounded-xl overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="text-left px-4 py-3 font-semibold text-foreground">Fee</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Who Pays</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">When</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-3 text-foreground font-medium">Platform fee</td>
                <td className="px-4 py-3 text-green-400 font-bold">0%</td>
                <td className="px-4 py-3 text-muted-foreground">Creator</td>
                <td className="px-4 py-3 text-muted-foreground">Per sale (launch period)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3 text-foreground font-medium">Processing fee</td>
                <td className="px-4 py-3 text-foreground font-bold">2.5%</td>
                <td className="px-4 py-3 text-muted-foreground">Buyer</td>
                <td className="px-4 py-3 text-muted-foreground">At checkout</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3 text-foreground font-medium">Withdrawal fee</td>
                <td className="px-4 py-3 text-foreground font-bold">4%</td>
                <td className="px-4 py-3 text-muted-foreground">Creator</td>
                <td className="px-4 py-3 text-muted-foreground">Per payout request</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-foreground font-medium">Free plan storage</td>
                <td className="px-4 py-3 text-foreground font-bold">500MB</td>
                <td className="px-4 py-3 text-muted-foreground">Creator</td>
                <td className="px-4 py-3 text-muted-foreground">Included free</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-3">Buyer Fees</h2>
        <p className="text-muted-foreground mb-6">
          Buyers pay a <strong className="text-foreground">2.5% processing fee</strong> added at checkout.
          This covers payment processing costs. There are no hidden fees or subscription charges for buyers.
        </p>

        <h2 className="text-xl font-semibold text-foreground mb-3">Creator Fees</h2>
        <p className="text-muted-foreground mb-4">
          During the launch period, NOIZU-DIRECT charges <strong className="text-foreground">0% platform fee</strong> on all sales.
          Creators keep 100% of their listing price (minus payment processing, which is covered by the buyer fee).
        </p>
        <p className="text-muted-foreground mb-6">
          When withdrawing earnings, creators pay a <strong className="text-foreground">4% withdrawal fee</strong>.
          There is no fee to list products, no subscription, and no setup cost.
        </p>

        <h2 className="text-xl font-semibold text-foreground mb-3">No Hidden Fees</h2>
        <p className="text-muted-foreground">
          NOIZU-DIRECT does not charge for: listing products, creating an account, receiving orders,
          messaging buyers, or using the storefront. The only fees are the 2.5% buyer processing fee
          and the 4% creator withdrawal fee.
        </p>
      </div>
    </div>
  )
}
