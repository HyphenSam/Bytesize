// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_COLOURS } from './lib/theme'

// index.html sets the theme before the first paint, without the app's code.
const html = readFileSync('index.html', 'utf8')
const script = /<script>([\s\S]*?)<\/script>/.exec(html)![1]

describe("index.html's theme script", () => {
  beforeEach(() => {
    document.cookie = 'theme=; Path=/; Max-Age=0'
    document.head.innerHTML = [...html.matchAll(/<meta name="theme-color"[^>]*>/g)].join('')
  })
  afterEach(() => vi.unstubAllGlobals())

  function run(prefersDark: boolean) {
    vi.stubGlobal('matchMedia', () => ({ matches: prefersDark }))
    new Function(script)()
    return [...document.querySelectorAll('meta[name="theme-color"]')].map((m) => m.getAttribute('content'))
  }

  it('follows the system without a chosen theme', () => {
    expect(run(true)).toEqual([THEME_COLOURS.dark, THEME_COLOURS.dark])
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('uses the chosen theme over the system', () => {
    document.cookie = 'theme=light; Path=/'
    expect(run(true)).toEqual([THEME_COLOURS.light, THEME_COLOURS.light])
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })
})
