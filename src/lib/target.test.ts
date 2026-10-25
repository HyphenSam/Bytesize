import { describe, expect, it } from 'vitest'
import { fitQuality } from './target'

/** A file of `size(quality)` bytes, recording the qualities tried. */
function encoder(size = (q: number) => q * 100) {
  const tried: number[] = []
  const encode = async (q: number) => {
    tried.push(q)
    return new ArrayBuffer(size(q))
  }
  return { tried, encode }
}

describe('fitQuality', () => {
  it('stops at the highest quality allowed when that already fits', async () => {
    const { tried, encode } = encoder()
    expect(await fitQuality(encode, 10_000, 80)).toMatchObject({ quality: 80, fits: true })
    expect(tried).toEqual([80])
  })

  it('finds the highest quality that fits, in a few tries', async () => {
    const { tried, encode } = encoder()
    const fitted = await fitQuality(encode, 4_250, 90)
    expect(fitted).toMatchObject({ quality: 42, fits: true })
    expect(fitted.bytes.byteLength).toBe(4_200)
    expect(tried.length).toBeLessThanOrEqual(8)
  })

  it('returns the smallest file it made when nothing fits', async () => {
    const { encode } = encoder((q) => 5_000 + q)
    expect(await fitQuality(encode, 1_000, 75)).toMatchObject({ quality: 1, fits: false })
  })
})
