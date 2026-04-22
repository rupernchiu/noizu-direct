'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { ShieldCheck, BadgeCheck, Heart } from 'lucide-react'
import { safeExternalHref, safeInternalHref } from '@/lib/safe-url'

interface HeroContent {
  headline: string
  subtext: string
  ctaPrimary: { text: string; link: string }
  ctaSecondary: { text: string; link: string }
  bgImage?: string
  videoUrl?: string
  videoThumbnail?: string
  rotatingMessages?: string[]
  overlayOpacity?: number
  showStats?: boolean
}

interface HeroSectionProps {
  content: HeroContent
  stats?: {
    creators: number
    products: number
    buyers: number
  }
}

function formatStat(n: number): string {
  if (n >= 1_000_000) return `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(n / 1_000_000)}M+`
  if (n >= 1_000) return `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(n / 1_000)}K+`
  return `${n}+`
}

export default function HeroSection({ content, stats }: HeroSectionProps) {
  const messages = content.rotatingMessages?.filter(Boolean) ?? []
  const hasVideo = Boolean(content.videoUrl)
  const showStats = content.showStats !== false
  const overlayOpacity = (content.overlayOpacity ?? 50) / 100

  const [msgIndex, setMsgIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (messages.length <= 1) return
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setMsgIndex(i => (i + 1) % messages.length)
        setVisible(true)
      }, 300)
    }, 3000)
    return () => clearInterval(id)
  }, [messages.length])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* ── Background ─────────────────────────────────────────────────────── */}
      {hasVideo ? (
        <>
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={content.videoThumbnail}
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={content.videoUrl} type="video/mp4" />
          </video>
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }} />
        </>
      ) : content.bgImage ? (
        <>
          <Image
            src={content.bgImage}
            alt=""
            fill
            priority
            className="object-cover"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-black/60" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-background via-surface to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(124,58,237,0.15),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(0,212,170,0.08),transparent)]" />
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-secondary/5 blur-3xl pointer-events-none" />
        </>
      )}

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">

        {/* Heading: rotating messages (video mode) or static headline */}
        {hasVideo && messages.length > 0 ? (
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 transition-opacity duration-300"
            style={{
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              opacity: visible ? 1 : 0,
              minHeight: '1.2em',
            }}
          >
            {messages[msgIndex]}
          </h1>
        ) : (
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
          >
            {content.headline}
          </h1>
        )}

        {/* Subtext — always rendered when present, in both video and static branches */}
        {content.subtext && (
          <p
            className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
          >
            {content.subtext}
          </p>
        )}

        {/* CTA buttons */}
        {/* H17 — CMS-controlled CTAs. Accept either a same-origin path or
            an http(s) absolute URL. Anything unsafe is rendered as a <span>,
            not a link, so it remains visible but inert. */}
        <div className={`flex flex-col sm:flex-row gap-4 justify-center ${hasVideo && messages.length > 0 ? 'mt-10' : ''}`}>
          {(() => {
            const primary = safeInternalHref(content.ctaPrimary.link) ?? safeExternalHref(content.ctaPrimary.link)
            const baseClass = 'inline-flex items-center justify-center px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] text-base'
            return primary ? (
              <Link href={primary} className={baseClass}>{content.ctaPrimary.text}</Link>
            ) : (
              <span className={baseClass}>{content.ctaPrimary.text}</span>
            )
          })()}
          {(() => {
            const secondary = safeInternalHref(content.ctaSecondary.link) ?? safeExternalHref(content.ctaSecondary.link)
            const baseClass = 'inline-flex items-center justify-center px-8 py-3.5 border border-white/70 hover:border-white bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all text-base'
            return secondary ? (
              <Link href={secondary} className={baseClass}>{content.ctaSecondary.text}</Link>
            ) : (
              <span className={baseClass}>{content.ctaSecondary.text}</span>
            )
          })()}
        </div>

        {/* Value claims strip */}
        {showStats && (
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-white/90" />
              <span className="text-white font-semibold text-sm">Escrow Protected</span>
              <span className="text-white/70 text-xs">Your money is safe</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <BadgeCheck className="w-7 h-7 text-white/90" />
              <span className="text-white font-semibold text-sm">Verified SEA Creators</span>
              <span className="text-white/70 text-xs">Every creator is reviewed</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Heart className="w-7 h-7 text-white/90" />
              <span className="text-white font-semibold text-sm">Fan Art Friendly</span>
              <span className="text-white/70 text-xs">Built for cosplay &amp; doujin</span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
