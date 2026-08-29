# Offline CRM Design System

## Product Context

Offline is a private CRM for a founders and operators community. It helps a small, high-context team understand relationships, follow up well, and turn scattered signals into useful action. The product should feel like a well-made operator tool: calm, precise, quietly premium, and built for repeated daily use.

This is an internal product surface, not a marketing site. Optimize for scanning, comparison, keyboard-friendly workflows, trustworthy data, and clear next actions.

## Design Intent

- Make the quality of the information and the relationships feel important without adding visual noise.
- Use editorial restraint and operational density: strong hierarchy, generous breathing room around groups, compact rows inside data views.
- Make dark mode a first-class theme, not an inverted afterthought.
- Use color as a meaning system for state and attention, never as decoration.
- Prefer flat surfaces, thin rules, and intentional alignment over floating card stacks.
- The visual signature is ink, bone, mineral green, and small controlled accents. There are no gradients.

## Visual Language

The mood is a private members' club translated into a modern operations console: warm paper and charcoal ink, subtle green as the Offline signal, copper for human warmth, and cool blue for system information. Surfaces should feel tactile through contrast and borders, not shadows or gloss.

Avoid the visual language of generic AI software: purple or indigo gradients, glowing borders, neon blobs, oversized hero copy, glassmorphism, excessive rounded containers, decorative robot imagery, and empty dashboard tiles.

## Color Tokens

Use semantic tokens in code. Do not scatter raw hex values through components.

### Light Theme

| Token | Value | Usage |
| --- | --- | --- |
| `--color-canvas` | `#F5F3EE` | App background, warm bone paper |
| `--color-surface` | `#FFFDF9` | Main content surface |
| `--color-surface-raised` | `#FFFFFF` | Menus, dialogs, focused work areas |
| `--color-surface-muted` | `#ECEBE5` | Secondary bands and selected rows |
| `--color-ink` | `#151714` | Primary text and high-emphasis icons |
| `--color-ink-muted` | `#626A63` | Secondary text and metadata |
| `--color-ink-faint` | `#8A918A` | Placeholder text and low-priority labels |
| `--color-line` | `#D8D9D2` | Dividers and default borders |
| `--color-line-strong` | `#B9BDB5` | Table rules and active boundaries |
| `--color-signal` | `#557A5D` | Primary action, active navigation, positive state |
| `--color-signal-soft` | `#DCE8D9` | Positive or selected background |
| `--color-copper` | `#A76245` | Human attention, warm accent, high-value moments |
| `--color-copper-soft` | `#F1DED4` | Warm accent background |
| `--color-info` | `#537A91` | Information and system state |
| `--color-info-soft` | `#DCE8EE` | Information background |
| `--color-warning` | `#9A7428` | Due soon, caution, pending action |
| `--color-warning-soft` | `#F1E7C7` | Warning background |
| `--color-danger` | `#A54F49` | Errors, destructive actions, overdue |
| `--color-danger-soft` | `#F2D9D6` | Error background |

### Dark Theme

| Token | Value | Usage |
| --- | --- | --- |
| `--color-canvas` | `#0F1210` | App background, deep ink |
| `--color-surface` | `#151916` | Main content surface |
| `--color-surface-raised` | `#1D231F` | Menus, dialogs, focused work areas |
| `--color-surface-muted` | `#202721` | Secondary bands and selected rows |
| `--color-ink` | `#F1F0EA` | Primary text and high-emphasis icons |
| `--color-ink-muted` | `#A2AAA2` | Secondary text and metadata |
| `--color-ink-faint` | `#737C74` | Placeholder text and low-priority labels |
| `--color-line` | `#2B342D` | Dividers and default borders |
| `--color-line-strong` | `#405044` | Table rules and active boundaries |
| `--color-signal` | `#A7C7A0` | Primary action, active navigation, positive state |
| `--color-signal-soft` | `#26392B` | Positive or selected background |
| `--color-copper` | `#D09270` | Human attention, warm accent, high-value moments |
| `--color-copper-soft` | `#3A2923` | Warm accent background |
| `--color-info` | `#8AAFC1` | Information and system state |
| `--color-info-soft` | `#25343B` | Information background |
| `--color-warning` | `#D7B65B` | Due soon, caution, pending action |
| `--color-warning-soft` | `#3A321E` | Warning background |
| `--color-danger` | `#D47B72` | Errors, destructive actions, overdue |
| `--color-danger-soft` | `#3B2524` | Error background |

Color rules:

- Meet WCAG AA contrast for all body text and controls. Do not use `--color-ink-faint` for essential information.
- Keep one primary signal color per view. Use copper, blue, yellow, and red only when their semantic meaning is present.
- Never use a gradient, glow, color wash, or colored shadow.
- Selected rows use a surface change and a left rule before using a saturated fill.

## Typography

### Font Pairing

- UI and body: `DM Sans`, with `system-ui`, `sans-serif` fallback. Use weights 400, 500, 600, and 700.
- Data, IDs, timestamps, keyboard hints, and technical values: `IBM Plex Mono`, with `ui-monospace`, `monospace` fallback. Use weights 400 and 500.
- Do not introduce a display face for routine CRM screens. Hierarchy comes from size, weight, color, and spacing.

Use `font-variant-numeric: tabular-nums` for quantities, dates, counts, and table columns. Keep letter spacing at `0`; never use negative tracking.

### Type Scale

| Name | Size / Line height | Weight | Usage |
| --- | --- | --- | --- |
| Display | `32px / 38px` | 600 | Page title only when the page needs a strong anchor |
| Heading | `22px / 28px` | 600 | Section heading and dialog title |
| Subheading | `16px / 22px` | 600 | Panel or group heading |
| Body | `14px / 21px` | 400 | Default application text |
| Label | `12px / 16px` | 600 | Field labels, navigation groups, table headers |
| Meta | `12px / 16px` | 400 | Supporting text, timestamps, secondary context |
| Data | `13px / 18px` | 400 | Mono data, IDs, technical values |

Use sentence case. Avoid all-caps UI copy except short mono metadata where it materially helps scanning. Headings should be concise and descriptive, not promotional.

## Spacing And Shape

Use a 4px base unit. The common spacing scale is `4, 8, 12, 16, 20, 24, 32, 40, 48, 64px`.

- App shell gutter: `24px` desktop, `16px` narrow screens.
- Primary content max width: `1440px`; allow dense tables to use the available width.
- Sidebar: `240px` expanded, `64px` collapsed. Keep the collapse control icon-only with a tooltip.
- Toolbar height: `56px` minimum.
- Input and button height: `36px` default, `32px` compact, `40px` prominent.
- Table row height: `52px` default, `40px` compact, with `12px` horizontal cell padding.
- Form field vertical gap: `16px`; related fields may use `12px`.
- Section gap: `32px`; page title to first content group: `24px`.
- Default radius: `6px`; use `8px` only for dialogs and larger framed tools.
- Pills are reserved for statuses, filters, and tags. Do not use pill shapes for ordinary buttons or layout containers.
- Borders are 1px and use the semantic line tokens. Shadows are rare and limited to dialogs or menus.

## Layout And Navigation

The desktop shell is a persistent left navigation rail and a flexible content region. The shell should remain visually quiet while the active work area carries hierarchy.

- Primary navigation: Overview, People, Companies, Opportunities, Tasks, Automations, Settings.
- Navigation groups have a small label, a compact vertical rhythm, and a clear active state using signal color plus a subtle surface shift.
- The top bar contains breadcrumb or page context on the left and search, notifications, and account controls on the right.
- Every data page begins with a compact title row containing title, useful context, and one primary action. Do not create a marketing hero.
- Use full-width page bands and unframed layouts for sections. Use cards only for repeated records, dialogs, menus, and genuinely framed tools.
- Prefer a table or split list/detail view for CRM data. Use a card grid only when comparing a small set of distinct entities.
- On mobile, the sidebar becomes a drawer; preserve the same navigation order and expose a visible menu button.
- At widths below `760px`, tables should become stacked records or a horizontally scrollable region with a pinned primary identity column. Never shrink text until it is unreadable.

## Component Rules

### Buttons And Actions

- Primary button: signal background, ink text in light mode, deep ink text in dark mode; use only for the main action in a region.
- Secondary button: transparent or surface background with a line border.
- Tertiary action: text or icon-only with a visible hover/focus state.
- Use familiar Lucide icons when available. Icon-only buttons require an accessible label and a tooltip for unfamiliar controls.
- Destructive actions are explicit, red, and require confirmation when data may be lost.
- Loading buttons retain their width and replace the label with a spinner plus accessible status; never cause layout shift.

### Inputs And Search

- Inputs use surface-raised background, a 1px line, 6px radius, and a clear 2px focus ring using signal color.
- Labels sit above controls. Placeholder text is an example, never the only label.
- Search is a first-class CRM workflow: support keyboard focus, recent searches, clear action, and empty/no-result states.
- Validation appears adjacent to the field, with a text explanation and semantic color. Do not rely on color alone.

### Tables And Lists

- Use a strong identity column, predictable column alignment, tabular numbers, and restrained row rules.
- Keep headers sticky only when the table is long enough to justify it.
- Row hover changes surface color only. Selection adds a signal left rule and a checkbox or explicit selection affordance.
- Keep actions at the row end and reveal secondary actions on hover and keyboard focus.
- Include loading skeletons, empty states, error states, and pagination or infinite-scroll feedback as appropriate.
- Make deduplication and merge states explicit: show match confidence, source, and what will be retained before any destructive merge.

### Tags, Status, And Confidence

- Status tags are compact, sentence case, and use a muted semantic background with readable text.
- Confidence is shown as a number or label plus supporting evidence, never as an unexplained progress bar.
- Use `signal` for healthy/active, `warning` for attention, `danger` for blocked/overdue, `info` for system-generated, and copper for relationship-sensitive context.

### Panels, Dialogs, And Detail Views

- Detail views should prioritize identity, relationship context, recent activity, and next action in that order.
- Panels use a clear title, a compact close action, and predictable footer actions. Keep dialogs within `min(560px, calc(100vw - 32px))` unless the task truly needs more space.
- Use a split view for list-to-detail workflows on desktop and a pushed detail route or drawer on mobile.
- Keep one layer of framing. Do not put cards inside cards.

### Charts And Data Visualization

- Charts answer a concrete operational question and include a visible title, unit, period, and empty state.
- Prefer thin lines, small points, and direct labels over decorative axes or gradients.
- Use the signal color for the primary series, blue for comparison, copper for relationship or cohort context, and warning/danger only for semantic thresholds.
- Always provide the underlying value in accessible text or a table.

## Interaction And Motion

- Default transitions are `120ms` to `180ms` for color, border, and surface changes.
- Use motion to preserve spatial context: drawers slide from their edge, rows do not jump, and dialogs fade in with a short translate of no more than 4px.
- Do not animate gradients, add celebratory confetti, or use perpetual motion.
- Respect `prefers-reduced-motion: reduce` by removing nonessential transitions.
- Keyboard focus is always visible. Tab order follows visual and task order.

## Content And AI Surfaces

- Write like an experienced operator: specific, brief, and action-oriented.
- AI-generated suggestions must be visually distinct from verified CRM facts. Label source, timestamp, and confidence.
- Never imply that an AI suggestion is a confirmed relationship, contact detail, or revenue fact.
- Show the next useful action for empty states: import people, connect a source, create a task, or adjust a filter.
- Avoid conversational assistant chrome unless the workflow truly needs it. AI should appear as a capability inside the CRM, not as the product's visual identity.

## Accessibility And Quality Bar

- Use semantic landmarks, real buttons, real form labels, and keyboard-operable controls.
- Provide visible focus, hover, pressed, disabled, loading, empty, error, and success states for every interactive component.
- Maintain AA contrast in both themes and test dense views at 200% zoom.
- Keep touch targets at least `40px` where space allows and never rely on hover for essential information.
- Preserve stable dimensions for toolbars, rows, counters, and controls so state changes do not move surrounding content.

## Implementation Checklist

Before shipping a new page, confirm:

1. The page has a clear operational purpose and primary action.
2. The layout works in light and dark themes with semantic tokens only.
3. The first viewport shows useful data or an actionable empty state.
4. All content states are implemented: loading, empty, error, success, disabled, and focused.
5. Mobile layout preserves hierarchy without unreadable text or overlapping controls.
6. AI-derived information is labeled separately from verified CRM data.
7. No gradient, glow, decorative orb, stacked-card dashboard, or generic AI hero has slipped in.
