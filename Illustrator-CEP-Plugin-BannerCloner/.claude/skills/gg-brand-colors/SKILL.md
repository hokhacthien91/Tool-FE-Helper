---
name: gg-brand-colors
description: Apply Gravity Global brand color palette to any UI, dashboard, component, or styling work. Use when user asks to "theme as Gravity Global", "use brand colors", "GG branding", or references the brand site https://www.gravityglobal.com/. Covers primary green, dark backgrounds, typography, button styles, and focus/hover states.
---

# Gravity Global Brand Colors Skill

Apply the official Gravity Global palette extracted from https://www.gravityglobal.com/ to any styling or UI work.

## Palette

| Token | Hex | Usage |
|---|---|---|
| **gg-green** | `#b7e39b` | Primary accent, buttons, active states, links, headings, icons |
| **gg-green-dark** | `#59a139` | Button hover, success indicators, checkbox accent |
| **gg-accent** | `#a32600` | Errors, warnings, destructive actions |
| **gg-cyan** | `#2bc9de` | Secondary accent (rarely used — info badges) |
| **bg-page** | `#121212` | Body / page background |
| **bg-card** | `#1c1c1c` | Card / panel surface |
| **bg-input** | `#0a0a0a` | Input field / sunken panel |
| **border** | `#2a2a2a` | Dividers, field borders |
| **text-primary** | `#f2f2f2` | Primary text |
| **text-secondary** | `#b0b0b0` | Secondary text |
| **text-muted** | `#707070` | Hints, placeholder, low-priority labels |

## Core design principles

1. **Dark-first theme** — always use dark backgrounds (`#121212`, `#1c1c1c`). Never use light mode unless explicitly requested.
2. **Green = action** — the signature light green (`#b7e39b`) is reserved for interactive elements and emphasis. Don't use it as a large flat fill.
3. **Uppercase labels** — card titles, button text, section headings use `text-transform: uppercase; letter-spacing: 0.5-1px` for the modern agency look.
4. **Sharp corners** — prefer `border-radius: 4-8px` (not pill or fully rounded).
5. **Subtle borders** — `1px solid #2a2a2a` for cards; focus ring = `box-shadow: 0 0 0 3px rgba(183, 227, 155, 0.15)`.

## Component recipes

### CSS variables (drop-in)

```css
:root {
  --gg-green: #b7e39b;
  --gg-green-dark: #59a139;
  --gg-accent: #a32600;
  --bg-page: #121212;
  --bg-card: #1c1c1c;
  --bg-input: #0a0a0a;
  --border: #2a2a2a;
  --text-primary: #f2f2f2;
  --text-secondary: #b0b0b0;
  --text-muted: #707070;
}
```

### Button (primary)

```css
button {
  background: var(--gg-green);
  color: #121212;
  border: none;
  padding: 11px 22px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: background 0.15s;
}
button:hover { background: var(--gg-green-dark); color: #fff; }
button:disabled { background: var(--border); color: var(--text-muted); cursor: not-allowed; }
```

### Card

```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 18px;
}
.card h2 {
  font-size: 11px;
  color: var(--gg-green);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 700;
}
```

### Input field + focus

```css
input, textarea {
  background: var(--bg-input);
  border: 1px solid var(--border);
  color: var(--text-primary);
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 12px;
  transition: border-color 0.15s;
}
input:focus, textarea:focus {
  outline: none;
  border-color: var(--gg-green);
  box-shadow: 0 0 0 3px rgba(183, 227, 155, 0.15);
}
```

### Heading with brand bar

Iconic "green accent bar" next to main headings:

```css
h1 { display: flex; align-items: center; gap: 10px; font-weight: 700; }
h1::before {
  content: '';
  width: 6px;
  height: 22px;
  background: var(--gg-green);
  border-radius: 1px;
}
```

### Status badges

```css
.badge-success { background: rgba(89, 161, 57, 0.15); border: 1px solid var(--gg-green-dark); color: var(--gg-green); }
.badge-error   { background: rgba(163, 38, 0, 0.15); border: 1px solid var(--gg-accent); color: #ffb8a0; }
```

### Link

```css
a { color: var(--gg-green); text-decoration: underline; font-weight: 600; }
a:hover { color: #fff; }
```

### Checkbox / radio

```css
input[type="checkbox"], input[type="radio"] { accent-color: var(--gg-green-dark); }
```

### Hover state for list items / rows

```css
.row { border: 1px solid transparent; transition: border-color 0.15s; }
.row:hover { border-color: var(--gg-green-dark); }
```

## When applying to existing UI

1. Replace Tailwind/framework default blues (`#3b82f6`, `#2563eb`) → `var(--gg-green)` / `var(--gg-green-dark)`.
2. Replace light gray backgrounds → `var(--bg-card)`.
3. Replace red/amber error colors → `var(--gg-accent)`.
4. Replace black text → `var(--text-primary)`.
5. Add the `h1::before` green bar wherever there's a page title.
6. Preserve original spacing/typography unless user asks for full restyle.

## Example application

Reference implementation in this project:
- [web-ui/index.html](web-ui/index.html) — full dashboard styled with this palette

## Don't

- Don't use bright light-mode backgrounds
- Don't use the green at large scale (100% fills) — it's too saturated; use it as accent only
- Don't mix with other bright brand colors (no red/orange CTAs unless for errors)
- Don't use rounded pill buttons or fully circular elements (stay rectangular/subtly rounded)
