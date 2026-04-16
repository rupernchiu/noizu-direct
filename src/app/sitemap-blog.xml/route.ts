import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const SITE = 'https://noizu.direct'
export const revalidate = 3600

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, title: true, excerpt: true, coverImage: true, updatedAt: true },
      take: 50000,
    })

    const urls = posts.map(p => {
      const imageXml = p.coverImage ? `    <image:image>
      <image:loc>${escapeXml(p.coverImage)}</image:loc>
      <image:title>${escapeXml(p.title)}</image:title>
      ${p.excerpt ? `<image:caption>${escapeXml(p.excerpt.slice(0, 150))}</image:caption>` : ''}
    </image:image>` : ''

      return `  <url>
    <loc>${SITE}/blog/${p.slug}</loc>
    <lastmod>${new Date(p.updatedAt).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
${imageXml}
  </url>`
    })

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>`

    return new NextResponse(xml, {
      headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
    })
  } catch {
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      headers: { 'Content-Type': 'application/xml' },
    })
  }
}
