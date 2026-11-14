import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

if (typeof window !== 'undefined') {
  const { cleanup } = await import('@testing-library/react')
  afterEach(cleanup)

  // jsdom has no layout, so nothing to observe.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // Nor media queries: the system is always light.
  window.matchMedia ??= () =>
    ({ matches: false, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList
  let urls = 0
  URL.createObjectURL ??= () => `blob:test/${++urls}`
  URL.revokeObjectURL ??= () => {}
}
