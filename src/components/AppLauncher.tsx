import { Grip } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useRef, useState } from 'react'
import { type AppLink, APPS_URL, FALLBACK_APPS, isCurrentApp, parseApps } from '@/lib/apps'
import { cn } from '@/lib/cn'
import { ICON_BUTTON } from './ui/Button'

async function loadApps(): Promise<AppLink[] | null> {
  const response = await fetch(APPS_URL)
  return response.ok ? parseApps(await response.json(), response.url || APPS_URL) : null
}

/** The sister sites, as a grid of icons. Shows the built-in list until the
 * shared one arrives, and keeps it if that fails (offline, say). The list is
 * asked for on first opening, so nothing is requested for anyone who never
 * opens it. */
export function AppLauncher({ load = loadApps }: { load?: () => Promise<AppLink[] | null> }) {
  const [apps, setApps] = useState(FALLBACK_APPS)
  const asked = useRef(false)

  function opened(open: boolean) {
    if (!open || asked.current) return
    asked.current = true
    load()
      .then((list) => list && setApps(list))
      .catch(() => {})
  }

  return (
    <Popover.Root onOpenChange={opened}>
      <Popover.Trigger aria-label="Apps" className={ICON_BUTTON}>
        <Grip strokeWidth={1.75} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label="Apps"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 w-[19rem] max-w-[calc(100vw-1rem)] rounded-panel bg-panel p-2 shadow-float ring-1 ring-line outline-none"
        >
          <ul className="grid grid-cols-3 gap-1">
            {apps.map((app) => (
              <li key={app.url}>
                <AppTile app={app} current={isCurrentApp(app, location.origin)} />
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

const TILE = 'flex flex-col items-center gap-2 rounded-control px-1 pt-3 pb-2.5 text-center text-[13px] leading-tight'

function AppTile({ app, current }: { app: AppLink; current: boolean }) {
  const [broken, setBroken] = useState(false)
  const content = (
    <>
      {broken ? (
        <span
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-[10px] bg-sunken text-base font-semibold text-ink-soft"
        >
          {app.name[0]}
        </span>
      ) : (
        <img src={app.icon} alt="" crossOrigin="anonymous" className="size-10" onError={() => setBroken(true)} />
      )}
      <span className="w-full truncate">{app.name}</span>
    </>
  )
  // The app you're in is marked, not linked: opening it again would only
  // start a second copy.
  return current ? (
    <div aria-current="page" className={cn(TILE, 'bg-sunken text-ink ring-1 ring-line-strong ring-inset')}>
      {content}
    </div>
  ) : (
    <a
      href={app.url}
      target="_blank"
      rel="noopener"
      className={cn(TILE, 'text-ink no-underline transition-colors duration-150 hover:bg-sunken')}
    >
      {content}
    </a>
  )
}
