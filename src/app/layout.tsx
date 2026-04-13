import type { Metadata } from 'next';
import './globals.css';
import SessionProvider from '@/components/providers/SessionProvider';
import AnnouncementBar from '@/components/ui/AnnouncementBar';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'NOIZU-DIRECT — Your fave creators. Direct to you.',
  description:
    "Discover original art, doujin, cosplay prints and merch from Southeast Asia's best creators.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0d0d12] text-[#f0f0f5] font-sans antialiased">
        <SessionProvider>
          <AnnouncementBar />
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster theme="dark" position="bottom-right" />
        </SessionProvider>
      </body>
    </html>
  );
}
