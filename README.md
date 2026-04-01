# Budget 1503

A personal budgeting app built with Vue 3, Vite, and PrimeVue. Manage multiple budgets per year, track income and expenses across categories, and export your data — all stored locally in the browser.

**Live demo:** https://jacob-winther.github.io/budget1503/

## Features

- Multiple budgets per year with rename and delete support
- Income and expense tracking across customizable categories
- Calculated values with visual indicators
- Drag-and-drop row reordering
- Clean CSV export
- All data stored in browser localStorage — no server, no account required

## Getting started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The output goes to `dist/` and can be served as a static site.

## Tests

```bash
npm run test        # run tests in watch mode
npm run coverage    # run tests with coverage report
```

## For developers

The project follows a **smart stores / dumb components** architecture:

- All business logic, state, calculations, and persistence live in `src/stores/budgetStore.ts`
- Components are presentational — they receive props and emit events, delegating mutations to the store
- Dialog components manage their own form state (draft values, validation) which is appropriate UI-layer responsibility

`App.vue` acts as the top-level coordinator and contains some orchestration logic (routing edits to dialogs vs inline, export/import flow). This is the main grey area in the pattern, but the overall separation of concerns is sound.

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE) for details.
