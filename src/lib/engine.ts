/** The worker's logic: decode, turn upright, resize, encode (searching for a
 * quality when there's a target size) and put the metadata back. The codecs
 * come in as a dependency, so this is tested with fakes. */
import { isLosslessWebp, MIME, outputFormat, sniff } from './formats'
import { flatten, hasAlpha, type Rgba } from './image'
import { carriesMetadata, embedMetadata, readIcc } from './metadata'
import { orient, readExif, readOrientation, uprightExif } from './orientation'
import { encodingOf, type Format, MAX_SIDE, resizedSize, type Settings } from './settings'
import { fitQuality } from './target'

export type Decoded = {
  image: Rgba
  /** The decoder applied the EXIF orientation already. */
  upright: boolean
}

export type Encoding = { quality: number; lossless: boolean }

export interface Codecs {
  /** `srgb`: convert to sRGB through the browser, for a result that can't carry the profile. */
  decode(bytes: Uint8Array, type: string, srgb: boolean): Promise<Decoded>
  resize(image: Rgba, width: number, height: number): Promise<Rgba>
  encode(image: Rgba, format: Format, encoding: Encoding): Promise<ArrayBuffer>
  /** A JPEG XL file as a PNG the page can show: most browsers can't show JPEG XL. */
  preview(jxl: ArrayBuffer): Promise<ArrayBuffer>
}

export type JobEvent = { phase: 'decode' } | { phase: 'resize' } | { phase: 'encode'; attempt: number }

export type Job = { bytes: Uint8Array; type: string; settings: Settings }

export type JobResult = {
  bytes: ArrayBuffer
  width: number
  height: number
  /** The decoded original's size, upright. */
  source: { width: number; height: number }
  format: Format
  mime: string
  /** The quality used for a lossy format; with a target size, the one found. */
  quality: number | null
  /** A target size was asked for and even the lowest quality is larger. */
  overTarget: boolean
  /** What to show for a result the browser may not display. */
  preview: ArrayBuffer | null
}

export async function compress(
  job: Job,
  codecs: Codecs,
  onEvent: (e: JobEvent) => void,
  signal?: AbortSignal,
): Promise<JobResult> {
  const { bytes, settings } = job
  const kind = sniff(bytes)
  const format = outputFormat(settings.format, kind)
  const icc = readIcc(bytes)
  const carries = carriesMetadata(format)

  onEvent({ phase: 'decode' })
  // Without somewhere to put the profile, the colours are converted instead.
  const decoded = await codecs.decode(bytes, job.type, !!icc && !carries)
  let image = decoded.upright ? decoded.image : orient(decoded.image, readOrientation(bytes))
  const source = { width: image.width, height: image.height }
  signal?.throwIfAborted()

  const size = resizedSize(settings, image.width, image.height)
  if (size.width !== image.width || size.height !== image.height) {
    onEvent({ phase: 'resize' })
    image = await codecs.resize(image, size.width, size.height)
    signal?.throwIfAborted()
  }
  if (format === 'webp' && (image.width > MAX_SIDE || image.height > MAX_SIDE)) {
    throw new Error(`WebP can't be larger than ${MAX_SIDE} px on a side. Turn on Resize, or choose another format.`)
  }
  if (format === 'jpeg' && hasAlpha(image)) image = flatten(image)

  const exif = settings.keepMetadata && carries ? readExif(bytes) : null
  const meta = { icc: carries ? icc : null, exif: exif && uprightExif(exif) }
  const encoding = encodingOf(settings, format, isLosslessWebp(bytes))
  let attempt = 0
  const encode = async (quality: number) => {
    signal?.throwIfAborted()
    onEvent({ phase: 'encode', attempt: ++attempt })
    const encoded = await codecs.encode(image, format, { ...encoding, quality })
    return embedMetadata(encoded, format, meta)
  }

  const lossy = !encoding.lossless
  if (settings.target && lossy) {
    const fitted = await fitQuality(encode, settings.targetKb * 1000, encoding.quality)
    return result(fitted.bytes, fitted.quality, !fitted.fits)
  }
  return result(await encode(encoding.quality), lossy ? encoding.quality : null, false)

  async function result(encoded: ArrayBuffer, quality: number | null, overTarget: boolean): Promise<JobResult> {
    return {
      bytes: encoded,
      width: image.width,
      height: image.height,
      source,
      format,
      mime: MIME[format],
      quality,
      overTarget,
      preview: format === 'jxl' ? await codecs.preview(encoded) : null,
    }
  }
}
