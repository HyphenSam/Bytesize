---
name: Bytesize
description: A quiet, neutral image utility where the image is the only colour on screen.
colors:
  accent: "oklch(0.511 0.086 186)"
  accent-hover: "oklch(0.45 0.08 187)"
  accent-soft: "oklch(0.95 0.03 186)"
  accent-text: "oklch(0.48 0.083 186)"
  focus: "oklch(0.511 0.086 186)"
  canvas: "oklch(0.975 0.002 286)"
  panel: "oklch(1 0 0)"
  stage: "oklch(0.935 0.003 286)"
  sunken: "oklch(0.955 0.003 286)"
  line: "oklch(0.905 0.005 286)"
  line-strong: "oklch(0.83 0.008 286)"
  ink: "oklch(0.21 0.006 286)"
  ink-soft: "oklch(0.45 0.012 286)"
  danger: "oklch(0.55 0.2 25)"
  ok: "oklch(0.55 0.13 155)"
typography:
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
  heading:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.45
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.45
  caption:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  control: "8px"
  panel: "12px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  section: "28px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.panel}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 14px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 14px"
  button-ghost:
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.control}"
    height: "28px"
    padding: "0 10px"
  segmented:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.control}"
    height: "32px"
  segmented-selected:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
  switch-on:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    width: "36px"
    height: "20px"
---

# Design System: Bytesize

## Overview

**Creative North Star: "The Quiet Workbench"**

A bench you bring images to: neutral surfaces, a settings column of short labelled controls, and a large stage where the image sits on plain grey. Nothing on screen competes with the image; the one teal accent marks the next thing to press and whatever is in progress. The system is Art Cleaner's, the sister app, with its own accent so the two are told apart at a glance: the category standard (a settings column beside an image stage, in the vein of Squoosh and Upscayl) finished carefully rather than reinvented.

Density is moderate: compact 13–14 px labels, tight groups, generous separation between groups. Light and dark are equal citizens and follow the system setting. Motion is limited to 150–200 ms state changes.

**Key Characteristics:**
- Zinc neutrals in OKLCH (hue 286), one teal accent (hue 186).
- System UI type with tabular figures everywhere.
- Hairline borders and tonal layers instead of shadows; one floating shadow for overlays.
- State carried by form as well as colour (dashed, filling, ticked, warned, dimmed).

## Colors

Neutral zinc greys with a single teal; the image supplies every other colour.

### Primary
- **Workbench Teal** (accent): the primary action (Compress, Download), switches that are on, slider ranges and progress bars. Hover deepens it (accent-hover); accent-text is the readable version for links; accent-soft is the text-selection and drop-overlay tint.
- **Focus** (focus): focus rings and the selected thumbnail's ring. The accent in light; in dark, the lighter accent-text, since teal dark enough to carry white text is too dark to stand out on the dark panels.

### Neutral
- **Canvas** (canvas): the page behind everything.
- **Panel** (panel): the settings column, toolbars and the batch strip.
- **Stage** (stage): the image area; a checkerboard shows only under transparent pixels.
- **Sunken** (sunken): segmented-control tracks and hover fills.
- **Hairline** (line, line-strong): dividers and control outlines; line-strong also marks waiting thumbnails (dashed).
- **Ink** (ink, ink-soft): text and secondary text, both at least 4.5:1 on panel and canvas.
- **Danger / OK** (danger, ok): a failed image's ring and badge; a finished image's tick.

Dark mode redefines every token under `prefers-color-scheme: dark` (canvas 0.165 L, panel 0.2 L, stage 0.13 L, ink 0.965 L) in `src/index.css`. The accent stays at 0.511 L: white text on teal holds AA only up to about 0.53 L.

### Named Rules
**The Image Owns Colour Rule.** Nothing but the teal accent and the two status colours carries chroma. The stage stays neutral grey so colours and compression artefacts can be judged.

**The Accent Means Act Rule.** Teal appears only on the next action, the current selection, focus and progress; never as decoration.

## Typography

**Body Font:** the platform UI face (system-ui stack), no web fonts, so the app works offline and feels native.

**Character:** plain and quiet; weight and size do the ranking, never case or tracking.

### Hierarchy
- **Title** (600, 18px): the empty stage's "Drop images here"; the About dialog's title is 16px.
- **Heading** (600, 14px): the app name (15px).
- **Body** (400, 14px, 1.45): dialog prose and button text.
- **Label** (500, 13px): section headings (sentence case, ink-soft), field labels, segmented options, file names.
- **Caption** (400, 12px): hints under controls, status lines, file sizes.

### Named Rules
**The Sentence Case Rule.** Headings and labels are sentence case at normal tracking. No uppercase tracked labels or eyebrows.

## Layout

Desktop (1024 px and up): a two-column grid, a 320 px settings column (header, scrolling settings, the Compress button pinned at its foot) beside a stage that fills the rest; the stage has a toolbar row on top and the batch strip at the bottom. The page itself never scrolls.

Mobile: one column in reading order: header, stage (at least 62% of the viewport height), batch strip, settings; the Compress button is fixed to the bottom of the screen. Toolbars wrap rather than truncate.

Spacing: 4 px base; 8–12 px inside groups, 16–20 px panel padding, 28 px between settings sections.

## Elevation & Depth

Flat by default: depth comes from tonal layers (canvas, panel, stage, sunken) and 1 px hairlines. One shadow, `--shadow-float`, is reserved for things that float above the page: dialogs, the update notice, a thumbnail's remove button. Labels over the image use a translucent black chip with a small backdrop blur for legibility on any artwork.

### Named Rules
**The Flat-By-Default Rule.** Surfaces don't cast shadows at rest; only overlays float.

## Shapes

Gently rounded: 8 px for controls and thumbnails, 6 px for a segmented option inside its 8 px track, 12 px for panels, dialogs and the drop area, full pills for switches and status badges. The empty stage uses a 2 px dashed outline as the drop target.

## Components

### Buttons
- **Shape:** gently rounded (8px); heights 28 / 36 / 44 px.
- **Primary:** teal with white text; hover deepens; disabled turns line-strong grey.
- **Secondary:** panel fill with a 1 px line-strong ring; hover fills sunken.
- **Ghost:** ink-soft text, sunken fill on hover. Used in toolbars (Add, Clear).
- Icons are lucide at 16 px, 1.75–2 stroke, before the label.

### Segmented control
A sunken track holding equal options (radio group, arrow keys move). The selected option lifts to panel with a hairline ring and a 1 px shadow. Used for format (six options in a 3 × 2 grid) and compare mode (options sized to their labels).

### Switch row
Label (and an optional caption) on the left, a 36×20 px switch on the right; on is teal.

### Number field
A 32 px panel-filled field with a line-strong ring and its unit (px, kB) after the number; focus thickens the ring in the focus colour. Typing is free; an invalid value goes back when the field is left.

### Quality slider
Label and value on one line, a 4 px track with a teal range and a white 16 px thumb below. With "same format", one per lossy format.

### Batch strip
64 px rounded thumbnails in a horizontal scroller. Waiting: dashed outline. Working: teal ring and a pulsing bar along the bottom (the encoders report no progress). Done: green tick badge and the size change (−83%) in a translucent chip. Failed: red ring and warning badge. Cancelled: half opacity. Selected: 2 px focus-colour ring with offset. ← and → move the selection.

### Compare stage
The original and result over the neutral stage: slider (a white hairline with a pill handle), toggle, or side by side, with shared wheel zoom and drag pan, pixelated rendering from 200%, and a small translucent zoom bar (Fit, 1:1).

## Do's and Don'ts

### Do:
- **Do** keep the stage neutral grey and let the image be the only colour.
- **Do** use the teal accent only for the next action, selection, focus and progress.
- **Do** show state by form as well as colour (dashed, bar, tick, warning, dimmed).
- **Do** use sentence-case headings at 13–14 px, ranked by weight.
- **Do** keep colour transitions to 150–200 ms.

### Don't:
- **Don't** use gradients, glass, glows or decorative shadows.
- **Don't** add uppercase tracked labels, eyebrows or numbered sections.
- **Don't** tint the stage or put colour behind the image.
- **Don't** load web fonts; the app must work offline with the system UI face.
