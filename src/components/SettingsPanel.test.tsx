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
  source = null,
}: {
  onChange?: (s: Settings) => void
  initial?: Settings
  source?: { width: number; height: number } | null
}) {
  const [settings, setSettings] = useState(initial)
  return (
    <SettingsPanel
      settings={settings}
      source={source}
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

  it('has a lossless switch for each format that can be, with "same format" too', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.click(screen.getByRole('switch', { name: 'Lossless WebP' }))
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, webpLossless: true })
    expect(screen.queryByRole('slider', { name: 'WebP quality' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Lossless JPEG XL' }))
    expect(screen.queryByRole('slider', { name: 'JPEG XL quality' })).not.toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'AVIF quality' })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'AVIF' }))
    await user.click(screen.getByRole('switch', { name: 'Lossless' }))
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      format: 'avif',
      webpLossless: true,
      jxlLossless: true,
      avifLossless: true,
    })
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })

  it('scales by a percentage when resizing, or fits a box', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    expect(screen.queryByRole('slider', { name: 'Scale' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Resize' }))
    const scale = screen.getByRole('slider', { name: 'Scale' })
    expect(scale).toHaveAttribute('aria-valuenow', '50')
    scale.focus()
    await user.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, resize: true, scale: 49 })

    await user.click(screen.getByRole('radio', { name: 'Fit within' }))
    expect(screen.queryByRole('slider', { name: 'Scale' })).not.toBeInTheDocument()
    const width = screen.getByRole('spinbutton', { name: 'Maximum width' })
    await user.clear(width)
    await user.type(width, '1280{Enter}')
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      resize: true,
      scale: 49,
      resizeMode: 'fit',
      maxWidth: 1280,
    })
  })

  it("shows what the selected image's size becomes", async () => {
    const user = userEvent.setup()
    render(<Harness source={{ width: 4000, height: 3000 }} />)
    await user.click(screen.getByRole('switch', { name: 'Resize' }))
    expect(screen.getByText('4000 × 3000 → 2000 × 1500')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Fit within' }))
    expect(screen.getByText('4000 × 3000 → 1920 × 1440')).toBeInTheDocument()
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
