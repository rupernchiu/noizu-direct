import { NextResponse } from 'next/server'

const SITE = 'https://noizu.direct'
export const revalidate = 3600

const CATEGORIES = [
  { slug: 'digital-art', priority: '0.8' },
  { slug: 'doujin', priority: '0.8' },
  { slug: 'cosplay-print', priority: '0.8' },
  { slug: 'physical-merch', priority: '0.7' },
  { slug: 'stickers', priority: '0.7' },
  { slug: 'other', priority: '0.6' },
]

export async function GET() {
  const today = new Date().toISOString()

  const urls = CATEGORIES.map(c => `  <url>
    <loc>${SITE}/marketplace?category=${c.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${c.priority}</priority>
  </url>`)

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  })
}
