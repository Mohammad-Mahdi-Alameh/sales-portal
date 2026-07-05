# Sales Portal Dummy API

Dependency-free Node.js mock API for the front-end assessment. Keeps data in memory, so restarting the server resets the data.

## Run

```bash
node server.js
```

Optional:

```bash
PORT=8788 node server.js
```

## Base URLs

- `http://localhost:8787/api/auth`
- `http://localhost:8787/api/v3/sales`
- `http://localhost:8787/api/v1/renewals`

## Dummy Credentials

```json
{
  "email": "admin@example.test",
  "password": "assessment"
}
```

Any seeded staff or client email works with password `assessment`.

## Notes

- Intentionally simple; stores mutations in memory.
- Supports CORS for local Angular development.
- Mirrors the sales-dashboard endpoints candidates need for the assessment.

