# Linksy Frontend — Agent guide

## Stack
- Next.js 15 App Router, React 19, TypeScript
- TanStack Query, Axios (`withCredentials`), Zustand, shadcn/ui
- SignalR: chat/calls only — not for admin MVP

## Admin feature (cross-repo)
- **PRD master:** backend repo `docs/admin-prd.md` (see [docs/admin-prd.md](./docs/admin-prd.md) stub)
- **Cursor rule:** [.cursor/rules/admin-frontend.mdc](./.cursor/rules/admin-frontend.mdc)

### Tickets in this repo
| ID | Work |
|----|------|
| M3 | Types + `src/lib/api/admin.ts` | **Done** |
| M4 | `src/app/(admin)/` + guard | **Done** |
| M5 | Users CRUD UI | **Done** |
| M6 | Review + smoke test | **Done** — see backend [admin-m6-review.md](../backend_api/docs/admin-m6-review.md) |

### Depends on backend (M1)
Login/refresh must return `user.roles` before M4 guard works. Coordinate with backend repo M1.

## Agent prompts
```
Implement M4 from admin PRD. Frontend only.
@src/app/(main)/layout.tsx @src/lib/api/auth.ts
PRD: @../backend_api/docs/admin-prd.md (multi-root) or paste section 7
```

## Multi-root workspace (recommended)
Add both repos to one Cursor workspace to `@` backend PRD from frontend sessions.
