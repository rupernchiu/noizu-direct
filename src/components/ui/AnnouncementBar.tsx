import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function AnnouncementBar() {
  let announcement = null;
  try {
    announcement = await prisma.announcement.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    return null;
  }

  if (!announcement) return null;

  const content = (
    <div
      className="w-full py-2 px-4 text-center text-sm font-medium text-white"
      style={{ backgroundColor: announcement.color }}
    >
      {announcement.text}
      {announcement.link && (
        <span className="ml-2 underline underline-offset-2 opacity-90">
          Learn more →
        </span>
      )}
    </div>
  );

  if (announcement.link) {
    return (
      <Link href={announcement.link} className="block w-full hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
