import type { NextConfig } from "next";

// Content-Security-Policy lives in src/middleware.ts — it needs a per-request
// nonce so Next.js can attach it to bootstrap scripts and so we can drop
// 'unsafe-inline' from script-src. The non-CSP security headers stay here.
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
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // M22 — HSTS. Cloudflare also sets this upstream, but we want the
          // app itself to emit it so that we can be added to the browser
          // preload list and first-visit downgrade attacks are closed.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // M22 — COOP. Attacker-opened tabs lose their window.opener
          // reference; protects against tabnabbing and opener-poisoning.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // M22 — CORP. Third parties can't hotlink our HTML/JSON as a
          // subresource. We deliberately do NOT add COEP since it breaks
          // our third-party images (R2, Unsplash) and YouTube embeds.
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          // M23 — enables the /api/csp-report endpoint as a Reporting API
          // group so CSP violations land there.
          { key: 'Reporting-Endpoints', value: 'csp-endpoint="/api/csp-report"' },
        ],
      },
    ]
  },
};

export default nextConfig;
