import type { Metadata } from 'next';
import './globals.css';
import { Poppins } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Script from 'next/script'

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
import { CartProvider } from '@/components/layout/CartProvider';
import { RejectionBannerWrapper } from '@/components/ui/RejectionBannerWrapper'
import { ApprovalBannerWrapper } from '@/components/ui/ApprovalBannerWrapper'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_CANONICAL_DOMAIN || 'https://noizu.direct'),
  title: {
    default: 'NOIZU-DIRECT — SEA Creator Marketplace | Buy Direct',
    template: '%s | NOIZU-DIRECT',
  },
  description: 'Shop directly from Southeast Asian cosplay, doujin, and anime art creators. Digital downloads, physical merch, and POD products with buyer protection.',
  keywords: ['SEA creator marketplace', 'cosplay', 'doujin', 'anime art', 'Malaysia creator', 'digital download', 'Southeast Asia'],
  authors: [{ name: 'NOIZU-DIRECT' }],
  creator: 'NOIZU-DIRECT',
  openGraph: {
    type: 'website',
    locale: 'en_MY',
    url: 'https://noizu.direct',
    siteName: 'NOIZU-DIRECT',
    title: 'NOIZU-DIRECT — SEA Creator Marketplace | Buy Direct',
    description: 'Shop directly from Southeast Asian cosplay, doujin, and anime art creators. Digital downloads, physical merch, and POD products with buyer protection.',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630, alt: 'NOIZU-DIRECT — SEA Creator Marketplace' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@noizudirect',
    creator: '@noizudirect',
    title: 'NOIZU-DIRECT — SEA Creator Marketplace',
    description: 'Shop directly from Southeast Asian cosplay, doujin, and anime art creators.',
    images: ['/images/og-default.jpg'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${poppins.variable}`} suppressHydrationWarning>
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
            <header className="sticky top-0 z-50 bg-background">
              <AnnouncementBar />
              <RejectionBannerWrapper />
              <ApprovalBannerWrapper />
              <Navbar />
              <CartProvider />
              <SecondaryNav />
            </header>
            <SearchBar />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster position="bottom-right" />
            <FloatingScrollButtons />
          </SessionProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
        {process.env.NEXT_PUBLIC_CLARITY_ID && (
          <Script id="clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${process.env.NEXT_PUBLIC_CLARITY_ID}");`}
          </Script>
        )}
      </body>
    </html>
  );
}
