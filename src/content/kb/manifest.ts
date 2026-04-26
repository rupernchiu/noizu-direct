// Single source of truth for the admin knowledgebase index.
// Adding a doc: append to the section, then create the matching .md file
// in this directory. Slugs must be unique across all sections.

export interface KbDoc {
  slug: string
  title: string
  blurb: string
}

export interface KbSection {
  id: string
  title: string
  intro: string
  docs: KbDoc[]
}

export const KB_MANIFEST: readonly KbSection[] = [
  {
    id: 'business',
    title: '1. Business',
    intro: 'What noizu.direct is, who it serves, and how it makes money.',
    docs: [
      { slug: 'overview',           title: 'What we do',          blurb: 'Elevator pitch, mission, scope.' },
      { slug: 'target-users',       title: 'Target users',        blurb: 'Buyer + creator personas.' },
      { slug: 'industry',           title: 'Industry context',    blurb: 'SEA creator economy, why direct-to-creator.' },
      { slug: 'competitors',        title: 'Competitive landscape', blurb: 'Where we sit vs. Etsy, Gumroad, Booth, Shopee.' },
      { slug: 'revenue-model',      title: 'Revenue model',       blurb: 'How money flows from buyer → creator → us.' },
      { slug: 'unit-economics',     title: 'Unit economics',      blurb: 'Per-order math, fee/cost breakdown, sensitivity.' },
    ],
  },
  {
    id: 'operations',
    title: '2. Operations',
    intro: 'How the platform actually runs, day to day.',
    docs: [
      { slug: 'order-lifecycle',    title: 'Order lifecycle',     blurb: 'Cart → checkout → escrow → fulfillment → release.' },
      { slug: 'escrow-payouts',     title: 'Escrow & payouts',    blurb: 'Hold logic, release windows, payout corridors.' },
      { slug: 'kyc-onboarding',     title: 'KYC & onboarding',    blurb: 'Creator application + verification flow.' },
      { slug: 'disputes-chargebacks', title: 'Disputes & chargebacks', blurb: 'Dispute states, evidence packaging, chargeback handling.' },
      { slug: 'fraud-queue',        title: 'Fraud queue',         blurb: 'How flags surface and get worked.' },
      { slug: 'tax-architecture',   title: 'Tax architecture',    blurb: '3-layer model: origin / destination / platform.' },
      { slug: 'customer-support',   title: 'Customer support',    blurb: 'CS workbench, ticket SLAs, escalation paths.' },
      { slug: 'cron-jobs',          title: 'Cron jobs',           blurb: 'Scheduled jobs, what they do, staleness thresholds.' },
      { slug: 'maintenance-mode',   title: 'Maintenance mode',    blurb: 'How to flip it on/off without locking yourself out.' },
    ],
  },
  {
    id: 'product-tech',
    title: '3. Product & Tech',
    intro: 'How the webapp is built and where things live.',
    docs: [
      { slug: 'architecture',       title: 'Architecture overview', blurb: 'Stack, hosting, data plane.' },
      { slug: 'page-map',           title: 'Page map',            blurb: 'Public, dashboard, admin route inventory.' },
      { slug: 'feature-inventory',  title: 'Feature inventory',   blurb: 'Shipped features grouped by surface.' },
      { slug: 'database-schema',    title: 'Database schema',     blurb: 'Top-level Prisma models grouped by domain.' },
      { slug: 'integrations',       title: 'Integrations',        blurb: 'Airwallex, R2, Resend, Clarity, Vercel.' },
      { slug: 'admin-tools',        title: 'Admin tools',         blurb: 'What every /admin page does.' },
    ],
  },
  {
    id: 'policy-legal',
    title: '4. Policy & Legal',
    intro: 'What we promise to buyers and creators.',
    docs: [
      { slug: 'fee-model',          title: 'Fee model',           blurb: '5/5.5/8 + rail-aware breakdown.' },
      { slug: 'buyer-protection',   title: 'Buyer protection',    blurb: 'What we cover, what we don\'t.' },
      { slug: 'refund-policy',      title: 'Refund policy',       blurb: 'Eligibility windows by category.' },
      { slug: 'shipping-policy',    title: 'Shipping policy',     blurb: 'Per-country rates, combined shipping, free-ship boost, refund carve-out.' },
      { slug: 'storage-policy',     title: 'Storage policy',      blurb: 'Plans, quotas, grace, retention.' },
      { slug: 'terms-summary',      title: 'Terms summary',       blurb: 'Plain-English read of ToS + Creator Agreement.' },
    ],
  },
  {
    id: 'glossary',
    title: '5. Glossary',
    intro: 'Decoder ring for acronyms, internal terms, and external references.',
    docs: [
      { slug: 'acronyms',           title: 'Acronyms',            blurb: 'KYC, SST, SWIFT, FPX, etc.' },
      { slug: 'internal-terms',     title: 'Internal terms',      blurb: 'Rail, corridor, tier, snapshot, etc.' },
      { slug: 'external-references', title: 'External references', blurb: 'Counterparties, regulators, dashboards.' },
    ],
  },
] as const
