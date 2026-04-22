/**
 * Lightweight magic-byte sniffer for upload validation.
 *
 * The full `file-type` npm package is not a dependency here — we keep this to
 * the formats we actually accept for uploads. If the project later adds
 * `file-type`, prefer it over these signatures.
 *
 * TODO(security): consider adding `file-type` to dependencies for broader
 * coverage and to catch container formats (docx/xlsx zips, MP4 ftyp brand
 * mismatches, etc).
 */

export type SniffedType =
  | 'pdf'
  | 'png'
  | 'jpg'
  | 'gif'
  | 'webp'
  | 'zip'
  | 'rar'
  | '7z'
  | 'gz'
  | 'tar'
  | 'mp3'
  | 'wav'
  | 'flac'
  | 'mp4'
  | 'mov'
  | 'psd'
  | 'epub'

function startsWith(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false
  for (let i = 0; i < bytes.length; i++) {
    if (buf[offset + i] !== bytes[i]) return false
  }
  return true
}

function asciiAt(buf: Buffer, offset: number, str: string): boolean {
  if (buf.length < offset + str.length) return false
  for (let i = 0; i < str.length; i++) {
    if (buf[offset + i] !== str.charCodeAt(i)) return false
  }
  return true
}

/** Return the sniffed type, or null if we don't recognise the bytes. */
export function sniffMagic(buf: Buffer): SniffedType | null {
  if (buf.length < 4) return null

  // PDF
  if (asciiAt(buf, 0, '%PDF')) return 'pdf'

  // PNG — 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'

  // JPEG — FF D8 FF
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'jpg'

  // GIF
  if (asciiAt(buf, 0, 'GIF87a') || asciiAt(buf, 0, 'GIF89a')) return 'gif'

  // WebP — 'RIFF' ... 'WEBP'
  if (asciiAt(buf, 0, 'RIFF') && asciiAt(buf, 8, 'WEBP')) return 'webp'

  // ZIP — PK\x03\x04 (plain zip, or EPUB, or docx, xlsx …)
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04]) || startsWith(buf, [0x50, 0x4b, 0x05, 0x06])) {
    // EPUB: "mimetype" at 30 with value application/epub+zip
    if (asciiAt(buf, 30, 'mimetypeapplication/epub+zip')) return 'epub'
    return 'zip'
  }

  // RAR 5 — 52 61 72 21 1A 07 01 00
  if (startsWith(buf, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07])) return 'rar'

  // 7z — 37 7A BC AF 27 1C
  if (startsWith(buf, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return '7z'

  // gzip — 1F 8B
  if (startsWith(buf, [0x1f, 0x8b])) return 'gz'

  // tar — ustar at offset 257
  if (buf.length > 265 && asciiAt(buf, 257, 'ustar')) return 'tar'

  // MP3 — 'ID3' tag OR FF Fx (MPEG frame sync)
  if (asciiAt(buf, 0, 'ID3')) return 'mp3'
  if (buf.length >= 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return 'mp3'

  // WAV — RIFF ... WAVE
  if (asciiAt(buf, 0, 'RIFF') && asciiAt(buf, 8, 'WAVE')) return 'wav'

  // FLAC — 'fLaC'
  if (asciiAt(buf, 0, 'fLaC')) return 'flac'

  // MP4 / MOV — ....ftyp at offset 4
  if (asciiAt(buf, 4, 'ftyp')) {
    // QuickTime brands
    if (asciiAt(buf, 8, 'qt  ')) return 'mov'
    return 'mp4'
  }

  // PSD — '8BPS'
  if (asciiAt(buf, 0, '8BPS')) return 'psd'

  return null
}

/** Thin sniff: first 4KB is plenty for all signatures above. */
export function sniffFirstBytes(buf: Buffer): SniffedType | null {
  return sniffMagic(buf.subarray(0, Math.min(buf.length, 4096)))
}
