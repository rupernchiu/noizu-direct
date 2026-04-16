import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const SITE_URL = process.env.NEXT_PUBLIC_CANONICAL_DOMAIN || 'https://noizu.direct'
void SITE_URL

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'default'
  const title = searchParams.get('title') || 'NOIZU-DIRECT'
  const subtitle = searchParams.get('subtitle') || ''
  const image = searchParams.get('image') || ''
  const price = searchParams.get('price') || ''
  const badge = searchParams.get('badge') || ''

  // Default OG
  if (type === 'default' || !type) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px', height: '630px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a0533 0%, #0d1f33 50%, #001a1a 100%)',
          }}
        >
          <div style={{ fontSize: '72px', fontWeight: 900, color: '#ffffff', letterSpacing: '-2px', marginBottom: '16px' }}>
            NOIZU-DIRECT
          </div>
          <div style={{ fontSize: '28px', color: '#a78bfa', fontWeight: 500 }}>
            Your fave creators. Direct to you.
          </div>
          <div style={{ marginTop: '32px', fontSize: '18px', color: '#6ee7d6', opacity: 0.8 }}>
            SEA Creator Marketplace · Malaysia · Singapore · Philippines
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    )
  }

  // Product OG
  if (type === 'product') {
    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px', height: '630px', display: 'flex',
            background: 'linear-gradient(135deg, #1a0533 0%, #0d1f33 100%)',
          }}
        >
          {/* Left: image */}
          {image && (
            <div style={{ width: '50%', height: '100%', overflow: 'hidden' }}>
              <img src={image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            </div>
          )}
          {/* Right: info */}
          <div
            style={{
              flex: 1, padding: '48px 40px', display: 'flex', flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {badge && (
                <div style={{ display: 'inline-block', background: 'rgba(124,58,237,0.3)', border: '1px solid #7c3aed', borderRadius: '20px', padding: '4px 12px', fontSize: '14px', color: '#a78bfa', marginBottom: '16px' }}>
                  {badge}
                </div>
              )}
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', lineHeight: 1.2, marginBottom: '12px' }}>
                {title}
              </div>
              {subtitle && (
                <div style={{ fontSize: '20px', color: '#94a3b8' }}>by {subtitle}</div>
              )}
            </div>
            <div>
              {price && (
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#a78bfa', marginBottom: '16px' }}>
                  {price}
                </div>
              )}
              <div style={{ fontSize: '16px', color: '#6ee7d6', fontWeight: 600 }}>NOIZU-DIRECT</div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    )
  }

  // Creator OG
  if (type === 'creator') {
    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px', height: '630px', display: 'flex', flexDirection: 'column',
            justifyContent: 'flex-end',
            background: 'linear-gradient(135deg, #1a0533 0%, #0d1f33 50%, #001a1a 100%)',
          }}
        >
          <div style={{ padding: '48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {image && (
                <img src={image} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #7c3aed' }} alt="" />
              )}
              <div>
                <div style={{ fontSize: '40px', fontWeight: 800, color: '#ffffff' }}>{title}</div>
                {subtitle && <div style={{ fontSize: '20px', color: '#a78bfa', marginTop: '4px' }}>{subtitle}</div>}
              </div>
            </div>
            <div style={{ fontSize: '20px', color: '#6ee7d6', fontWeight: 600 }}>NOIZU-DIRECT</div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    )
  }

  // Blog OG
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px', height: '630px', display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end',
          background: 'linear-gradient(135deg, #1a0533 0%, #0d1f33 100%)',
        }}
      >
        {image && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <img src={image} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} alt="" />
          </div>
        )}
        <div style={{ position: 'relative', padding: '48px', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))' }}>
          <div style={{ fontSize: '42px', fontWeight: 800, color: '#ffffff', lineHeight: 1.2, marginBottom: '12px' }}>
            {title}
          </div>
          {subtitle && <div style={{ fontSize: '20px', color: '#94a3b8' }}>{subtitle}</div>}
          <div style={{ marginTop: '16px', fontSize: '16px', color: '#6ee7d6' }}>NOIZU-DIRECT Blog</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
