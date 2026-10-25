/** What the user picks, its defaults, and what it means for a job. */

export type Format = 'jpeg' | 'webp' | 'avif' | 'jxl' | 'png'
/** `original`: each image keeps its own format. */
export type FormatChoice = 'original' | Format
export type LossyFormat = Exclude<Format, 'png'>

export const LOSSY_FORMATS: LossyFormat[] = ['jpeg', 'webp', 'avif', 'jxl']

export type Settings = {
  format: FormatChoice
  /** Each lossy format's quality, 1–100. The scales differ: AVIF's 50 looks about like JPEG's 75. */
  quality: Record<LossyFormat, number>
  webpLossless: boolean
  jxlLossless: boolean
  resize: boolean
  maxWidth: number
  maxHeight: number
  /** Searches for the highest quality that fits under `targetKb`. */
  target: boolean
  /** In kB of 1000 bytes, as file managers and browsers show sizes. */
  targetKb: number
  /** EXIF (camera, date, location). The colour profile is always kept. */
  keepMetadata: boolean
}

// libjpeg's, libwebp's, libavif's and libjxl's own defaults.
export const DEFAULT_QUALITY: Record<LossyFormat, number> = { jpeg: 75, webp: 75, avif: 50, jxl: 75 }

export const DEFAULT_SETTINGS: Settings = {
  format: 'original',
  quality: DEFAULT_QUALITY,
  webpLossless: false,
  jxlLossless: false,
  resize: false,
  maxWidth: 1920,
  maxHeight: 1920,
  target: false,
  targetKb: 500,
  keepMetadata: false,
}

/** libwebp's limit on either side, the smallest of the encoders'. */
export const MAX_SIDE = 16383

/** Saved settings, each field checked; anything invalid gets its default. */
export function parseSettings(saved: unknown): Settings {
  const s = record(saved)
  const q = record(s.quality)
  const d = DEFAULT_SETTINGS
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
  const int = (v: unknown, lo: number, hi: number, fallback: number) =>
    Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? (v as number) : fallback
  const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T) =>
    options.includes(v as T) ? (v as T) : fallback
  return {
    format: oneOf(s.format, ['original', 'jpeg', 'webp', 'avif', 'jxl', 'png'], d.format),
    quality: {
      jpeg: int(q.jpeg, 1, 100, d.quality.jpeg),
      webp: int(q.webp, 1, 100, d.quality.webp),
      avif: int(q.avif, 1, 100, d.quality.avif),
      jxl: int(q.jxl, 1, 100, d.quality.jxl),
    },
    webpLossless: bool(s.webpLossless, d.webpLossless),
    jxlLossless: bool(s.jxlLossless, d.jxlLossless),
    resize: bool(s.resize, d.resize),
    maxWidth: int(s.maxWidth, 1, MAX_SIDE, d.maxWidth),
    maxHeight: int(s.maxHeight, 1, MAX_SIDE, d.maxHeight),
    target: bool(s.target, d.target),
    targetKb: int(s.targetKb, 1, 1_000_000, d.targetKb),
    keepMetadata: bool(s.keepMetadata, d.keepMetadata),
  }
}

const record = (v: unknown) => (typeof v === 'object' && v !== null ? v : {}) as Record<string, unknown>

/** How an image is encoded once its output format is known. With "same
 * format", a lossless WebP stays lossless; the switches are for a format
 * chosen on purpose. */
export function encodingOf(s: Settings, format: Format, losslessSource = false) {
  const chosen = s.format !== 'original'
  const lossless =
    format === 'png' ||
    (format === 'webp' && (chosen ? s.webpLossless : losslessSource)) ||
    (format === 'jxl' && chosen && s.jxlLossless)
  return { lossless, quality: format === 'png' ? 100 : s.quality[format] }
}
