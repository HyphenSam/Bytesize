# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite, React 19, TypeScript, Tailwind v4, Radix primitives, Vitest; pnpm. Static site on Cloudflare
Pages; the codecs are jSquash's WebAssembly builds of Squoosh's encoders, bundled with the site.
Installable PWA that works offline for the formats it has used.

## Users

Anyone with images to make smaller: people preparing photos for a website, a form with an upload
limit, a chat or an email; designers exporting assets; people converting between formats. Often many
images at once.

## Product Purpose

Compresses, converts (JPEG, WebP, AVIF, JPEG XL, PNG) and resizes images entirely on the user's
device. Success: drop a batch in, get smaller files out, see how much was saved, and check at the
pixel level that the quality is still good enough.

## Positioning

Squoosh's codecs with batches, a target file size and privacy by default: no uploads, no account,
no server, and it keeps working offline once installed. Free and open source (MIT OR Apache-2.0).

## Operating Context

- Batches of images added by drag and drop, file picker or paste; up to four compressed at once
  (one per worker); each result downloadable on its own or all as a zip.
- A comparison view (toggle, slider, side by side with shared zoom and pan) for checking results.
- The before and after sizes and the change are shown for each image and for the batch.
- AVIF and JPEG XL are slow to encode in WebAssembly (seconds per photo).

## Capabilities and Constraints

- Format: same as the original (default; GIF and BMP become PNG), JPEG, WebP (optionally lossless),
  AVIF, JPEG XL (optionally lossless), PNG (lossless, optimised by oxipng).
- Quality: a slider per lossy format, defaulting to each codec's own default (JPEG, WebP, JPEG XL 75;
  AVIF 50).
- Resize: optional maximum width and height, Lanczos3 in linear light; never scales up.
- Target file size: bisects the quality (at most about eight encodes); says when even the lowest
  quality is too large.
- Metadata: EXIF is removed by default and can be kept (JPEG, PNG, WebP). The colour profile is always
  kept where the format can carry it, and converted to sRGB where it can't (AVIF, JPEG XL).
- WebP is capped at 16383 px a side. Animated images keep only their first frame.

## Brand Commitments

- Name: Bytesize.
- Voice: plain and quiet. Short, factual labels; explains only when asked; a tool that gets out of
  the way. British spelling.
- Credit the codecs (MozJPEG, libwebp, libavif, libjxl, oxipng) and jSquash/Squoosh in About.

## Evidence on Hand

No testimonials or benchmarks are provided; don't invent them.

## Product Principles

1. The image is the hero; the interface recedes around it.
2. Nothing leaves the device, and the app says so plainly once.
3. Batches first: adding twenty images should be as easy as adding one.
4. Show the result honestly: sizes before and after, and say when a file got larger.
5. Sensible defaults; options stay out of sight until wanted.

## Accessibility & Inclusion

Keyboard operable throughout, visible focus, WCAG AA contrast in light and dark themes, reduced
motion respected.
