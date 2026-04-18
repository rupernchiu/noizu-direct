import { SEO_CONFIG } from './seo-config'

/** "[pageTitle] | NOIZU-DIRECT", capped at 60 chars */
export function generateTitle(pageTitle?: string): string {
  if (!pageTitle) return SEO_CONFIG.defaultTitle
  const full = `${pageTitle} | noizu.direct`
  return full.length <= 60 ? full : pageTitle.slice(0, 45) + '… | noizu.direct'
}

/** Strip HTML tags, truncate at word boundary */
export function generateDescription(text: string, maxLength = 160): string {
  const stripped = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  if (stripped.length <= maxLength) return stripped
  const cut = stripped.lastIndexOf(' ', maxLength - 1)
  return stripped.slice(0, cut > 0 ? cut : maxLength) + '…'
}

/** Canonical URL from path */
export function generateCanonical(path: string): string {
  const base = SEO_CONFIG.siteUrl.replace(/\/$/, '')
  return base + (path.startsWith('/') ? path : '/' + path)
}

/** /api/og?type=X&... */
export function generateOgImageUrl(type: string, params: Record<string, string>): string {
  const base = SEO_CONFIG.siteUrl.replace(/\/$/, '')
  const qs = new URLSearchParams({ type, ...params }).toString()
  return `${base}/api/og?${qs}`
}

/** BreadcrumbList JSON-LD */
export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
