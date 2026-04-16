import { NextResponse } from 'next/server'

const SITE = 'https://noizu.direct'

export const revalidate = 3600

export async function GET() {
  const today = new Date().toISOString().split('T')[0]
  const sitemaps = ['pages', 'creators', 'products', 'blog', 'categories', 'video']

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(name => `  <sitemap>
    <loc>${SITE}/sitemap-${name}.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  })
}
