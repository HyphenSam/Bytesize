// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import type { EngineApi } from './hooks/useBatch'
import type { JobEvent, JobResult } from './lib/engine'
import type { Settings } from './lib/settings'

class FakeClient implements EngineApi {
  jobs: { settings: Settings; onEvent: (e: JobEvent) => void; resolve: (r: JobResult) => void }[] = []
  process(_b: ArrayBuffer, _m: string, settings: Settings, onEvent: (e: JobEvent) => void) {
    return new Promise<JobResult>((resolve) => this.jobs.push({ settings, onEvent, resolve }))
  }
}

const png = (name: string, size = 4) => new File([new Uint8Array(size)], name, { type: 'image/png' })
const result = (bytes: number, extra: Partial<JobResult> = {}): JobResult => ({
  bytes: new ArrayBuffer(bytes),
  width: 8,
  height: 6,
  source: { width: 8, height: 6 },
  format: 'webp',
  mime: 'image/webp',
  quality: 75,
  overTarget: false,
  preview: null,
  ...extra,
})

beforeEach(() => localStorage.clear())

describe('App', () => {
  it('says nothing leaves the device and invites images', () => {
    render(<App clients={[new FakeClient()]} />)
    expect(screen.getByText(/Nothing is uploaded/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Compress' })).toBeDisabled()
  })

  it('adds images, compresses them and offers the result with its saving', async () => {
    const user = userEvent.setup()
    const client = new FakeClient()
    render(<App clients={[client]} />)
    await user.upload(screen.getByLabelText('Add images'), [png('cat.png', 1000), png('dog.png')])

    const strip = screen.getByRole('list', { name: 'Images' })
    expect(within(strip).getAllByRole('listitem')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Compress 2 images' }))

    await waitFor(() => expect(client.jobs).toHaveLength(1))
    act(() => client.jobs[0].onEvent({ phase: 'encode', attempt: 1 }))
    expect(within(strip).getByRole('progressbar', { name: 'cat.png' })).toBeInTheDocument()
    expect(screen.getByText('Compressing')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()

    await act(async () => client.jobs[0].resolve(result(250)))
    const download = await screen.findByRole('link', { name: /Download/ })
    expect(download).toHaveAttribute('download', 'cat.webp')
    expect(screen.getByText('1 kB → 250 B (−75%)')).toBeInTheDocument()
    expect(screen.getByText(/WebP at 75/)).toBeInTheDocument()
    expect(screen.getByText(/750 B saved \(75%\)/)).toBeInTheDocument()
  })

  it('shows a resize, and a target size it could not reach', async () => {
    const user = userEvent.setup()
    const client = new FakeClient()
    render(<App clients={[client]} />)
    await user.upload(screen.getByLabelText('Add images'), [png('big.png', 1000)])
    await user.click(screen.getByRole('button', { name: 'Compress 1 image' }))
    await waitFor(() => expect(client.jobs).toHaveLength(1))
    await act(async () =>
      client.jobs[0].resolve(result(900, { source: { width: 4000, height: 3000 }, quality: 1, overTarget: true })),
    )
    expect(await screen.findByText(/4000 × 3000 → 8 × 6/)).toBeInTheDocument()
    expect(screen.getByText(/Still over the target/)).toBeInTheDocument()
  })

  it('works on several images at once with several workers', async () => {
    const user = userEvent.setup()
    const clients = [new FakeClient(), new FakeClient()]
    render(<App clients={clients} />)
    await user.upload(screen.getByLabelText('Add images'), [png('a.png'), png('b.png'), png('c.png')])
    await user.click(screen.getByRole('button', { name: 'Compress 3 images' }))
    await waitFor(() => expect(clients.map((c) => c.jobs.length)).toEqual([1, 1]))
  })

  it('takes dropped files anywhere on the page', async () => {
    render(<App clients={[new FakeClient()]} />)
    fireEvent.drop(document.body.firstElementChild!, { dataTransfer: { files: [png('a.png')], types: ['Files'] } })
    const strip = await screen.findByRole('list', { name: 'Images' })
    expect(within(strip).getAllByRole('listitem')).toHaveLength(1)
  })

  it('never lets the browser open what is dragged onto the page', () => {
    render(<App clients={[new FakeClient()]} />)
    // An image dragged from another page may only carry its URL, not a file.
    const dataTransfer = { files: [], types: ['text/uri-list', 'text/html'] }
    expect(fireEvent.dragOver(document.body.firstElementChild!, { dataTransfer })).toBe(false)
    expect(fireEvent.drop(document.body.firstElementChild!, { dataTransfer })).toBe(false)
  })

  it('remembers settings between visits', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App clients={[new FakeClient()]} />)
    await user.click(screen.getByRole('radio', { name: 'AVIF' }))
    unmount()
    render(<App clients={[new FakeClient()]} />)
    expect(screen.getByRole('radio', { name: 'AVIF' })).toBeChecked()
  })

  it('remembers how results are compared between visits', async () => {
    const user = userEvent.setup()
    async function compressOne() {
      const client = new FakeClient()
      const view = render(<App clients={[client]} />)
      await user.upload(screen.getByLabelText('Add images'), [png('cat.png')])
      await user.click(screen.getByRole('button', { name: 'Compress 1 image' }))
      await waitFor(() => expect(client.jobs).toHaveLength(1))
      await act(async () => client.jobs[0].resolve(result(3)))
      return view
    }
    const first = await compressOne()
    await user.click(await screen.findByRole('radio', { name: 'Side by side' }))
    first.unmount()
    await compressOne()
    expect(await screen.findByRole('radio', { name: 'Side by side' })).toBeChecked()
  })

  it('credits the codecs and links the source', async () => {
    const user = userEvent.setup()
    render(<App clients={[new FakeClient()]} />)
    await user.click(screen.getByRole('button', { name: 'About' }))
    const dialog = screen.getByRole('dialog')
    for (const name of ['MozJPEG', 'libwebp', 'libavif', 'libjxl', 'oxipng', 'jSquash'])
      expect(within(dialog).getByRole('link', { name })).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /Source code/ })).toHaveAttribute(
      'href',
      'https://github.com/HyphenSam/Bytesize',
    )
  })

  it('moves between images with the arrow keys', async () => {
    const user = userEvent.setup()
    render(<App clients={[new FakeClient()]} />)
    await user.upload(screen.getByLabelText('Add images'), [png('one.png'), png('two.png')])
    const current = () =>
      screen.getByRole('list', { name: 'Images' }).querySelector('[aria-current="true"]')?.textContent
    expect(current()).toMatch(/one\.png/)
    await user.keyboard('{ArrowRight}')
    expect(current()).toMatch(/two\.png/)
    await user.keyboard('{ArrowRight}')
    expect(current()).toMatch(/two\.png/)
    await user.keyboard('{ArrowLeft}')
    expect(current()).toMatch(/one\.png/)
  })
})
