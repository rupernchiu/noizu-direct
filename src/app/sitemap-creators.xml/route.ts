import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const SITE = 'https://noizu.direct'
export const revalidate = 3600

export async function GET() {
  try {
    const creators = await prisma.creatorProfile.findMany({
      select: { username: true, displayName: true, avatar: true, bannerImage: true, bio: true, createdAt: true },
      take: 50000,
    })

    const urls = creators.map(c => {
      const bioSnippet = c.bio ? c.bio.slice(0, 100) : ''
      const imageXml = [
        c.avatar ? `    <image:image>
      <image:loc>${escapeXml(c.avatar)}</image:loc>
      <image:title>${escapeXml(c.displayName)} — NOIZU-DIRECT Creator</image:title>
      ${bioSnippet ? `<image:caption>${escapeXml(bioSnippet)}</image:caption>` : ''}
    </image:image>` : '',
        c.bannerImage ? `    <image:image>
      <image:loc>${escapeXml(c.bannerImage)}</image:loc>
      <image:title>${escapeXml(c.displayName)} creator banner</image:title>
    </image:image>` : '',
      ].filter(Boolean).join('\n')

      return `  <url>
    <loc>${SITE}/creator/${c.username}</loc>
    <lastmod>${new Date(c.createdAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
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

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
