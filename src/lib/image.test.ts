import { describe, expect, it } from 'vitest'
import { fitWithin, flatten, hasAlpha } from './image'
import { rgba } from './testing'

describe('flatten', () => {
  it('puts the image over white, opaque', () => {
    const pixels: [number, number, number, number][] = [
      [0, 0, 0, 0],
      [200, 100, 0, 255],
      [0, 0, 0, 128],
    ]
    const image = rgba(3, 1, (x) => pixels[x])
    const out = flatten(image)
    expect(Array.from(out.data)).toEqual([255, 255, 255, 255, 200, 100, 0, 255, 127, 127, 127, 255])
    expect(hasAlpha(out)).toBe(false)
    // The original is left alone.
    expect(image.data[3]).toBe(0)
  })
})

describe('fitWithin', () => {
  it('scales down to fit inside the box, keeping the shape', () => {
    expect(fitWithin(4000, 3000, 1920, 1920)).toEqual({ width: 1920, height: 1440 })
    expect(fitWithin(3000, 4000, 1920, 1920)).toEqual({ width: 1440, height: 1920 })
    expect(fitWithin(4000, 3000, 1000, 500)).toEqual({ width: 667, height: 500 })
  })

  it('never scales up, and never to nothing', () => {
    expect(fitWithin(800, 600, 1920, 1920)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(10_000, 2, 100, 100)).toEqual({ width: 100, height: 1 })
  })
})
