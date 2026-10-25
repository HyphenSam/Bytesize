import { describe, expect, it } from 'vitest'
import { change, type Item, nextQueued, progressLabel, queue, type QueueAction, type Result, totals } from './queue'

const file = (id: string, size = 100): Item => ({
  id,
  name: `${id}.png`,
  size,
  originalUrl: `blob:${id}`,
  status: 'queued',
  event: null,
})
const run = (items: Item[], ...actions: QueueAction[]) => actions.reduce(queue, items)
const result = (size = 10): Result => ({
  url: 'blob:out',
  previewUrl: null,
  name: 'a.webp',
  width: 2,
  height: 3,
  size,
  source: { width: 2, height: 3 },
  format: 'webp',
  quality: 75,
  overTarget: false,
})

describe('queue', () => {
  it('adds files at the end, queued', () => {
    const items = run([], { type: 'add', items: [file('a'), file('b')] }, { type: 'add', items: [file('c')] })
    expect(items.map((i) => i.id)).toEqual(['a', 'b', 'c'])
    expect(nextQueued(items)?.id).toBe('a')
  })

  it('follows a job from start to result', () => {
    const items = run(
      [file('a'), file('b')],
      { type: 'start', id: 'a' },
      { type: 'event', id: 'a', event: { phase: 'encode', attempt: 1 } },
    )
    expect(items[0]).toMatchObject({ status: 'working', event: { phase: 'encode', attempt: 1 } })
    expect(nextQueued(items)?.id).toBe('b')

    const done = run(items, { type: 'done', id: 'a', result: result() })
    expect(done[0]).toMatchObject({ status: 'done', result: result(), event: null })
  })

  it('records failures and cancellations', () => {
    const items = run(
      [file('a'), file('b')],
      { type: 'start', id: 'a' },
      { type: 'failed', id: 'a', message: 'out of memory' },
      { type: 'start', id: 'b' },
      { type: 'cancelled', id: 'b' },
    )
    expect(items[0]).toMatchObject({ status: 'failed', error: 'out of memory' })
    expect(items[1]).toMatchObject({ status: 'cancelled' })
    expect(nextQueued(items)).toBeUndefined()
  })

  it('queues finished, failed and cancelled items again, dropping old results', () => {
    const items = run(
      [file('a'), file('b'), file('c')],
      { type: 'start', id: 'a' },
      { type: 'done', id: 'a', result: result() },
      { type: 'start', id: 'b' },
      { type: 'failed', id: 'b', message: 'x' },
      { type: 'requeue', ids: ['a', 'b'] },
    )
    expect(items.map((i) => i.status)).toEqual(['queued', 'queued', 'queued'])
    expect(items[0].result).toBeUndefined()
    expect(items[1].error).toBeUndefined()
  })

  it("doesn't requeue the item that's being worked on", () => {
    const items = run([file('a')], { type: 'start', id: 'a' }, { type: 'requeue', ids: ['a'] })
    expect(items[0].status).toBe('working')
  })

  it('removes items and clears everything', () => {
    expect(run([file('a'), file('b')], { type: 'remove', id: 'a' }).map((i) => i.id)).toEqual(['b'])
    expect(run([file('a'), file('b')], { type: 'clear' })).toEqual([])
  })
})

describe('progressLabel', () => {
  it('names each phase, and counts the tries for a target size', () => {
    expect(progressLabel({ phase: 'decode' })).toBe('Reading')
    expect(progressLabel({ phase: 'resize' })).toBe('Resizing')
    expect(progressLabel({ phase: 'encode', attempt: 1 })).toBe('Compressing')
    expect(progressLabel({ phase: 'encode', attempt: 3 })).toBe('Fitting the size, try 3')
  })
})

describe('change', () => {
  it('is the size difference as a signed percentage', () => {
    expect(change(1000, 170)).toBe('−83%')
    expect(change(1000, 1040)).toBe('+4%')
    expect(change(1000, 1001)).toBe('±0%')
    expect(change(0, 10)).toBe('')
  })
})

describe('totals', () => {
  it('adds up the finished images only', () => {
    const items = run(
      [file('a', 1000), file('b', 500), file('c', 300)],
      { type: 'done', id: 'a', result: result(200) },
      { type: 'done', id: 'b', result: result(100) },
    )
    expect(totals(items)).toEqual({ done: 2, before: 1500, after: 300 })
  })
})
