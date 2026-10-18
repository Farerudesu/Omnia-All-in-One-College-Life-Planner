---
name: Calm Horizon
colors:
  surface: '#f6fbf4'
  surface-dim: '#d7dbd5'
  surface-bright: '#f6fbf4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f5ef'
  surface-container: '#ebefe9'
  surface-container-high: '#e5e9e3'
  surface-container-highest: '#dfe4de'
  on-surface: '#181d19'
  on-surface-variant: '#3f4942'
  inverse-surface: '#2d322e'
  inverse-on-surface: '#eef2ec'
  outline: '#6f7a71'
  outline-variant: '#bec9bf'
  surface-tint: '#006d43'
  primary: '#006a41'
  on-primary: '#ffffff'
  primary-container: '#258457'
  on-primary-container: '#f6fff5'
  inverse-primary: '#7ed9a5'
  secondary: '#446651'
  on-secondary: '#ffffff'
  secondary-container: '#c1e6cc'
  on-secondary-container: '#476853'
  tertiary: '#964149'
  on-tertiary: '#ffffff'
  tertiary-container: '#b45860'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9af6c0'
  primary-fixed-dim: '#7ed9a5'
  on-primary-fixed: '#002111'
  on-primary-fixed-variant: '#005231'
  secondary-fixed: '#c6ebd1'
  secondary-fixed-dim: '#abcfb6'
  on-secondary-fixed: '#002111'
  on-secondary-fixed-variant: '#2d4d3a'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b6'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#7b2c35'
  background: '#f6fbf4'
  on-background: '#181d19'
  surface-variant: '#dfe4de'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system embodies intentional minimalism, structural clarity, and quiet efficiency. Built for high-cognitive-load planning environments, it establishes an atmosphere of calm focus, spatial breathing room, and effortless temporal navigation. 

Drawing from modern architectural minimalism and Swiss typographic discipline, the aesthetic rejects decorative noise in favor of proportion, generous white space, crisp structural lines, and purposeful micro-interactions. The emotional response is centered on control, relief, and crystalline organization—transforming busy schedules into tranquil, structured landscapes.

## Colors
The palette leverages a warm, light neutral canvas to minimize eye strain during extended scheduling sessions, contrasted with deep slate typography for sharp legibility.

- **Canvas & Surface Base:** Warm off-white (`#faf8ff`) and subtle soft slate provide base and container separation without harsh white glare.
- **Primary Accent (`#29875a`):** Reserved strictly for active temporal focal points, primary action triggers, current day highlights, and key event classifications.
- **Secondary & Tertiary Accents (`#5d7f69`, `#b65a62`):** Applied functionally to differentiate multiple calendar feeds, tag categories, and overlapping schedules with balanced visual weight.
- **Borders & Dividers:** Subtle, low-contrast slate tints establish crisp calendar grid lines and card divisions without visually cluttering the layout.

## Typography
Plus Jakarta Sans provides a clean, contemporary geometry paired with humanist warmth, yielding supreme optical balance at small sizes (essential for multi-event grid density).

- Numerical dates prioritize tabular or monospaced figure settings (`font-variant-numeric: tabular-nums`) to ensure strict vertical alignment across month and week views.
- Section dates and view headers employ negative letter-spacing for refined editorial authority, while tiny metadata badges use positive tracking to preserve legibility at 11px and 12px scales.

## Layout & Spacing
The layout follows a fluid-column structural grid nested within fixed chrome panels (collapsible sidebar navigation, fixed calendar header, adaptive viewport body).

- **Breakpoints:** Mobile (`< 768px`), Tablet (`768px - 1024px`), Desktop (`> 1024px`).
- **Desktop:** Mini-calendar, quick actions, and calendar lists occupy a persistent 280px left rail. The primary temporal viewport uses a fluid 7-column grid (month view) or multi-column timeline (week/day view) maintaining a 1.5rem gutter for clear separation.
- **Mobile/Tablet:** The sidebar collapses into a slide-over sheet. The multi-column grid condenses to a single-day vertical timeline or dynamic agenda view with reduced outer margins (`1rem`) to maximize horizontal scheduling real estate.

## Elevation & Depth
Visual hierarchy relies on low-contrast structural outlines and subtle tonal layering rather than heavy drop shadows.

- **Level 0 (Base Canvas):** Off-white base, unbordered, completely flat.
- **Level 1 (Calendar Grids & Panels):** Contained via 1px hairline borders. Time-cell boundaries inside calendar views use faint borders.
- **Level 2 (Event Blocks & Flyouts):** Soft ambient tinting (diffuse spread, 8px blur) combined with a matching semi-transparent border, ensuring clean layering over calendar grid lines.
- **Level 3 (Modals & Date Pickers):** Elevated via a clean ambient shadow and high-contrast surface isolation against an ultra-soft translucent backdrop overlay.

## Shapes
The shape language uses balanced curvature (`roundedness: 2`, base radius `0.5rem` / 8px). 

- **Calendar Event Cards:** 6px to 8px border radius, preventing visual tension at grid boundaries while maintaining a structured, architectural layout.
- **Today Indicator & Badges:** Circular (full radius) for singular date badges to draw rapid visual focus, contrasting against the rectangular grid structure.
- **Dialogs & Flyouts:** `rounded-lg` (16px) to soften larger surface areas without appearing juvenile.

## Components

### Buttons
- **Primary:** Deep brand primary fill (`#29875a`), crisp white text, 8px radius, subtle hover lift via brightness adjustment. No heavy drop shadow.
- **Secondary:** Warm slate border, transparent background, slate text, transitioning to a soft slate tint on hover.
- **Ghost / Icon:** Borderless, 8px radius, slate icon, activating with neutral washes on interaction (e.g., month navigation arrows).

### Event Cards & Indicators
- **Event Chips (Month View):** Compact 22px height, 4px inner padding, soft tint background (10% opacity of event accent color), solid 3px left border accent, `body-sm` truncated label.
- **Event Blocks (Day/Week View):** Semi-opaque background matching event theme, hairline border, internal metadata stacking (Title, Time, Location).
- **Dot Indicators:** 6px solid circular marks nested under dates in compact mobile/sidebar views.

### Input Fields & Selectors
- **Form Controls:** 40px height, 8px radius, hairline border, soft white interior. Focused state introduces a primary border with a 2px diffuse ring.

### Date Cells & Grid Headers
- **Day Cell:** Subtle border dividers, top-right numerical date label in `label-md`. Current day is signified by a solid primary-colored circle containing white text.
- **Hover State:** Faint neutral wash to indicate droppable or clickable temporal zones.

### Checkboxes & Toggle Lists (Calendar Categories)
- **Category Toggles:** Custom rounded squares (4px radius) filled with category color on check. Inactive items display a muted outline with an empty center.
- **List Items:** Minimalist 32px height rows with clean text truncation, count badges, and right-aligned action affordances visible on hover.