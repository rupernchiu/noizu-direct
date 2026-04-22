import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import sanitizeHtml from 'sanitize-html'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'

// Slugs handled by dedicated routes — skip them here
const RESERVED = new Set(['about', 'terms', 'privacy', 'help', 'contact', 'storage-policy', 'creator-handbook', 'fees', 'fees-payouts', 'escrow', 'blog', 'creators', 'marketplace', 'checkout', 'login', 'register', 'account', 'dashboard', 'admin', 'creator', 'product', 'order', 'download', 'api'])

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  // `u` — StarterKit's Underline emits <u>, which isn't in sanitize-html's
  // defaults. `style` + allowedStyles — TipTap TextAlign writes inline
  // `style="text-align:…"`; without it, alignment is silently stripped.
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'figure', 'figcaption', 'iframe', 'u', 'h1', 'h2', 'h3', 'h4']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'width', 'height', 'class'],
    iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'class'],
    '*': ['class', 'style'],
  },
  allowedStyles: {
    '*': { 'text-align': [/^(left|right|center|justify)$/] },
  },
  allowedIframeHostnames: ['www.youtube.com', 'www.facebook.com'],
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (RESERVED.has(slug)) return {}
  const page = await prisma.page.findUnique({ where: { slug }, select: { title: true, seoTitle: true, seoDescription: true } })
  if (!page) return {}
  return { title: page.seoTitle || page.title, description: page.seoDescription }
}

export default async function StaticPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (RESERVED.has(slug)) notFound()

  const page = await prisma.page.findUnique({ where: { slug } })
  if (!page || page.status !== 'PUBLISHED') notFound()

  const safeContent = page.content ? sanitizeHtml(page.content, SANITIZE_OPTIONS) : null

  const faqSchema = page.slug === 'help' ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'What is noizu.direct?', acceptedAnswer: { '@type': 'Answer', text: 'noizu.direct is a Southeast Asian creator marketplace where cosplayers, illustrators, and doujin artists sell directly to fans. Products include digital art, physical merchandise, doujin, cosplay prints, stickers, and print-on-demand items.' } },
      { '@type': 'Question', name: 'How does buyer protection work on noizu.direct?', acceptedAnswer: { '@type': 'Answer', text: 'All physical and POD orders are protected by escrow. Your payment is held securely until you receive your order. Digital purchases have a 7-day dispute window. Physical orders have 14-day protection. POD orders have 21-day protection.' } },
      { '@type': 'Question', name: 'What fees does noizu.direct charge?', acceptedAnswer: { '@type': 'Answer', text: 'noizu.direct charges 0% platform fee during launch. Members pay a 2.5% processing fee at checkout. Creators pay a 4% withdrawal fee when requesting payouts.' } },
      { '@type': 'Question', name: 'What countries does noizu.direct serve?', acceptedAnswer: { '@type': 'Answer', text: 'noizu.direct primarily serves Malaysia, Singapore, Philippines, Indonesia, and Thailand, though creators ship worldwide and digital products are available globally.' } },
      { '@type': 'Question', name: 'How do digital downloads work?', acceptedAnswer: { '@type': 'Answer', text: 'After payment, you receive an instant download link valid for 48 hours. Downloads are available anytime from your account downloads page.' } },
      { '@type': 'Question', name: 'What is print-on-demand (POD)?', acceptedAnswer: { '@type': 'Answer', text: "POD products are made to order by the creator's print provider after you purchase. Production takes 3-7 days plus shipping. Your payment is protected for 21 days." } },
      { '@type': 'Question', name: 'How do I become a creator on noizu.direct?', acceptedAnswer: { '@type': 'Answer', text: 'Register at noizu.direct/register/creator, complete your profile, and list your first product. The process takes under 10 minutes.' } },
      { '@type': 'Question', name: 'What is World Cosplay Summit Malaysia?', acceptedAnswer: { '@type': 'Answer', text: 'World Cosplay Summit Malaysia (WCS Malaysia) is the official national qualifier for the World Cosplay Summit in Japan, organized by NOIZU. It is the top cosplay competition in Malaysia.' } },
      { '@type': 'Question', name: 'How do I track my order?', acceptedAnswer: { '@type': 'Answer', text: 'Once a creator adds a tracking number to your order, you will receive a notification. You can view tracking information in your account orders page.' } },
      { '@type': 'Question', name: 'Can I get a refund?', acceptedAnswer: { '@type': 'Answer', text: 'Refunds are available for items that never arrived, significantly damaged items, wrong items sent, or when a creator fails to fulfill. Raise a dispute from your orders page within the protection window.' } },
    ],
  } : null

  const howToBuySchema = page.slug === 'how-it-works' ? {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Buy from noizu.direct',
    description: 'Step-by-step guide to purchasing from SEA creators on noizu.direct',
    step: [
      { '@type': 'HowToStep', name: 'Browse', text: 'Browse products from Southeast Asian cosplayers, illustrators, and doujin artists on the marketplace.' },
      { '@type': 'HowToStep', name: 'Purchase', text: 'Add to cart and checkout securely. Your payment is protected by escrow for physical and POD orders.' },
      { '@type': 'HowToStep', name: 'Receive', text: 'Download digital products instantly, or track shipping for physical items. Confirm receipt to release payment to the creator.' },
    ],
  } : null

  const howToSellSchema = page.slug === 'start-selling' ? {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Sell on noizu.direct',
    description: 'Step-by-step guide to becoming a creator and selling on noizu.direct',
    step: [
      { '@type': 'HowToStep', name: 'Sign Up', text: 'Create your creator account at noizu.direct/register/creator.' },
      { '@type': 'HowToStep', name: 'Set Up Store', text: 'Complete your profile with a bio, banner, and category tags to attract the right buyers.' },
      { '@type': 'HowToStep', name: 'List Products', text: 'Upload digital files or physical product photos, set prices, and publish your products.' },
      { '@type': 'HowToStep', name: 'Get Paid', text: 'Earn from sales with escrow protection. Request payouts at any time.' },
    ],
  } : null

  const cmsPageBreadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://noizu.direct' },
      { '@type': 'ListItem', position: 2, name: page.title, item: `https://noizu.direct/${page.slug}` },
    ],
  }

  const cmsSchemas = [cmsPageBreadcrumbSchema, faqSchema, howToBuySchema, howToSellSchema].filter(Boolean)

  return (
    <div className="min-h-screen bg-background py-16">
      <JsonLd data={cmsSchemas} />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <span className="text-foreground">{page.title}</span>
        </nav>

        <h1 className="mb-8 text-3xl font-bold text-foreground">{page.title}</h1>

        {safeContent ? (
          <div className="rounded-xl bg-card border border-border p-8">
            <div
              // `dark:prose-invert` (not `prose-invert`) — app defaults to light
              // theme, so unconditional invert rendered body text as light gray
              // on white. Explicit `[&_hN]` sizes + margins ensure heading
              // hierarchy is visible regardless of Tailwind prose plugin quirks;
              // mirrors the sizing used in TipTapEditor so WYSIWYG holds.
              className={[
                'prose max-w-none dark:prose-invert',
                'text-foreground prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground',
                '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-3',
                '[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2',
                '[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2',
                '[&_p]:my-2',
              ].join(' ')}
              dangerouslySetInnerHTML={{ __html: safeContent }}
            />
          </div>
        ) : (
          <div className="rounded-xl bg-card border border-border p-8 text-muted-foreground">
            This page has no content yet.
          </div>
        )}
      </div>
    </div>
  )
}
