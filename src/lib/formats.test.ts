import { describe, expect, it } from 'vitest'
import { isImageFile, isLosslessWebp, outputFormat, sniff } from './formats'

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0))
const le32 = (v: number) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, v >>> 24]

describe('sniff', () => {
  it('recognises each format by its first bytes', () => {
    expect(sniff(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('png')
    expect(sniff(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg')
    expect(sniff(new Uint8Array([...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WEBPVP8L')]))).toBe('webp')
    expect(sniff(new Uint8Array([0, 0, 0, 0x1c, ...ascii('ftypavif')]))).toBe('avif')
    expect(sniff(new Uint8Array([0, 0, 0, 0x1c, ...ascii('ftypavis')]))).toBe('avif')
    expect(sniff(new Uint8Array([0xff, 0x0a, 1]))).toBe('jxl')
    expect(sniff(new Uint8Array([0, 0, 0, 0x0c, ...ascii('JXL '), 0x0d, 0x0a, 0x87, 0x0a]))).toBe('jxl')
    expect(sniff(new Uint8Array(ascii('GIF89a')))).toBe('gif')
    expect(sniff(new Uint8Array(ascii('BM\0\0')))).toBe('bmp')
  })

  it('is null for anything else, such as other ISO BMFF files', () => {
    expect(sniff(new Uint8Array([0, 0, 0, 0x1c, ...ascii('ftypheic')]))).toBe(null)
    expect(sniff(new Uint8Array([...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WAVE')]))).toBe(null)
    expect(sniff(new Uint8Array([]))).toBe(null)
  })
})

describe('outputFormat', () => {
  it('is the chosen format', () => {
    expect(outputFormat('avif', 'jpeg')).toBe('avif')
    expect(outputFormat('png', null)).toBe('png')
  })

  it("keeps the image's own format, or PNG for one with no encoder here", () => {
    for (const kind of ['jpeg', 'webp', 'avif', 'jxl', 'png'] as const)
      expect(outputFormat('original', kind)).toBe(kind)
    expect(outputFormat('original', 'gif')).toBe('png')
    expect(outputFormat('original', 'bmp')).toBe('png')
    expect(outputFormat('original', null)).toBe('png')
  })
})

describe('isLosslessWebp', () => {
  const chunk = (fourcc: string, data: number[]) => [
    ...ascii(fourcc),
    ...le32(data.length),
    ...data,
    ...(data.length % 2 ? [0] : []),
  ]
  const webp = (...chunks: number[][]) => {
    const body = [...ascii('WEBP'), ...chunks.flat()]
    return new Uint8Array([...ascii('RIFF'), ...le32(body.length), ...body])
  }
  const vp8x = chunk('VP8X', new Array(10).fill(0))

  it('finds VP8L, alone or after VP8X and other chunks', () => {
    expect(isLosslessWebp(webp(chunk('VP8L', [0x2f, 0, 0, 0, 0])))).toBe(true)
    expect(isLosslessWebp(webp(vp8x, chunk('ICCP', [1, 2, 3]), chunk('VP8L', [0x2f])))).toBe(true)
  })

  it('is false for lossy WebP, other formats and truncated files', () => {
    expect(isLosslessWebp(webp(chunk('VP8 ', [1, 2, 3, 4])))).toBe(false)
    expect(isLosslessWebp(webp(vp8x, chunk('ALPH', [1]), chunk('VP8 ', [1])))).toBe(false)
    expect(isLosslessWebp(new Uint8Array([0xff, 0xd8, 0xff]))).toBe(false)
    expect(isLosslessWebp(webp(vp8x).subarray(0, 24))).toBe(false)
  })
})

describe('isImageFile', () => {
  it('accepts image types, and image extensions when the type is missing', () => {
    expect(isImageFile('a.png', 'image/png')).toBe(true)
    expect(isImageFile('a.avif', '')).toBe(true)
    expect(isImageFile('a.jxl', '')).toBe(true)
    expect(isImageFile('a.JPEG', '')).toBe(true)
    expect(isImageFile('a.txt', 'text/plain')).toBe(false)
    expect(isImageFile('a.svg', 'image/svg+xml')).toBe(false)
    expect(isImageFile('a', '')).toBe(false)
  })
})
