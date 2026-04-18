export const CATEGORY_META: Record<string, {
  slug: string
  name: string
  h1: string
  description: string
  longDescription: string
  keywords: string[]
  ogImage: string
  icon: string
  color: string
  changefreq: string
  priority: string
}> = {
  DIGITAL_ART: {
    slug: 'digital-art',
    name: 'Digital Art',
    h1: 'Digital Art from SEA Creators',
    description:
      'Browse original digital artwork from Southeast Asian cosplay and anime artists. Wallpapers, illustrations, character art and fan art available for instant download.',
    longDescription:
      'Discover thousands of original digital artworks from talented Malaysian, Singaporean, Filipino and Indonesian creators. From anime fan art to original character illustrations, cosplay-inspired wallpapers to detailed character sheets — all available as instant digital downloads.',
    keywords: [
      'digital art', 'anime art', 'cosplay illustration', 'fan art', 'SEA artist',
      'digital download', 'wallpaper', 'character art', 'Malaysia artist', 'Philippines artist',
    ],
    ogImage: '/images/categories/digital-art.jpg',
    icon: '🎨',
    color: '#7c3aed',
    changefreq: 'daily',
    priority: '0.8',
  },
  DOUJIN: {
    slug: 'doujin',
    name: 'Doujin',
    h1: 'Doujin from SEA Independent Creators',
    description:
      'Original and fan-made doujin from SEA creators. Comics, zines, artbooks and self-published works shipped directly from creators across Malaysia and Singapore.',
    longDescription:
      'Shop self-published doujin from Malaysian and Singaporean indie creators. Find original comics, fan zines, artbooks, and limited print runs. Every purchase supports independent Southeast Asian creators directly.',
    keywords: [
      'doujin', 'manga', 'comic', 'zine', 'artbook', 'self-published',
      'Malaysia doujin', 'Singapore doujin', 'fan comic', 'indie comic',
    ],
    ogImage: '/images/categories/doujin.jpg',
    icon: '📖',
    color: '#ec4899',
    changefreq: 'daily',
    priority: '0.8',
  },
  COSPLAY_PRINT: {
    slug: 'cosplay-print',
    name: 'Cosplay Prints',
    h1: 'Cosplay Prints from SEA Cosplayers',
    description:
      'Professional cosplay photography prints and digital downloads from SEA cosplayers. Convention photos, character portraits and cosplay art prints.',
    longDescription:
      'Get professional cosplay prints from Malaysia\'s top cosplayers. Convention photos from NoizuCon, NoizuCon, and WCS Malaysia. Character portraits, full-body shoots, and group photos available as prints or digital downloads.',
    keywords: [
      'cosplay print', 'cosplay photo', 'convention photo', 'cosplay art', 'SEA cosplay',
      'Malaysia cosplay', 'NoizuCon', 'NoizuCon', 'WCS Malaysia',
    ],
    ogImage: '/images/categories/cosplay-print.jpg',
    icon: '📸',
    color: '#00d4aa',
    changefreq: 'daily',
    priority: '0.8',
  },
  PHYSICAL_MERCH: {
    slug: 'physical-merch',
    name: 'Physical Merch',
    h1: 'Physical Merch from Independent SEA Creators',
    description:
      'Physical merchandise from independent SEA creators. Apparel, accessories, collectibles and custom goods shipped directly from creators across Southeast Asia.',
    longDescription:
      'Shop indie merch directly from creators in Malaysia, Singapore, the Philippines, and Indonesia. From custom apparel and pins to collectibles and accessories — all made with care and shipped direct.',
    keywords: [
      'physical merch', 'merchandise', 'indie merch', 'creator goods', 'custom apparel',
      'SEA merch', 'anime merch', 'cosplay merch',
    ],
    ogImage: '/images/categories/physical-merch.jpg',
    icon: '📦',
    color: '#f59e0b',
    changefreq: 'daily',
    priority: '0.8',
  },
  STICKERS: {
    slug: 'stickers',
    name: 'Stickers',
    h1: 'Anime & Cosplay Stickers from SEA Artists',
    description:
      'Anime, cosplay and pop culture sticker sheets from SEA independent artists. Die-cut stickers, sticker packs and custom designs.',
    longDescription:
      'Find kawaii anime stickers, cosplay character die-cuts, and pop culture sticker sheets from independent Southeast Asian artists. Perfect for laptops, water bottles, planners, and more.',
    keywords: [
      'sticker', 'anime sticker', 'kawaii sticker', 'die cut sticker', 'sticker sheet',
      'pop culture sticker', 'cosplay sticker', 'Malaysia sticker artist',
    ],
    ogImage: '/images/categories/stickers.jpg',
    icon: '🏷️',
    color: '#22c55e',
    changefreq: 'daily',
    priority: '0.7',
  },
  OTHER: {
    slug: 'other',
    name: 'Other',
    h1: 'Unique Creator Goods on noizu.direct',
    description:
      'Discover unique and miscellaneous creator goods from the noizu.direct community of SEA artists and creators.',
    longDescription:
      'Explore one-of-a-kind creator goods that don\'t fit a single category. Handmade items, unique collaborations, and special releases from SEA creators.',
    keywords: ['creator goods', 'indie creator', 'SEA marketplace', 'unique art', 'handmade'],
    ogImage: '/images/categories/other.jpg',
    icon: '✨',
    color: '#8888aa',
    changefreq: 'weekly',
    priority: '0.6',
  },
}

/** Map DB category keys to CATEGORY_META keys */
export const CATEGORY_KEY_MAP: Record<string, string> = {
  'digital-art': 'DIGITAL_ART',
  'doujin': 'DOUJIN',
  'cosplay-print': 'COSPLAY_PRINT',
  'physical-merch': 'PHYSICAL_MERCH',
  'stickers': 'STICKERS',
  'other': 'OTHER',
  // DB values (uppercase)
  'DIGITAL_ART': 'DIGITAL_ART',
  'DOUJIN': 'DOUJIN',
  'COSPLAY_PRINT': 'COSPLAY_PRINT',
  'PHYSICAL_MERCH': 'PHYSICAL_MERCH',
  'STICKERS': 'STICKERS',
  'OTHER': 'OTHER',
}
