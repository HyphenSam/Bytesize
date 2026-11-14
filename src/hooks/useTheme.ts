import { useEffect, useState } from 'react'
import { readTheme, resolveTheme, THEME_COLOURS, type Theme, themeCookie } from '@/lib/theme'

const DARK = '(prefers-color-scheme: dark)'

/** Sets the tokens (`data-theme` on <html>, see index.css) and the browser bar's colour. */
function apply(theme: Theme) {
  const resolved = resolveTheme(theme, matchMedia(DARK).matches)
  document.documentElement.dataset.theme = resolved
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute('content', THEME_COLOURS[resolved])
  }
}

/** The chosen theme, and a setter that applies and remembers it. Auto keeps
 * following the system while the page is open. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState(() => readTheme(document.cookie))

  useEffect(() => {
    apply(theme)
    if (theme !== 'auto') return
    const query = matchMedia(DARK)
    const change = () => apply('auto')
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [theme])

  return [
    theme,
    (next) => {
      document.cookie = themeCookie(next, location.hostname)
      setTheme(next)
    },
  ]
}
