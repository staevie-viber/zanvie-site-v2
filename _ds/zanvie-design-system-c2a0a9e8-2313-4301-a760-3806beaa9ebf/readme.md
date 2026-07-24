# Zanvie Design System

**Zanvie Publicidade e Tráfego Pago** is a Brazilian digital-marketing agency. It
helps small and medium businesses turn online presence into real results through
paid-traffic management (Meta Ads and Google Ads), landing-page creation, and
strategic social-media content. Positioning is sophisticated and direct:
"comunicação com propósito, não apenas postagem por postar" — communication with
purpose, not posting for posting's sake.

This is a brand-guidelines-only design system: no codebase, Figma file, or slide
deck was attached. Everything here was built from:
- `uploads/LOGO-ZANVIE-SEMFUNDO.png` — the wordmark/logo
- `uploads/Fraunces-Italic-Variable.ttf`, `uploads/Inter-Variable.ttf`,
  `uploads/Inter-Italic-Variable.ttf` — supplied webfonts
- A written visual-identity brief (see below), no other source material

If a Figma file, website codebase, or additional decks exist, attach them and this
system should be rebuilt/extended against that ground truth rather than the
brand-guidelines approximation here.

## The two-style system

The brief calls for **two alternating visual styles**, switching section to
section so no single design reads in one style start to finish. Every section
should contrast with the one before it (photo vs. solid color, dark vs. light).

**Estilo 1 — Editorial / Lifestyle** (used for hero/opening and storytelling
blocks): full-bleed photography of sophisticated, warm environments (wood,
marble, plants, coffee, terracotta armchairs) under a subtle dark overlay. Pure
white text, with select keywords (never whole phrases) picked out in purple
`#7c5cfc` or orange `#ff5a2e`. Display type is italic Fraunces for
emotionally-weighted words; thin uppercase tracked sans (Inter) for captions and
quiet CTAs. Tone: "quiet luxury" — restrained, business, never shouted.

**Estilo 2 — Bold Graphic** (used for attention hooks, pattern breaks, proof/
argument blocks): solid background, black-ish or white, with grain/halftone
texture, cut-out magazine-style collage, hand-drawn icons (stars, dashes,
arrows). Bold/condensed sans-serif type in blocks of color — white + orange on
black backgrounds, black + orange on white backgrounds.

Recurring elements across both styles: glass/blur cards with rounded corners;
purple→orange text gradient used sparingly; strikethrough copy for "myth vs.
truth" contrasts; a thin vertical purple/orange divider bar beside text blocks;
WhatsApp as the primary conversion CTA everywhere.

## Content fundamentals

- **Voice**: direct, consultivo (consultative), never apelativo (pushy/salesy).
  Communicates value and strategy — not discounts or cheap urgency.
- **Language**: Portuguese (Brazil). Copy speaks to the client in second person
  ("sua empresa", "seu negócio") — a professional "você", not overly casual "tu".
- **Casing**: sentence case for body copy; uppercase with wide letter-spacing
  reserved for small labels, eyebrows, and CTA buttons only — never for headlines.
- **Emphasis, not decoration**: only single words or short phrases get color
  (purple or orange) or italic treatment — never a whole colored sentence. This
  keeps the "quiet luxury" restraint; over-coloring reads as loud/cheap.
- **Emoji**: not part of the brand. Do not use emoji in Zanvie copy or UI.
- **Example headline pattern**: plain sans-serif sentence with one italic
  Fraunces keyword in purple or orange — e.g. "Presença online que vira
  *resultado*." with "resultado" in italic orange.
- **Myth vs. truth structure**: a struck-through claim followed by the real
  claim, e.g. ~~"postar todo dia gera vendas"~~ → "estratégia gera vendas" — used
  to reframe common misconceptions about social media marketing.
- **CTA copy**: short, direct, action-first — "Falar no WhatsApp", "Ver
  proposta", never "Compre agora!!!" style urgency.

## Visual foundations

- **Color**: fixed palette — purple `#7c5cfc`, orange `#ff5a2e`, near-black
  `#0a0a0b`, white. Black and white are both valid section backgrounds
  (alternate them for rhythm); purple and orange are accent-only, never used as
  large background fields. A purple→orange gradient exists but is reserved for
  small text/accent moments (a highlighted word, a divider, an icon glow) — not
  full backgrounds or buttons.
- **Type**: Onest carries display/headline moments — the one or two keywords
  per headline that carry emotional weight — while Space Grotesk is the
  workhorse for body copy, UI text, and — set uppercase with wide tracking —
  labels/captions/CTAs. Onest was supplied as a variable-weight TTF; Space
  Grotesk is loaded from Google Fonts (no files were supplied for it —
  flagged below). Earlier pairings (Fraunces Italic + Inter, then SF Pro
  Display + Space Grotesk) are still present in `assets/fonts/` but no
  longer wired into `styles.css`, in case of a revert.
- **Backgrounds**: alternate between full-bleed photography (Estilo 1, always
  with a dark overlay for text contrast) and flat solid color with grain/
  halftone texture (Estilo 2). No busy repeating patterns; texture is subtle
  grain, not a decorative motif.
- **Cards**: glass/blur effect (`backdrop-filter: blur`) with translucent fill,
  a hairline border, and generously rounded corners (`--radius-lg`/`--radius-xl`).
  Same recipe on both dark and light sections, tuned per-surface (see
  `--surface-glass-on-dark` / `--surface-glass-on-light` tokens).
  Elevation is a soft, low-contrast shadow, never a hard drop shadow.
- **Corner radii**: generous throughout — buttons and chips use pill radius;
  cards and images use `--radius-lg`/`--radius-xl` (20–28px), never sharp
  corners on content containers.
- **Borders**: hairline, low-opacity (white on dark, near-black on light) —
  borders are structural (defining glass-card edges), not decorative color.
- **Dividers**: a thin (3px) solid vertical bar in purple or orange sits beside
  a block of text as a section marker — the system's signature layout device.
- **Strikethrough**: used specifically for the myth→truth copy pattern, plain
  `text-decoration: line-through`, no color change on the struck text itself.
- **Shadows**: soft and dark-neutral for elevation (`--shadow-sm/md/lg`); on
  key CTAs or highlighted numerals, a soft color glow (`--shadow-glow-purple`,
  `--shadow-glow-orange`) instead of a dark shadow.
- **Imagery color vibe**: warm, natural, sophisticated — wood tones, marble,
  terracotta, greenery, coffee. Never cold/blue-toned or clinical. A subtle
  dark overlay always sits between photo and text for legibility ("quiet
  luxury", not high-contrast/punchy).
- **Animation**: minimal and confident — fades and gentle upward slides on
  entrance, `--ease-standard` cubic-bezier, no bounce/elastic easing, no
  decorative looping motion. Motion supports readability, it doesn't perform.
- **Hover states**: subtle darken/lighten of fill (10–15%), never a color hue
  change; underlines appear on text links; glass cards lift 2–4px with a
  slightly stronger shadow.
- **Press/active states**: a slight scale-down (~0.97) plus an immediate
  (no-transition or very fast) darken — communicates a tactile, decisive click.
- **Transparency & blur**: reserved for cards/panels sitting on top of photo or
  textured backgrounds — never on typography itself, never as a whole-page
  effect.
- **Layout**: centered content column with a max width (`--container-max:
  1200px`), generous vertical rhythm between sections (`--space-8`–`--space-10`),
  WhatsApp CTA fixed/prominent near the end of every conversion-oriented page.

## Iconography

No icon set, icon font, or SVG sprite was supplied with the brand materials.
The brief mentions **hand-drawn marks** (stars, dashes, arrows) as a texture
element within Estilo 2 — these read as loose illustrative marks, not a
systematic icon set, and are not something to fabricate here (this system does
not draw or generate new icons/SVGs). For any UI that needs a real functional
icon (nav chevrons, check-marks, social/WhatsApp glyph, etc.), the closest
same-weight CDN match is **Lucide** (lucide.dev, stroke-based, rounded joins —
close to the brand's soft/rounded geometry), linked from CDN in the components
that need it. This substitution is flagged here rather than silently baked in.
Emoji are not used anywhere in the brand.

## Caveats — please help iterate

- **No Figma / codebase / deck was attached.** This entire system — components,
  UI kit, tone — is inferred from the written brief + logo + fonts alone. If
  Zanvie has an existing site, ad templates, or a Figma file, attach it and this
  system should be corrected against that ground truth.
- **Estilo 2 (bold graphic) was made the majority style** and italic type was
  removed from most sections at the user's request — a deliberate departure
  from the brief's original 50/50 alternation and italic-forward Fraunces
  voice. If a more even split or more italic accents are wanted back, say so.
- **Type system was swapped twice at the user's request** — from the
  original brief's Fraunces Italic + Inter, to SF Pro Display + Space
  Grotesk, to the current Onest + Space Grotesk. Space Grotesk has no
  supplied font files — it's loaded from Google Fonts as a CDN substitute;
  send real files if you have them.
- **No icon set supplied** — Lucide (CDN) is used as the closest stroke-icon
  match; swap for a real Zanvie icon set if one exists.
- **No photography supplied** for the Estilo 1 editorial backgrounds — the UI
  kit uses placeholder/generic-toned images (warm wood/marble/plant scenes) as
  stand-ins. Replace with real Zanvie brand photography.
- Component inventory below is a standard set sized to this brief, not
  derived from an existing product.

### Components — full list

- `components/core/` — **Button** (primary/secondary/whatsapp/ghost),
  **Badge**, **Tag**, **Card** (glass/blur), **Divider** (accent bar + text),
  **SectionLabel** (tracked uppercase eyebrow)
- `components/forms/` — **Input**, **Select**, **Checkbox**, **Radio**,
  **Switch**
- `components/navigation/` — **Tabs**
- `components/feedback/` — **Dialog**

### Intentional additions

None beyond the standard primitives above — every component here is a
brand-agnostic UI building block needed to assemble the landing page and any
future screens (forms, CTAs, cards, tabs, modals). No brand-specific
component (e.g. a "campaign result" widget) was added without a source to
justify its exact shape.

## Index

- `styles.css` — root stylesheet, imports everything in `tokens/`
- `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css`,
  `tokens/fonts.css` — design tokens and `@font-face`
- `assets/logo/` — Zanvie wordmark (transparent PNG, white text — use on dark
  or colored backgrounds)
- `assets/fonts/` — supplied Fraunces + Inter variable TTFs
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand)
- `components/core/` — Button, Badge, Tag, Card, Divider, SectionLabel
- `components/forms/` — Input, Select, Checkbox, Radio, Switch
- `components/navigation/` — Tabs
- `components/feedback/` — Dialog
- `ui_kits/landing-page/` — full landing-page recreation (`index.html`)
  demonstrating both alternating styles
- `SKILL.md` — Claude Code–compatible skill wrapper for this design system
