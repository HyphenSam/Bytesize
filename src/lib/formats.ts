import type { Format, FormatChoice } from './settings'

export type Kind = 'png' | 'jpeg' | 'webp' | 'avif' | 'jxl' | 'gif' | 'bmp'

/** What a file is, by its first bytes rather than its name. */
export function sniff(b: Uint8Array): Kind | null {
  const is = (at: number, bytes: number[]) => bytes.every((v, i) => b[at + i] === v)
  const text = (at: number, s: string) =>
    is(
      at,
      Array.from(s, (c) => c.charCodeAt(0)),
    )
  if (is(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (is(0, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (text(0, 'RIFF') && text(8, 'WEBP')) return 'webp'
  // An ISO BMFF file whose major brand is AVIF (a still image or a sequence).
  if (text(4, 'ftyp') && (text(8, 'avif') || text(8, 'avis'))) return 'avif'
  // A bare codestream, or one in its container.
  if (is(0, [0xff, 0x0a]) || is(0, [0, 0, 0, 0x0c, 0x4a, 0x58, 0x4c, 0x20, 0x0d, 0x0a, 0x87, 0x0a])) return 'jxl'
  if (text(0, 'GIF8')) return 'gif'
  if (text(0, 'BM')) return 'bmp'
  return null
}

/** Formats with exact WebAssembly decoders; others go through the browser. */
export const EXACT: Kind[] = ['png', 'jpeg', 'webp', 'jxl']

/** The format a result is written in. GIF and BMP (and anything the browser
 * decodes that has no encoder here) become PNG, which loses nothing. */
export function outputFormat(choice: FormatChoice, kind: Kind | null): Format {
  if (choice !== 'original') return choice
  return kind === 'jpeg' || kind === 'webp' || kind === 'avif' || kind === 'jxl' ? kind : 'png'
}

/** A WebP whose image is lossless (VP8L), alone or after VP8X and its chunks. */
export function isLosslessWebp(b: Uint8Array): boolean {
  if (sniff(b) !== 'webp') return false
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  let at = 12
  while (at + 8 <= b.length) {
    const fourcc = String.fromCharCode(...b.subarray(at, at + 4))
    if (fourcc === 'VP8L') return true
    if (fourcc === 'VP8 ' || fourcc === 'ANMF') return false
    const size = v.getUint32(at + 4, true)
    at += 8 + size + (size % 2)
  }
  return false
}

export const MIME: Record<Format, string> = {
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  jxl: 'image/jxl',
  png: 'image/png',
}

export const FORMAT_NAMES: Record<Format, string> = {
  jpeg: 'JPEG',
  webp: 'WebP',
  avif: 'AVIF',
  jxl: 'JPEG XL',
  png: 'PNG',
}

const EXTENSIONS = /\.(png|jpe?g|jfif|webp|avif|jxl|gif|bmp)$/i

/** Raster images the app can open. SVG isn't one: it has no pixels to compress. */
export function isImageFile(name: string, type: string): boolean {
  if (type === 'image/svg+xml') return false
  return type.startsWith('image/') || EXTENSIONS.test(name)
}
