# Ring n Bring — Sales Portal (Front-End Slice)

A focused slice of the Ring n Bring sales portal built in modern Angular against
the provided dummy REST API. It ships an auth shell, dashboard, four CRUD areas
(organizations, branches, venues, clients), and a two-path multi-step setup
wizard — all with real loading / empty / error / optimistic / confirm states.

> The original assessment brief is preserved in
> [ASSESSMENT_BRIEF.md](ASSESSMENT_BRIEF.md).

## Stack & Versions

| Tool | Version |
| --- | --- |
| Angular | 22.0.5 (standalone, zoneless, signals, new control flow) |
| TypeScript | 6.0.3 (strict) |
| Tailwind CSS | 4.x (via `@tailwindcss/postcss`) |
| Node | 24.18.0 |
| npm | 11.16.0 |
| Unit tests | Vitest via `@angular/build:unit-test` |
| E2E | Playwright |

Every component is standalone and uses `ChangeDetectionStrategy.OnPush`.
State is signal-based; DI uses `inject()`; routes use `withComponentInputBinding()`.

## Setup (one command)

```bash
npm install
```

### Run the mock API + app

The mock API lives in [mock-api/](mock-api/) and serves `http://localhost:8787/api`.

```bash
# terminal 1 — mock API
npm start --prefix mock-api

# terminal 2 — Angular dev server (http://localhost:4200)
npm start
```

Sign in with any seeded email and the password `assessment`
(prefilled default: `admin@example.test` / `assessment`).

## Configuration

API base URLs live in [src/environments/environment.ts](src/environments/environment.ts):

```ts
apiBase:   'http://localhost:8787/api'
salesBase: 'http://localhost:8787/api/v3/sales'
```

Override these for a different mock host; no other config is required.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Dev server on :4200 |
| `npm run build` | Production build to `dist/` |
| `npm test` | Unit tests (watch) |
| `npx ng test --watch=false` | Unit tests, single run |
| `npm run e2e` | Playwright smoke (boots mock API + app automatically) |

First Playwright run needs browsers: `npx playwright install chromium`.

## Architecture

```
src/app/
  core/         models, typed ApiClient, auth (service/guard/interceptor), toast + confirm services
  shared/ui/    reusable DataTable, toast container, confirm modal
  layout/       app shell (role-aware nav)
  features/
    auth/         login
    dashboard/    KPI cards + recent activity
    organizations/ list • create • detail
    branches/     list • create/edit
    venues/       list • create • detail
    clients/      list • create/edit
    setup-wizard/ signal state service • shell • step components
```

### Typed API client

`core/api/api-client.ts` unwraps the mock's envelopes
(`{ success, data }`, list `{ data, pagination, stats }`, error
`{ success:false, error:{ code, message } }`) and maps failures to a single
`ApiError { code, message, status }`. Lists share one `ListQuery` type.

### UX states

- **Loading**: skeleton rows in the shared `DataTable`.
- **Empty / error**: dedicated table states with a retry / empty-action.
- **Optimistic**: organization activate/deactivate and venue status change apply
  immediately and **roll back** on failure, surfaced via a toast.
- **Confirm**: destructive actions (client/branch delete, wizard cancel) go
  through a promise-based confirm modal. Delete honours the API's `409
  HAS_DEPENDENCIES` guard with an inline message.

### Setup wizard — state management

`features/setup-wizard/services/wizard-state.service.ts` is a signal-based store
chosen over a heavier state library because the flow is self-contained and
benefits from fine-grained reactivity:

- A single **unified `data` object** spans every step. Each step owns a
  `FormGroup` with `Validators`; on **Back**, the `FormGroup` is patched with
  the previously saved values from `WizardStateService`; on valid **Next**,
  the `FormGroup`'s value is written into `WizardStateService` before advancing.
- `path` (`organization` | `standalone`) drives the step set and the create
  sequence.
- State (`path`, `currentStep`, `data`, `createdIds`) is **persisted to
  localStorage** — loaded once in the constructor, then written via an `effect`.
- **Sequential creates** compose the plain endpoints:
  - Organization path: `POST /clients` → `POST /organizations` (new client as
    `adminId`) → `POST /branches` (new `orgId`) → `POST /venues` (new
    `orgId` + `branchId` + client as `owner`).
  - Standalone path: `POST /clients` → `POST /venues`
    (`orgId: null`, `branchId: null`, client as `owner`).
- Each success records its id in `createdIds`. On failure the wizard **stops at
  that step and surfaces it**; **Retry re-runs and skips already-created
  entities**. The persisted cache is **cleared only on total success**.

## Tests

- `wizard-state.service.spec.ts` — path switching, step validation, both create
  sequences, retry-skips-created, cache-cleared-on-success.
- `venues-list.component.spec.ts` — optimistic status change applies then rolls
  back on error.
- `app.spec.ts` — root bootstraps.
- `e2e/smoke.spec.ts` — login → standalone wizard → venue detail.

## Out of scope (intentionally cut)

Per the brief: no staff CRUD, serial keys, renewals, clones, migrations, or
audit pages. The mock exposes those endpoints; they are not wired into the UI.

## Known gaps / assumptions

- Login accepts any seeded email with the password `assessment` (mock behaviour).
- Owner/admin selection uses client autocomplete against `/clients`.
- The mock API is checked in under [mock-api/](mock-api/) rather than the
  `docs/assessments/...` path some docs reference; adjust `--prefix` if relocated.
