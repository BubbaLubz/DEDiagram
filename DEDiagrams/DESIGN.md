---
name: DEDiagram
description: AI-drafted, live-collaborative data pipeline architecture diagrams
colors:
  honey-oak: "#B87040"
  honey-oak-dark-mode: "#E3A854"
  pine-pale: "#D9BE95"
  cedar-deep: "#7A5233"
  sumi-charcoal: "#2B2926"
  hallway-concrete: "#A3A099"
  washi-paper: "#F7F2E7"
  corten-rust: "#A3502B"
  moss: "#5C7A4A"
  moss-dark-mode: "#7FA366"
  bg-light: "#F1EBDF"
  bg-dark: "#1C1815"
  surface-light: "#E7DFD0"
  surface-dark: "#262019"
  card-light: "#E0D6C4"
  card-dark: "#322A21"
  divider-light: "#D2C6AF"
  divider-dark: "#453B2F"
  text-light: "#241F19"
  text-dark: "#E8DFD0"
  muted-light: "#7C7264"
  muted-dark: "#9C8F7C"
  danger-light: "#A23A2E"
  danger-dark: "#E8735F"
  workspace-canvas: "#171310"
  workspace-node: "#2A2119"
  workspace-node-border: "#4A3B2C"
typography:
  display:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 300
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "JetBrains Mono, Fira Code, monospace"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  sm: "3px"
  md: "6px"
  lg: "10px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "28px"
components:
  button-primary:
    backgroundColor: "{colors.honey-oak}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    padding: "8px 18px"
  button-ai:
    backgroundColor: "{colors.washi-paper}"
    textColor: "{colors.sumi-charcoal}"
    rounded: "{rounded.sm}"
    padding: "10px 18px"
  node-card:
    backgroundColor: "{colors.workspace-node}"
    textColor: "#F1EBDF"
    rounded: "{rounded.md}"
    padding: "12px"
  edge-chip:
    backgroundColor: "{colors.workspace-canvas}"
    rounded: "{rounded.pill}"
    padding: "2px 6px"
---

# Design System: DEDiagram

## 1. Overview

**Creative North Star: "The Timber-Frame Workshop"**

DEDiagram is redesigned around two reference photographs of contemporary Japanese minimalist architecture: a living room opening onto a wood deck through a wide sliding frame, and a timber-lined hallway where diagonal light cuts across raw board-and-batten walls. Neither image is decorative flourish — they set the actual material logic of the interface. Warm honey-oak and cedar wood carry structure and primary action. Matte plaster carries the quiet background. A single near-black charcoal carries the sparing dark accent (a cushion, a pendant lamp, a stool — never more than one dark object in a room). A cool concrete gray grounds the warm palette exactly once, the way the hallway floor grounds the wood around it. Texture is never applied for its own sake: grain, board-seams, and woven paper are structural facts of the material, not filters laid on top.

This redesign explicitly tears out the previous system's AI-slop tells: the indigo→violet gradient CTA (the single most recognizable "AI-generated design" cliché), the cool GitHub-dark canvas palette, and any surface that read as a generic dashboard template. AI-touchpoint surfaces are now differentiated by material — a washi-paper grain texture, evoking the shoji screen in the reference photo — not by switching to an unrelated hue family. The whole interface should photograph like the reference images: warm, matte, grain-forward, quiet.

**Key Characteristics:**
- One wood family (pale pine → honey oak → deep cedar) carries nearly all warm surface and accent color; charcoal and concrete are used once each, deliberately, never as a competing palette.
- Texture is material, not decoration: a fine grain noise on plaster surfaces, a repeated vertical board-seam rhythm behind large empty areas, never a gradient or a glow-for-glow's-sake.
- The canvas workspace stays permanently dark (per the existing Two-Palette Rule), but re-themed warm — a shadowed timber interior at night, not a cool blue-black dev-tool dark mode.
- AI-touchpoint surfaces are marked by the washi-paper texture and a quieter, ink-charcoal button — not a different color family.

## 2. Colors

The palette is almost entirely built from one wood family plus three deliberately rare accents (charcoal, concrete, rust), matching how sparingly color appears in the reference photographs.

### Primary
- **Honey Oak** (`#B87040` light mode / `#E3A854` dark mode): the floor-wood color from the living-room photo. The app's one true accent — primary buttons, active/selected states, the canvas connection-line preview.
- **Pine Pale** (`#D9BE95`): the deck-wood color. Used for hover/lighter states of the primary accent, never as its own separate accent.
- **Cedar Deep** (`#7A5233`): the structural-beam color. Used for pressed/active states and for deeper emphasis where Honey Oak would be too light (e.g. dark-mode borders needing more weight).

### Secondary
- **Washi Paper** (`#F7F2E7`): the shoji-screen paper glow. Marks AI-touchpoint surfaces (the Generate/Edit modal) via texture and warmth, replacing the old indigo/violet gradient entirely. Paired with Sumi Charcoal text, never a gradient.

### Neutral
- **Plaster Bg** (`#F1EBDF` light / `#1C1815` dark): the outermost app background — matte, not glossy paper.
- **Plaster Surface** (`#E7DFD0` light / `#262019` dark): sidebar and panel backgrounds.
- **Plaster Card** (`#E0D6C4` light / `#322A21` dark): cards inside panels.
- **Board Seam** (`#D2C6AF` light / `#453B2F` dark): dividers, borders — named for the visible seams between wood boards in the hallway photo.
- **Ink Text** (`#241F19` light / `#E8DFD0` dark): primary text.
- **Muted Text** (`#7C7264` light / `#9C8F7C` dark): secondary/meta text.
- **Sumi Charcoal** (`#2B2926`): the one deliberate near-black — used exactly like the single dark cushion or pendant lamp in the reference photo. Reserved for a small number of specific moments (see Components), never a general dark-neutral.
- **Hallway Concrete** (`#A3A099`): the one cool note in an otherwise warm palette — used exactly once per screen at most, the way the hallway floor grounds the corridor photo.
- **Corten Rust** (`#A3502B`): the rarest accent — glimpsed once, outside, through the hallway window. Reserved for a single high-emphasis warning/highlight moment; not a general danger color (that's Danger, below).
- **Danger** (`#A23A2E` light / `#E8735F` dark): destructive actions and error states.
- **Moss** (`#5C7A4A` light / `#7FA366` dark): confirmation/success states — the plant on the dining table, used sparingly.

### Workspace (always dark — see Named Rule below)
- **Workspace Canvas** (`#171310`): the diagram's background and every edge-label chip. A warm near-black — shadowed timber at night, not cool dev-tool black.
- **Workspace Node** (`#2A2119`): the background of every component node.
- **Workspace Node Border** (`#4A3B2C`): default node border, overridden by category color on hover/select.

### Named Rules
**The One Dark Object Rule.** Sumi Charcoal appears at most once or twice per screen, the way a single dark cushion or pendant lamp anchors a warm room in the reference photos. It is never a general "neutral-900" dark color available everywhere — if you reach for it a third time on the same screen, use Cedar Deep or a plaster neutral instead.

**The Two-Palette Rule.** Chrome (sidebar, toolbar, panels, project cards) follows the light/dark theme toggle. The canvas workspace — node cards, edges, edge-label chips — does not; it is always dark, now re-themed warm rather than cool. Never make a node card or edge chip respect light mode, and never let the canvas read as cool blue-black again.

**The No-Gradient Rule.** No color gradients anywhere in the interface, on text or on fills. This was the previous system's single biggest AI-slop tell (the indigo→violet CTA) and it is now banned outright. Emphasis comes from the wood family's own value contrast (Pine Pale → Honey Oak → Cedar Deep) or from texture, never from a gradient.

## 3. Typography

**Display Font:** IBM Plex Sans (with system-ui, sans-serif fallback)
**Label/Mono Font:** JetBrains Mono (with Fira Code, monospace fallback)

**Character:** IBM Plex Sans carries all UI text. Display-scale headings drop to a light weight (300) with tightened negative tracking to read as quiet and architectural rather than loud — closer to a monograph caption than a SaaS hero. JetBrains Mono still marks anything measuring or naming the data flow itself.

### Hierarchy
- **Display** (300, 22px, 1.3 line-height, -0.01em tracking): Page-level titles. Deliberately restrained — light weight, generous line-height, no bold shouting.
- **Title** (600, 14px, 1.4 line-height): Component names, card titles, node labels.
- **Body** (400, 13px, 1.65 line-height): Descriptions, pipeline notes, form inputs. The line-height is slightly more generous than before — matching the calm, unhurried spacing of the reference interiors.
- **Label** (500, 10px, 1.4 line-height, 0.05em tracking, JetBrains Mono): Edge-type chips, category labels, technical tags.

### Named Rules
**The Quiet Display Rule.** Display-scale text is light-weight (300), never bold. Weight and emphasis in this system come from color and material, not from heavier type — a heading shouting in bold sans is the fastest way back to generic SaaS.

## 4. Elevation

Flat by default, same as before, but shadows are now warm-tinted (never pure black) to match the reference photos' soft directional light on wood grain rather than a hard studio shadow.

### Shadow Vocabulary
- **Ambient Panel** (`box-shadow: 0 4px 20px rgba(36,31,25,0.16)`): floating chrome — zoom controls, minimap, toolbar popovers.
- **Node Rest** (`box-shadow: 0 2px 8px rgba(23,19,16,0.35)`): default node card shadow.
- **Node Hover** (`box-shadow: 0 4px 16px rgba(23,19,16,0.45)`): node on hover, before selection.
- **Node Selected** (`box-shadow: 0 0 0 2px {categoryColor}44, 0 8px 24px rgba(23,19,16,0.55)`): colored ring plus a deeper lift.
- **Edge Chip Glow** (`box-shadow: 0 0 8px {edgeColor}22`, intensifying to `44` while editing): unchanged mechanism, still tinted per edge-type color.

### Named Rules
**The Warm Shadow Rule.** No shadow in this system is pure black. Every `box-shadow` and `drop-shadow` uses a warm charcoal-brown (`rgba(23,19,16,...)`), matching how shadow actually looks falling across the honey-oak wood in the reference photographs — a cool gray shadow is an immediate tell that a component wasn't designed against this system.

## 5. Components

### Texture (new — the "textured" half of the brief)
- **Plaster Grain**: a very fine, low-contrast noise texture (an SVG fractal-noise data URI, ~3% opacity) applied to large flat background areas (page bodies, empty canvas). Evokes matte plaster, not a printed pattern — it should be nearly subliminal, felt more than seen.
- **Board Seam Rhythm**: a repeated, low-contrast vertical-line pattern (thin 1px lines every 24px, at ~4% opacity against the surface color) used behind large empty chrome areas (sidebar background, empty states) — evokes the tongue-and-groove board rhythm and the louvered screen from the living-room photo. Never used behind dense content; it's a quiet backdrop, not a foreground pattern.
- **Washi Weave**: a subtle woven-paper texture (fine cross-hatch noise, ~5% opacity) reserved for AI-touchpoint surfaces only (Generate/Edit modal header). This is the AI feature's entire visual identity now — texture and warmth, not a different color family.

### Buttons
- **Shape:** 3px radius (`rounded.sm`) — sharper and more architectural than the previous system's rounded corners, matching the square timber joinery in the reference photos.
- **Primary:** solid Honey Oak, white text.
- **AI/Generate:** Washi Paper background with the Washi Weave texture, Sumi Charcoal text — quiet and textural instead of a loud gradient. This is the single biggest visual change from the old system.
- **Ghost/Icon:** transparent, muted-text color, hover reveals the Surface/Hover tint.

### Chips (edge-type & category labels)
- Unchanged mechanism (pill shape, Workspace Canvas background, colored border/glow), but edge and category colors move to an earth-tone palette (clay, indigo-dye, moss, charcoal, stone, bronze — see the sidecar's category palette) instead of saturated web defaults, so they sit naturally against the new wood tones instead of reading as neon.

### Cards / Containers (saved projects, templates, sidebar items)
- **Corner Style:** 3-6px radius — sharper than before.
- **Background:** Plaster Card, flat, with a whisper of Plaster Grain texture.
- **Border:** 1px Board Seam at rest; on hover, shifts to Honey Oak at reduced opacity.

### Node Card (signature component)
- 10px radius, 2px border — Workspace Node Border by default, shifting to category color on hover/select. Background is flat Workspace Node, now warm dark rather than cool slate. Icon tile unchanged structurally. Notes still truncate at 2 lines behind a thin divider.

### Inputs / Fields
- Transparent at rest, 1px Board Seam border while editing, sharp 3px radius. Focus shifts to 1.5px Honey Oak border.

### Navigation / Toolbar
- Single-row, 48px, icon-button field. The AI Generate button is still the one visually distinct element in the row — now via the Washi texture and quieter charcoal-on-paper treatment instead of a bright gradient.

## 6. Do's and Don'ts

### Do:
- **Do** build the palette almost entirely from the wood family (Pine Pale → Honey Oak → Cedar Deep); reach for Sumi Charcoal, Hallway Concrete, or Corten Rust only once or twice per screen, deliberately.
- **Do** texture large flat surfaces with Plaster Grain or Board Seam Rhythm at very low opacity — texture should be felt, not seen as a pattern.
- **Do** mark AI-touchpoint surfaces with the Washi Weave texture and a quiet Sumi-Charcoal-on-Washi-Paper button.
- **Do** keep every shadow warm-tinted (`rgba(23,19,16,...)`), never pure black/gray.
- **Do** keep the canvas workspace permanently dark, now warm rather than cool.

### Don't:
- **Don't** use a gradient anywhere, on text or fills — this is the single most important rule in this system. The old indigo→violet AI button is the canonical example of what NOT to do.
- **Don't** let the canvas workspace read as cool blue-black GitHub-dark again — it must feel like a shadowed timber room, not a code editor.
- **Don't** use a colored `border-left`/`border-right` stripe as an accent anywhere.
- **Don't** build a generic enterprise-SaaS look — bland panels, stock icon grids, generic stat tiles. If a screen could be mistaken for a corporate dashboard template, it's failed.
- **Don't** apply texture as a decorative pattern layered on top of a flat design — it should read as the material the surface is actually made of, at near-subliminal opacity.
