# Design: Drag-and-Drop, Frequency Options, and Modal UX

**Date:** 2026-03-30
**Branch:** feat/animations

---

## Overview

Four related improvements to the budget planner:

1. Drag-and-drop reordering of items across categories and sections
2. Frequency options for budget items (monthly, weekly, quarterly)
3. Enter key submission in modal dialogs
4. Modal amount layout cleanup

---

## 1. Data Model Changes

### `BudgetItem` extension

Three new optional fields on the existing `BudgetItem` interface:

```ts
interface BudgetItem {
  // ...existing fields unchanged...
  frequency: 'monthly' | 'weekly' | 'quarterly'  // defaults to 'monthly'
  weekday?: number        // 0=Sun … 6=Sat; only used when frequency='weekly'
  quarterStartMonth?: number  // 0=Jan … 11=Dec; only used when frequency='quarterly'
}
```

### `months[]` computation rules

The `months` array (12 values) is always computed from `frequency` + `baseAmount` + frequency-specific fields:

- **monthly**: all 12 values = `baseAmount`. Behavior unchanged from today. `baseAmount` = amount per month.
- **weekly**: for each month (Jan–Dec), count how many times `weekday` occurs in that calendar month, multiply by `baseAmount`. `baseAmount` = amount per week.
- **quarterly**: 4 months are active — `quarterStartMonth`, `quarterStartMonth+3`, `quarterStartMonth+6`, `quarterStartMonth+9` (all mod 12) — each set to `baseAmount`. Remaining 8 months = 0. `baseAmount` = amount per quarter.

### Migration

Existing items in localStorage have no `frequency` field. The store treats a missing or undefined `frequency` as `'monthly'`. No migration script required — full backwards compatibility.

### Monthly overrides interaction

Manual monthly overrides (the `useOverrides` toggle + 12-month grid) are only available when `frequency = 'monthly'`. For weekly and quarterly, the `months[]` array is fully computed and the overrides UI is hidden.

---

## 2. Drag-and-Drop

### Library

`vue-draggable-plus` — a Vue 3 wrapper around SortableJS. Installed as a project dependency.

### Drag targets

Each category's item list is wrapped in `<VueDraggable>`, bound to that category's reactive `items` array. All categories in both Expenses and Income sections are valid drop targets, including collapsed ones (items dropped onto a collapsed category are appended to the end).

### Store action

A new `moveItem(itemId: string, targetCategoryId: string, targetIndex: number)` action in `budgetStore`:

1. Finds the item and its source category.
2. Removes the item from the source category's `items` array.
3. Inserts it at `targetIndex` in the target category's `items` array.
4. No changes to the item's own fields — section membership is determined by the category tree, not a field on the item.

### Cross-section behavior

When the target category belongs to a different section (Expenses ↔ Income), the move proceeds identically. The item effectively changes type by virtue of being in the new category. No extra field update needed since `BudgetItem` has no `type` field.

### Visual feedback

SortableJS provides drag ghost and drop placeholder out of the box. No custom drop indicator is needed. Existing `TransitionGroup` animations on item rows will fire naturally as items are added/removed from reactive arrays during a drop.

---

## 3. Enter Key Submission

Both `ItemFormDialog` and `CategoryFormDialog` get a `@keydown.enter` listener on the dialog root element. The listener calls the same save handler as the confirm button. It does not fire if the event target is a button (to avoid double-firing when the confirm button itself is focused and Enter is pressed).

---

## 4. Modal Amount Layout

### Redesigned field order (ItemFormDialog)

1. **Name** — unchanged
2. **Category** — unchanged
3. **Frequency selector** — new segmented control or select: `Monthly | Weekly | Quarterly`
4. **Amount field** — label changes dynamically:
   - Monthly → "Amount per month"
   - Weekly → "Amount per week"
   - Quarterly → "Amount per quarter"
5. **Weekday picker** — shown only when `frequency = 'weekly'`. Select: Mon, Tue, Wed, Thu, Fri, Sat, Sun. Defaults to Monday when switching to weekly.
6. **Start month picker** — shown only when `frequency = 'quarterly'`. Select: Jan through Dec.
7. **Monthly overrides toggle + grid** — shown only when `frequency = 'monthly'`. Behavior unchanged.

### Computed preview

No live preview of computed `months[]` in the form — the existing totals in the table reflect it once saved.

---

## 5. Out of Scope

- Drag-and-drop reordering of categories (items only)
- Drag-and-drop across years
- Bi-weekly or yearly frequency options
- Live monthly breakdown preview in the form
