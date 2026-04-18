import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
const pool = new Pool({ connectionString: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any)
async function main() {
  const content = JSON.stringify({
    headline: "Where SEA creators sell direct to fans who get it.",
    subtext: "Original art, doujin, cosplay prints and commissions from Malaysia, Singapore and beyond. Escrow-protected. 0% platform fee.",
    ctaPrimary: { text: "Start Selling Free", link: "/register/creator" },
    ctaSecondary: { text: "Explore Marketplace", link: "/marketplace" },
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    videoThumbnail: "",
    rotatingMessages: [
      "Your art. Your fans. Your income.",
      "Doujin, prints, commissions — direct to your fans.",
      "Built for SEA creators. Free during launch."
    ],
    overlayOpacity: 60,
    showStats: true,
  })
  const r = await prisma.section.updateMany({ where: { pageSlug: 'home', type: 'HERO' }, data: { content } })
  console.log('Updated', r.count, 'section(s)')
}
main().catch(console.error).finally(() => prisma.$disconnect())
