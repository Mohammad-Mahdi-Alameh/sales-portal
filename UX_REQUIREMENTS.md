# UX Requirements (3 Day Edition)

## Design Direction

Internal ops tool: dense but readable, calm, fast, predictable. No marketing hero, no decorative filler.

## App Shell

- Left nav grouped: Dashboard, Organizations, Branches, Venues, Clients, Setup.
- Top bar: current user, role, sign-out button.
- Active route visually clear.
- Responsive: nav collapses on tablet.

Role-aware nav at link level is enough: admins see Clients, staff see Clients but cannot delete. No separate Staff management screen needed.

## Dashboard

KPI cards from `/api/v3/sales/dashboard/summary`. Surface at minimum:

- Active organizations.
- Active venues.
- Trial venues.
- Renewals due soon.
- Small "Recent activity" list.
- Quick-link buttons to Setup (wizard), Organizations, Venues, Clients.

Decorative chart filler not required.

## Data Tables

Every list (Organizations, Branches, Venues, Clients) must include:

- Search input.
- Column sort on at least one column.
- Pagination bound to the API.
- Loading skeleton or stable loading rows (no layout jump).
- Empty state with clear next action.
- Error state with retry.
- Row actions (view, toggle status where applicable, delete where applicable).
- Confirmation modal for any destructive action.

## Forms (Standalone Create Screens and CRUD)

- Reactive form with field-level validation.
- Submit disabled while invalid or saving.
- Server-side error mapped onto form (preserve user input).
- Success feedback (toast or inline) plus redirect to created entity's detail.

Specific cases:

- **Create organization**: `name` and `adminId` required; offer quick client picker (autocomplete against `/clients?search=`).
- **Create branch**: `orgId` and `name` required; `orgId` may be preselected if reached from an organization detail page.
- **Create venue**: `type`, `timezone`, `currency`, `name`, and `owner` always required. If `orgId` set, `branchId` required too. Provide clear toggle between "Standalone" and "Under an organization" controlling which fields appear.

## Setup Wizard

Wizard is the assessment's marquee flow. UX expectations:

- **Path selection** on entry step: "Organization setup" vs "Standalone venue". Show one-sentence description of each path so a new sales rep chooses correctly.
- **Stepper** at top showing all steps for chosen path, current step, completed steps. Steps per path:
  - Organization path: 1. Client → 2. Organization → 3. Branch → 4. Venue → 5. Review & finish.
  - Standalone path: 1. Client → 2. Venue → 3. Review & finish.
- Each step is a reactive form with full validation; **Next** disabled until step valid.
- **Back** preserves form state when revisiting earlier steps.
- **Review** step shows everything to be created, grouped per entity, with an Edit link per group jumping back to the relevant step.
- Final **Finish** creates entities in sequence (see [API_CONTRACT](./API_CONTRACT.md) for the call order) and shows progress (e.g., "Creating client… Creating organization…").
- **Partial failure handling**: if step N succeeds and step N+1 fails, do not silently abandon half-created entities. Show which step failed, why, and offer Retry without re-creating already-succeeded entities.
- On success: toast "Setup complete" and redirect to new venue's detail page.
- User can cancel wizard anytime; cancel shows confirm modal if any field filled.

## Required Interaction Details

- Organization activate/deactivate is an **optimistic update**: flip UI immediately, call API, roll back on failure with toast.
- Venue status change uses same optimistic pattern.
- Deleting a client or branch must confirm and surface a clear error if the API reports a dependency.
- Loading states must not collapse layout.
- Toasts never the only place a critical error shows — keep an inline error near the failing control.

## Accessibility

- Keyboard-accessible controls everywhere (tab order, focus styles).
- Wizard: Enter advances when step valid; Esc triggers cancel confirm.
- Visible focus states.
- Label every field; no placeholder-only forms.
- Buttons have accessible names.

## Responsive

- Desktop: full nav and table view; wizard uses two-column layout (form + summary panel).
- Tablet: collapsed nav, horizontally safe tables; wizard collapses to single column.
- Mobile: not required to be feature-perfect, but text and controls must not overlap or clip.

## Custom Engineering & Performance Overrides

### 1. Architectural Patterns
* **Component Architecture**: Use 100% standalone components[cite: 9]. No NgModules unless absolutely required and strictly justified[cite: 9].
* **Folder Structure**: Strict feature-driven folder layout (e.g., `features/setup-wizard/components/`, `features/organizations/`).
* **Change Detection Strategy**: Enforce `changeDetection: ChangeDetectionStrategy.OnPush` across all wizard components for optimal rendering. Reactive streams or signals drive the view to handle change cycles.

### 2. Setup Wizard State Engine
* **State Management**: Intermediate wizard state lives in a centralized service using modern Angular Signals[cite: 3, 9]. Do not thread form states via component `@Input` or `@Output`[cite: 3, 9].
* **Unified Data Model**: Track all wizard form values in a single `formData` state object in the service.
* **State & Back-Button Preservation**: On backward nav, hydrate the local reactive form from values cached in the service's data signal to preserve inputs seamlessly[cite: 1, 2, 3].
* **Performance Optimization**: Use `valueChanges` with `distinctUntilChanged` before pushing updates to the service to eliminate redundant signal writes and unnecessary template dirty-checking.

### 3. Resilience & Local Storage Caching
* **Draft Caching**: Serialize and sync the active step, raw form data, and created entity IDs to `localStorage` on change[cite: 9].
* **Read-Performance Optimization**: Load the cached draft from `localStorage` once during service init to avoid blocking synchronous reads during step navigation.
* **Partial Failure Handling**: If an API step fails, store successful entity IDs in service state[cite: 1, 2, 3]. On retry, skip calls for already-created items to prevent duplication[cite: 1, 2, 3]. Clear the entire cache only on final wizard success[cite: 3].
