---
name: Serene Devotion
colors:
  surface: '#fff8f5'
  surface-dim: '#e3d8d0'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fef1e9'
  surface-container: '#f8ece4'
  surface-container-high: '#f2e6de'
  surface-container-highest: '#ece0d8'
  on-surface: '#201b16'
  on-surface-variant: '#53433c'
  inverse-surface: '#362f2a'
  inverse-on-surface: '#fbeee6'
  outline: '#86736b'
  outline-variant: '#d9c2b8'
  surface-tint: '#8f4c29'
  primary: '#6f3312'
  on-primary: '#ffffff'
  primary-container: '#8c4a27'
  on-primary-container: '#ffc9b0'
  inverse-primary: '#ffb693'
  secondary: '#47654e'
  on-secondary: '#ffffff'
  secondary-container: '#c9ebcd'
  on-secondary-container: '#4d6b53'
  tertiary: '#633b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#835000'
  on-tertiary-container: '#ffcb91'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcb'
  primary-fixed-dim: '#ffb693'
  on-primary-fixed: '#351000'
  on-primary-fixed-variant: '#723614'
  secondary-fixed: '#c9ebcd'
  secondary-fixed-dim: '#aecfb2'
  on-secondary-fixed: '#04210e'
  on-secondary-fixed-variant: '#304d37'
  tertiary-fixed: '#ffddba'
  tertiary-fixed-dim: '#ffb964'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#663e00'
  background: '#fff8f5'
  on-background: '#201b16'
  surface-variant: '#ece0d8'
typography:
  display-lg:
    fontFamily: Merriweather
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 48px
  display-lg-mobile:
    fontFamily: Merriweather
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 38px
  headline-lg:
    fontFamily: Merriweather
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 38px
  headline-lg-mobile:
    fontFamily: Merriweather
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Merriweather
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 30px
  scripture-hero:
    fontFamily: Merriweather
    fontSize: 24px
    fontWeight: '300'
    lineHeight: 40px
    letterSpacing: 0.01em
  scripture-body:
    fontFamily: Merriweather
    fontSize: 18px
    fontWeight: '300'
    lineHeight: 32px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.03em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

The brand personality is contemplative, warm, reverent, and quietly encouraging. Designed to foster daily reflection, scripture retention, and spiritual intimacy, the interface eschews transactional urgency and gamified noise in favor of mindful pacing, literary dignity, and sanctuary-like focus.

### Design Movement & Aesthetic
The design system combines **Warm Editorial Minimalism** with **Tactile Modernist Restraint**:
- Generous breathing margins and parchment-toned surfaces evoke fine book design, archival paper, and natural sacred elements like aged olive wood and olive oil.
- Tactile warmth is achieved through organic micro-elevations, fine-hairline separators, and buttery surface tiers that feel like physical study cards and cloth-bound journals.
- Interface elements recede gracefully, allowing the sacred text to stand forward with timeless poise.

## Colors

The palette draws deeply from historical parchment, natural pigments, olive groves, and illuminated manuscripts. Every tone maintains low saturation and balanced warmth to avoid screen fatigue during prolonged devotional reading and evening prayers.

### Functional Roles
- **Primary (`#8C4A27`) — Terracotta Wood**: Anchor tone for primary interactive actions, high-priority devotional prompts, and focus states. Represents warmth, earth, and continuity.
- **Secondary (`#4D6B53`) — Sage Olive**: Used for states of completion, mastery ("Dominado"), affirmation, and steady growth.
- **Tertiary (`#B87A28`) — Sacred Amber**: Used for active learning ("Decorando"), active streaks, and illuminated bookmarks.
- **Neutral (`#2C2621`) — Deep Espresso**: Replaces harsh pitch-black for all core reading typography, providing deep contrast with soft eye-strain characteristics.

### Surface Architecture
- **Base Canvas (`#F9F6F0`)**: Warm antique vellum canvas that grounds the entire screen.
- **Surface Elevation 1 (`#FFFFFF`)**: Pure warm white cards and interactive memorization tiles.
- **Surface Muted (`#F0EAE1`)**: Subtle inset containers, unselected tab pills, and segmented tracks.
- **Borders & Dividers (`#E5DDD0`)**: Warm-neutral hairline strokes (1px) preserving structural clarity without visual friction.

## Typography

The typographic hierarchy establishes a deliberate dual-engine structure:
1. **Sacred & Contemplative Voice (Merriweather)**: Imparts literary authority, warmth, and traditional editorial cadence to Bible passages, daily reflection titles, and flashcard scripture fronts. Line heights are purposefully generous (`1.7x`–`1.8x`) to ensure smooth scanning and deep reading immersion.
2. **System & Interaction Voice (Plus Jakarta Sans)**: Ensures instant legibility for status badges, navigational labels, micro-copy, timestamps, and study controls.

### Editorial Guidelines
- Use italic styling (`Merriweather Italic`) exclusively for biblical citations, contextual commentaries, and chapter references (e.g., *Salmos 23:1-3*).
- Maintain optical rhythm by keeping scripture lines within 55–70 characters per line on mobile devices.

## Layout & Spacing

The layout follows an organic single-column stack designed primarily for comfortable one-handed mobile navigation (thumb-zone ergonomics).

### Spatial Rhythm
- **Canvas Margins**: Standardized to `1.25rem` (20px) on mobile viewports to provide reading calmness while maximizing screen real estate for verses.
- **Section Rhythm**: A vertical baseline rhythm of `space-xl` (36px) divides distinct spiritual modules (e.g., "Versículo do Dia" to "Prática de Memorização").
- **Thumb Zone Safety**: Key interactive triggers (flashcard flip, check-ins, advance actions) are anchored to the bottom third of the viewport with a minimum touch target height of 48px.

## Elevation & Depth

Visual depth is achieved through layered warm surfaces paired with diffused, amber-tinted ambient shadows that mimic soft daylight on fine cardstock.

### Depth Hierarchy
- **Level 0 (Flat Canvas)**: `#F9F6F0` (Base background).
- **Level 1 (Resting Cards & Devotional Tiles)**: Background `#FFFFFF`, 1px border `#E5DDD0`, shadow `0 2px 8px rgba(44, 38, 33, 0.04), 0 1px 2px rgba(44, 38, 33, 0.02)`.
- **Level 2 (Active Memorization Flashcards & Modals)**: Background `#FFFFFF`, 1px border `#DFD5C6`, shadow `0 8px 24px rgba(77, 56, 38, 0.08), 0 2px 6px rgba(77, 56, 38, 0.04)`.
- **Level 3 (Floating Persistent Controls & Bottom Trays)**: Background `#FFFFFF` with 95% opacity blur, shadow `0 12px 32px rgba(44, 38, 33, 0.12)`.

## Shapes

The shape system emphasizes friendly organic geometry with reassuring curves that convey gentleness and approachability. 

- **Cards & Interactive Containers**: Bound by `rounded-lg` (1rem / 16px) for tactile softness.
- **Badges, Pills & Primary CTAs**: Bound by continuous full-radius pill styling (`rounded-full` / 9999px) to invite direct fingertip contact.
- **Flashcards**: Crafted with a distinct `rounded-xl` (1.5rem / 24px) radius, creating a clear physical association with hand-held study cards.

## Components

### 1. Flashcards de Memorização
- **Surface**: Pure `#FFFFFF` resting on parchment background with `rounded-xl` corners and Level 2 elevation.
- **Verso/Frente Transition**: Smooth 3D flip animation (350ms ease-out) accompanied by subtle tactile haptic feedback.
- **Scripture Content**: Displayed in `scripture-hero` typography with centered optical alignment and 1.7x line-height.
- **Reference Label**: Positioned below the passage in `label-md`, styled with tertiary amber tinting.

### 2. Status Badges & Pills
- **Dominado (Mastered)**: 
  - Background: Soft sage tint (`#EBF2EC`).
  - Text & Dot Indicator: Sage Olive (`#4D6B53`).
  - Typography: `label-sm` in uppercase with subtle tracking.
- **Decorando (Practicing)**: 
  - Background: Soft amber tint (`#FAF3E7`).
  - Text & Dot Indicator: Sacred Amber (`#B87A28`).
- **Missão Diária (Daily Quest)**: 
  - Background: Soft terracotta tint (`#F9EFEA`).
  - Text & Dot Indicator: Terracotta Wood (`#8C4A27`).

### 3. Buttons & Thumb Actions
- **Primary CTA**: Full pill shape (`rounded-full`), height 52px, filled with Terracotta Wood (`#8C4A27`), typography `label-lg` in `#FFFFFF`. Shadow: `0 4px 14px rgba(140, 74, 39, 0.25)`.
- **Secondary / Flip Action**: Off-white background (`#FFFFFF`), 1.5px border (`#E5DDD0`), text color Neutral (`#2C2621`).
- **Touch Targets**: Minimum tapping dimension of 48px across all interactions.

### 4. Progress Bars (Hábitos & Metas)
- **Track**: Height 8px, background `#EDE5DA`, shape `rounded-full`.
- **Indicator**: Solid gradient transitioning smoothly from Sacred Amber (`#B87A28`) to Sage Olive (`#4D6B53`) upon habit completion.

### 5. Input Fields (Reflexão & Diário)
- **Container**: White surface with 1px border `#E5DDD0` and `rounded-lg` corners.
- **Focus State**: Border transitions to Terracotta (`#8C4A27`) with an ambient 3px glow ring in `rgba(140, 74, 39, 0.12)`.
- **Placeholder**: Muted warm stone tone (`#8F857B`).