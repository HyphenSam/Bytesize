import { describe, expect, it } from 'vitest'
import { FALLBACK_APPS, isCurrentApp, parseApps } from './apps'

const BASE = 'https://apps.hyphensam.com/apps.json'

describe('parseApps', () => {
  it('reads each app, resolving icons against the list', () => {
    const apps = parseApps(
      { apps: [{ name: 'Moviola', url: 'https://moviola.hyphensam.com/', icon: 'icons/moviola.svg' }] },
      BASE,
    )
    expect(apps).toEqual([
      { name: 'Moviola', url: 'https://moviola.hyphensam.com/', icon: 'https://apps.hyphensam.com/icons/moviola.svg' },
    ])
  })

  it('drops entries that are incomplete or would not open a web page', () => {
    const apps = parseApps(
      {
        apps: [
          { name: 'Good', url: 'https://good.example/', icon: '/good.svg' },
          { name: 'No icon', url: 'https://x.example/' },
          { name: 'Script', url: 'javascript:alert(1)', icon: '/x.svg' },
          { name: 'Plain', url: 'http://x.example/', icon: '/x.svg' },
          { name: 'Bad icon', url: 'https://x.example/', icon: 'data:image/svg+xml,<svg/>' },
          { name: '', url: 'https://x.example/', icon: '/x.svg' },
          'nonsense',
        ],
      },
      BASE,
    )
    expect(apps?.map((a) => a.name)).toEqual(['Good'])
  })

  it('gives null when nothing usable is there', () => {
    expect(parseApps(null, BASE)).toBeNull()
    expect(parseApps({ apps: 'no' }, BASE)).toBeNull()
    expect(parseApps({ apps: [] }, BASE)).toBeNull()
    expect(parseApps({ apps: [{ name: 'x' }] }, BASE)).toBeNull()
  })
})

describe('FALLBACK_APPS', () => {
  it('lists the sister sites, Bytesize among them', () => {
    expect(FALLBACK_APPS.map((a) => a.name)).toEqual(['Bytesize', 'Art Cleaner', 'Moviola'])
  })
})

describe('isCurrentApp', () => {
  it('matches on origin', () => {
    const app = { name: 'Bytesize', url: 'https://bytesize.hyphensam.com/', icon: '' }
    expect(isCurrentApp(app, 'https://bytesize.hyphensam.com')).toBe(true)
    expect(isCurrentApp(app, 'https://moviola.hyphensam.com')).toBe(false)
  })
})
