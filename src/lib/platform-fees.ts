import { prisma } from '@/lib/prisma'

const DEFAULT_FEE_PERCENT = 2.5

export async function getProcessingFeePercent(): Promise<number> {
  const settings = await prisma.platformSettings.findFirst({ select: { processingFeePercent: true } })
  return settings?.processingFeePercent ?? DEFAULT_FEE_PERCENT
}

export async function getProcessingFeeRate(): Promise<number> {
  return (await getProcessingFeePercent()) / 100
}

export function feeOnSubtotal(subtotalCents: number, rate: number): number {
  return Math.round(subtotalCents * rate)
}

export function feeFromGross(grossCents: number, rate: number): number {
  return Math.round((grossCents * rate) / (1 + rate))
}

export function getDefaultFeeRate(): number {
  return DEFAULT_FEE_PERCENT / 100
}
