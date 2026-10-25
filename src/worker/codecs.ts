/** Exact decoding and encoding with jSquash's WebAssembly codecs (a 2D
 * canvas would premultiply alpha and lose colour under transparent pixels). */
import encodeAvif from '@jsquash/avif/encode'
import decodeJpeg from '@jsquash/jpeg/decode'
import encodeJpeg from '@jsquash/jpeg/encode'
import decodeJxl from '@jsquash/jxl/decode'
import encodeJxl from '@jsquash/jxl/encode'
import optimisePng from '@jsquash/oxipng/optimise'
import decodePng from '@jsquash/png/decode'
import resize from '@jsquash/resize'
import decodeWebp from '@jsquash/webp/decode'
import encodeWebp from '@jsquash/webp/encode'
import type { Codecs, Decoded } from '@/lib/engine'
import { sniff } from '@/lib/formats'
import type { Rgba } from '@/lib/image'

const imageData = (image: Rgba) => new ImageData(new Uint8ClampedArray(image.data), image.width, image.height)
const rgba = (data: ImageData): Rgba => ({ width: data.width, height: data.height, data: data.data })

export const codecs: Codecs = {
  async decode(bytes, type, srgb): Promise<Decoded> {
    const buffer = bytes.slice().buffer
    const kind = sniff(bytes)
    if (!srgb) {
      if (kind === 'png') return { image: rgba(await decodePng(buffer)), upright: false }
      if (kind === 'jpeg') return { image: rgba(await decodeJpeg(buffer)), upright: false }
      if (kind === 'webp') return { image: rgba(await decodeWebp(buffer)), upright: false }
      // Few browsers can show JPEG XL yet, let alone decode it.
      if (kind === 'jxl') return { image: rgba(await decodeJxl(buffer)), upright: false }
    }
    // Anything else (AVIF, GIF, BMP…), or a profile to convert, through the
    // browser, which turns it upright and converts it to sRGB.
    const bitmap = await createImageBitmap(new Blob([buffer], { type }), {
      colorSpaceConversion: 'default',
      premultiplyAlpha: 'none',
      imageOrientation: 'from-image',
    })
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d')!
    context.drawImage(bitmap, 0, 0)
    bitmap.close()
    return { image: rgba(context.getImageData(0, 0, canvas.width, canvas.height)), upright: true }
  },

  async resize(image, width, height) {
    // Lanczos3 in linear light with premultiplied alpha, as Squoosh does.
    const out = await resize(imageData(image), {
      width,
      height,
      method: 'lanczos3',
      fitMethod: 'stretch',
      premultiply: true,
      linearRGB: true,
    })
    return rgba(out)
  },

  async encode(image, format, { quality, lossless }) {
    const data = imageData(image)
    switch (format) {
      case 'jpeg':
        return encodeJpeg(data, { quality })
      case 'webp':
        // In lossless mode libwebp's quality is effort; 75 is its default.
        return encodeWebp(data, lossless ? { lossless: 1, quality: 75, method: 4 } : { quality, method: 4 })
      case 'avif':
        // Speed 7: about 2.5× faster than libavif's default 6, files within a percent or two.
        return encodeAvif(data, { quality, speed: 7 })
      case 'jxl':
        return encodeJxl(data, lossless ? { lossless: true, effort: 7 } : { quality, effort: 7 })
      case 'png':
        return optimisePng(data, { level: 2, interlace: false, optimiseAlpha: true })
    }
  },

  async preview(jxl) {
    const image = await decodeJxl(jxl)
    const canvas = new OffscreenCanvas(image.width, image.height)
    canvas.getContext('2d')!.putImageData(image, 0, 0)
    return (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer()
  },
}
