import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== 'production';

// CSP notes:
// * script-src keeps 'unsafe-inline' because Next.js App Router injects inline
//   bootstrap scripts (hydration, flight data) and the layout ships an inline
//   theme-init guard to avoid a light-mode flash. A nonce-based policy would
//   require per-request middleware rewriting and is tracked separately.
// * 'unsafe-eval' is only granted in dev where React Refresh needs it.
// * connect/img/script allow lists cover Vercel Analytics/Speed Insights,
//   Microsoft Clarity, and the R2 public bucket.
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://va.vercel-scripts.com https://vitals.vercel-insights.com https://www.clarity.ms`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' blob: data: https://*.r2.dev https://*.r2.cloudflarestorage.com https://images.unsplash.com https://picsum.photos https://fastly.picsum.photos https://i.ytimg.com https://img.youtube.com",
  "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com https://www.clarity.ms https://c.clarity.ms",
  "frame-ancestors 'self'",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ')

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'fastly.picsum.photos' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: 'pub-noizu-direct-uploads.r2.dev' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspDirectives },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
};

export default nextConfig;
