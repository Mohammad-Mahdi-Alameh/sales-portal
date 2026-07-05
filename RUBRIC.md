# Front-End Evaluation Rubric (3 Day Edition)

Score each category 1 to 5. Wizard correctness, UX correctness, and Angular architecture carry the most weight.

## 1. Wizard Correctness (weight: high)

5: Both paths work end-to-end. The stepper accurately reflects progress. Back preserves state. Server errors surface inline at the failing step. Partial failures do not re-create already-created entities on retry. On success the user lands on the new venue's detail.

3: One path works cleanly, the other has rough edges. Partial-failure handling is naive (re-creates entities or loses state).

1: Wizard is a single long form, not a real multi-step flow, or paths are mixed together.

## 2. UX Correctness (weight: high)

5: Every list has loading/empty/error states; every destructive action confirms; the activate/deactivate toggle is optimistic and rolls back on failure; forms preserve input on error.

3: Most states present; one or two screens are shallow.

1: Naive CRUD with no real state handling.

## 3. Angular Architecture (weight: high)

5: Modern Angular patterns (standalone or well-justified modules), typed services, strict TypeScript, reusable components, clean route organization, the wizard state lives in a dedicated service, no API logic in templates.

3: Functional app with some duplicated or loosely typed code; wizard state threaded through component inputs/outputs.

1: Inconsistent structure, weak typing, fragile coupling.

## 4. API Integration

5: Centralized typed API client, centralized error mapping over the `{ success, error }` envelope, query params handled cleanly, wizard composes the create endpoints in the right order, no hardcoded sample data anywhere.

3: API calls work but are inconsistent across screens.

1: Hardcoded data in components or untyped `fetch` calls everywhere.

## 5. Visual Execution

5: Operational dashboard feel, clear hierarchy, stable layouts, consistent Tailwind usage, good responsive behavior on desktop and tablet, wizard layout is calm and scannable.

3: Usable but uneven visual detail or state handling.

1: Hard to scan, inconsistent, or visually broken.

## 6. Testing

5: Unit/component tests on the wizard's step validation and path-switching, the create-venue form (standalone vs org-attached branches), and the optimistic activate/deactivate toggle. One smoke test for login → wizard standalone path → venue detail.

3: A handful of tests on services or components.

1: No meaningful tests.

## 7. Accessibility and Responsiveness

5: Keyboard reachable, visible focus, labeled fields, semantic controls, no layout overlap on desktop or tablet; wizard supports Enter/Esc.

3: Mostly accessible with gaps.

1: Accessibility ignored or responsive layout breaks.

## 8. Communication

5: Clear README with exact Angular/Node versions, setup commands, the wizard state-management choice explained, what was cut and why, known gaps, optional screenshots.

3: Basic README.

1: Hard to run or evaluate.

## Review Red Flags

- Wizard re-creates entities that already succeeded on retry after a partial failure.
- Wizard loses form state when going back.
- Hardcoded sample data instead of API calls.
- App will not run from a fresh clone.
- Latest Angular requirement ignored without explanation.
- Tailwind installed but most styling is ad hoc inline CSS.
- Activate/deactivate is not optimistic (or never rolls back).
- Destructive actions without confirmation.
- Tests skipped entirely.
- Time spent on out-of-scope screens (serials, renewals, audit, clone, migrate, staff CRUD) at the expense of polish on the required ones or wizard quality.
