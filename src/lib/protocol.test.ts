import { afterEach, describe, expect, it } from 'vitest'
import type { JobEvent, JobResult } from './engine'
import { EngineClient, type Handler, serve } from './protocol'
import { DEFAULT_SETTINGS } from './settings'

let channels: MessageChannel[] = []
afterEach(() => {
  for (const c of channels) {
    c.port1.close()
    c.port2.close()
  }
  channels = []
})

function open(handle: Handler) {
  const channel = new MessageChannel()
  channels.push(channel)
  serve(channel.port2, handle)
  return channel
}

const result = (width: number, preview: ArrayBuffer | null = null): JobResult => ({
  bytes: new Uint8Array([1]).buffer,
  width,
  height: 4,
  source: { width, height: 4 },
  format: 'webp',
  mime: 'image/webp',
  quality: 75,
  overTarget: false,
  preview,
})

describe('EngineClient and serve', () => {
  it('runs a job, passing its events and its result back', async () => {
    const channel = open(async (job, onEvent) => {
      expect(new Uint8Array(job.bytes)).toEqual(new Uint8Array([9, 8]))
      expect(job.type).toBe('image/jpeg')
      expect(job.settings).toEqual(DEFAULT_SETTINGS)
      onEvent({ phase: 'encode', attempt: 1 })
      return result(3, new ArrayBuffer(2))
    })
    const client = new EngineClient(() => channel.port1)
    const events: JobEvent[] = []
    const out = await client.process(new Uint8Array([9, 8]).buffer, 'image/jpeg', DEFAULT_SETTINGS, (e) =>
      events.push(e),
    )
    expect(events).toEqual([{ phase: 'encode', attempt: 1 }])
    expect(out).toMatchObject({ width: 3, mime: 'image/webp' })
    expect(new Uint8Array(out.bytes)).toEqual(new Uint8Array([1]))
    expect(out.preview?.byteLength).toBe(2)
  })

  it('keeps simultaneous requests apart', async () => {
    const channel = open(async (job) => result(job.bytes.length))
    const client = new EngineClient(() => channel.port1)
    const [a, b] = await Promise.all([
      client.process(new ArrayBuffer(1), '', DEFAULT_SETTINGS, () => {}),
      client.process(new ArrayBuffer(2), '', DEFAULT_SETTINGS, () => {}),
    ])
    expect([a.width, b.width]).toEqual([1, 2])
  })

  it('passes errors back as errors', async () => {
    const channel = open(async () => Promise.reject(new Error('Out of memory')))
    const client = new EngineClient(() => channel.port1)
    await expect(client.process(new ArrayBuffer(1), '', DEFAULT_SETTINGS, () => {})).rejects.toThrow('Out of memory')
  })

  it('cancels by replacing the worker, without waiting for the encoder', async () => {
    const first = open(() => new Promise(() => {}))
    const second = open(async () => result(5))
    const terminated: number[] = []
    const workers = [first, second].map((channel, k) =>
      Object.assign(channel.port1, { terminate: () => terminated.push(k) }),
    )
    let started = 0
    const client = new EngineClient(() => workers[started++])

    const controller = new AbortController()
    const job = client.process(new ArrayBuffer(1), '', DEFAULT_SETTINGS, () => {}, controller.signal)
    controller.abort()
    const error = await job.catch((e) => e)
    expect(error).toBeInstanceOf(DOMException)
    expect(error.name).toBe('AbortError')
    expect(terminated).toEqual([0])
    expect((await client.process(new ArrayBuffer(1), '', DEFAULT_SETTINGS, () => {})).width).toBe(5)
  })

  it("doesn't replace the worker for a job that has finished", async () => {
    let started = 0
    const channel = open(async () => result(1))
    const client = new EngineClient(() => (started++, channel.port1))
    const controller = new AbortController()
    await client.process(new ArrayBuffer(1), '', DEFAULT_SETTINGS, () => {}, controller.signal)
    controller.abort()
    expect(started).toBe(1)
  })
})
