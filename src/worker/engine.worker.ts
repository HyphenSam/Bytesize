/// <reference lib="webworker" />
/** A worker: owns the codecs, compresses one image at a time (the page
 * queues them, one per worker) and answers the page through `serve`. */
import { compress } from '@/lib/engine'
import { type Port, serve } from '@/lib/protocol'
import { codecs } from './codecs'

serve(self as unknown as Port, (job, onEvent) => compress(job, codecs, onEvent))
