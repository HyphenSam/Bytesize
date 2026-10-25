import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, encodingOf, parseSettings } from './settings'

describe('settings', () => {
  it("defaults to each image keeping its format, at the codecs' own default qualities", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      format: 'original',
      quality: { jpeg: 75, webp: 75, avif: 50, jxl: 75 },
      webpLossless: false,
      jxlLossless: false,
      resize: false,
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

  it('makes WebP and JPEG XL lossless when chosen with the switch on', () => {
    const s = { ...DEFAULT_SETTINGS, webpLossless: true, jxlLossless: true }
    expect(encodingOf({ ...s, format: 'webp' }, 'webp').lossless).toBe(true)
    expect(encodingOf({ ...s, format: 'jxl' }, 'jxl').lossless).toBe(true)
    expect(encodingOf({ ...s, format: 'webp', webpLossless: false }, 'webp').lossless).toBe(false)
  })

  it('keeps a lossless WebP lossless with "same format", whatever the switches say', () => {
    expect(encodingOf({ ...DEFAULT_SETTINGS, webpLossless: false }, 'webp', true).lossless).toBe(true)
    expect(encodingOf({ ...DEFAULT_SETTINGS, webpLossless: true }, 'webp', false).lossless).toBe(false)
    expect(encodingOf({ ...DEFAULT_SETTINGS, jxlLossless: true }, 'jxl').lossless).toBe(false)
  })
})
