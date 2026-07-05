# Front-End Submission Checklist (3 Day Edition)

Candidates include:

- Exact Angular, Node, and package manager versions.
- One-command setup from a fresh clone.
- API base URL configuration in `environment.ts` (pointed at `http://localhost:8787/api` by default).
- Test command (unit + smoke).
- Optional: screenshots or a short demo video link.
- Architecture notes — wizard state-management choice, what was cut, what would come next.
- Known limitations.

Reviewers verify:

- App runs from a fresh clone with one command.
- Points at the dummy API, not hardcoded local data.
- Login works with `admin@example.test` / `assessment`.
- Dashboard loads from `/api/v3/sales/dashboard/summary`.
- Organizations, Branches, Venues, and Clients all call the API and respect pagination + search.
- Activate/deactivate is optimistic and rolls back on a forced API failure (reviewers can simulate by editing the mock).
- Destructive delete (client, branch) is confirmed before sending and surfaces dependency errors inline.
- Forms preserve input on a failed submit.
- The standalone Create Venue form correctly toggles between "Standalone" and "Under an organization" and submits the right body shape.
- Branch delete is blocked when venues exist under it.
- **Setup wizard organization path**: client → organization → branch → venue produces all four entities and lands on the venue detail.
- **Setup wizard standalone path**: client → venue produces both entities and lands on the venue detail.
- Wizard Back preserves form state.
- Wizard partial-failure: forcing the venue step to fail keeps the previously-created entities and lets the user retry without re-creating them.
- Tailwind is the styling source; no scattered inline CSS.
- Tests run; the smoke test covers the standalone wizard path.
- Out-of-scope screens (serials, renewals, audit, clone, migrate, staff CRUD) are not built.
