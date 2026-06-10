# CSS Architecture & Design System

> **Atlas Internal Documentation**
> Week 3 — CSS Architecture, Layout & Design System
> Last updated: June 2026

---

## Overview

This document defines the CSS architecture, design system, and styling conventions for Atlas. Every visual decision in the codebase flows from the principles defined here. The goal is a consistent, maintainable, and scalable styling system that a new engineer can understand and follow without ambiguity.

---

## Table of Contents

1. [Strategy — The Hybrid Approach](#1-strategy--the-hybrid-approach)
2. [Design Tokens](#2-design-tokens)
3. [Dark Mode](#3-dark-mode)
4. [CSS Module Conventions](#4-css-module-conventions)
5. [Responsive Architecture](#5-responsive-architecture)
6. [Typography](#6-typography)
7. [Layout System](#7-layout-system)
8. [Patterns & Anti-Patterns](#8-patterns--anti-patterns)
9. [Component Style Reference](#9-component-style-reference)

---

## 1. Strategy — The Hybrid Approach

Atlas uses a deliberate hybrid of **Tailwind CSS** and **CSS Modules**, with **CSS custom properties** (design tokens) as the shared foundation. Each tool has a defined, non-overlapping responsibility.

### Tailwind CSS
Handles structural decisions that don't carry visual brand identity:
- Layout primitives: `flex`, `grid`, `flex-col`, `items-center`
- Spacing utilities: `gap-3`, `p-4` (only when a token variable would be verbose)
- Responsive breakpoint utilities: `lg:hidden`, `lg:block`

Tailwind is never used for colors, typography sizes, border radii, or shadows — these are always token variables.

### CSS Modules
Handles all visual and component-specific decisions:
- Colors — always via `var(--token-name)`
- Typography — font size, weight, line height
- Component positioning — `position: fixed`, `position: absolute`
- Animations and transitions
- Interactive states — hover, focus-visible, active
- Dark mode overrides (via `[data-theme="dark"]` token redefinition)

### CSS Custom Properties (Tokens)
The single source of truth for all visual values. Defined in `styles/tokens.css`, consumed by CSS Modules. Changing a token value cascades instantly across the entire application.

### Why This Approach
Tailwind alone produces unreadably long `className` strings for complex components and makes brand identity impossible to maintain at scale. CSS Modules alone loses the convenience of responsive utilities. The hybrid approach gives Atlas the best of both: structural convenience from Tailwind and brand consistency from tokens.

---

## 2. Design Tokens

All tokens are defined in `styles/tokens.css` as CSS custom properties on `:root`. Dark mode overrides are defined on `[data-theme="dark"]`.

### Color Palette — Zinc & Golden-Orange

The palette was chosen for its clean, minimal aesthetic with a distinctive warm accent. Zinc grays are warmer than slate, avoiding the sterile feel common in productivity dashboards. Golden-orange (`#ea8c00`) is deliberately separated from the warning orange (`#f97316`) to prevent semantic confusion between brand elements and system signals.

```css
/* Light mode (default) */
--color-background: #fafafa;       /* Page background */
--color-surface: #ffffff;          /* Cards, sidebar, header */
--color-surface-raised: #f4f4f5;   /* Hover states, elevated surfaces */
--color-border: #e4e4e7;           /* Default borders */
--color-border-strong: #d4d4d8;    /* Emphasis borders, separators */

--color-text-primary: #18181b;     /* Headings, primary content */
--color-text-secondary: #71717a;   /* Body text, nav links */
--color-text-muted: #a1a1aa;       /* Placeholders, timestamps */

--color-accent: #ea8c00;           /* Brand — buttons, active states, links */
--color-accent-hover: #c97a00;     /* Brand hover state */
--color-accent-subtle: #fef3c7;    /* Accent backgrounds, active nav */

--color-danger: #dc2626;           /* Destructive actions, errors */
--color-success: #16a34a;          /* Success states */
--color-warning: #f97316;          /* Warning states (distinct from accent) */
```

### Spacing Scale — 4px Base

All spacing in Atlas is derived from a 4px base scale, expressed in `rem` for accessibility.

```css
--space-1: 0.25rem;   /* 4px  — tight gaps, icon padding */
--space-2: 0.5rem;    /* 8px  — button padding, small gaps */
--space-3: 0.75rem;   /* 12px — nav link padding vertical */
--space-4: 1rem;      /* 16px — section padding, standard gap */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px — section separation */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px — page-level spacing */
--space-20: 5rem;     /* 80px */
```

If the design feels too compact at 4px base, migrate to 8px base by updating token values — no component code changes required.

### Border Radius

```css
--radius-sm: 4px;       /* Badges, tags, inputs, compact elements */
--radius-md: 8px;       /* Cards, buttons, nav links */
--radius-lg: 12px;      /* Modals, panels, drawers */
--radius-pill: 9999px;  /* Pill buttons, status chips, avatars */
```

### Shadows — Three Elevation Levels

```css
--shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);   /* Cards */
--shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05);   /* Dropdowns */
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.06);  /* Modals */
```

### Layout Constants

```css
--sidebar-width: 240px;   /* Fixed sidebar width — desktop only */
--header-height: 56px;    /* Fixed header height — all viewports */
```

---

## 3. Dark Mode

### Implementation

Dark mode is implemented via a `[data-theme="dark"]` attribute on the `<html>` element. CSS Modules consume token variables — when the attribute changes, all token values update automatically and the entire UI re-renders without a page reload.

```css
[data-theme="dark"] {
  --color-background: #18181b;
  --color-surface: #27272a;
  --color-surface-raised: #3f3f46;
  --color-border: #3f3f46;
  --color-border-strong: #52525b;
  --color-text-primary: #fafafa;
  --color-text-secondary: #a1a1aa;
  --color-text-muted: #71717a;
  --color-accent: #fbbf24;
  --color-accent-hover: #f59e0b;
  --color-accent-subtle: #292524;
  --color-danger: #f87171;
  --color-success: #4ade80;
  --color-warning: #fb923c;
}
```

### State Management

Theme state is managed globally by `context/ThemeContext.tsx`. The `ThemeProvider` wraps the entire application in `app/layout.tsx`.

**Priority order on initialization:**
1. `localStorage` key `atlas-theme` — the user's explicit previous choice
2. `prefers-color-scheme` media query — the system preference
3. `"light"` — the default fallback

### Flash Prevention

A pre-hydration inline `<script>` in `app/layout.tsx` runs before React loads and sets `data-theme` on `<html>` immediately, preventing a flash of the wrong theme on first paint. `suppressHydrationWarning` on `<html>` suppresses the expected React hydration mismatch caused by this script.

```javascript
// Runs before React hydrates — prevents theme flash
(function() {
  try {
    var t = localStorage.getItem('atlas-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    } else {
      var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', d ? 'dark' : 'light');
    }
  } catch(e) {}
})();
```

### Toggle Location

The theme toggle lives in the **Sidebar footer** — not the header. This follows the convention established by Linear, Notion, and other modern productivity tools. The header is reserved for page-level context and user identity. Theme preference is a global setting, not a page action.

---

## 4. CSS Module Conventions

### File Naming
One CSS Module per component, co-located with the component file:
```
components/
├── Sidebar.tsx
├── Sidebar.module.css
├── Header.tsx
└── Header.module.css
```

### Class Naming
camelCase throughout — matches JavaScript property access syntax:
```css
.navLink {}
.navLinkActive {}
.closeButton {}
.footerButton {}
```

### What Goes in a CSS Module
- All color values — always `var(--color-token)`
- All typography — `var(--font-size-*)`, `var(--font-weight-*)`
- All spacing used for visual styling — `var(--space-*)`
- Component positioning — `position: fixed`, `position: absolute`
- Animations and transitions — always in CSS Module, never inline
- All interactive states — `:hover`, `:focus-visible`, `:active`

### Interactive State Pattern
Every interactive element follows this exact pattern:

```css
.button {
  /* base styles */
  transition: background-color 150ms ease, color 150ms ease;
}

.button:hover {
  background-color: var(--color-surface-raised);
  color: var(--color-text-primary);
}

.button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

`focus-visible` is used instead of `focus` — it only shows the outline for keyboard navigation, not mouse interaction.

### Overlay and Transition Pattern
Animated overlays (backdrops, drawers, modals) are always rendered in the DOM. Visibility is controlled via CSS, not conditional rendering. This ensures CSS transitions fire correctly on both open and close:

```css
/* Always in DOM — invisible by default */
.backdrop {
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease-in-out;
  touch-action: none; /* iOS Safari scroll fix */
}

/* Visible state applied via className */
.backdropVisible {
  opacity: 1;
  pointer-events: auto;
}
```

If conditional rendering is used (`{isOpen && <div />}`), the element mounts after the open state is applied — the transition never fires.

### Media Query Rules
- All media queries for the same breakpoint must be merged into a single block
- Media query block always placed at the bottom of the CSS Module file
- Base styles must always appear before media query overrides — CSS cascades by source order

```css
/* Correct — base styles first, media query last */
.menuButton {
  display: flex; /* base: visible on mobile */
}

@media (min-width: 1024px) {
  .menuButton {
    display: none; /* override: hidden on desktop */
  }
}
```

---

## 5. Responsive Architecture

### Mobile-First
Base styles target mobile. `min-width` media queries progressively enhance for larger screens. `max-width` queries are never used — they fight mobile-first architecture and create specificity conflicts.

### Single Breakpoint Strategy
Atlas uses one primary layout breakpoint: **`1024px` (Tailwind `lg`)**.

- Below 1024px — mobile layout: full-width header, sidebar as overlay
- At 1024px and above — desktop layout: fixed sidebar, offset header and main content

All JavaScript viewport checks align with this breakpoint:
```typescript
const isMobile = window.innerWidth < 1024; // always 1024, never 768 or 992
```

### Shell Layout
The dashboard shell is a fixed positioning system:

```
┌─────────────────────────────────────────┐
│  Header (fixed, top: 0, z-index: 30)    │
├──────────┬──────────────────────────────┤
│          │                              │
│ Sidebar  │  Main Content               │
│ (fixed,  │  (margin-left: 240px        │
│  left:0, │   padding-top: 56px)        │
│  z: 50)  │                              │
│          │                              │
└──────────┴──────────────────────────────┘
```

Desktop layout achieved through:
- `Sidebar`: `position: fixed`, always `transform: translateX(0)`
- `Header`: `position: fixed`, `left: var(--sidebar-width)` on desktop
- `Main`: `margin-left: var(--sidebar-width)`, `padding-top: var(--header-height)`

### Z-Index Layering
```
z-index: 0   — Main content
z-index: 30  — Header
z-index: 40  — Mobile backdrop
z-index: 50  — Sidebar
```

---

## 6. Typography

Inter is loaded via `next/font/google`, which handles subsetting, preloading, and self-hosting automatically. The CSS variable `--font-inter` is set on `<html>` by Next.js and consumed by the `--font-sans` token.

### Type Scale
```
xs:   12px (0.75rem)   — Labels, timestamps, badges
sm:   14px (0.875rem)  — Nav links, body text, buttons
base: 16px (1rem)      — Default body text
lg:   18px (1.125rem)  — Page titles, emphasized text
xl:   20px (1.25rem)   — Section headings
2xl:  24px (1.5rem)    — Page headings
3xl:  30px (1.875rem)  — Hero text
```

### Heading Defaults (set in `global.css`)
```
h1 — 3xl, semibold, tight line height
h2 — 2xl, semibold, tight line height
h3 — xl,  semibold, tight line height
h4 — lg,  semibold, tight line height
h5 — base, semibold, tight line height
h6 — sm,  semibold, tight line height
```

---

## 7. Layout System

### CSS Reset (`global.css`)
```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
```

Eliminates browser default spacing inconsistencies. `box-sizing: border-box` ensures padding and border are included in element dimensions.

### Font Rendering
```css
html {
  -webkit-font-smoothing: antialiased;    /* Chrome, Safari, Edge */
  -moz-osx-font-smoothing: grayscale;    /* Firefox on macOS */
  scrollbar-width: thin;                  /* Firefox scrollbar */
  scrollbar-color: var(--color-border-strong) var(--color-surface);
}
```

`antialiased` makes Inter render lighter and crisper on macOS — the standard for modern UI fonts.

### Custom Scrollbar
Thin, token-colored scrollbar for WebKit browsers:
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--color-surface); }
::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: var(--radius-pill); }
::-webkit-scrollbar-thumb:hover { background: var(--color-text-muted); }
```

---

## 8. Patterns & Anti-Patterns

### Use
```css
/* Token variables for all visual values */
color: var(--color-text-primary);
background-color: var(--color-surface);
border-radius: var(--radius-md);

/* transform for animations */
transform: translateX(-100%);
transition: transform 300ms ease-in-out;

/* focus-visible for keyboard accessibility */
:focus-visible { outline: 2px solid var(--color-accent); }

/* Specific transition properties */
transition: background-color 150ms ease, color 150ms ease;

/* Always-rendered overlays with CSS visibility control */
opacity: 0; pointer-events: none; /* hidden */
opacity: 1; pointer-events: auto; /* visible */
```

### Avoid
```css
/* Hardcoded color values */
color: #ea8c00;
background: #fafafa;

/* Tailwind color classes */
className="bg-amber-500 text-zinc-700"

/* Tailwind arbitrary color values */
className="bg-[var(--color-accent)]"

/* transition: all */
transition: all 150ms ease; /* animates everything, including unwanted properties */

/* left/right/top for animations */
left: -240px; /* triggers layout reflow on every frame */

/* max-width media queries */
@media (max-width: 1023px) { ... } /* fights mobile-first */

/* Split media queries */
@media (min-width: 1024px) { .a { ... } }
/* ... other styles ... */
@media (min-width: 1024px) { .b { ... } } /* merge these */

/* Media query before base style */
@media (min-width: 1024px) { .button { display: none; } }
.button { display: flex; } /* overrides the media query above */
```

---

## 9. Component Style Reference

### Sidebar (`components/Sidebar.module.css`)
- Fixed position, full height, `var(--sidebar-width)` wide
- Default: `translateX(-100%)` — off screen
- Open: `translateX(0)` — visible
- Desktop: always `translateX(0)` via media query
- Footer: theme toggle + logout, both using `.footerButton` base with separate hover states

### Header (`components/Header.module.css`)
- Fixed position, full width minus sidebar on desktop
- `left: var(--sidebar-width)` on desktop, `left: 0` on mobile
- Left: menu button (mobile only) + page title (`<h1>`)
- Right: username (desktop only) + avatar (always visible)
- Avatar: 32×32, `border-radius: var(--radius-pill)`, initials-based placeholder

### Dashboard Layout (`app/(dashboard)/layout.module.css`)
- Shell: `min-height: 100vh`
- Main: `padding-top: var(--header-height)`, `margin-left: var(--sidebar-width)` on desktop

---

*This document will be updated as new components and patterns are added throughout the project.*