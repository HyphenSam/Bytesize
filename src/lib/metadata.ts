/** Metadata the codecs drop, put back. ICC colour profiles: the decoders
 * return the stored values and ignore the profile, and the encoders write
 * none, so a result would show a Display P3 original's values as sRGB: washed
 * out. The original's profile is copied into the result unchanged, with no
 * colour conversion. EXIF (camera, date, location) is copied only if asked. */
import { unzlibSync, zlibSync } from 'fflate'
import { ascii, bytesOf, concat, jpegSegments, pngChunks, riffChunks, view } from './containers'
import { sniff } from './formats'
import type { Format } from './settings'

/** The embedded RGB profile of a JPEG, PNG or WebP file; null if it has none. */
export function readIcc(bytes: Uint8Array): Uint8Array | null {
  try {
    const icc = profileIn(bytes)
    // The result is always RGB; a CMYK or grey profile wouldn't describe it.
    return icc && ascii(icc, 16, 4) === 'RGB ' ? icc : null
  } catch {
    // Truncated or malformed: no profile.
    return null
  }
}

function profileIn(b: Uint8Array): Uint8Array | null {
  const format = sniff(b)
  if (format === 'jpeg') {
    // A profile over ~64 KB is split across APP2 segments, numbered from 1.
    const parts: Uint8Array[] = []
    let count = 0
    for (const { marker, data } of jpegSegments(b)) {
      if (marker !== 0xe2 || ascii(data, 0, 12) !== 'ICC_PROFILE\0') continue
      parts[data[12] - 1] = data.subarray(14)
      count = data[13]
    }
    const ordered = Array.from({ length: count }, (_, i) => parts[i])
    return count && ordered.every(Boolean) ? concat(ordered) : null
  }
  if (format === 'png') {
    for (const { type, data } of pngChunks(b)) {
      if (type !== 'iCCP') continue
      // A name of 1–79 bytes, a NUL, compression method 0, then zlib data.
      const nul = data.indexOf(0)
      return nul >= 1 && nul <= 79 && data[nul + 1] === 0 ? unzlibSync(data.subarray(nul + 2)) : null
    }
  }
  if (format === 'webp') {
    for (const { fourcc, data } of riffChunks(b)) if (fourcc === 'ICCP') return data.slice()
  }
  return null
}

export type Metadata = { icc: Uint8Array | null; exif: Uint8Array | null }

/** The formats metadata can be written into here. libavif and libjxl, as
 * built for the web, take neither. */
export const carriesMetadata = (format: Format) => format === 'jpeg' || format === 'png' || format === 'webp'

/** `encoded`, as the codecs wrote it, carrying `meta`. */
export function embedMetadata(encoded: ArrayBuffer, format: Format, meta: Metadata): ArrayBuffer {
  if (!meta.icc && !meta.exif) return encoded
  const b = new Uint8Array(encoded)
  if (format === 'jpeg') return jpegWith(b, meta).buffer
  if (format === 'png') return pngWith(b, meta).buffer
  if (format === 'webp') return webpWith(b, meta).buffer
  throw new Error(`Can't add metadata to ${format}.`)
}

/** A JPEG marker segment's payload limit (its length field counts itself). */
const SEGMENT = 65533

function jpegWith(b: Uint8Array, { icc, exif }: Metadata): Uint8Array<ArrayBuffer> {
  if (sniff(b) !== 'jpeg') throw new Error("Can't add metadata: not a JPEG.")
  const segment = (marker: number, data: Uint8Array) => {
    const head = new Uint8Array([0xff, marker, 0, 0])
    view(head).setUint16(2, data.length + 2)
    return concat([head, data])
  }
  const added: Uint8Array[] = []
  // EXIF has to fit in one segment; an oversized block is left out.
  const exifData = exif && concat([bytesOf('Exif\0\0'), exif])
  if (exifData && exifData.length <= SEGMENT) added.push(segment(0xe1, exifData))
  if (icc) {
    // Split across APP2 segments, numbered from 1.
    const size = SEGMENT - 14
    const count = Math.ceil(icc.length / size)
    if (count > 255) throw new Error("Can't add the colour profile: it's too large for JPEG.")
    for (let i = 0; i < count; i++) {
      const data = concat([
        bytesOf('ICC_PROFILE\0'),
        new Uint8Array([i + 1, count]),
        icc.subarray(i * size, (i + 1) * size),
      ])
      added.push(segment(0xe2, data))
    }
  }
  // After JFIF's APP0, which has to come first; the encoder writes no other metadata.
  let at = 2
  const [first] = jpegSegments(b)
  if (first?.marker === 0xe0) at += 4 + first.data.length
  return concat([b.subarray(0, at), ...added, b.subarray(at)])
}

function pngWith(b: Uint8Array, { icc, exif }: Metadata): Uint8Array<ArrayBuffer> {
  if (sniff(b) !== 'png') throw new Error("Can't add metadata: not a PNG.")
  const added = [
    ...(icc ? [pngChunk('iCCP', concat([bytesOf('ICC Profile\0\0'), zlibSync(icc)]))] : []),
    ...(exif ? [pngChunk('eXIf', exif)] : []),
  ]
  const parts = [b.subarray(0, 8)]
  for (const { type, raw } of pngChunks(b)) {
    // The PNG spec says not to have sRGB beside iCCP.
    if ((icc && (type === 'sRGB' || type === 'iCCP')) || (exif && type === 'eXIf')) continue
    parts.push(raw)
    // iCCP must come before PLTE and IDAT, eXIf before IDAT.
    if (type === 'IHDR') parts.push(...added)
  }
  if (parts[2] !== added[0]) throw new Error("Can't add metadata: the PNG doesn't start with IHDR.")
  return concat(parts)
}

function pngChunk(type: string, data: Uint8Array) {
  const name = bytesOf(type)
  const crc = new Uint8Array(4)
  view(crc).setUint32(0, crc32(concat([name, data])))
  const length = new Uint8Array(4)
  view(length).setUint32(0, data.length)
  return concat([length, name, data, crc])
}

const ICC_FLAG = 0x20
const ALPHA_FLAG = 0x10
const EXIF_FLAG = 0x08

/** A port of Kura's `with_icc`: libwebp writes simple lossy (`VP8 `),
 * lossless (`VP8L`) or, for lossy with alpha, extended (`VP8X`) files. The
 * extended layout is VP8X, ICCP, the image's chunks, then EXIF. */
function webpWith(b: Uint8Array, { icc, exif }: Metadata): Uint8Array<ArrayBuffer> {
  const bad = () => new Error("Can't add metadata: not a still WebP.")
  if (sniff(b) !== 'webp' || b.length < 20) throw bad()
  const kind = ascii(b, 12, 4)
  const payload = view(b.subarray(20))
  const flags = (icc ? ICC_FLAG : 0) | (exif ? EXIF_FLAG : 0)
  let head: Uint8Array
  let rest: Uint8Array
  if (kind === 'VP8X') {
    if (b.length < 30) throw bad()
    head = b.slice(12, 30)
    head[8] |= flags
    rest = b.subarray(30)
  } else if (kind === 'VP8 ' || kind === 'VP8L') {
    // Size and alpha come from the bitstream, not the image: libwebp drops
    // the alpha of an RGBA image that's fully opaque.
    let width: number, height: number, alpha: boolean
    if (kind === 'VP8 ') {
      // After the frame tag and start code: 14-bit width and height.
      width = payload.getUint16(6, true) & 0x3fff
      height = payload.getUint16(8, true) & 0x3fff
      alpha = false
    } else {
      // After the signature byte: width−1, height−1 (14 bits each), alpha.
      const bits = payload.getUint32(1, true)
      width = (bits & 0x3fff) + 1
      height = ((bits >>> 14) & 0x3fff) + 1
      alpha = ((bits >>> 28) & 1) === 1
    }
    const header = new Uint8Array(10)
    header[0] = flags | (alpha ? ALPHA_FLAG : 0)
    const u24 = (at: number, v: number) => header.set([v & 255, (v >> 8) & 255, (v >> 16) & 255], at)
    u24(4, width - 1)
    u24(7, height - 1)
    head = riffChunk('VP8X', header)
    rest = b.subarray(12)
  } else throw bad()
  const out = concat([
    bytesOf('RIFF\0\0\0\0WEBP'),
    head,
    ...(icc ? [riffChunk('ICCP', icc)] : []),
    rest,
    ...(exif ? [riffChunk('EXIF', exif)] : []),
  ])
  view(out).setUint32(4, out.length - 8, true)
  return out
}

/** A RIFF chunk, padded to an even length. */
function riffChunk(fourcc: string, data: Uint8Array): Uint8Array {
  const size = new Uint8Array(4)
  view(size).setUint32(0, data.length, true)
  return concat([bytesOf(fourcc), size, data, new Uint8Array(data.length % 2)])
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})

function crc32(b: Uint8Array): number {
  let c = 0xffffffff
  for (const byte of b) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
