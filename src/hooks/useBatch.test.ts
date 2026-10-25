// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import type { JobEvent, JobResult } from '@/lib/engine'
import type { Format } from '@/lib/settings'
import { DEFAULT_SETTINGS, type Settings } from '@/lib/settings'
import { type EngineApi, useBatch } from './useBatch'

type Call = {
  name: number
  settings: Settings
  resolve: (r: JobResult) => void
  reject: (e: unknown) => void
  onEvent: (e: JobEvent) => void
  signal?: AbortSignal
}

/** Jobs wait until the test resolves them. */
class FakeClient implements EngineApi {
  calls: Call[] = []
  process(bytes: ArrayBuffer, _mime: string, settings: Settings, onEvent: (e: JobEvent) => void, signal?: AbortSignal) {
    return new Promise<JobResult>((resolve, reject) => {
      this.calls.push({ name: bytes.byteLength, settings, resolve, reject, onEvent, signal })
      signal?.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')))
    })
  }
}

const image = (name: string, size = 1) => new File([new Uint8Array(size)], name, { type: 'image/png' })
const result = (byte: number, format: Format = 'webp'): JobResult => ({
  bytes: new Uint8Array([byte]).buffer,
  width: 4,
  height: 3,
  source: { width: 8, height: 6 },
  format,
  mime: 'image/webp',
  quality: 75,
  overTarget: false,
  preview: null,
})

function setup(settings = DEFAULT_SETTINGS, lanes = 1) {
  const clients = Array.from({ length: lanes }, () => new FakeClient())
  const hook = renderHook(({ s }) => useBatch(clients, s), { initialProps: { s: settings } })
  return { client: clients[0], clients, hook, items: () => hook.result.current.items }
}

describe('useBatch', () => {
  it('adds images and ignores other files', () => {
    const { hook, items } = setup()
    act(() =>
      hook.result.current.add([
        image('a.png'),
        new File(['x'], 'notes.txt', { type: 'text/plain' }),
        image('b.jpg', 5),
      ]),
    )
    expect(items().map((i) => [i.name, i.size])).toEqual([
      ['a.png', 1],
      ['b.jpg', 5],
    ])
    expect(items().every((i) => i.status === 'queued' && i.originalUrl.startsWith('blob:'))).toBe(true)
  })

  it('processes the queue one image at a time on one worker, in order', async () => {
    const { client, hook, items } = setup()
    act(() => hook.result.current.add([image('a.png', 1), image('b.png', 2)]))
    act(() => void hook.result.current.start())
    await waitFor(() => expect(client.calls).toHaveLength(1))
    expect(hook.result.current.running).toBe(true)
    expect(items().map((i) => i.status)).toEqual(['working', 'queued'])

    act(() => client.calls[0].onEvent({ phase: 'encode', attempt: 1 }))
    expect(items()[0].event).toEqual({ phase: 'encode', attempt: 1 })

    await act(async () => client.calls[0].resolve(result(7)))
    await waitFor(() => expect(client.calls).toHaveLength(2))
    expect(client.calls[1].name).toBe(2)
    expect(items()[0]).toMatchObject({
      status: 'done',
      result: { name: 'a.webp', width: 4, height: 3, size: 1, format: 'webp', source: { width: 8, height: 6 } },
    })

    await act(async () => client.calls[1].resolve(result(8)))
    await waitFor(() => expect(hook.result.current.running).toBe(false))
    expect(items().map((i) => i.status)).toEqual(['done', 'done'])
  })

  it('works on as many images at once as there are workers', async () => {
    const { clients, hook, items } = setup(DEFAULT_SETTINGS, 2)
    act(() => hook.result.current.add([image('a.png', 1), image('b.png', 2), image('c.png', 3)]))
    act(() => void hook.result.current.start())
    await waitFor(() => expect(clients.map((c) => c.calls.length)).toEqual([1, 1]))
    expect(items().map((i) => i.status)).toEqual(['working', 'working', 'queued'])

    // Whichever worker is free first takes the next one.
    await act(async () => clients[1].calls[0].resolve(result(2)))
    await waitFor(() => expect(clients[1].calls).toHaveLength(2))
    expect(clients[1].calls[1].name).toBe(3)
  })

  it('uses the settings current when each image starts', async () => {
    const { client, hook } = setup()
    act(() => hook.result.current.add([image('a.png'), image('b.png')]))
    act(() => void hook.result.current.start())
    await waitFor(() => expect(client.calls).toHaveLength(1))
    hook.rerender({ s: { ...DEFAULT_SETTINGS, format: 'avif' } })
    await act(async () => client.calls[0].resolve(result(1)))
    await waitFor(() => expect(client.calls).toHaveLength(2))
    expect(client.calls[0].settings.format).toBe('original')
    expect(client.calls[1].settings.format).toBe('avif')
  })

  it('records a failure and goes on to the next image', async () => {
    const { client, hook, items } = setup()
    act(() => hook.result.current.add([image('a.png'), image('b.png')]))
    act(() => void hook.result.current.start())
    await waitFor(() => expect(client.calls).toHaveLength(1))
    await act(async () => client.calls[0].reject(new Error('Out of memory')))
    await waitFor(() => expect(client.calls).toHaveLength(2))
    expect(items()[0]).toMatchObject({ status: 'failed', error: 'Out of memory' })
  })

  it('stops the queue on cancel, leaving the rest queued', async () => {
    const { client, hook, items } = setup()
    act(() => hook.result.current.add([image('a.png'), image('b.png')]))
    act(() => void hook.result.current.start())
    await waitFor(() => expect(client.calls).toHaveLength(1))
    await act(async () => hook.result.current.cancel())
    await waitFor(() => expect(hook.result.current.running).toBe(false))
    expect(items().map((i) => i.status)).toEqual(['cancelled', 'queued'])
    expect(client.calls).toHaveLength(1)
  })

  it('removing the image being worked on moves on to the next', async () => {
    const { client, hook, items } = setup()
    act(() => hook.result.current.add([image('a.png'), image('b.png')]))
    act(() => void hook.result.current.start())
    await waitFor(() => expect(client.calls).toHaveLength(1))
    await act(async () => hook.result.current.remove(items()[0].id))
    await waitFor(() => expect(client.calls).toHaveLength(2))
    expect(items().map((i) => i.name)).toEqual(['b.png'])
  })

  it('processes finished images again with new settings', async () => {
    const { client, hook, items } = setup()
    act(() => hook.result.current.add([image('a.png')]))
    act(() => void hook.result.current.start())
    await waitFor(() => expect(client.calls).toHaveLength(1))
    await act(async () => client.calls[0].resolve(result(1)))
    await waitFor(() => expect(hook.result.current.running).toBe(false))
    act(() => hook.result.current.redo())
    await waitFor(() => expect(client.calls).toHaveLength(2))
    expect(items()[0].status).toBe('working')
  })

  it('zips every result under a unique name', async () => {
    const { client, hook } = setup()
    act(() => hook.result.current.add([image('a.png'), image('a.jpg'), image('b.png')]))
    act(() => void hook.result.current.start())
    for (let i = 0; i < 3; i++) {
      await waitFor(() => expect(client.calls).toHaveLength(i + 1))
      await act(async () => client.calls[i].resolve(result(i)))
    }
    await waitFor(() => expect(hook.result.current.running).toBe(false))
    const zip = await hook.result.current.zip()
    const files = unzipSync(new Uint8Array(await zip.arrayBuffer()))
    expect(Object.keys(files)).toEqual(['a.webp', 'a (2).webp', 'b.webp'])
    expect(Array.from(files['b.webp'])).toEqual([2])
  })
})
