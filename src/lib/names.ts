import type { Format } from './settings'

export const EXTENSIONS: Record<Format, string> = { jpeg: 'jpg', webp: 'webp', avif: 'avif', jxl: 'jxl', png: 'png' }

// Extensions that already name the format, kept as the original spelt them.
const SPELLINGS: Record<Format, RegExp> = {
  jpeg: /^jpe?g$/i,
  webp: /^webp$/i,
  avif: /^avif$/i,
  jxl: /^jxl$/i,
  png: /^png$/i,
}

/** `photo.jpeg` stays `photo.jpeg` as JPEG and becomes `photo.webp` as WebP. */
export function outputName(original: string, format: Format): string {
  const match = /^(.+)\.([^.]+)$/.exec(original)
  const [stem, ext] = match ? [match[1], match[2]] : [original, '']
  return `${stem}.${SPELLINGS[format].test(ext) ? ext : EXTENSIONS[format]}`
}

/** Numbers repeats (`a (2).png`), ignoring case, as file systems may. */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>()
  return names.map((name) => {
    const key = name.toLowerCase()
    const count = (seen.get(key) ?? 0) + 1
    seen.set(key, count)
    return count === 1 ? name : name.replace(/(\.[^.]+)?$/, (ext) => ` (${count})${ext}`)
  })
}
