import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const SITE = 'https://noizu.direct'
export const revalidate = 3600

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, title: true, description: true, images: true, updatedAt: true, creator: { select: { displayName: true } } },
      take: 50000,
    })

    const urls = products.map(p => {
      let imgs: string[] = []
      try { imgs = JSON.parse(p.images) } catch { /* */ }
      const imageXml = imgs.slice(0, 10).map((img, i) => `    <image:image>
      <image:loc>${escapeXml(img)}</image:loc>
      <image:title>${escapeXml(`${p.title} by ${p.creator.displayName}${i > 0 ? ` — image ${i + 1}` : ''}`)}</image:title>
      ${i === 0 && p.description ? `<image:caption>${escapeXml(p.description.slice(0, 150))}</image:caption>` : ''}
    </image:image>`).join('\n')

      return `  <url>
    <loc>${SITE}/product/${p.id}</loc>
    <lastmod>${new Date(p.updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
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
