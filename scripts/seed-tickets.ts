/**
 * Seed representative ticket data for dev viewing of the ticket system.
 *
 * Covers: GENERAL tickets (buyer-initiated), ORDER tickets linked to
 * existing paid/shipped/completed orders from the main seed, a closed
 * ticket within retention, unread-for-creator / unread-for-buyer states,
 * and a reported message for moderation views.
 *
 * Idempotent — wipes any Ticket rows that reference the chosen buyer/creator
 * pairs first so re-runs don't pile up duplicates.
 *
 * Usage:  npx tsx scripts/seed-tickets.ts
 */

import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const dbUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!
const pool = new Pool({ connectionString: dbUrl })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

const now = () => new Date()
const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000)
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000)

// Exclude test-kyc/test fixtures so we don't interfere with other seeds.
const EXCLUDE_EMAIL_PREFIX = 'test+kyc-'

type UserRow = { id: string; email: string; name: string | null }

async function loadUsersByRole(role: 'BUYER' | 'CREATOR', take: number): Promise<UserRow[]> {
  const rows = await prisma.user.findMany({
    where: {
      role,
      email: { not: { startsWith: EXCLUDE_EMAIL_PREFIX } },
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, name: true },
    take,
  })
  return rows
}

async function cleanupTickets(buyerIds: string[], creatorIds: string[]) {
  // Wipe tickets where either party is in our seeded pool. Cascade on
  // TicketMessage/TicketAttachment/TicketReadMarker handles the rest.
  const deleted = await prisma.ticket.deleteMany({
    where: {
      OR: [
        { buyerId: { in: buyerIds } },
        { creatorId: { in: creatorIds } },
      ],
    },
  })
  console.log(`  🧹 Removed ${deleted.count} prior ticket(s)`)
}

// ── Ticket builders ─────────────────────────────────────────────────────────

type MessageSpec = {
  sender: 'buyer' | 'creator'
  body: string
  at: Date
  systemKind?: 'OPENED' | 'CLOSED' | 'AUTO_CLOSED' | 'REOPENED' | 'BLOCKED'
  reported?: boolean
}

type TicketSpec = {
  label: string
  buyer: UserRow
  creator: UserRow
  kind: 'GENERAL' | 'COMMISSION' | 'QUOTE' | 'ORDER'
  subject: string
  openedAutoSource: 'REQUEST' | 'QUOTE' | 'ORDER' | null
  status: 'OPEN' | 'CLOSED'
  closedAt?: Date
  closeReason?: 'CREATOR_CLOSED' | 'AUTO_INACTIVITY' | 'ADMIN'
  orderId?: string
  messages: MessageSpec[]
  readBy: Array<'buyer' | 'creator'> // who has read up to latest
}

async function createTicket(spec: TicketSpec) {
  const openEvent = spec.messages[0]
  const lastMsg = spec.messages[spec.messages.length - 1]

  let lastBuyerMessageAt: Date | null = null
  let lastCreatorMessageAt: Date | null = null
  for (const m of spec.messages) {
    if (m.sender === 'buyer') lastBuyerMessageAt = m.at
    else lastCreatorMessageAt = m.at
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject: spec.subject.slice(0, 140),
      kind: spec.kind,
      status: spec.status,
      buyerId: spec.buyer.id,
      creatorId: spec.creator.id,
      openedById: openEvent.sender === 'buyer' ? spec.buyer.id : spec.creator.id,
      openedAutoSource: spec.openedAutoSource,
      orderId: spec.orderId ?? null,
      lastBuyerMessageAt,
      lastCreatorMessageAt,
      lastMessageAt: lastMsg.at,
      closedAt: spec.closedAt ?? null,
      closedById: spec.closedAt ? spec.creator.id : null,
      closeReason: spec.closeReason ?? null,
      purgeAt: spec.closedAt
        ? new Date(spec.closedAt.getTime() + 90 * 24 * 60 * 60 * 1000)
        : null,
      createdAt: openEvent.at,
      updatedAt: lastMsg.at,
    },
  })

  for (const m of spec.messages) {
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: m.sender === 'buyer' ? spec.buyer.id : spec.creator.id,
        body: m.body.slice(0, 5000),
        systemKind: m.systemKind ?? null,
        reportedAt: m.reported ? m.at : null,
        reportedById: m.reported
          ? (m.sender === 'buyer' ? spec.creator.id : spec.buyer.id)
          : null,
        createdAt: m.at,
      },
    })
  }

  // Read markers — mark each listed side as having read up to the last message.
  for (const side of spec.readBy) {
    await prisma.ticketReadMarker.create({
      data: {
        ticketId: ticket.id,
        userId: side === 'buyer' ? spec.buyer.id : spec.creator.id,
        lastReadAt: lastMsg.at,
      },
    })
  }

  console.log(`  ✅ ${spec.label} — ${spec.kind}/${spec.status} (${spec.messages.length} msgs)`)
  return ticket
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Tickets seed starting…')
  console.log(`    Target DB: ${dbUrl?.replace(/:[^:@/]+@/, ':***@')}`)

  const [creators, buyers] = await Promise.all([
    loadUsersByRole('CREATOR', 8),
    loadUsersByRole('BUYER', 8),
  ])

  if (creators.length < 3 || buyers.length < 3) {
    console.error(
      `❌ Not enough seeded users: found ${creators.length} creator(s), ${buyers.length} buyer(s). Run the main seed first.`,
    )
    process.exit(1)
  }

  console.log(
    `  Using ${creators.length} creator(s): ${creators.map((u) => u.email).join(', ')}`,
  )
  console.log(`  Using ${buyers.length} buyer(s): ${buyers.map((u) => u.email).join(', ')}`)

  await cleanupTickets(
    buyers.map((u) => u.id),
    creators.map((u) => u.id),
  )

  // Deterministic pick helpers — wrap around if the pool is smaller than the
  // distinct roles the fixtures call for.
  const c = (i: number): UserRow => creators[i % creators.length]
  const b = (i: number): UserRow => buyers[i % buyers.length]

  // Grab a few existing seeded orders so some ORDER tickets actually link.
  const sampleOrders = await prisma.order.findMany({
    where: {
      status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] },
      buyerId: { in: buyers.map((u) => u.id) },
      creatorId: { in: creators.map((u) => u.id) },
      ticket: null, // don't clash with whatever lived there before
    },
    select: { id: true, buyerId: true, creatorId: true, createdAt: true },
    take: 4,
  })

  console.log(`\n📦 Seeding tickets…`)

  // 1. GENERAL — fresh unread-for-creator, buyer's first outreach.
  await createTicket({
    label: 'GEN-1 Buyer asks about custom lineart',
    buyer: b(0),
    creator: c(0),
    kind: 'GENERAL',
    subject: 'Do you take lineart-only commissions?',
    openedAutoSource: null,
    status: 'OPEN',
    messages: [
      {
        sender: 'buyer',
        body: 'Ticket opened.',
        systemKind: 'OPENED',
        at: hoursAgo(3),
      },
      {
        sender: 'buyer',
        body:
          'Hi! Love your neon style. I\'m after lineart-only for an OC ref sheet — two poses, no colour. Do you take that kind of job and roughly what\'s the budget?',
        at: hoursAgo(3),
      },
    ],
    readBy: ['buyer'], // creator hasn't opened it → unread badge on their side
  })

  // 2. GENERAL — creator replied last; buyer hasn't read yet.
  await createTicket({
    label: 'GEN-2 Creator replied about shipping',
    buyer: b(1),
    creator: c(1),
    kind: 'GENERAL',
    subject: 'International shipping to Japan?',
    openedAutoSource: null,
    status: 'OPEN',
    messages: [
      {
        sender: 'buyer',
        body: 'Ticket opened.',
        systemKind: 'OPENED',
        at: daysAgo(2),
      },
      {
        sender: 'buyer',
        body:
          'Hello, do you ship to Japan? Just the cosplay armour pauldron piece, not a full set. Would prefer tracked.',
        at: daysAgo(2),
      },
      {
        sender: 'creator',
        body:
          'Yes! Tracked to Japan is MYR 85 via Pos Laju. Roughly 10–14 days. I can quote once you tell me which pauldron design you\'re after.',
        at: hoursAgo(6),
      },
    ],
    readBy: ['creator'], // buyer hasn't read yet
  })

  // 3. GENERAL — back-and-forth, both caught up.
  await createTicket({
    label: 'GEN-3 Sticker pack question, both caught up',
    buyer: b(2),
    creator: c(2),
    kind: 'GENERAL',
    subject: 'Holographic finish available on the oni pack?',
    openedAutoSource: null,
    status: 'OPEN',
    messages: [
      { sender: 'buyer', body: 'Ticket opened.', systemKind: 'OPENED', at: daysAgo(5) },
      {
        sender: 'buyer',
        body: 'Hey! Is the oni sticker pack available with a holographic finish? Happy to pay the upgrade.',
        at: daysAgo(5),
      },
      {
        sender: 'creator',
        body: 'Yes — holo adds MYR 6 to the pack. I can list a custom variant for you if you want to check out tonight.',
        at: daysAgo(5),
      },
      {
        sender: 'buyer',
        body: 'Perfect, please do. I\'ll grab it after dinner.',
        at: daysAgo(4),
      },
      {
        sender: 'creator',
        body: 'Listed under your username. Let me know once you\'ve ordered and I\'ll ship tomorrow.',
        at: daysAgo(4),
      },
    ],
    readBy: ['buyer', 'creator'],
  })

  // 4. GENERAL — reported message (abuse flag visible in moderation views).
  await createTicket({
    label: 'GEN-4 Buyer reported a rude reply',
    buyer: b(3),
    creator: c(3),
    kind: 'GENERAL',
    subject: 'Any chance of a discount on the ink wash set?',
    openedAutoSource: null,
    status: 'OPEN',
    messages: [
      { sender: 'buyer', body: 'Ticket opened.', systemKind: 'OPENED', at: daysAgo(1) },
      {
        sender: 'buyer',
        body: 'Hi, I\'ve bought from you before — any chance of a small loyalty discount on the ink wash set?',
        at: daysAgo(1),
      },
      {
        sender: 'creator',
        body: 'Lol no. Pay full price like everyone else or don\'t bother me.',
        at: hoursAgo(18),
        reported: true,
      },
    ],
    readBy: ['buyer', 'creator'],
  })

  // 5. GENERAL — closed within the 90-day retention window.
  await createTicket({
    label: 'GEN-5 Resolved & closed, within retention',
    buyer: b(4),
    creator: c(4),
    kind: 'GENERAL',
    subject: 'Price for the full kimono commission?',
    openedAutoSource: null,
    status: 'CLOSED',
    closedAt: daysAgo(14),
    closeReason: 'CREATOR_CLOSED',
    messages: [
      { sender: 'buyer', body: 'Ticket opened.', systemKind: 'OPENED', at: daysAgo(30) },
      {
        sender: 'buyer',
        body: 'Hi, what\'s the ballpark for a full kimono commission with obi?',
        at: daysAgo(30),
      },
      {
        sender: 'creator',
        body:
          'Depends on fabric — synthetic MYR 900–1200, silk MYR 1800+. Full set with obi adds roughly MYR 300. I can send a proper quote once you tell me which route you\'re after.',
        at: daysAgo(29),
      },
      {
        sender: 'buyer',
        body: 'Thanks! I think I\'ll save up a bit longer. I\'ll come back in a few months.',
        at: daysAgo(15),
      },
      {
        sender: 'creator',
        body: 'Sounds good. Closing this for now — open a new one anytime.',
        at: daysAgo(14),
      },
      { sender: 'creator', body: 'Ticket closed by creator.', systemKind: 'CLOSED', at: daysAgo(14) },
    ],
    readBy: ['buyer', 'creator'],
  })

  // 6–9. ORDER tickets linked to real orders from the main seed (up to 4).
  for (let i = 0; i < sampleOrders.length; i++) {
    const o = sampleOrders[i]
    const creatorRow = creators.find((u) => u.id === o.creatorId)
    const buyerRow = buyers.find((u) => u.id === o.buyerId)
    if (!creatorRow || !buyerRow) continue

    const openedAt = o.createdAt
    const scenarios = [
      {
        label: `ORD-${i + 1} Buyer waiting for tracking`,
        messages: [
          { sender: 'creator' as const, body: 'Ticket opened for this order.', systemKind: 'OPENED' as const, at: openedAt },
          {
            sender: 'buyer' as const,
            body: 'Hi! Just checking in — any update on tracking? Thanks for the quick turnaround so far.',
            at: hoursAgo(10),
          },
        ],
        readBy: ['buyer' as const],
      },
      {
        label: `ORD-${i + 1} Creator confirming address`,
        messages: [
          { sender: 'creator' as const, body: 'Ticket opened for this order.', systemKind: 'OPENED' as const, at: openedAt },
          {
            sender: 'creator' as const,
            body: 'Thanks for the order! Can you confirm the address is still correct? I\'ll post it out this afternoon.',
            at: hoursAgo(30),
          },
          {
            sender: 'buyer' as const,
            body: 'Confirmed — same address as listed. Appreciate you checking.',
            at: hoursAgo(28),
          },
        ],
        readBy: ['buyer' as const, 'creator' as const],
      },
      {
        label: `ORD-${i + 1} Packed & shipped handoff`,
        messages: [
          { sender: 'creator' as const, body: 'Ticket opened for this order.', systemKind: 'OPENED' as const, at: openedAt },
          {
            sender: 'creator' as const,
            body: 'Packed and dropped at Pos Laju this morning — tracking is uploaded to your order page. Let me know when it lands!',
            at: hoursAgo(48),
          },
          { sender: 'buyer' as const, body: 'Arrived safe, looks gorgeous. Thank you!', at: hoursAgo(6) },
        ],
        readBy: ['buyer' as const, 'creator' as const],
      },
      {
        label: `ORD-${i + 1} Creator closed after delivery`,
        messages: [
          { sender: 'creator' as const, body: 'Ticket opened for this order.', systemKind: 'OPENED' as const, at: openedAt },
          {
            sender: 'buyer' as const,
            body: 'Hey, received this today — packaging was great, but one corner of the print has a small crease. Not a dealbreaker, just noting.',
            at: daysAgo(5),
          },
          {
            sender: 'creator' as const,
            body: 'Really sorry about that — I\'ll send a replacement print with your next order free. Marking this ticket resolved.',
            at: daysAgo(4),
          },
          { sender: 'creator' as const, body: 'Ticket closed by creator.', systemKind: 'CLOSED' as const, at: daysAgo(4) },
        ],
        readBy: ['buyer' as const, 'creator' as const],
      },
    ]

    const sc = scenarios[i]
    const isClosed = sc.label.includes('closed')
    await createTicket({
      label: sc.label,
      buyer: buyerRow,
      creator: creatorRow,
      kind: 'ORDER',
      subject: `Order ${o.id.slice(-8).toUpperCase()}`,
      openedAutoSource: 'ORDER',
      status: isClosed ? 'CLOSED' : 'OPEN',
      closedAt: isClosed ? daysAgo(4) : undefined,
      closeReason: isClosed ? 'CREATOR_CLOSED' : undefined,
      orderId: o.id,
      messages: sc.messages,
      readBy: sc.readBy,
    })
  }

  if (sampleOrders.length === 0) {
    console.log('  ⚠️  No eligible seeded orders found — skipped ORDER tickets')
  }

  // 10. Long idle GENERAL (23 days since last activity — approaching 30d auto-close).
  await createTicket({
    label: 'GEN-IDLE Long idle, approaching auto-close',
    buyer: b(5 % buyers.length),
    creator: c(5 % creators.length),
    kind: 'GENERAL',
    subject: 'Thinking about a chibi pair commission',
    openedAutoSource: null,
    status: 'OPEN',
    messages: [
      { sender: 'buyer', body: 'Ticket opened.', systemKind: 'OPENED', at: daysAgo(25) },
      {
        sender: 'buyer',
        body: 'Hi! Just thinking ahead — rough pricing for a chibi pair portrait (me + my partner)?',
        at: daysAgo(25),
      },
      {
        sender: 'creator',
        body: 'Chibi pair is MYR 180 flat with 2 revisions, ~2 weeks turnaround. Let me know if you\'d like me to open a formal quote!',
        at: daysAgo(24),
      },
      // No follow-up — idle on both sides.
    ],
    readBy: ['buyer', 'creator'],
  })

  const [totalTickets, totalMessages] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticketMessage.count(),
  ])

  console.log('\n🎉 Tickets seed complete!')
  console.log(`   Tickets:         ${totalTickets}`)
  console.log(`   Ticket messages: ${totalMessages}`)
  console.log('\nTicket parties in seed:')
  console.log(`   Creator for GEN-1: ${creators[0].email}`)
  console.log(`   Buyer   for GEN-1: ${buyers[0].email}`)
  console.log('(use the password you set in your main seed to log in)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
