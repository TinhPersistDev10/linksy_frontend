# Admin PRD — Link stub (Frontend repo)

**The master PRD lives in the backend repo** (Option A — single source of truth).

## Read the full PRD

When using a **multi-root workspace** (backend + frontend under the same parent folder):

- [../backend_api/docs/admin-prd.md](../backend_api/docs/admin-prd.md)

When the two repos are separate on GitHub (cloned independently), update the link below:

- `https://github.com/<org>/linksy-backend/blob/main/docs/admin-prd.md`

## Tickets in the frontend repo

| ID | Work |
|----|------|
| M3 | `User.roles` type + `src/lib/api/admin.ts` |
| M4 | `src/app/(admin)/` layout + role guard |
| M5 | Users CRUD UI (`/admin/users`) |
| M6 | Review frontend diff + smoke test |

## Agent prompts

Open the **frontend repo** workspace, attach the PRD from backend (multi-root or paste sections 6–7):

```
Implement M3 from admin PRD section 6–7. Frontend only.
Follow @src/lib/api/auth.ts pattern. Do not change backend.
```

## Cursor rule

See [.cursor/rules/admin-frontend.mdc](../.cursor/rules/admin-frontend.mdc)
