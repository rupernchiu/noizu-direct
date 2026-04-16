import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const SITE = 'https://noizu.direct'
export const revalidate = 3600

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function getThumbnailUrl(platform: string, embedId: string, creatorAvatar: string | null): string {
  if (platform === 'YOUTUBE') {
    return `https://img.youtube.com/vi/${embedId}/maxresdefault.jpg`
  }
  return creatorAvatar ?? `${SITE}/images/default-video-thumbnail.jpg`
}

export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        description: true,
        platform: true,
        embedId: true,
        createdAt: true,
        creator: { select: { username: true, displayName: true, avatar: true } },
      },
      take: 50000,
    })

    const urls = videos.map(v => {
      const thumbnailUrl = getThumbnailUrl(v.platform, v.embedId, v.creator.avatar)
      const creatorPageUrl = `${SITE}/creator/${v.creator.username}`

      return `  <url>
    <loc>${creatorPageUrl}</loc>
    <lastmod>${new Date(v.createdAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
    <video:video>
      <video:thumbnail_loc>${escapeXml(thumbnailUrl)}</video:thumbnail_loc>
      <video:title>${escapeXml(v.title)}</video:title>
      ${v.description ? `<video:description>${escapeXml(v.description.slice(0, 2048))}</video:description>` : ''}
      <video:content_loc>${escapeXml(creatorPageUrl)}</video:content_loc>
      <video:publication_date>${new Date(v.createdAt).toISOString()}</video:publication_date>
    </video:video>
  </url>`
    })

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
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
