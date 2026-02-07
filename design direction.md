# Notion Design Language Guide

## Core Philosophy

Notion's UI is defined by radical simplicity and content-first design. The interface should feel like it disappears — almost like a blank page that responds to interaction. Every element earns its place; nothing is decorative.

## Color & Theme

- Near-white backgrounds (`bg-white` / `bg-neutral-50`), with very subtle warm gray tones for secondary surfaces (`bg-stone-50`, `bg-stone-100`)
- Text is soft black, never pure black — use `text-neutral-800` for primary, `text-neutral-500` for secondary/placeholder
- Accent color is extremely restrained — a desaturated blue (`text-blue-600`) used sparingly for links and active states
- Borders are barely visible: `border-neutral-200` or `divide-neutral-100`

## Typography

- System font stack (already shadcn's default via `font-sans`)
- Clean hierarchy: titles are medium-weight (`font-medium`), not bold. Body is `text-sm` (14px). Headings use size rather than weight for distinction
- Generous line-height (`leading-relaxed` or `leading-7`)

## Spacing & Layout

- Generous whitespace — content breathes. Use `px-24` or `max-w-3xl mx-auto` for content areas (Notion's content column is ~720px)
- Vertical rhythm with consistent `space-y-1` or `space-y-0.5` for tight lists, `space-y-4` between blocks
- Flat hierarchy — minimal nesting, minimal card-like containers

## Components & Patterns

- **Inputs:** No visible borders by default. Inputs and editable areas look like plain text until hovered/focused. Use `border-transparent hover:border-neutral-200 focus:border-neutral-300` with `rounded-sm`
- **Hover-reveal UI:** Controls, buttons, and menus appear on hover. Use `opacity-0 group-hover:opacity-100 transition-opacity`
- **Menus & Popovers:** Use shadcn's `DropdownMenu`, `Command`, and `Popover`. Style with tight padding (`p-1`), small text (`text-sm`), `rounded-md`, subtle shadow (`shadow-md`), no heavy borders
- **Buttons:** Mostly ghost/text style — use shadcn's `variant="ghost"` with `size="sm"`. Icon buttons are common (`h-7 w-7`)
- **Icons:** Thin/light stroke — use Lucide icons at 16px or 18px with `text-neutral-400`
- **Slash command / Command palette:** Use shadcn `Command` component — this is very Notion-native
- **Sidebar:** `w-60`, `bg-stone-50`, tight spacing, small text, tree-style nav with indentation

## Interactions & Motion

- Minimal, functional transitions — `transition-colors duration-100` or `transition-opacity duration-150`
- No bouncy animations or spring physics. Everything is fast and subtle
- Hover states are slight background shifts: `hover:bg-neutral-100 rounded-sm`

## Anti-Patterns (things to avoid)

- No heavy shadows or elevation (no `shadow-lg` on cards)
- No gradient backgrounds or colorful fills
- No `rounded-full` buttons (use `rounded-sm` or `rounded-md`)
- No thick borders or outlines
- No large, prominent CTAs — everything is quiet and understated
- Avoid visual "boxes inside boxes" — keep surfaces flat

## shadcn Overrides to Consider

- Reduce default border-radius in `tailwind.config` (Notion uses ~4px, so `rounded-sm`)
- Tone down shadcn's default ring/focus styles to something subtler
- Override default button padding to be tighter
- Use `stone` or `neutral` scale instead of shadcn's default `slate`

---

This gives the agent enough to produce components that feel like Notion without pixel-matching it — emphasizing the invisible-UI, content-first, hover-reveal philosophy that defines the product.
