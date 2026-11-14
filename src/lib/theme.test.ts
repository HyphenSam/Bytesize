import { describe, expect, it } from 'vitest'
import { readTheme, resolveTheme, themeCookie } from './theme'

describe('readTheme', () => {
  it('reads light or dark from the cookie', () => {
    expect(readTheme('theme=dark')).toBe('dark')
    expect(readTheme('other=1; theme=light; more=2')).toBe('light')
  })

  it('is auto without the cookie or with a value it does not know', () => {
    expect(readTheme('')).toBe('auto')
    expect(readTheme('theme=sepia')).toBe('auto')
    expect(readTheme('mytheme=dark')).toBe('auto')
  })
})

describe('themeCookie', () => {
  it('is shared by every hyphensam.com site', () => {
    expect(themeCookie('dark', 'bytesize.hyphensam.com')).toBe(
      'theme=dark; Domain=hyphensam.com; Path=/; Max-Age=31536000; SameSite=Lax; Secure',
    )
  })

  it('stays on the host anywhere else, such as localhost', () => {
    expect(themeCookie('light', 'localhost')).toBe('theme=light; Path=/; Max-Age=31536000; SameSite=Lax')
  })

  it('does not take a lookalike domain for the shared one', () => {
    expect(themeCookie('light', 'evilhyphensam.com')).not.toContain('Domain')
  })

  it('removes the cookie for auto', () => {
    expect(themeCookie('auto', 'moviola.hyphensam.com')).toBe(
      'theme=; Domain=hyphensam.com; Path=/; Max-Age=0; SameSite=Lax; Secure',
    )
  })
})

describe('resolveTheme', () => {
  it('follows the system for auto and the choice otherwise', () => {
    expect(resolveTheme('auto', true)).toBe('dark')
    expect(resolveTheme('auto', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})
