import type { Metadata } from 'next';
import './globals.css';
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
    <html lang="en" className="h-full" suppressHydrationWarning>
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
      </body>
    </html>
  );
}
