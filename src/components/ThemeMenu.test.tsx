// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeMenu } from './ThemeMenu'

function systemPrefersDark(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: dark, addEventListener() {}, removeEventListener() {} })),
  )
}

describe('ThemeMenu', () => {
  beforeEach(() => {
    document.cookie = 'theme=; Path=/; Max-Age=0'
    delete document.documentElement.dataset.theme
    systemPrefersDark(false)
  })
  afterEach(() => vi.unstubAllGlobals())

  async function choose(name: string) {
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Theme' }))
    await user.click(screen.getByRole('menuitemradio', { name }))
  }

  it('follows the system until a theme is chosen', () => {
    systemPrefersDark(true)
    render(<ThemeMenu />)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('switches to the chosen theme and remembers it', async () => {
    render(<ThemeMenu />)
    await choose('Dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.cookie).toContain('theme=dark')
  })

  it('starts from the remembered theme, ticked in the menu', async () => {
    document.cookie = 'theme=dark; Path=/'
    render(<ThemeMenu />)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Theme' }))
    expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
  })

  it('goes back to the system and forgets the choice with auto', async () => {
    document.cookie = 'theme=dark; Path=/'
    render(<ThemeMenu />)
    await choose('Auto')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(document.cookie).not.toContain('theme=')
  })
})
