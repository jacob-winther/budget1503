# Animations & Transitions Design

**Date:** 2026-03-30
**Status:** Approved

## Goal

Add sleek, premium-feeling animations and transitions to the budget planner UI. Balanced speed (200–350ms), cubic-bezier easing, zero new dependencies. Built entirely on Vue's `<Transition>` / `<TransitionGroup>` system and CSS custom properties.

## Animation System

All transitions derive from 5 CSS custom properties added to `:root` in `src/style.css`:

```css
:root {
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1); /* entrances */
  --ease-in-expo:  cubic-bezier(0.7, 0, 0.84, 0);  /* exits */
  --dur-enter:     280ms;
  --dur-exit:      200ms;
  --dur-micro:     150ms;
  --stagger-row:   30ms;  /* delay multiplier for cascading rows */
}
```

Exits are slightly faster than entrances so they don't slow down the workflow.

## The 7 Interaction Animations

### A — Expand / Collapse (sections & categories)

- **Technique:** CSS `grid-template-rows: 0fr → 1fr` transition (no JS height measurement needed)
- **Timing:** `--dur-enter` / `--dur-exit` with `--ease-out-expo` / `--ease-in-expo`
- **Stagger:** Child rows delayed by `index * --stagger-row` on expand
- **Chevron:** Rotates 90° over `--dur-micro`
- **Components:** `BudgetSectionRow.vue`, `BudgetCategoryRow.vue` — wrap children in `<TransitionGroup name="row">`

### B — Adding a new row

- **Technique:** Slide up 8px + fade in
- **Timing:** `--dur-enter`, `--ease-out-expo`
- **Extra:** Left-border accent highlight flashes for 600ms to draw the eye to the new row
- **Components:** `BudgetItemRow.vue`, `BudgetCategoryRow.vue` — `.row-enter-active` / `.row-enter-from` CSS classes

### C — Deleting a row

- **Technique:** Fade out + slide left 12px, then height collapses to 0
- **Timing:** `--dur-exit`, `--ease-in-expo`
- **Detail:** Leaving element set to `position: absolute` during leave so siblings animate smoothly into place (standard `TransitionGroup` pattern)
- **Components:** Same `TransitionGroup` as B — `.row-leave-active` / `.row-leave-to`

### D — Edit mode enter / exit

- **Technique:** Row background transitions to highlight shade; inputs fade in via `<Transition name="fade">`; active edit row gets a left-border accent glow
- **Timing:** `--dur-micro` for background, `--dur-enter` for input appearance
- **Components:** `BudgetItemRow.vue`, `BudgetCategoryRow.vue` — CSS `transition` on `background-color` + `border-left`

### E — Totals updating (animated number counter)

- **Technique:** New composable `useAnimatedNumber` tweens the displayed value using `requestAnimationFrame` with an ease-out curve (~20 lines, no library)
- **Timing:** 300ms, `--ease-out-expo`
- **Components:** `BudgetTotalsRow.vue`, `BudgetDifferenceRow.vue`
- **New file:** `src/composables/useAnimatedNumber.ts`

```ts
// API shape
const displayed = useAnimatedNumber(source /* Ref<number> */, { duration: 300 })
```

### F — Dialog open / close

- **Technique:** Dialog panel scales `0.95 → 1` + fades in; backdrop fades separately
- **Timing:** Enter `--dur-enter` `--ease-out-expo`; exit `--dur-exit` `--ease-in-expo`
- **Components:** `ItemFormDialog.vue`, `CategoryFormDialog.vue`, `CopyYearDialog.vue` — wrap with `<Transition name="dialog">`

### G — Year switching

- **Technique:** Table slides out in the direction of navigation (left for previous year, right for next year) and new year slides in from the opposite side
- **Timing:** `--dur-enter`, `--ease-out-expo`
- **Detail:** Direction tracked in `budgetStore` as `yearSlideDirection: 'left' | 'right'`, updated on every year change. `App.vue` binds `<Transition :name="yearSlideDir">` dynamically.
- **Components:** `App.vue` + `src/stores/budgetStore.ts`

## Architecture

### New files
- `src/composables/useAnimatedNumber.ts` — animated number counter composable

### Modified files
- `src/style.css` — add CSS custom properties + transition class definitions (`.row-*`, `.fade-*`, `.dialog-*`, `.slide-left-*`, `.slide-right-*`)
- `src/App.vue` — wrap `<BudgetTable>` in `<Transition :name="yearSlideDir">`
- `src/stores/budgetStore.ts` — add `yearSlideDirection` state
- `src/components/BudgetSectionRow.vue` — `TransitionGroup` for category rows, animated chevron
- `src/components/BudgetCategoryRow.vue` — `TransitionGroup` for item rows, animated chevron
- `src/components/BudgetItemRow.vue` — edit mode fade + row enter/leave transitions
- `src/components/BudgetTotalsRow.vue` — `useAnimatedNumber` for totals
- `src/components/BudgetDifferenceRow.vue` — `useAnimatedNumber` for difference values
- `src/components/ItemFormDialog.vue` — dialog transition
- `src/components/CategoryFormDialog.vue` — dialog transition
- `src/components/CopyYearDialog.vue` — dialog transition

## Non-goals

- No animation library dependencies
- No changes to business logic or data model
- No animation on the toolbar or table header
