# Sales Portal Dummy API Contract (3 Day Edition)

Only the in-scope subset is documented here. The mock server exposes more endpoints (serials, renewals, audit, clone, migrate, staff) but do not integrate them — ignore them, spend time on in-scope screens and the wizard.

## Running the Dummy API

```bash
cd docs/assessments/frontend-sales-portal/mock-api
node server.js
```

Base URL:

```text
http://localhost:8787/api
```

Sales URL:

```text
http://localhost:8787/api/v3/sales
```

## Response Shapes

List:

```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "limit": 25, "total": 42, "totalPages": 2 },
  "stats": {}
}
```

Single / mutation:

```json
{ "success": true, "message": "Saved", "data": {} }
```

Error:

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Resource not found" } }
```

## Auth

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/login` | Login with dummy credentials |
| GET | `/auth/me` | Return current dummy profile |

Login body:

```json
{ "email": "admin@example.test", "password": "assessment" }
```

Mock accepts any seeded staff/client email with password `assessment`.

## Dashboard

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v3/sales/test` | Health check |
| GET | `/v3/sales/dashboard/summary` | KPI cards, renewals, funnel, alerts |

## Organizations

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v3/sales/organizations` | List |
| GET | `/v3/sales/organizations/:id` | Get |
| POST | `/v3/sales/organizations` | Create (used by the wizard organization path) |
| PUT | `/v3/sales/organizations/:id` | Update — also used for activate/deactivate |

Query params: `page`, `limit`, `search`, `sortBy=name|createdAt`, `sortOrder=asc|desc`, `salesId`.

Create body (minimum):

```json
{ "name": "Acme Group", "adminId": "client_001", "country": "JO", "timezone": "Asia/Amman", "currency": "JOD" }
```

## Branches

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v3/sales/branches` | List (filter by `orgId`) |
| GET | `/v3/sales/branches/:id` | Get |
| POST | `/v3/sales/branches` | Create (used by the wizard organization path) |
| PUT | `/v3/sales/branches/:id` | Update |
| DELETE | `/v3/sales/branches/:id` | Delete — must be blocked if branch has venues |

Query params: `page`, `limit`, `search`, `sortBy=name|createdAt`, `sortOrder=asc|desc`, `orgId`.

Create body (minimum):

```json
{ "orgId": "org_001", "name": "Downtown Branch", "city": "Amman", "active": true }
```

## Venues

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v3/sales/venues` | List |
| GET | `/v3/sales/venues/:id` | Get |
| POST | `/v3/sales/venues` | Create (used by both wizard paths and the standalone create form) |
| PUT | `/v3/sales/venues/:id` | Update — also used for status change |

Query params: `page`, `limit`, `search`, `sortBy=name|createdAt|owner`, `sortOrder=asc|desc`, `salesId`, `orgId`, `branchId`, `venueType=organization|standalone`.

Create body for an org-attached venue:

```json
{
  "name": "Acme Downtown Restaurant",
  "owner": "client_001",
  "orgId": "org_001",
  "branchId": "branch_001",
  "type": "restaurant",
  "timezone": "Asia/Amman",
  "currency": "JOD"
}
```

Create body for a standalone venue (no org/branch):

```json
{
  "name": "Indie Bistro",
  "owner": "client_002",
  "orgId": null,
  "branchId": null,
  "type": "restaurant",
  "timezone": "Asia/Amman",
  "currency": "JOD"
}
```

## Clients

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v3/sales/clients` | List |
| GET | `/v3/sales/clients/:id` | Get |
| POST | `/v3/sales/clients` | Create (used by both wizard paths and the standalone clients screen) |
| PUT | `/v3/sales/clients/:id` | Update |
| DELETE | `/v3/sales/clients/:id` | Delete with dependency check |

Query params: `page`, `limit`, `search`, `sortBy=name|createdAt`, `sortOrder=asc|desc`, `salesId`.

Create body (minimum):

```json
{ "name": "Jane Doe", "email": "jane@example.test", "phone": "+962700000000", "company": "Acme Group" }
```

## Wizard API Sequencing

No dedicated endpoint. Wizard composes the create endpoints above:

- **Organization path**: `POST /clients` → `POST /organizations` (using the new `clientId` as `adminId`) → `POST /branches` (using the new `orgId`) → `POST /venues` (using the new `orgId`, `branchId`, and `clientId`).
- **Standalone path**: `POST /clients` → `POST /venues` (with `orgId: null`, `branchId: null`, and the new `clientId` as `owner`).

If any step fails, wizard stops at that step and lets the user retry with the same form values. Previously-created entities are not re-created on retry; wizard remembers what already succeeded.

## Out-of-Scope Endpoints (Ignore)

Mock also exposes endpoints for serials, renewals, audit, clone, migrate, staff CRUD. These are **not** required and should not be wired into the UI. Time on them counts against polish on in-scope screens and wizard.
