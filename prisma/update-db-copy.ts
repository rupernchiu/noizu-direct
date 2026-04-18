import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  // Update spotlight quotes
  await prisma.creatorSpotlight.updateMany({
    where: { quote: { contains: 'Comic Fiesta' } },
    data: { quote: "I was scared no one would buy. Made back my NoizuCon table fee in week one. Now it runs while I sleep." },
  })
  await prisma.creatorSpotlight.updateMany({
    where: { quote: { contains: 'Animangaki' } },
    data: { quote: "Set up my store in one evening after NoizuCon. My fans actually found me — no chasing anyone on Instagram." },
  })

  // Update any Section content referencing NOIZU-DIRECT or conventions
  const sections = await prisma.section.findMany({ where: { pageSlug: 'home' } })
  for (const s of sections) {
    const updated = s.content
      .replace(/NOIZU-DIRECT/g, 'noizu.direct')
      .replace(/Comic Fiesta/g, 'NoizuCon')
      .replace(/Animangaki/g, 'NoizuCon')
    if (updated !== s.content) {
      await prisma.section.update({ where: { id: s.id }, data: { content: updated } })
      console.log('Updated section:', s.type)
    }
  }

  // Update CreatorProfile bios
  const creators = await prisma.creatorProfile.findMany({
    where: {
      OR: [
        { bio: { contains: 'NOIZU-DIRECT' } },
        { bio: { contains: 'Comic Fiesta' } },
        { bio: { contains: 'Animangaki' } },
      ]
    }
  })
  for (const c of creators) {
    const updated = (c.bio ?? '')
      .replace(/NOIZU-DIRECT/g, 'noizu.direct')
      .replace(/Comic Fiesta/g, 'NoizuCon')
      .replace(/Animangaki/g, 'NoizuCon')
    await prisma.creatorProfile.update({ where: { id: c.id }, data: { bio: updated } })
    console.log('Updated creator bio:', c.username)
  }

  console.log('DB copy updates done')
}

main().catch(console.error).finally(() => prisma.$disconnect())
