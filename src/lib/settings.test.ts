import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, encodingOf, parseSettings, resizedSize } from './settings'

describe('settings', () => {
  it("defaults to each image keeping its format, at the codecs' own default qualities", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      format: 'original',
      quality: { jpeg: 75, webp: 75, avif: 50, jxl: 75 },
      webpLossless: false,
      jxlLossless: false,
      avifLossless: false,
      resize: false,
      resizeMode: 'scale',
      scale: 50,
      target: false,
      keepMetadata: false,
    })
  })

  it('reads saved settings, falling back to defaults for anything invalid', () => {
    const avif40 = { ...DEFAULT_SETTINGS, format: 'avif', quality: { ...DEFAULT_SETTINGS.quality, avif: 40 } }
    expect(parseSettings(avif40)).toEqual(avif40)
    expect(
      parseSettings({
        format: 'gif',
        quality: { jpeg: 0, webp: 101, avif: 'x' },
        maxWidth: 99999,
        maxHeight: 2.5,
        resizeMode: 'stretch',
        scale: 101,
        avifLossless: 1,
        targetKb: -1,
        keepMetadata: 'yes',
      }),
    ).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings({ quality: { jpeg: 60 } }).quality).toEqual({ ...DEFAULT_SETTINGS.quality, jpeg: 60 })
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('nonsense')).toEqual(DEFAULT_SETTINGS)
  })

  it("uses the output format's own quality", () => {
    const s = { ...DEFAULT_SETTINGS, quality: { jpeg: 80, webp: 70, avif: 45, jxl: 60 } }
    expect(encodingOf(s, 'jpeg')).toEqual({ quality: 80, lossless: false })
    expect(encodingOf(s, 'avif')).toEqual({ quality: 45, lossless: false })
    expect(encodingOf(s, 'png')).toEqual({ quality: 100, lossless: true })
  })

  it('makes WebP, AVIF and JPEG XL lossless with their switches on', () => {
    const s = { ...DEFAULT_SETTINGS, webpLossless: true, avifLossless: true, jxlLossless: true }
    for (const format of ['original', 'webp', 'avif', 'jxl'] as const) {
      expect(encodingOf({ ...s, format }, 'webp').lossless).toBe(true)
      expect(encodingOf({ ...s, format }, 'avif').lossless).toBe(true)
      expect(encodingOf({ ...s, format }, 'jxl').lossless).toBe(true)
    }
    expect(encodingOf({ ...s, format: 'webp', webpLossless: false }, 'webp').lossless).toBe(false)
    expect(encodingOf({ ...s, avifLossless: false }, 'avif').lossless).toBe(false)
    expect(encodingOf({ ...s, jxlLossless: false }, 'jxl').lossless).toBe(false)
  })

  it('keeps a lossless WebP lossless with "same format" and the switch off', () => {
    expect(encodingOf(DEFAULT_SETTINGS, 'webp', true).lossless).toBe(true)
    expect(encodingOf(DEFAULT_SETTINGS, 'webp', false).lossless).toBe(false)
    // A WebP chosen on purpose follows its switch.
    expect(encodingOf({ ...DEFAULT_SETTINGS, format: 'webp' }, 'webp', true).lossless).toBe(false)
  })
})

describe('resizedSize', () => {
  it('leaves the size alone unless resizing', () => {
    expect(resizedSize(DEFAULT_SETTINGS, 4000, 3000)).toEqual({ width: 4000, height: 3000 })
  })

  it('scales by the percentage, or fits the box', () => {
    const s = { ...DEFAULT_SETTINGS, resize: true, scale: 25, maxWidth: 1000, maxHeight: 1000 }
    expect(resizedSize(s, 4000, 3000)).toEqual({ width: 1000, height: 750 })
    expect(resizedSize({ ...s, resizeMode: 'fit' }, 4000, 2000)).toEqual({ width: 1000, height: 500 })
  })
})
