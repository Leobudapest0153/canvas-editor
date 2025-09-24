# Repository Guidelines

## Project Structure & Module Organization
The Vite-powered Vue 3 app lives under `src/`, with `main.js` mounting `App.vue`. Feature logic is grouped inside `src/inventory-smart`, which splits concerns into `components/`, stateful `stores/`, reusable `composables/`, domain-specific `modules/`, and helper `utils/`. UI routes live in `src/pages`, the router in `src/router`, and shared global styles in `src/styles`. Public assets ship from `public/`, while project docs stay in `docs/`.

## Build, Test, and Development Commands
Run `npm install` once to sync dependencies. Use `npm run dev` for Vite hot-module development, `npm run build` for production bundles, and `npm run preview` to smoke-test the build locally. Quality gates include `npm run lint` (ESLint with autofix), `npm run format` (Prettier on `src/`), and `npm run test:unit` (Vitest + Vue Test Utils).

## Coding Style & Naming Conventions
Follow the repo `.editorconfig`: two-space indents, spaces over tabs, LF endings, and max 100 characters per line. Prettier enforces single quotes and no semicolons; do not override these defaults. Favor PascalCase for Vue SFC filenames (e.g., `HomePage.vue`), camelCase for functions and variables, and prefix composables with `use` (e.g., `useSelection`). Keep stores inside Pinia modules named `useXStore`.

## Testing Guidelines
Vitest drives both unit and integration specs, with setup in `src/__tests__/test-setup.js`. Place new tests in `src/inventory-smart/__tests__` using the `*.spec.js` pattern already in place. Mirror the feature folder structure when practical, and cover canvas interactions with high-level integration specs plus targeted geometry/unit checks. Run `npm run test:unit` before pushing; include new edge cases whenever business rules expand.

## Commit & Pull Request Guidelines
Match the existing Conventional Commit style (`feat:`, `fix:`, `test:`, etc.) and keep messages under 72 characters on the subject line. Squash local noise before opening a PR, then provide a concise summary, list impacted areas, and link Jira/GitLab issues. Attach screenshots or GIFs for UI-facing changes and note any follow-up work. Always state which checks you ran (e.g., lint, tests) in the PR description.

## Environment & Tooling Notes
Use Node.js 20.19+ (see `package.json` engines) and ensure pnpm/yarn lockfiles are not committed. Docker support exists via `Dockerfile` and `docker-compose.yml` for parity with staging; rebuild containers whenever dependencies change. Keep secrets out of the repo—leverage `.env.local` entries and document required keys in `docs/` without committing values.

## Reglas de Trabajo (IA & Devs)
- Estilos: agregar en los bloques `<style>` locales de componentes existentes (preferir `InventorySmart.vue` o el componente afectado). Si se requiere un estilo global, usar `src/styles/index.css`.
- Constantes: reutilizar o ampliar las existentes; si se requiere una nueva y ya hay un módulo afín, definirla ahí para evitar archivos sueltos.
- Redacción: no modificar ortografía, signos o símbolos de textos existentes a menos que se pida de forma explícita.
- Codificación: mantener siempre intactos acentos, emojis, caracteres especiales y comentarios. No reescribir ni reinterpretar texto en otro encoding (UTF-8 se asume por defecto). Cualquier tarea pedida debe limitarse a la lógica/estructura indicada sin introducir cambios accidentales de codificación.

## 📏 Regla de Mantenimiento: Componentes de Gran Tamaño

Con el fin de mantener la escalabilidad y facilitar el mantenimiento del proyecto, se establece la siguiente norma:

### 1. Principio General
- No agregar más líneas de código directamente en componentes que ya son demasiado grandes (CanvasView.vue, InventorySmart.vue, u otros identificados como críticos).
- Toda lógica que aumente significativamente la complejidad debe moverse a un archivo independiente y luego importarse.

### 2. Criterios de Extracción
- Si una función supera las 40 líneas de código o concentra múltiples condicionales/casos especiales, debe extraerse.
- Si se trata de lógica reactiva o dependiente de setup → mover a /composables.
- Si se trata de funciones puras o helpers reutilizables → mover a /utils.
- Si se trata de UI/renderizado → crear un subcomponente en /components.

### 3. Notas
Pequeñas correcciones (1–3 líneas) pueden aplicarse directamente en el componente.

Siempre documentar en el PR qué funciones fueron extraídas y a qué carpeta fueron movidas.

Este lineamiento aplica también a InventorySmart.vue y cualquier otro componente de tamaño similar.