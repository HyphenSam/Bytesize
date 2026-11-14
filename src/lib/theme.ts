/** Auto follows the system; light and dark override it. The choice is a
 * cookie on hyphensam.com, so it carries across the sister sites (Bytesize,
 * Art Cleaner, Moviola). index.html reads it again before the first paint. */
export type Theme = 'auto' | 'light' | 'dark'

export const THEMES: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

/** The browser bar's colour for each theme: the canvas token as hex. */
export const THEME_COLOURS = { light: '#f8f8f9', dark: '#141416' }

const SHARED_DOMAIN = 'hyphensam.com'
const YEAR = 60 * 60 * 24 * 365

export function readTheme(cookie: string): Theme {
  const value = /(?:^|;\s*)theme=([^;]*)/.exec(cookie)?.[1]
  return value === 'light' || value === 'dark' ? value : 'auto'
}

/** The `document.cookie` assignment that stores `theme`, or removes it for auto. */
export function themeCookie(theme: Theme, hostname: string): string {
  const shared = hostname === SHARED_DOMAIN || hostname.endsWith(`.${SHARED_DOMAIN}`)
  return [
    `theme=${theme === 'auto' ? '' : theme}`,
    shared && `Domain=${SHARED_DOMAIN}`,
    'Path=/',
    `Max-Age=${theme === 'auto' ? 0 : YEAR}`,
    'SameSite=Lax',
    shared && 'Secure',
  ]
    .filter(Boolean)
    .join('; ')
}

export function resolveTheme(theme: Theme, prefersDark: boolean): 'light' | 'dark' {
  return theme === 'auto' ? (prefersDark ? 'dark' : 'light') : theme
}
