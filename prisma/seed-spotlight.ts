import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  await prisma.creatorSpotlight.deleteMany()

  await prisma.creatorSpotlight.createMany({
    data: [
      {
        displayName: 'Mei Lin',
        creatorType: 'Digital Artist & Illustrator',
        location: 'Kuala Lumpur, MY',
        quote: "I was scared no one would buy. Made back my Comic Fiesta table fee in week one. Now it runs while I sleep.",
        earningsStat: 'RM 1,847',
        earningsPeriod: 'first 6 weeks',
        avatarInitials: 'ML',
        avatarColor: '#7c3aed',
        isActive: true,
        order: 0,
      },
      {
        displayName: 'Ryo Takahashi',
        creatorType: 'Cosplay Photographer & Print Maker',
        location: 'Penang, MY',
        quote: "Finally stopped DMing people spreadsheets for commissions. My queue manages itself and I just do the work.",
        earningsStat: 'RM 3,200',
        earningsPeriod: 'first 3 months',
        avatarInitials: 'RT',
        avatarColor: '#00d4aa',
        isActive: true,
        order: 1,
      },
      {
        displayName: 'Aina Rashid',
        creatorType: 'Doujin Circle Creator',
        location: 'Singapore',
        quote: "Set up my store in one evening after Animangaki. My fans actually found me — no chasing anyone on Instagram.",
        earningsStat: 'S$ 680',
        earningsPeriod: 'first month',
        avatarInitials: 'AR',
        avatarColor: '#ec4899',
        isActive: true,
        order: 2,
      },
    ],
  })

  console.log('Seeded 3 creator spotlight entries')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
