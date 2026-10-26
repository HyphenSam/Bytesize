/** Decoded pixels, RGBA interleaved, straight (not premultiplied) alpha. */
export type Rgba = { width: number; height: number; data: Uint8ClampedArray }

export function hasAlpha(image: Rgba): boolean {
  for (let i = 3; i < image.data.length; i += 4) if (image.data[i] !== 255) return true
  return false
}

/** The image over white, opaque: JPEG has no transparency, and the colour
 * stored under transparent pixels (often black) would show instead. */
export function flatten(image: Rgba): Rgba {
  const data = new Uint8ClampedArray(image.data.length)
  for (let i = 0; i < data.length; i += 4) {
    const a = image.data[i + 3] / 255
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(image.data[i + c] * a + 255 * (1 - a))
    data[i + 3] = 255
  }
  return { width: image.width, height: image.height, data }
}

/** The size that fits inside `maxWidth` × `maxHeight` with the same shape;
 * never larger than it was. */
export function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Both sides scaled by `percent` (at most 100, so never larger). */
export function scaleBy(width: number, height: number, percent: number) {
  const scale = Math.min(1, percent / 100)
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}
