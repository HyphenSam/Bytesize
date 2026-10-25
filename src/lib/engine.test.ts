import { describe, expect, it } from 'vitest'
import { bytesOf, concat } from './containers'
import { compress, type JobEvent } from './engine'
import { readIcc } from './metadata'
import { readExif, readOrientation } from './orientation'
import { DEFAULT_SETTINGS, type Settings } from './settings'
import { FakeCodecs, minimal, photo, rgba } from './testing'

const be16 = (v: number) => [v >> 8, v & 255]

/** A TIFF block with an Orientation tag (6: turn a quarter clockwise). */
const TIFF = new Uint8Array([0x49, 0x49, 42, 0, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0])

/** An RGB ICC header; nothing reads the rest. */
const ICC = (() => {
  const p = new Uint8Array(200)
  p.set(bytesOf('RGB '), 16)
  return p
})()

/** A JPEG holding `icc` and `exif`, if given; the fake decoder ignores the pixels. */
function jpeg({ icc, exif }: { icc?: Uint8Array; exif?: Uint8Array } = {}) {
  const segment = (marker: number, data: Uint8Array) =>
    concat([new Uint8Array([0xff, marker, ...be16(data.length + 2)]), data])
  return concat([
    new Uint8Array([0xff, 0xd8]),
    ...(exif ? [segment(0xe1, concat([bytesOf('Exif\0\0'), exif]))] : []),
    ...(icc ? [segment(0xe2, concat([bytesOf('ICC_PROFILE\0'), new Uint8Array([1, 1]), icc]))] : []),
    new Uint8Array([0xff, 0xda, 0, 2]),
  ])
}

const png = () => new Uint8Array(minimal('png', 60))

async function run(bytes: Uint8Array, settings: Partial<Settings> = {}, codecs = new FakeCodecs(photo(40, 30))) {
  const events: JobEvent[] = []
  const result = await compress({ bytes, type: '', settings: { ...DEFAULT_SETTINGS, ...settings } }, codecs, (e) =>
    events.push(e),
  )
  return { result, codecs, events, out: new Uint8Array(result.bytes) }
}

describe('compress', () => {
  it('keeps the format by default, at its default quality', async () => {
    const { result, codecs, events } = await run(jpeg())
    expect(result).toMatchObject({ format: 'jpeg', mime: 'image/jpeg', width: 40, height: 30, quality: 75 })
    expect(codecs.encodes.map((e) => e.encoding)).toEqual([{ quality: 75, lossless: false }])
    expect(events).toEqual([{ phase: 'decode' }, { phase: 'encode', attempt: 1 }])
  })

  it('converts to the chosen format, PNG with no quality', async () => {
    expect((await run(jpeg(), { format: 'avif' })).result).toMatchObject({ format: 'avif', quality: 50 })
    expect((await run(jpeg(), { format: 'png' })).result).toMatchObject({ format: 'png', quality: null })
  })

  it('turns the image upright when the decoder left it as stored', async () => {
    const { result } = await run(jpeg({ exif: TIFF }))
    expect(result).toMatchObject({ width: 30, height: 40, source: { width: 30, height: 40 } })
    const upright = await run(jpeg({ exif: TIFF }), {}, new FakeCodecs(photo(40, 30), true))
    expect(upright.result).toMatchObject({ width: 40, height: 30 })
  })

  it('resizes only what is larger than the box', async () => {
    const big = await run(jpeg(), { resize: true, maxWidth: 20, maxHeight: 20 })
    expect(big.codecs.resizes).toEqual([[20, 15]])
    expect(big.result).toMatchObject({ width: 20, height: 15, source: { width: 40, height: 30 } })
    expect(big.events).toContainEqual({ phase: 'resize' })
    const small = await run(jpeg(), { resize: true, maxWidth: 100, maxHeight: 100 })
    expect(small.codecs.resizes).toEqual([])
  })

  it('searches for the quality that fits the target size', async () => {
    // The fake writes 100 + 10 × quality bytes.
    const { result, codecs } = await run(jpeg(), { target: true, targetKb: 0.5 })
    expect(result).toMatchObject({ quality: 40, overTarget: false })
    expect(result.bytes.byteLength).toBeLessThanOrEqual(500)
    expect(codecs.encodes.length).toBeGreaterThan(1)
  })

  it('says when even the lowest quality is over the target', async () => {
    const { result } = await run(jpeg(), { target: true, targetKb: 0.05 })
    expect(result).toMatchObject({ quality: 1, overTarget: true })
  })

  it("doesn't search for lossless formats, which have no quality to lower", async () => {
    const { codecs, result } = await run(png(), { target: true, targetKb: 0.05 })
    expect(codecs.encodes).toHaveLength(1)
    expect(result.overTarget).toBe(false)
  })

  it('puts transparent images over white for JPEG only', async () => {
    const clear = new FakeCodecs(rgba(2, 2, () => [0, 0, 0, 0]))
    await run(png(), { format: 'jpeg' }, clear)
    expect(Array.from(clear.encodes[0].image.data.subarray(0, 4))).toEqual([255, 255, 255, 255])
    const webp = new FakeCodecs(rgba(2, 2, () => [0, 0, 0, 0]))
    await run(png(), { format: 'webp' }, webp)
    expect(webp.encodes[0].image.data[3]).toBe(0)
  })

  it('keeps the colour profile, and strips EXIF unless asked', async () => {
    const stripped = await run(jpeg({ icc: ICC, exif: TIFF }))
    expect(readIcc(stripped.out)).toEqual(ICC)
    expect(readExif(stripped.out)).toBeNull()

    const kept = await run(jpeg({ icc: ICC, exif: TIFF }), { keepMetadata: true })
    expect(readIcc(kept.out)).toEqual(ICC)
    expect(readExif(kept.out)).not.toBeNull()
    // The pixels were turned; the copy mustn't ask for it again.
    expect(readOrientation(kept.out)).toBe(1)
  })

  it('converts to sRGB for formats that cannot carry the profile', async () => {
    const avif = await run(jpeg({ icc: ICC }), { format: 'avif', keepMetadata: true })
    expect(avif.codecs.decodes).toEqual([{ srgb: true }])
    expect(readIcc(avif.out)).toBeNull()
    expect((await run(jpeg({ icc: ICC }), { format: 'webp' })).codecs.decodes).toEqual([{ srgb: false }])
    expect((await run(jpeg(), { format: 'avif' })).codecs.decodes).toEqual([{ srgb: false }])
  })

  it('makes a preview of JPEG XL, which most browsers cannot show', async () => {
    const { result, codecs } = await run(jpeg(), { format: 'jxl' })
    expect(codecs.previews).toBe(1)
    expect(result.preview?.byteLength).toBe(7)
    expect((await run(jpeg(), { format: 'webp' })).result.preview).toBeNull()
  })

  it('refuses WebP past its size limit', async () => {
    const huge = new FakeCodecs({ width: 20_000, height: 1, data: new Uint8ClampedArray(80_000).fill(255) })
    await expect(run(jpeg(), { format: 'webp' }, huge)).rejects.toThrow(/16383 px/)
  })

  it('stops between steps once cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    const job = { bytes: jpeg(), type: '', settings: DEFAULT_SETTINGS }
    await expect(compress(job, new FakeCodecs(photo(4, 4)), () => {}, controller.signal)).rejects.toThrow()
  })
})
