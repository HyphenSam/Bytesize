/** The batch: images in the order they were added, each queued, being
 * worked on, done, failed or cancelled. A pure reducer; object URLs are
 * made and revoked by whoever dispatches. */
import type { JobEvent } from './engine'
import type { Format } from './settings'

export type Status = 'queued' | 'working' | 'done' | 'failed' | 'cancelled'

export type Result = {
  url: string
  /** What the page shows, where the browser can't show the file itself. */
  previewUrl: string | null
  name: string
  width: number
  height: number
  size: number
  source: { width: number; height: number }
  format: Format
  quality: number | null
  overTarget: boolean
}

export type Item = {
  id: string
  name: string
  /** The original file's size in bytes. */
  size: number
  originalUrl: string
  status: Status
  /** The latest progress while working. */
  event: JobEvent | null
  error?: string
  result?: Result
}

export type QueueAction =
  | { type: 'add'; items: Item[] }
  | { type: 'start'; id: string }
  | { type: 'event'; id: string; event: JobEvent }
  | { type: 'done'; id: string; result: Result }
  | { type: 'failed'; id: string; message: string }
  | { type: 'cancelled'; id: string }
  | { type: 'requeue'; ids: string[] }
  | { type: 'remove'; id: string }
  | { type: 'clear' }

export function queue(items: Item[], action: QueueAction): Item[] {
  const update = (id: string, change: (item: Item) => Item) => items.map((i) => (i.id === id ? change(i) : i))
  switch (action.type) {
    case 'add':
      return [...items, ...action.items]
    case 'start':
      return update(action.id, (i) => ({ ...i, status: 'working', event: null, error: undefined }))
    case 'event':
      return update(action.id, (i) => ({ ...i, event: action.event }))
    case 'done':
      return update(action.id, (i) => ({ ...i, status: 'done', event: null, result: action.result }))
    case 'failed':
      return update(action.id, (i) => ({ ...i, status: 'failed', event: null, error: action.message }))
    case 'cancelled':
      return update(action.id, (i) => ({ ...i, status: 'cancelled', event: null }))
    case 'requeue':
      return items.map((i) =>
        action.ids.includes(i.id) && i.status !== 'working'
          ? { ...i, status: 'queued', event: null, error: undefined, result: undefined }
          : i,
      )
    case 'remove':
      return items.filter((i) => i.id !== action.id)
    case 'clear':
      return []
  }
}

export function nextQueued(items: Item[]): Item | undefined {
  return items.find((i) => i.status === 'queued')
}

/** What a working image's status line says. Encoders report no progress of their own. */
export function progressLabel(event: JobEvent): string {
  switch (event.phase) {
    case 'decode':
      return 'Reading'
    case 'resize':
      return 'Resizing'
    case 'encode':
      return event.attempt > 1 ? `Fitting the size, try ${event.attempt}` : 'Compressing'
  }
}

/** −83% for a file that shrank to 17% of the original, +4% for one that grew. */
export function change(original: number, result: number): string {
  if (original <= 0) return ''
  const percent = Math.round((result / original - 1) * 100)
  return percent === 0 ? '±0%' : percent > 0 ? `+${percent}%` : `−${-percent}%`
}

/** Bytes before and after, over every finished image. */
export function totals(items: Item[]) {
  const done = items.filter((i) => i.result)
  return {
    done: done.length,
    before: done.reduce((sum, i) => sum + i.size, 0),
    after: done.reduce((sum, i) => sum + i.result!.size, 0),
  }
}
