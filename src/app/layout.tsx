import type { Metadata } from 'next';
import './globals.css';
import { Poppins } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Script from 'next/script'
import { headers } from 'next/headers'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
})
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import SessionProvider from '@/components/providers/SessionProvider';
import AnnouncementBar from '@/components/ui/AnnouncementBar';
import Navbar from '@/components/layout/Navbar';
import { SecondaryNav } from '@/components/layout/SecondaryNav';
import { SearchBar } from '@/components/layout/SearchBar';
import Footer from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/sonner'
import { FloatingScrollButtons } from '@/components/ui/FloatingScrollButtons'
import { MobileBottomNavServer } from '@/components/layout/MobileBottomNavServer'
import { CartProvider } from '@/components/layout/CartProvider';
import { RejectionBannerWrapper } from '@/components/ui/RejectionBannerWrapper'
import { ApprovalBannerWrapper } from '@/components/ui/ApprovalBannerWrapper'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_CANONICAL_DOMAIN || 'https://noizu.direct'),
  title: {
    default: 'noizu.direct — SEA Creator Marketplace | Buy Direct',
    template: '%s | noizu.direct',
  },
  description: 'Shop directly from Southeast Asian cosplay, doujin, and anime art creators. Digital downloads, physical merch, and POD products with buyer protection.',
  keywords: ['SEA creator marketplace', 'cosplay', 'doujin', 'anime art', 'Malaysia creator', 'digital download', 'Southeast Asia'],
  authors: [{ name: 'noizu.direct' }],
  creator: 'noizu.direct',
  openGraph: {
    type: 'website',
    locale: 'en_MY',
    url: 'https://noizu.direct',
    siteName: 'noizu.direct',
    title: 'noizu.direct — SEA Creator Marketplace | Buy Direct',
    description: 'Shop directly from Southeast Asian cosplay, doujin, and anime art creators. Digital downloads, physical merch, and POD products with buyer protection.',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630, alt: 'noizu.direct — SEA Creator Marketplace' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@noizudirect',
    creator: '@noizudirect',
    title: 'noizu.direct — SEA Creator Marketplace',
    description: 'Shop directly from Southeast Asian cosplay, doujin, and anime art creators.',
    images: ['/images/og-default.jpg'],
  },
  robots: { index: true, follow: true },
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('noizu-theme');var d=document.documentElement;if(t==='dark'){d.classList.add('dark');}else{d.classList.add('light');}}catch(e){document.documentElement.classList.add('light');}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html lang="en" className={`h-full ${poppins.variable}`} suppressHydrationWarning>
      <head>
        {/* `next/script` with beforeInteractive renders into <head> server-side,
            avoiding React's "script tag in component" warning that triggers
            on a literal <script>. Theme must apply pre-paint to prevent FOUC. */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-background text-foreground font-sans antialiased"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="noizu-theme"
        >
          <SessionProvider>
            <a href="#main-content" className="skip-to-main">Skip to main content</a>
            <header className="sticky top-0 z-50 bg-background">
              <AnnouncementBar />
              <RejectionBannerWrapper />
              <ApprovalBannerWrapper />
              <Navbar />
              <CartProvider />
              <SecondaryNav />
            </header>
            <SearchBar />
            <main id="main-content" className="flex-1 pb-16 md:pb-0">{children}</main>
            <Footer />
            <MobileBottomNavServer />
            <Toaster position="bottom-right" />
            <FloatingScrollButtons />
          </SessionProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
        {process.env.NEXT_PUBLIC_CLARITY_ID && (
          <Script id="clarity" strategy="afterInteractive" nonce={nonce}>
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${process.env.NEXT_PUBLIC_CLARITY_ID}");`}
          </Script>
        )}
      </body>
    </html>
  );
}
