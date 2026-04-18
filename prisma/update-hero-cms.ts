import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as object)

async function main() {
  const result = await prisma.section.updateMany({
    where: { pageSlug: 'home', type: 'HERO' },
    data: {
      content: JSON.stringify({
        headline: "Where SEA creators sell direct to fans who get it.",
        subtext: "Original art, doujin, cosplay prints and commissions from Malaysia, Singapore and beyond. Escrow-protected. 0% platform fee.",
        ctaPrimary: { text: "Start Selling Free", link: "/register/creator" },
        ctaSecondary: { text: "Browse Creators", link: "/marketplace" },
        rotatingMessages: [
          "Your art. Your fans. Your income.",
          "Doujin, prints, commissions — direct to your fans.",
          "Built for SEA creators. Free during launch."
        ],
        showStats: true,
      }),
    },
  })
  console.log('Updated', result.count, 'HERO section(s)')
}

main().catch(console.error).finally(() => prisma.$disconnect())
