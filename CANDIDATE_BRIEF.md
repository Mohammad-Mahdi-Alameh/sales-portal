# Candidate Brief: Sales Portal (3 Day Edition)

## Context

Ring n Bring runs an internal sales portal to manage client onboarding, organizations, branches, venues, and operational visibility. Task: build a focused, modern Angular slice of that portal — including the **onboarding setup wizard** — against the provided dummy REST API.

Brief is intentionally narrower than full production scope so you can finish a polished slice in 3 days. We want thoughtful state handling, a clean multi-step flow, and solid Angular architecture on a focused surface, not breadth.

## What You Will Build

A modern Angular app using:

- Angular latest stable (prepared baseline `@angular/core@22.0.4`).
- Tailwind CSS.
- TypeScript strict mode.
- Standalone components or a clearly justified modern structure.
- Typed API services and models.
- Reactive forms (essential for the wizard).
- Responsive layout for desktop and tablet.

You will ship six screens plus a multi-step wizard:

1. **Login** — dummy credentials against `/api/auth/login`.
2. **Dashboard** — KPI cards from `/api/v3/sales/dashboard/summary` and quick navigation.
3. **Organizations** — list (search, sort, paginate), activate/deactivate, create, detail page.
4. **Branches** — list (filter by `orgId`), create, edit, delete with dependency check.
5. **Venues** — list with filters (`orgId`, `venueType`), status change, create (standalone or under an org/branch), detail page.
6. **Clients CRUD** — list, create, edit, delete with confirmation.
7. **Setup Wizard** — multi-step flow with two paths:
   - **Organization path**: client → organization → branch → venue.
   - **Standalone venue path**: client → venue.

## What You Will NOT Build

Out of scope. If time remains, write tests and polish in-scope screens and wizard instead.

- Staff CRUD.
- Serial keys.
- Renewals.
- Clone or migration workflows.
- Audit logs.

## Setup Wizard Requirements

Wizard is the marquee flow. Reviewers care more about the wizard working end-to-end than about the standalone create forms being individually beautiful.

Required behavior:

- Path selection on step 0: "Organization setup" vs "Standalone venue".
- A stepper UI showing current step, completed steps, and total steps.
- Each step is a reactive form with field-level validation.
- User can move **back** without losing input.
- Server errors at any step surface inline; wizard does not advance until the API confirms the entity was created.
- A draft summary panel (or final review step) shows what will be created before final submit.
- On success: redirect to the created venue's detail page and toast a confirmation.
- On partial failure (e.g., organization created but branch creation fails), surface where it failed and let the user retry the failing step. Do not silently abandon the half-created entity.

Store in-flight wizard state in a signal-based service or a reactive form group — your call, justify it in the README.

## UX Expectations

Internal operations tool, not a marketing page. Prioritize density, clarity, speed, predictability.

Every list and form must handle:

- Loading skeleton or stable rows (no layout jump).
- Empty state with a clear next action.
- Error state with a retry path.
- Optimistic update on the activate/deactivate toggle, with rollback on failure.
- Confirmation modal on every destructive action.

First screen after login is the dashboard. No landing hero.

## Engineering Expectations

- All API calls go through a typed client; no `fetch`/`HttpClient` calls scattered across components.
- Centralized error handling that maps the API's `{ success: false, error }` envelope.
- Route-level loading boundaries where it helps.
- Field-level form validation, disabled submit when invalid or saving.
- The wizard's intermediate state lives in a dedicated service, not in component inputs/outputs threaded through every step.
- Tests on the highest-risk pieces:
  - Wizard step validation and path-switching.
  - Create-venue form (including the standalone-vs-org-attached branch).
  - Activate/deactivate optimistic update with rollback.
- One end-to-end smoke test: login → wizard (standalone path) → land on the venue detail.

## Suggested Time Allocation

- **Day 1** — Angular + Tailwind setup, app shell with left nav and top bar, auth guard, API client + interceptors, login, dashboard with KPI cards, organizations list with activate/deactivate.
- **Day 2** — Organization detail, organization create form, branches CRUD, venues list with filters and status change, venue detail, standalone venue create form.
- **Day 3** — Setup wizard (both paths), clients CRUD, component tests, smoke test, README, polish.

Warning: the wizard usually takes more than half a day if you have not built a stepper before. Start it on Day 3 morning at the latest, or stub the clients screen earlier and pick it up only if the wizard finishes ahead of plan.

## Stretch Items (Only If Core Is Solid)

- URL-synchronized filters and pagination.
- Skeleton loading that preserves table geometry.
- Keyboard shortcuts for the wizard (back/next).
- A small reusable `DataTable` component you would be proud to ship.
- The wizard remembers in-progress drafts across reloads (localStorage).
- Screenshots in the README.

## What Reviewers Care About

In order of weight:

1. Wizard correctness — both paths work end-to-end, errors surface where they happen, no half-created entities are silently abandoned.
2. UX correctness across lists and forms — loading/empty/error/confirm everywhere; optimistic toggle rolls back.
3. Angular architecture — typed services, the wizard's state in a dedicated service, no API logic in templates.
4. API integration — central client, centralized error mapping, no hardcoded sample data.
5. Visual polish — operational dashboard feel, stable layouts, consistent Tailwind usage.
6. Testing — meaningful tests on the wizard, create-venue, and optimistic toggle, plus the smoke test.
7. Communication — README explains the Angular version, the wizard state-management choice, what was cut, and what would come next.
