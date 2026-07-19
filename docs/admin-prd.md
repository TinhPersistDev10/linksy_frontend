# Admin PRD — Link stub (Frontend repo)

**PRD master nằm ở backend repo** (Cách A — single source of truth).

## Đọc PRD đầy đủ

Khi mở **multi-root workspace** (backend + frontend cùng folder cha):

- [../backend_api/docs/admin-prd.md](../backend_api/docs/admin-prd.md)

Khi hai repo tách trên GitHub (clone riêng), cập nhật link sau:

- `https://github.com/<org>/linksy-backend/blob/main/docs/admin-prd.md`

## Tickets thuộc frontend repo

| ID | Work |
|----|------|
| M3 | `User.roles` type + `src/lib/api/admin.ts` |
| M4 | `src/app/(admin)/` layout + role guard |
| M5 | Users CRUD UI (`/admin/users`) |
| M6 | Review frontend diff + smoke test |

## Agent prompts

Mở workspace **frontend repo**, attach PRD từ backend (multi-root hoặc paste section 6–7):

```
Implement M3 from admin PRD section 6–7. Frontend only.
Follow @src/lib/api/auth.ts pattern. Do not change backend.
```

## Cursor rule

Xem [.cursor/rules/admin-frontend.mdc](../.cursor/rules/admin-frontend.mdc)
