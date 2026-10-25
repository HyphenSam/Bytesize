// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type Settings } from '@/lib/settings'
import { SettingsPanel } from './SettingsPanel'

function Harness({
  onChange = () => {},
  initial = DEFAULT_SETTINGS,
}: {
  onChange?: (s: Settings) => void
  initial?: Settings
}) {
  const [settings, setSettings] = useState(initial)
  return (
    <SettingsPanel
      settings={settings}
      onChange={(s) => {
        setSettings(s)
        onChange(s)
      }}
    />
  )
}

describe('SettingsPanel', () => {
  it('starts with each image keeping its format, and a quality for each lossy one', () => {
    render(<Harness />)
    expect(screen.getByRole('radio', { name: 'Same' })).toBeChecked()
    expect(screen.getByRole('slider', { name: 'JPEG quality' })).toHaveAttribute('aria-valuenow', '75')
    expect(screen.getByRole('slider', { name: 'WebP quality' })).toHaveAttribute('aria-valuenow', '75')
    expect(screen.getByRole('slider', { name: 'AVIF quality' })).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByRole('slider', { name: 'JPEG XL quality' })).toHaveAttribute('aria-valuenow', '75')
  })

  it("shows one slider for a chosen format, with that format's own quality", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.click(screen.getByRole('radio', { name: 'AVIF' }))
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, format: 'avif' })
    expect(screen.getAllByRole('slider')).toHaveLength(1)
    expect(screen.getByRole('slider', { name: 'Quality' })).toHaveAttribute('aria-valuenow', '50')
  })

  it('has no quality for PNG, or for lossless WebP', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('radio', { name: 'PNG' }))
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'WebP' }))
    expect(screen.getByRole('slider', { name: 'Quality' })).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Lossless' }))
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })

  it('asks for a box to resize into only when resizing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    expect(screen.queryByRole('spinbutton', { name: 'Maximum width' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Resize' }))
    const width = screen.getByRole('spinbutton', { name: 'Maximum width' })
    await user.clear(width)
    await user.type(width, '1280{Enter}')
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, resize: true, maxWidth: 1280 })
  })

  it('puts back an invalid number when the field is left', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} initial={{ ...DEFAULT_SETTINGS, target: true }} />)
    const size = screen.getByRole('spinbutton', { name: 'Target size' })
    await user.clear(size)
    await user.type(size, '0')
    await user.tab()
    expect(size).toHaveValue(500)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('says what happens to metadata either way', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.getByText(/location are removed/)).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Keep metadata' }))
    expect(screen.getByText(/location are kept/)).toBeInTheDocument()
  })
})
