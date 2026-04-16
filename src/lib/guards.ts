/**
 * Shared route guards for API handlers.
 * All functions return the relevant data on success, or null on auth failure.
 * Usage: const session = await requireAdmin(); if (!session) return unauthorized()
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ─── Response helpers ────────────────────────────────────────────────────────

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 })
}

// ─── Auth guards ─────────────────────────────────────────────────────────────

/** Any authenticated session. */
export async function requireAuth() {
  const session = await auth()
  if (!session) return null
  return session
}

/** Session where role === 'ADMIN'. */
export async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') return null
  return session
}

/** Session where role === 'CREATOR'. */
export async function requireCreator() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'CREATOR') return null
  return session
}

/**
 * Creator session + resolved CreatorProfile.
 * Returns null if unauthenticated, wrong role, or no profile exists.
 */
export async function requireCreatorProfile() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'CREATOR') return null
  const userId = (session.user as any).id as string
  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) return null
  return { session, userId, profile }
}

// ─── Ownership helpers ────────────────────────────────────────────────────────

/**
 * Verify that a product belongs to the given user (via their CreatorProfile).
 * Returns the product (with creator relation) or null.
 */
export async function verifyProductOwnership(productId: string, userId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { creator: true },
  })
  if (!product) return null
  if (product.creator.userId !== userId) return null
  return product
}

/**
 * Generic ownership check for creator-owned resources (support tiers, goals, videos, etc.).
 * Looks up the creator profile for userId, then calls fetcher(creatorId).
 * Returns the resource or null if profile not found or fetcher returns null.
 *
 * @example
 * const tier = await getOwnedByCreator(userId, (creatorId) =>
 *   prisma.supportTier.findFirst({ where: { id, creatorId } })
 * )
 */
export async function getOwnedByCreator<T>(
  userId: string,
  fetcher: (creatorId: string) => Promise<T | null>,
): Promise<T | null> {
  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) return null
  return fetcher(profile.id)
}
