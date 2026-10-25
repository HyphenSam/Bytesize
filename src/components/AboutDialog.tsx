import { Info, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { APP_NAME, SOURCE_URL } from '@/lib/brand'

const CODECS = [
  { name: 'MozJPEG', url: 'https://github.com/mozilla/mozjpeg' },
  { name: 'libwebp', url: 'https://chromium.googlesource.com/webm/libwebp' },
  { name: 'libavif', url: 'https://github.com/AOMediaCodec/libavif' },
  { name: 'libjxl', url: 'https://github.com/libjxl/libjxl' },
  { name: 'oxipng', url: 'https://github.com/shssoichiro/oxipng' },
]

export function AboutDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label="About"
        className="flex size-8 items-center justify-center rounded-control text-ink-soft transition-colors duration-150 hover:bg-sunken hover:text-ink"
      >
        <Info className="size-4" strokeWidth={1.75} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-[fade_150ms_ease-out]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[85dvh] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-panel bg-panel p-6 shadow-float outline-none">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-base font-semibold">{APP_NAME}</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="-m-1 rounded-control p-1 text-ink-soft hover:bg-sunken hover:text-ink"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm text-ink-soft">
            Compresses, converts and resizes images. Everything runs in your browser on your own device; images are
            never uploaded. Once installed, it works without a connection for the formats you've used.
          </Dialog.Description>

          <h3 className="mt-6 text-[13px] font-semibold">Software</h3>
          <p className="mt-3 text-[13px] text-ink-soft">
            The codecs are{' '}
            {CODECS.map((codec, i) => (
              <span key={codec.name}>
                <a href={codec.url} target="_blank" rel="noreferrer">
                  {codec.name}
                </a>
                {i < CODECS.length - 2 ? ', ' : i === CODECS.length - 2 ? ' and ' : ''}
              </span>
            ))}
            , each under its own open-source licence, compiled to WebAssembly by{' '}
            <a href="https://github.com/jamsinclair/jSquash" target="_blank" rel="noreferrer">
              jSquash
            </a>{' '}
            (Apache-2.0) from{' '}
            <a href="https://github.com/GoogleChromeLabs/squoosh" target="_blank" rel="noreferrer">
              Squoosh
            </a>
            . {APP_NAME}'s own code is available under the MIT or Apache-2.0 licence.
          </p>
          <p className="mt-3 text-[13px]">
            <a href={SOURCE_URL} target="_blank" rel="noreferrer">
              Source code on GitHub
            </a>
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
