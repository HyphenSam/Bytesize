# Bytesize

A static web app (Cloudflare Workers, static assets only) that compresses, converts and resizes images entirely on the
user's device, with jSquash's WebAssembly codecs. Installable (PWA) and works offline for the formats
it has used. The name lives in `src/lib/brand.ts` and `vite.config.ts` (manifest) only. Its UI is
Art Cleaner's (a sister project), refitted.

## Test-driven development is mandatory

Every change to behaviour follows red, green, refactor:

1. **Red.** Write or change a test that states the behaviour. Run it (`pnpm test <file>`) and watch it
   fail for the reason you expect. A test you never saw fail proves nothing.
2. **Green.** Write the least code that makes it pass.
3. **Refactor** with the tests green, then run the whole suite (`pnpm test`) and `pnpm typecheck`.

Rules:

- No production code without a failing test first. That includes bug fixes: reproduce the bug in a
  test, then fix it.
- Don't weaken, skip or delete a test to get green. If a test is wrong, say why in the change.
- Keep logic testable: formats, settings, metadata, EXIF orientation, the quality search, resizing
  maths and file naming are pure modules in `src/lib/` with injected dependencies. They never import
  the codecs or the DOM. The worker (`src/worker/`) and React components are thin wiring over them.
- Fakes over mocks: the engine is tested with `FakeCodecs` (`src/lib/testing.ts`), whose files grow
  with quality. `metadata.test.ts` runs the real MozJPEG, libwebp and oxipng wasm in Node, so the
  metadata writers see what the encoders really write.
- Components get React Testing Library tests for behaviour users see (`// @vitest-environment jsdom`
  at the top of the file). Test what the user does and sees, not implementation details.
- Things only a real browser can show (the codecs in a worker, threads, the service worker) are
  checked by hand in the browser after the unit tests pass; say so when you report.

## Commands

```bash
pnpm install
pnpm dev              # http://localhost:5173
pnpm test             # Vitest, once
pnpm test:watch
pnpm typecheck
pnpm build            # typecheck + build to dist/; fails if any file is over the 25 MiB asset limit
pnpm preview          # serves dist/ with the same headers as production
pnpm exec wrangler dev  # serves dist/ on the Workers runtime, reading public/_headers as production does
```

## Design

PRODUCT.md (who it's for, voice, principles) and DESIGN.md (tokens and rules) are the authorities
for UI work; tokens live in `src/index.css`. Keep to them: zinc neutrals, one teal accent for action,
selection and progress (focus has its own token, lighter in dark mode), a neutral stage so the
image's colours can be judged, sentence-case labels, state shown by form as well as colour, light and
dark both first-class.

## Code style

- KISS. Small modules, plain functions, no premature abstraction.
- TypeScript strict, Prettier (no semicolons, single quotes, 120 columns).
- Comment the why, briefly, in the style of the existing code.
- UI copy uses British spelling ("colour", "optimise", "licence").
- Stack: Vite, React 19, Tailwind v4, Radix primitives (`radix-ui`), lucide icons, Vitest.
- pnpm only.

## Layout

- `src/lib/` pure logic: `engine.ts` (the job: decode, orient, resize, encode, metadata),
  `settings.ts`, `formats.ts` (sniffing, output format), `metadata.ts` (ICC and EXIF in JPEG, PNG,
  WebP), `orientation.ts` (EXIF), `containers.ts` (JPEG/PNG/RIFF block walks), `target.ts` (quality
  search), `image.ts`, `names.ts`, `queue.ts`, `protocol.ts` (page ↔ worker), `zoom.ts`.
- `src/worker/` the Web Worker: `codecs.ts` wires jSquash into the engine's `Codecs`.
- `src/components/` the UI (`ui/` holds the primitives). `src/App.tsx` puts it together; it takes
  the workers' clients as a prop so tests pass fakes. `src/main.tsx` creates the real workers.
- `src/hooks/useBatch.ts` the queue: one loop per worker, settings read when each image starts.

## How a job runs

1. Sniff the format from the bytes. The output format is the chosen one, or the original's
   ("same format"; GIF, BMP and anything unknown become PNG).
2. Decode exactly with jSquash (PNG, JPEG, WebP, JPEG XL), or through the browser (AVIF, GIF, BMP),
   which also converts to sRGB. The browser is used too when the original has an ICC profile and
   the output can't carry one (AVIF, JPEG XL), so colours are converted rather than misread.
3. Turn upright from EXIF if the decoder didn't.
4. Resize (optional) by a percentage or to fit a box, Lanczos3 in linear light, never up.
5. JPEG output: transparency is flattened onto white first.
6. Encode. With a target size and a lossy format, `fitQuality` bisects 1 to the slider's quality.
   Metadata is embedded in each attempt, so its bytes count against the target.
7. Metadata: the ICC profile is copied unchanged (JPEG, PNG, WebP). EXIF only if "Keep metadata"
   is on, with its Orientation set to 1, since the pixels were already turned.
8. JPEG XL results also get a PNG preview, decoded from the result, because most browsers can't
   show JPEG XL.

Cancelling terminates the worker and starts a new one (`EngineClient.restart`): encoders can't be
interrupted, and an AVIF encode can take many seconds.

Codec settings (in `src/worker/codecs.ts`): MozJPEG's defaults (progressive, optimised Huffman,
4:2:0); libwebp method 4; libavif speed 7 (about 2.5× faster than its default 6 for files within a
percent or two); libjxl effort 7; oxipng level 2.

## Hosting facts that bite

- Workers Builds deploys `main` with `npx wrangler deploy`, using `wrangler.jsonc` (assets only, no
  Worker script; unknown paths get `index.html`). Without that file, Wrangler tries to configure the
  project itself and fails. pnpm 11 refuses dependency install scripts it hasn't been told about, so
  `workerd` (Wrangler's runtime) is allowed in `pnpm-workspace.yaml`; a new dependency with an
  install script needs the same.
- Static assets are capped at 25 MiB a file; the largest codec wasm is about 3.5 MB.
- `public/_headers` sets COOP `same-origin` and COEP `require-corp` so the AVIF and JPEG XL encoders
  can use threads. Everything is same-origin, so nothing needs CORP headers; adding a cross-origin
  resource (fonts, analytics, a CDN) will break unless it sends them.
- The service worker precaches the app shell and caches each wasm the first time it's used, so the
  app works offline for the formats already used. Hashed file names make the cache safe forever.

## Licences

The code is MIT OR Apache-2.0. The codecs keep their own licences (all permissive); keep the credits
in About.
