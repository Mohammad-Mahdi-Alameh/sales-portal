# Front-End Assessment: Sales Portal (3 Day Edition)

## Objective

Build a focused slice of the Ring n Bring sales portal in modern Angular against the provided dummy REST API. Time-boxed to **3 calendar days** (lower bound; expect a firm 3 with the setup wizard included). Goal: see how the candidate structures an Angular app, types an API client, models a multi-step flow, handles real UX states (loading, empty, error, optimistic, confirm), and ships a small but realistic set of operational workflows.

Prepared baseline is Angular `22.0.4` with Tailwind CSS. If a newer stable Angular version is current when the assessment is sent, use it and document the version in the README.

## Time Box

- Total: **3 calendar days**.
- Suggested split: Day 1 shell + auth + dashboard + organizations, Day 2 venues + branches + creation forms, Day 3 setup wizard + clients CRUD + tests + polish.

If the candidate cannot reach full scope, ship dashboard, organizations, venues, branches, and setup wizard as a working slice and document the rest under known gaps.

## Candidate Deliverables

- Angular app (latest stable) with Tailwind, TypeScript strict mode.
- Typed API client for the dummy REST API.
- Auth shell with role-aware navigation.
- Six screens, fully wired and stateful: login, dashboard, organizations (+ detail + create), branches (+ create), venues (+ detail + create), clients CRUD.
- Multi-step **setup wizard** with two paths (organization path and standalone path).
- Loading, empty, error, optimistic, and confirmation states across those screens.
- A handful of component tests on the highest-risk pieces (wizard step validation, create-venue form, optimistic toggle).
- One smoke test (Cypress / Playwright / Angular e2e) covering login → wizard → standalone path end-to-end.
- README with setup, Angular version, assumptions, and known gaps.

## In-Scope Workflows

1. Login with dummy credentials against `/api/auth/login`.
2. Dashboard overview with KPI cards from `/api/v3/sales/dashboard/summary` and quick links.
3. Organizations list: search, sort, paginate, activate/deactivate, detail view, **create**.
4. Branches list scoped to an organization: **create**, edit, delete with dependency check.
5. Venues list: filters (`orgId`, `venueType`), status change, detail view, **create** (standalone and inside an organization/branch).
6. Clients CRUD: list, create form with validation, edit, soft-delete with confirmation.
7. **Setup wizard** with two paths:
   - Organization path: client → organization → branch → venue.
   - Standalone venue path: client → venue.

## Out of Scope

Part of the full production portal, intentionally **not** required:

- Staff CRUD (dashboard already shows staff workload; enough).
- Serial key list, generation, batch generation, status changes, guarded delete.
- Renewals page, notification settings, activity logging.
- Clone and migration workflows.
- Audit log page.

If you find yourself building any of these, stop. Spend the time on in-scope screens, the wizard, tests, and polish.

## Dummy API

The mock API is already runnable:

```bash
cd docs/assessments/frontend-sales-portal/mock-api
node server.js
```

Base URLs:

- Sales API: `http://localhost:8787/api/v3/sales`
- Auth API: `http://localhost:8787/api/auth`

Login as `admin@example.test` (or any seeded staff email) with password `assessment`.

## Supporting Files

- [Candidate Brief](./CANDIDATE_BRIEF.md) — what to build, day-by-day plan.
- [API Contract](./API_CONTRACT.md) — the subset of endpoints you need.
- [UX Requirements](./UX_REQUIREMENTS.md) — expected states, interactions, and wizard behavior.
- [Evaluation Rubric](./RUBRIC.md) — scoring categories.
- [Submission Checklist](./SUBMISSION_CHECKLIST.md) — what to hand in.
- [Runnable Dummy API](./mock-api/README.md) — how the mock works.
