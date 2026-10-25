import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { UpdateBanner } from './components/UpdateBanner'
import { EngineClient, type Port } from './lib/protocol'
import './index.css'

// One worker per image at once. AVIF and JPEG XL encode on several threads
// of their own, so half the cores, and at most four: each holds its images
// and codecs in memory.
const workers = Math.min(4, Math.max(1, Math.floor((navigator.hardwareConcurrency || 2) / 2)))
const clients = Array.from(
  { length: workers },
  () =>
    new EngineClient(
      () => new Worker(new URL('./worker/engine.worker.ts', import.meta.url), { type: 'module' }) as unknown as Port,
    ),
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App clients={clients} />
    <UpdateBanner />
  </StrictMode>,
)
