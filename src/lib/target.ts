/** "Under 200 kB": the highest quality whose file fits, found by bisection.
 * Size grows with quality almost everywhere, so about eight encodes find it. */

export type Fitted = { bytes: ArrayBuffer; quality: number; fits: boolean }

/** Tries `max` first (a file that already fits needs one encode), then
 * bisects 1 to `max`. If nothing fits, the smallest file tried. */
export async function fitQuality(
  encode: (quality: number) => Promise<ArrayBuffer>,
  limit: number,
  max: number,
): Promise<Fitted> {
  const first = await encode(max)
  if (first.byteLength <= limit) return { bytes: first, quality: max, fits: true }
  let smallest: Fitted = { bytes: first, quality: max, fits: false }
  let best: Fitted | null = null
  let [lo, hi] = [1, max - 1]
  while (lo <= hi) {
    const quality = (lo + hi) >> 1
    const bytes = await encode(quality)
    if (bytes.byteLength <= limit) {
      best = { bytes, quality, fits: true }
      lo = quality + 1
    } else {
      if (bytes.byteLength < smallest.bytes.byteLength) smallest = { bytes, quality, fits: false }
      hi = quality - 1
    }
  }
  return best ?? smallest
}
