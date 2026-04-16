export const COURIERS = [
  { code: 'POSLAJU',  name: 'Pos Malaysia / PosLaju' },
  { code: 'JNT',      name: 'J&T Express' },
  { code: 'DHL',      name: 'DHL Express' },
  { code: 'FEDEX',    name: 'FedEx' },
  { code: 'NINJAVAN', name: 'Ninja Van' },
  { code: 'LALAMOVE', name: 'Lalamove' },
  { code: 'GDEX',     name: 'GDex' },
  { code: 'CITYLINK', name: 'City-Link Express' },
  { code: 'PRINTIFY', name: 'Printify Tracking' },
  { code: 'OTHER',    name: 'Other' },
] as const

export type CourierCode = typeof COURIERS[number]['code']

const TRACKING_PATTERNS: Record<string, string | null> = {
  POSLAJU:  'https://www.poslaju.com.my/track-trace/?trackingNo={tracking}',
  JNT:      'https://www.jtexpress.my/trajectoryQuery?billCode={tracking}',
  DHL:      'https://www.dhl.com/my-en/home/tracking.html?tracking-id={tracking}',
  FEDEX:    'https://www.fedex.com/en-my/tracking.html?tracknumbers={tracking}',
  NINJAVAN: 'https://www.ninjavan.co/en-my/tracking?id={tracking}',
  LALAMOVE: null,
  GDEX:     'https://www.gdex.com.my/tracking/{tracking}',
  CITYLINK: 'https://www.citylinkexpress.com/shipment-tracking/?trackingNo={tracking}',
  PRINTIFY: 'https://printify.com/app/orders',
  OTHER:    null,
}

export function getTrackingUrl(courierCode: string, trackingNumber: string): string | null {
  const pattern = TRACKING_PATTERNS[courierCode]
  if (!pattern) return null
  return pattern.replace('{tracking}', encodeURIComponent(trackingNumber))
}

export function getCourierName(code: string): string {
  return COURIERS.find(c => c.code === code)?.name ?? code
}
