import { Slider } from 'radix-ui'
import { cn } from '@/lib/cn'
import { FORMAT_NAMES } from '@/lib/formats'
import {
  type FormatChoice,
  LOSSY_FORMATS,
  type LossyFormat,
  MAX_SIDE,
  resizedSize,
  type Settings,
} from '@/lib/settings'
import { NumberInput } from './ui/NumberInput'
import { Segmented } from './ui/Segmented'
import { Toggle } from './ui/Toggle'

const FORMATS: { value: FormatChoice; label: string }[] = [
  { value: 'original', label: 'Same' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'jxl', label: 'JPEG XL' },
  { value: 'png', label: 'PNG' },
]

const FORMAT_HINTS: Record<FormatChoice, string> = {
  original: 'Each image keeps its format. GIF and BMP become PNG.',
  jpeg: 'Opens anywhere. No transparency: transparent areas turn white.',
  webp: 'Smaller than JPEG, with transparency. Every current browser shows it.',
  avif: 'The smallest files, with transparency. Slow to encode.',
  jxl: 'Very small files, but not every browser and app can open them yet.',
  png: 'Lossless, so no detail is lost. Best for screenshots, logos and flat art.',
}

const RESIZE_MODES: { value: Settings['resizeMode']; label: string }[] = [
  { value: 'scale', label: 'Scale' },
  { value: 'fit', label: 'Fit within' },
]

/** The formats that can also be lossless, each with its own switch. */
const LOSSLESS = {
  webp: { key: 'webpLossless', hint: 'Keeps every pixel. Larger, but smaller than PNG.' },
  avif: { key: 'avifLossless', hint: 'Keeps every pixel, but usually larger than lossless WebP or JPEG XL.' },
  jxl: { key: 'jxlLossless', hint: 'Keeps every pixel. Larger, but smaller than PNG.' },
} as const

type LosslessFormat = keyof typeof LOSSLESS
const canBeLossless = (f: FormatChoice): f is LosslessFormat => f in LOSSLESS

/** `source`: the selected image's size, once known, to show what resizing makes of it. */
export function SettingsPanel({
  settings,
  source = null,
  onChange,
}: {
  settings: Settings
  source?: { width: number; height: number } | null
  onChange: (settings: Settings) => void
}) {
  const set = (change: Partial<Settings>) => onChange({ ...settings, ...change })
  const setQuality = (format: LossyFormat, quality: number) =>
    set({ quality: { ...settings.quality, [format]: quality } })
  const { format } = settings
  const isLossless = (f: LossyFormat) => canBeLossless(f) && settings[LOSSLESS[f].key]
  const lossless = canBeLossless(format) && isLossless(format)
  const resized = source && resizedSize(settings, source.width, source.height)

  return (
    <div className="flex flex-col gap-7">
      <Section title="Format">
        <div className="flex flex-col gap-1.5">
          <Segmented
            label="Format"
            value={format}
            options={FORMATS}
            onChange={(format) => set({ format })}
            className="grid grid-cols-3"
          />
          <p className="text-xs text-ink-soft">{FORMAT_HINTS[format]}</p>
        </div>
        {canBeLossless(format) && (
          <Toggle
            label="Lossless"
            hint={LOSSLESS[format].hint}
            checked={lossless}
            onChange={(on) => set({ [LOSSLESS[format].key]: on })}
          />
        )}
        {format === 'original' &&
          (Object.keys(LOSSLESS) as LosslessFormat[]).map((f) => (
            <Toggle
              key={f}
              label={`Lossless ${FORMAT_NAMES[f]}`}
              hint={f === 'webp' ? 'Keeps every pixel. Lossless WebPs stay lossless either way.' : LOSSLESS[f].hint}
              checked={isLossless(f)}
              onChange={(on) => set({ [LOSSLESS[f].key]: on })}
            />
          ))}
      </Section>

      {format !== 'png' && !lossless && (
        <Section title="Quality">
          {format === 'original' ? (
            LOSSY_FORMATS.filter((f) => !isLossless(f)).map((f) => (
              <RangeSlider
                key={f}
                label={FORMAT_NAMES[f]}
                name={`${FORMAT_NAMES[f]} quality`}
                value={settings.quality[f]}
                onChange={(q) => setQuality(f, q)}
              />
            ))
          ) : (
            <RangeSlider label="Quality" value={settings.quality[format]} onChange={(q) => setQuality(format, q)} />
          )}
          <p className="text-xs text-ink-soft">
            {settings.target
              ? 'With a target size, the highest quality tried.'
              : format === 'original'
                ? 'Lower is smaller. PNG and lossless WebP stay lossless.'
                : 'Lower is smaller.'}
          </p>
        </Section>
      )}

      <Section title="Size">
        <div className="flex flex-col gap-3">
          <Toggle
            label="Resize"
            hint="Keeps each image's shape. Never scales up."
            checked={settings.resize}
            onChange={(resize) => set({ resize })}
          />
          {settings.resize && (
            <Segmented
              label="Resize by"
              value={settings.resizeMode}
              options={RESIZE_MODES}
              onChange={(resizeMode) => set({ resizeMode })}
            />
          )}
          {settings.resize && settings.resizeMode === 'scale' && (
            <RangeSlider label="Scale" value={settings.scale} unit="%" onChange={(scale) => set({ scale })} />
          )}
          {settings.resize && settings.resizeMode === 'fit' && (
            <div className="flex items-center gap-2">
              <NumberInput
                label="Maximum width"
                value={settings.maxWidth}
                min={1}
                max={MAX_SIDE}
                unit="px"
                onChange={(maxWidth) => set({ maxWidth })}
                className="flex-1"
              />
              <span className="text-ink-soft" aria-hidden="true">
                ×
              </span>
              <NumberInput
                label="Maximum height"
                value={settings.maxHeight}
                min={1}
                max={MAX_SIDE}
                unit="px"
                onChange={(maxHeight) => set({ maxHeight })}
                className="flex-1"
              />
            </div>
          )}
          {settings.resize && resized && (
            <p className="text-xs text-ink-soft tabular-nums">
              {source.width} × {source.height} → {resized.width} × {resized.height}
            </p>
          )}
        </div>
        <div className="h-px bg-line" />
        <div className="flex flex-col gap-3">
          <Toggle
            label="Target file size"
            hint="Finds the highest quality under this size. Takes several tries per image."
            checked={settings.target}
            onChange={(target) => set({ target })}
          />
          {settings.target && (
            <>
              <NumberInput
                label="Target size"
                value={settings.targetKb}
                min={1}
                max={1_000_000}
                unit="kB"
                onChange={(targetKb) => set({ targetKb })}
              />
              {(format === 'png' || format === 'original' || lossless) && (
                <p className="text-xs text-ink-soft">
                  {format === 'original'
                    ? 'PNG and other lossless images are left at full quality.'
                    : 'Lossless images have no quality to lower; choose a lossy format or resize.'}
                </p>
              )}
            </>
          )}
        </div>
      </Section>

      <Section title="Metadata">
        <Toggle
          label="Keep metadata"
          hint={
            settings.keepMetadata
              ? 'Camera details, dates and location are kept in JPEG, PNG and WebP.'
              : 'Camera details, dates and location are removed.'
          }
          checked={settings.keepMetadata}
          onChange={(keepMetadata) => set({ keepMetadata })}
        />
        <p className="text-xs text-ink-soft">
          Colour profiles are always kept; AVIF and JPEG XL results are converted to sRGB instead.
        </p>
      </Section>
    </div>
  )
}

/** 1 to 100. `name`: what the thumb is called, if not `label`. */
function RangeSlider({
  label,
  name = label,
  value,
  unit = '',
  onChange,
}: {
  label: string
  name?: string
  value: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-[13px] font-medium">
        <span>{label}</span>
        <span className="text-ink-soft tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <Slider.Root
        className="relative flex h-5 touch-none items-center select-none"
        min={1}
        max={100}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      >
        <Slider.Track className="relative h-1 grow rounded-full bg-line-strong">
          <Slider.Range className="absolute h-full rounded-full bg-accent" />
        </Slider.Track>
        <Slider.Thumb
          aria-label={name}
          className="block size-4 rounded-full bg-white shadow-[0_0_0_1px_var(--color-line-strong),0_1px_3px_oklch(0_0_0/0.25)] focus-visible:outline-2 focus-visible:outline-focus"
        />
      </Slider.Root>
    </div>
  )
}

export function Section({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <h2 className="text-[13px] font-medium text-ink-soft">{title}</h2>
      {children}
    </section>
  )
}
