import { Check, Moon, Sun, SunMoon } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useTheme } from '@/hooks/useTheme'
import { THEMES } from '@/lib/theme'
import { ICON_BUTTON } from './ui/Button'

const ICONS = { auto: SunMoon, light: Sun, dark: Moon }

/** Auto, light or dark; the button shows the current choice. */
export function ThemeMenu() {
  const [theme, setTheme] = useTheme()
  const Icon = ICONS[theme]
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger aria-label="Theme" className={ICON_BUTTON}>
        <Icon strokeWidth={1.75} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-36 rounded-panel bg-panel p-1 shadow-float ring-1 ring-line"
        >
          <DropdownMenu.RadioGroup value={theme} onValueChange={(value) => setTheme(value as typeof theme)}>
            {THEMES.map(({ value, label }) => {
              const ItemIcon = ICONS[value]
              return (
                <DropdownMenu.RadioItem
                  key={value}
                  value={value}
                  className="flex h-8 cursor-default items-center gap-2 rounded-[6px] px-2 text-[13px] text-ink outline-none select-none data-highlighted:bg-sunken"
                >
                  <ItemIcon className="size-4 text-ink-soft" strokeWidth={1.75} />
                  {label}
                  <DropdownMenu.ItemIndicator className="ml-auto pl-3">
                    <Check className="size-4" />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              )
            })}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
