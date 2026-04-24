import { prisma } from '@/lib/prisma'

export type NotificationType =
  | 'NEW_ORDER'
  | 'FULFILLMENT_REMINDER'
  | 'FULFILLMENT_WARNING'
  | 'FULFILLMENT_FINAL_WARNING'
  | 'ORDER_CANCELLED'
  | 'ESCROW_RELEASED'
  | 'TICKET_OPENED'
  | 'TICKET_REPLY'
  | 'TICKET_CLOSED'
  | 'DISPUTE_RAISED'
  | 'DISPUTE_RESOLVED'
  | 'PAYOUT_PROCESSED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_SHIPPED'
  | 'DOWNLOAD_READY'
  | 'REFUND_ISSUED'

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  orderId?: string,
  actionUrl?: string,
) {
  return prisma.notification.create({
    data: { userId, type, title, message, orderId, actionUrl },
  })
}

export async function markAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  })
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  })
}
