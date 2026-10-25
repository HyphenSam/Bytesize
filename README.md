# Bytesize

**[bytesize.hyphensam.com](https://bytesize.hyphensam.com)**

Compresses, converts and resizes images in your browser. Images never leave your device: the
encoders run locally as WebAssembly. Install it as an app and it works offline for the formats you've
used.

- **Formats:** keep each image's own format, or convert to JPEG (MozJPEG), WebP (lossy or lossless),
  AVIF, JPEG XL (lossy or lossless) or PNG (optimised with oxipng). Opens JPEG, PNG, WebP, AVIF,
  JPEG XL, GIF and BMP.
- **Quality:** a slider per format, starting at each encoder's own default.
- **Resize:** fit within a maximum width and height (Lanczos3, in linear light); never scales up.
- **Target file size:** finds the highest quality under a size you set, such as 200 kB.
- **Metadata:** camera details, dates and location are removed unless you keep them. Colour profiles
  (Display P3 and others) are kept, or converted to sRGB for AVIF and JPEG XL.
- **Batches:** several images compressed at once, a before/after comparison (slider, toggle, side by
  side, with zoom), the size saved for each image and in total, and a zip of every result.

Animated GIFs and WebPs keep only their first frame. WebP can't be larger than 16383 px on a side.

## Licence

Licensed under either of [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE), at your option.

The codecs are [jSquash](https://github.com/jamsinclair/jSquash)'s WebAssembly builds (Apache-2.0)
of the codecs from [Squoosh](https://github.com/GoogleChromeLabs/squoosh):
[MozJPEG](https://github.com/mozilla/mozjpeg), [libwebp](https://chromium.googlesource.com/webm/libwebp),
[libavif](https://github.com/AOMediaCodec/libavif), [libjxl](https://github.com/libjxl/libjxl) and
[oxipng](https://github.com/shssoichiro/oxipng), each under its own open-source licence.

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the
work by you, as defined in the Apache-2.0 licence, shall be dual licensed as above, without any
additional terms or conditions.

## Development

Needs Node 24+ and pnpm 11 (pinned in `package.json` and `.node-version`, which Cloudflare's builds read too).

```bash
pnpm install
pnpm test          # Vitest
pnpm dev           # http://localhost:5173
```

This project is test-driven: see [CLAUDE.md](CLAUDE.md) for the rules and the architecture.

## Deploying

Cloudflare Workers Builds builds it from this repository on every push to `main` and serves it at
bytesize.hyphensam.com (a custom domain on the Worker). The Worker's build settings:

- **Build command:** `pnpm build`
- **Deploy command:** `npx wrangler deploy`

The Worker only serves the static files in `dist/`, as set in [`wrangler.jsonc`](wrangler.jsonc).
Every file is under the 25 MiB limit on static assets (the build fails if one isn't).
`public/_headers` sets the cross-origin isolation headers the AVIF and JPEG XL encoders need for
threads. To try the production build on the Workers runtime locally:
`pnpm build && pnpm exec wrangler dev`.
