import { prisma } from '@/lib/prisma';
import { AnnouncementBarClient } from './AnnouncementBarClient';

export default async function AnnouncementBar() {
  let announcements: { id: string; text: string; color: string; link: string | null }[] = [];
  try {
    announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, text: true, color: true, link: true },
    });
  } catch {
    return null;
  }

  if (announcements.length === 0) return null;

  // Pick a random starting announcement per request so full page refreshes
  // rotate through them. Client advances on each pathname change.
  const initialIndex = Math.floor(Math.random() * announcements.length);

  return <AnnouncementBarClient announcements={announcements} initialIndex={initialIndex} />;
}
