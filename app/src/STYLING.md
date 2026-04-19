# Shell Styling — Token Vocabulary & Rules

> The shell is themeable. Every color, size, shadow, radius, and motion value in this app resolves to a named token — never a literal. A customer theme is just a different set of token *values*; the shell's component code never changes when we re-skin it.

---

## North Star

1. **The shell's styling vocabulary is canonical and matches the Swatchboard.** When the Swatchboard emits `tokens.css` in Phase 1, dropping it into the shell should "just work" with no mapping layer.
2. **Themes change values, never names.** A contributor adding a new component picks from the existing token names. They don't invent new ones. A genuinely new token goes through the Swatchboard's Material Change Protocol first.
3. **Three buckets, three rules.** Every styling value in the shell is either a *token*, an *alias*, or a *recipe*. Know the bucket before you write it.

---

## The Three-Bucket Rule

### Token — canonical primitive
Lowest-level raw value. Comes from the Swatchboard (or matches its spec).

```css
--color-brand-primary-500: #1E8FE8;
--radius-md: 8px;
--space-4: 16px;
--font-size-md: 14px;
```

**Rule:** never invent a new token name in the shell. Propose it via the Swatchboard Material Change Protocol.

### Alias — a semantic role pointing at a token
Thin pass-through that lets component CSS read semantically. Only used for shell-wide role concepts.

```css
--card-bg: var(--color-surface-raised);
--btn-radius: var(--radius-md);
--color-avatar-1: var(--color-brand-primary-500);
```

**Rules:**
- Aliases live at the top of `theme.css` only. Never define an alias inside a component's CSS.
- Every alias resolves to a `var(--token)` reference. Never to a literal.

### Recipe — a composition of tokens into a visual effect
Gradients, layered shadows, glow stacks, multi-layer backgrounds. These are theme-specific compositions.

```css
--btn-primary-grad: linear-gradient(135deg, var(--color-brand-primary-400), var(--color-brand-primary-600));
--card-shadow-primary:
  inset 0 1px 0 rgba(var(--color-white-rgb), 0.9),
  inset 0 0 0 1px rgba(var(--color-brand-primary-rgb), 0.18),
  0 4px 14px rgba(var(--color-brand-primary-rgb), 0.12);
```

**Rules:**
- Every value inside a recipe is either a `var(--token)` reference or an allowed literal (transforms like `translateY(1px)`, easings like `ease-out`, display modes, `transparent`). **Never hex, px, or raw rgb tuples** except for `rgba(0, 0, 0, ...)` as the canonical black-tint primitive in shadows.
- Recipes live in the `RECIPES` section of their theme file. They will migrate to `element_variants.recipe` JSONB rows in Swatchboard Phase 2.

---

## Naming Convention

All CSS variables: `--{category}-{role}-{step}` with dashes only.

| Pattern | Example |
|---|---|
| `--color-{family}-{step}` | `--color-brand-primary-500`, `--color-neutral-300` |
| `--color-{role}-{variant}` | `--color-text-muted`, `--color-surface-raised`, `--color-border-default` |
| `--radius-{step}` | `--radius-md` |
| `--shadow-{step}` | `--shadow-md` |
| `--space-{n}` | `--space-4` (16px on a 4px grid) |
| `--font-{property}-{step}` | `--font-size-md`, `--font-weight-semibold`, `--line-height-tight` |
| `--duration-{step}` | `--duration-base` |
| `--ease-{curve}` | `--ease-out` |
| `--z-{layer}` | `--z-modal` |
| `--breakpoint-{step}` | `--breakpoint-md` |

No dots, no camelCase, no abbreviations. The Swatchboard stores names with dots (e.g. `color.surface.raised`); the emitted CSS file translates them to dashes (`--color-surface-raised`).

---

## Canonical Vocabulary

### Color — brand
```
--color-brand-primary-{50, 100, 400, 500, 600, 700}
--color-brand-secondary-{50, 100, 400, 500, 600, 700}    (optional — use when theme has a second brand color)
```
Plus RGB triplets for alpha compositing in recipes:
```
--color-brand-primary-rgb
--color-brand-primary-400-rgb
--color-brand-primary-600-rgb
```

### Color — neutral scale
```
--color-neutral-{50, 100, 200, 300, 400, 500, 600, 700, 800, 900}
--color-neutral-rgb    (alpha compositing — defaults to 500)
```
Default values match the Swatchboard seed (Tailwind `neutral`). Themes may override with a tonally-shifted scale (e.g. `slate`) when stylistically motivated.

### Color — surface
```
--color-surface-base        (page / app background)
--color-surface-raised      (card / elevated surface)
--color-surface-sunken      (inset / recessed surface)
--color-surface-overlay     (modal / backdrop surface)
```

### Color — text
```
--color-text-primary        (headings, dominant text)
--color-text-body           (body copy)
--color-text-muted          (secondary, captions)
--color-text-faint          (disabled, placeholder)
--color-text-on-primary     (text rendered over --color-brand-primary-500)
```

### Color — border
```
--color-border-subtle       (hairlines inside cards)
--color-border-default      (card edge, input edge)
--color-border-strong       (emphasized divider, focus ring base)
```

### Color — semantic
```
--color-semantic-success-{50, 200, 400, 500, 600, 700}
--color-semantic-warning-{50, 200, 400, 500, 600, 700}
--color-semantic-error-{50, 200, 400, 500, 600, 700}
--color-semantic-info-{50, 200, 400, 500, 600, 700}        (optional)
```
Plus `--color-semantic-{success|warning|error}-rgb` for alpha compositing.

### Color — accent (shell extension)
```
--color-accent-purple-{50, 200, 400, 500, 600}
--color-accent-orange-{50, 200, 400, 500, 600}
--color-accent-teal-{50, 200, 400, 500, 600}
```
**Status:** extension beyond the Swatchboard's Layer 1 spec. Flagged for promotion via Material Change Protocol. Use sparingly — only when brand/semantic don't fit (e.g. per-cell metric-strip tints).

### Base primitives
```
--color-white-rgb           255, 255, 255
--color-black-rgb           0, 0, 0
```
RGB triplets for alpha compositing of pure white/black (highlights, shadows).

### Radius
```
--radius-none       0
--radius-sm         4px
--radius-md         8px       (unthemed default: buttons, inputs)
--radius-lg         12px      (unthemed default: cards)
--radius-xl         16px
--radius-full       9999px    (pills, badges, avatars)
```
A theme may override step values to shift the shell's overall roundedness.

### Shadow (primitives)
```
--shadow-sm         subtle lift (hover hints)
--shadow-md         card elevation
--shadow-lg         modal, popover elevation
--shadow-inset      recessed feel
```
Complex compositions (neumorphic stacks, colored glows, inset+outer combos) are **recipes**, not tokens.

### Spacing (4px grid)
```
--space-0     0
--space-1     4px
--space-2     8px
--space-3     12px
--space-4     16px
--space-5     20px
--space-6     24px
--space-7     28px
--space-8     32px
--space-10    40px
--space-12    48px
--space-16    64px
```

### Typography
```
--font-family-sans            primary UI font
--font-family-mono            monospace (numerics, code)

--font-size-2xs               10px      (micro labels)
--font-size-xs                11px      (caption)
--font-size-sm                13px      (body-sm)
--font-size-md                14px      (body default)
--font-size-lg                16px      (body-lg, small heading)
--font-size-xl                20px      (heading)
--font-size-2xl               24px      (display-sm)
--font-size-3xl               30px      (display)
--font-size-4xl               36px      (display-lg)

--font-weight-regular         400
--font-weight-medium          500
--font-weight-semibold        600
--font-weight-bold            700

--line-height-tight           1.2
--line-height-normal          1.5
--line-height-relaxed         1.75

--letter-spacing-tight        -0.02em
--letter-spacing-normal       0
--letter-spacing-wide         0.04em
--letter-spacing-wider        0.08em
```

### Motion
```
--duration-fast               100ms
--duration-base               200ms
--duration-slow               350ms

--ease-in                     cubic-bezier(0.4, 0, 1, 1)
--ease-out                    cubic-bezier(0, 0, 0.2, 1)
--ease-in-out                 cubic-bezier(0.4, 0, 0.2, 1)
--ease-spring                 cubic-bezier(0.175, 0.885, 0.32, 1.275)
```

### Z-index
```
--z-base                      1
--z-dropdown                  100
--z-sticky                    200
--z-overlay                   300
--z-modal                     400
--z-toast                     500
```

### Breakpoints
```
--breakpoint-sm               640px         (mobile → tablet)
--breakpoint-md               1024px        (tablet → desktop)
```
*Note:* CSS `@media` queries can't consume `var()`. These tokens are reference values for JS (`matchMedia`) and documentation. Component `@media` queries inline the px values — keep them in sync with this file.

---

## Aliases (shell-wide roles)

These are the ONLY aliases allowed in the shell. They exist so component CSS reads semantically. If you need a new alias, add it here — never invent one in a component file.

```
--font                    → --font-family-sans
--page-bg                 → --color-surface-base
--card-bg                 → --color-surface-raised
--inset-bg                → --color-surface-sunken
--card-border             → --color-border-default
--border-light            → --color-border-subtle
--border-mid              → --color-border-default
--text-primary            → --color-text-primary
--text-body               → --color-text-body
--text-muted              → --color-text-muted
--text-faint              → --color-text-faint
--primary                 → --color-brand-primary-500
--primary-light           → --color-brand-primary-400
--primary-hover           → --color-brand-primary-600
--primary-deep            → --color-brand-primary-700
--primary-soft            → --color-brand-primary-100
--primary-bg              → --color-brand-primary-50
--success                 → --color-semantic-success-500
--warning                 → --color-semantic-warning-500
--danger                  → --color-semantic-error-500
--card-radius             → --radius-lg
--btn-radius              → --radius-md
--input-radius            → --radius-md
--badge-radius            → --radius-full
--sidebar-bg              → --color-neutral-900
--sidebar-border          → --color-neutral-800
--color-avatar-{1..5}     → (theme-specific color token assignment)
--avatar-{1..5}           → var(--color-avatar-{1..5})  (legacy form, kept for existing selectors)
```

---

## Rules (enforced)

1. **No hardcoded color values anywhere.** Any `#hex`, `rgb(...)`, or `rgba(...)` in a component CSS file is a bug (except `rgba(0, 0, 0, ...)` for shadow-black). Reference a token, or compose in a recipe.
2. **No hardcoded radii or shadows.** Use `var(--radius-*)` and `var(--shadow-*)`, never a raw px or multi-layer shadow in a component file.
3. **No inventing token names in the shell.** New token = Swatchboard Material Change Protocol. No exceptions.
4. **No aliases inside component files.** Aliases belong in `theme.css`. A component reads `var(--card-bg)` but never defines it.
5. **Recipes don't contain literal color/size values.** Every recipe input is a `var(--token)` or allowed literal (transforms, easings, display modes, `transparent`, `rgba(0,0,0,X)`).
6. **`@media` query breakpoints stay in sync with `--breakpoint-*` tokens.** If you change a breakpoint, update both the token and every call site.

---

## Freedoms (author's call)

1. **Pick any scale step.** Card radius = `--radius-md` or `--radius-lg`? Author chooses. The scale gives you structure; which step fits is a design call.
2. **Compose tokens into recipes freely.** Gradients, shadow stacks, multi-layer backgrounds — as long as inputs are tokens, the composition is yours.
3. **New components don't need new tokens.** If the vocabulary covers it (95% of cases), just wire it up.
4. **Semantic aliases or direct tokens — your call inside a component.** `var(--card-bg)` and `var(--color-surface-raised)` are both valid when the role matches.

---

## Adding a new component — checklist

Before committing a new component's CSS:

- [ ] All colors reference `var(--color-*)` tokens. Grep for `#` and `rgb` in your file to confirm.
- [ ] All radii reference `var(--radius-*)`. No raw `px` in `border-radius`.
- [ ] All shadows reference `var(--shadow-*)` primitives — or, if composing a multi-layer shadow, define it as a recipe in `theme.css` (or the theme's `RECIPES` section).
- [ ] Spacing uses `var(--space-*)` wherever possible. Document genuinely component-specific one-offs with a comment.
- [ ] Font sizes use `var(--font-size-*)`. No raw `px` in `font-size`.
- [ ] Any new aliases you introduced → moved to `theme.css`.
- [ ] Any new recipes are in the `RECIPES` section of the theme file.

---

## Adding a new token

New tokens come from the Swatchboard, not the shell. Process:

1. Check if an existing token covers the need — often the answer is yes with a creative scale-step choice.
2. If genuinely missing, propose the addition via the Swatchboard Material Change Protocol (see `Kronelius/PolishPoint-Swatchboard/PROTOCOL.md`).
3. Once approved and seeded, the Swatchboard emits the new token in `tokens.css`.
4. Add the token name to this file under "Canonical Vocabulary."

---

## Known gaps & pending-tokenization

Values currently missing from the Swatchboard's 8 categories. Handle inline until promoted.

- **Border width** — currently always 1px inline. If a theme needs a different scale, propose `--border-width-{sm, md, lg}` in the Swatchboard.
- **Opacity scale** — currently inline (`0.5`, `0.15`). If repeated, propose `--opacity-{muted, default, strong}`.
- **Blur / backdrop-filter** — no token. Glass-morphism effects use literal `blur(Xpx)` inside recipes for now. Consider a `--blur-{sm, md, lg}` category if patterns emerge.
- **Accent colors** — `--color-accent-*` is a shell-side extension. Flagged for promotion to Swatchboard Layer 1.
- **Hardcoded spacing & font-sizes in component CSS** — `app/src/index.css` still contains many raw px values (e.g. `padding: 20px 24px`, `font-size: 10px`). These will migrate to `var(--space-*)` / `var(--font-size-*)` in a follow-up pass. New components must use tokens from day one.

---

## Transition state (Phase 0)

- The Swatchboard currently has 16 grayscale color tokens seeded (Phase 0). All other categories below are defined in this doc but are not yet rows in Supabase.
- **Swatchboard Phase 1:** brand/semantic colors, typography, spacing, shadow, motion, breakpoints, z-index land in Supabase via normal token editing.
- **Swatchboard Phase 2:** recipes migrate from `theme*.css` `RECIPES` sections to `element_variants.recipe` JSONB rows.
- Until Phase 1 completes, this doc is the canonical vocabulary. Both `theme.css` (unthemed default) and `theme-polishpoint-blue.css` (reference themed) conform to it.
