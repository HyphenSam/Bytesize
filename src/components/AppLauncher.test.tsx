// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { type AppLink, FALLBACK_APPS } from '@/lib/apps'
import { AppLauncher } from './AppLauncher'

const here = { name: 'This one', url: `${location.origin}/`, icon: 'https://apps.example/here.svg' }
const there = { name: 'Other', url: 'https://other.example/', icon: 'https://apps.example/other.svg' }

async function open(load: () => Promise<AppLink[] | null>) {
  render(<AppLauncher load={load} />)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Apps' }))
  return screen.getByRole('dialog', { name: 'Apps' })
}

describe('AppLauncher', () => {
  it('lists the shared apps, each opening in a new tab', async () => {
    await open(async () => [here, there])
    const link = await screen.findByRole('link', { name: 'Other' })
    expect(link).toHaveAttribute('href', 'https://other.example/')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('marks the app you are in rather than linking to it', async () => {
    await open(async () => [here, there])
    await screen.findByRole('link', { name: 'Other' })
    expect(screen.queryByRole('link', { name: 'This one' })).not.toBeInTheDocument()
    expect(screen.getByText('This one').closest('[aria-current="page"]')).not.toBeNull()
  })

  it('asks for the shared list only once opened', async () => {
    const load = vi.fn(async () => [here, there])
    render(<AppLauncher load={load} />)
    expect(load).not.toHaveBeenCalled()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Apps' }))
    expect(load).toHaveBeenCalledOnce()
  })

  it('falls back to the built-in list when the shared one cannot be had', async () => {
    await open(async () => {
      throw new TypeError('offline')
    })
    for (const app of FALLBACK_APPS.slice(1)) expect(screen.getByRole('link', { name: app.name })).toBeInTheDocument()
  })

  it("shows the app's initial when its icon will not load", async () => {
    await open(async () => [here, there])
    const link = await screen.findByRole('link', { name: 'Other' })
    fireEvent.error(link.querySelector('img')!)
    expect(link).toHaveTextContent('OOther')
  })
})
