/** The sister sites shown in the app launcher. The list lives in one place,
 * apps.hyphensam.com/apps.json, so adding or renaming a site there updates
 * every site's launcher; FALLBACK_APPS covers the first visit offline or the
 * list being unreachable. */
export type AppLink = { name: string; url: string; icon: string }

export const APPS_URL = 'https://apps.hyphensam.com/apps.json'

export const FALLBACK_APPS: AppLink[] = [
  { name: 'Bytesize', url: 'https://bytesize.hyphensam.com/', icon: 'https://apps.hyphensam.com/icons/bytesize.svg' },
  { name: 'Art Cleaner', url: 'https://cleaner.hyphensam.com/', icon: 'https://apps.hyphensam.com/icons/cleaner.svg' },
  { name: 'Moviola', url: 'https://moviola.hyphensam.com/', icon: 'https://apps.hyphensam.com/icons/moviola.svg' },
]

/** Https only: the list comes from another site, and its URLs become links
 * and images here. */
function httpsUrl(value: unknown, base: string): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value, base)
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

/** The apps in a fetched list, skipping any entry that isn't usable; null
 * when none is. Icons may be relative to the list's own URL, `base`. */
export function parseApps(data: unknown, base: string): AppLink[] | null {
  const list = (data as { apps?: unknown } | null)?.apps
  if (!Array.isArray(list)) return null
  const apps = list.flatMap((entry) => {
    const { name, url, icon } = (entry ?? {}) as Record<string, unknown>
    const link = httpsUrl(url, base)
    const image = httpsUrl(icon, base)
    return typeof name === 'string' && name && link && image ? [{ name, url: link, icon: image }] : []
  })
  return apps.length ? apps : null
}

export function isCurrentApp(app: AppLink, origin: string): boolean {
  return new URL(app.url).origin === origin
}
