/** Single source of truth for DB enum → user-facing display labels */

export const CATEGORY_LABELS: Record<string, string> = {
  DIGITAL_ART: 'Digital Art',
  DOUJIN: 'Doujin',
  COSPLAY_PRINT: 'Cosplay Prints',
  PHYSICAL_MERCH: 'Physical Merch',
  STICKERS: 'Stickers',
  OTHER: 'Other',
  // legacy
  PRINT: 'Print',
  DIGITAL: 'Digital',
  COMMISSION: 'Commission',
}

export const TYPE_LABELS: Record<string, string> = {
  DIGITAL: 'Digital',
  PHYSICAL: 'Physical',
  POD: 'Print on Demand',
}

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
}

export const ESCROW_LABELS: Record<string, string> = {
  PENDING: 'Not yet paid',
  HELD: 'Payment protected',
  TRACKING_ADDED: 'Shipped — awaiting delivery',
  RELEASED: 'Payment released',
  DISPUTED: 'Under review',
  PARTIALLY_REFUNDED: 'Partially refunded',
  REFUNDED: 'Refunded',
}

export const ROLE_LABELS: Record<string, string> = {
  BUYER: 'Buyer',
  CREATOR: 'Creator',
  ADMIN: 'Admin',
}

export const COMMISSION_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  CLOSED: 'Closed',
  LIMITED: 'Limited slots',
}
