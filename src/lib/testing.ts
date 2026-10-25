/** Test doubles: pixels made to order, and codecs that record their calls. */
import type { Codecs, Encoding } from './engine'
import type { Rgba } from './image'
import type { Format } from './settings'

export function rgba(
  width: number,
  height: number,
  f: (x: number, y: number) => [number, number, number, number],
): Rgba {
  const data = new Uint8ClampedArray(4 * width * height)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(f(x, y), 4 * (y * width + x))
  return { width, height, data }
}

/** Busy, opaque. */
export const photo = (width: number, height: number) =>
  rgba(width, height, (x, y) => [(x * 3 + y) & 255, (y * 5) & 255, ((x ^ y) * 7) & 255, 255])

/** Decodes to `image`; resizes to the size asked, filled with grey; encodes
 * to a minimal file of the right format whose size grows with quality. */
export class FakeCodecs implements Codecs {
  decodes: { srgb: boolean }[] = []
  resizes: [number, number][] = []
  encodes: { image: Rgba; format: Format; encoding: Encoding }[] = []
  previews = 0

  constructor(
    private image: Rgba,
    private upright = false,
  ) {}

  async decode(_bytes: Uint8Array, _type: string, srgb: boolean) {
    this.decodes.push({ srgb })
    return { image: this.image, upright: this.upright }
  }

  async resize(_image: Rgba, width: number, height: number) {
    this.resizes.push([width, height])
    return rgba(width, height, () => [128, 128, 128, 255])
  }

  async encode(image: Rgba, format: Format, encoding: Encoding) {
    this.encodes.push({ image, format, encoding })
    return minimal(format, 100 + encoding.quality * 10)
  }

  async preview() {
    this.previews++
    return new ArrayBuffer(7)
  }
}

/** A file `sniff` and the metadata writers recognise, padded to `size`. */
export function minimal(format: Format, size: number): ArrayBuffer {
  const out = new Uint8Array(size)
  const v = new DataView(out.buffer)
  const ascii = (at: number, s: string) =>
    out.set(
      Array.from(s, (c) => c.charCodeAt(0)),
      at,
    )
  if (format === 'jpeg') out.set([0xff, 0xd8, 0xff, 0xda, 0, 2])
  else if (format === 'png') {
    // Signature, IHDR (13 zero bytes, CRC), IEND; the rest is padding.
    out.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    v.setUint32(8, 13)
    ascii(12, 'IHDR')
    ascii(37, 'IEND')
  } else if (format === 'webp') {
    ascii(0, 'RIFF')
    v.setUint32(4, size - 8, true)
    ascii(8, 'WEBPVP8L')
    v.setUint32(16, size - 20, true)
  } else if (format === 'avif') ascii(4, 'ftypavif')
  else out.set([0xff, 0x0a])
  return out.buffer
}
