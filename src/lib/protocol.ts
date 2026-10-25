/** Messages between the page and a worker, and both ends of them: a
 * promise-based client for the page, a dispatcher for the worker. */
import type { Job, JobEvent, JobResult } from './engine'
import type { Settings } from './settings'

export type Request = { type: 'process'; id: number; bytes: ArrayBuffer; mime: string; settings: Settings }

export type Reply =
  | { type: 'event'; id: number; event: JobEvent }
  | { type: 'done'; id: number; value: JobResult }
  | { type: 'failed'; id: number; message: string }

/** A `Worker`, a `MessagePort` or the worker's `self`. */
export interface Port {
  postMessage(message: unknown, transfer: Transferable[]): void
  onmessage: ((event: MessageEvent) => void) | null
  terminate?(): void
}

export type Handler = (job: Job, onEvent: (e: JobEvent) => void) => Promise<JobResult>

type Pending = { resolve(value: JobResult): void; reject(error: unknown): void; onEvent: (e: JobEvent) => void }

export class EngineClient {
  private next = 1
  private pending = new Map<number, Pending>()
  private port: Port

  /** `start` makes a worker; it's called again to replace one that was stopped. */
  constructor(private readonly start: () => Port) {
    this.port = this.listen(start())
  }

  private listen(port: Port) {
    port.onmessage = (event: MessageEvent<Reply>) => {
      const reply = event.data
      const waiting = this.pending.get(reply.id)
      if (!waiting) return
      if (reply.type === 'event') return waiting.onEvent(reply.event)
      this.pending.delete(reply.id)
      if (reply.type === 'done') waiting.resolve(reply.value)
      else waiting.reject(new Error(reply.message))
    }
    return port
  }

  /** An encoder can't be interrupted, so cancelling replaces the worker:
   * the job stops at once rather than when the encode finishes. */
  private restart() {
    this.port.onmessage = null
    this.port.terminate?.()
    for (const waiting of this.pending.values()) waiting.reject(new DOMException('Cancelled', 'AbortError'))
    this.pending.clear()
    this.port = this.listen(this.start())
  }

  process(bytes: ArrayBuffer, mime: string, settings: Settings, onEvent: (e: JobEvent) => void, signal?: AbortSignal) {
    const id = this.next++
    return new Promise<JobResult>((resolve, reject) => {
      if (signal?.aborted) return reject(new DOMException('Cancelled', 'AbortError'))
      this.pending.set(id, { resolve, reject, onEvent })
      signal?.addEventListener('abort', () => this.pending.has(id) && this.restart(), { once: true })
      this.port.postMessage({ type: 'process', id, bytes, mime, settings } satisfies Request, [bytes])
    })
  }
}

/** Answers the client's requests with `handle`. */
export function serve(port: Port, handle: Handler) {
  port.onmessage = async (event: MessageEvent<Request>) => {
    const { id, bytes, mime, settings } = event.data
    const onEvent = (e: JobEvent) => port.postMessage({ type: 'event', id, event: e } satisfies Reply, [])
    try {
      const value = await handle({ bytes: new Uint8Array(bytes), type: mime, settings }, onEvent)
      const transfer = value.preview ? [value.bytes, value.preview] : [value.bytes]
      port.postMessage({ type: 'done', id, value } satisfies Reply, transfer)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      port.postMessage({ type: 'failed', id, message } satisfies Reply, [])
    }
  }
}
