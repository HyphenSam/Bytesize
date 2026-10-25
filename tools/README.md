# Tools

- `icon-maskable.svg`: source of `public/icon-maskable-512.png` and `apple-touch-icon.png`; the other
  icons come from `public/icon.svg`. They were rendered with ImageMagick:
  `magick -background none -density 1600 public/icon.svg -resize 512x512 public/icon-512.png`.
