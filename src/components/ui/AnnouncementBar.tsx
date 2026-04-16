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

  return <AnnouncementBarClient announcements={announcements} />;
}
