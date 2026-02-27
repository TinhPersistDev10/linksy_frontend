<!-- .github/copilot-instructions.md - repo-specific guidance for AI coding agents -->

# Repo snapshot
- Type: Next.js (App Router) + TypeScript frontend.
- Entry: `app/` uses the new app-router with nested `layout.tsx` files and route groups like `(auth)` and `(main)`.
- UI primitives: `src/components/ui/*` and domain components under `src/components/{auth,chat,layout}`.
- API surface: axios wrapper at `src/lib/api/axios.ts` with interceptors and per-domain clients under `src/lib/api/*`.

# Big picture / architecture notes
- Frontend is a single Next.js app (server/client mix). Use `app/` layouts to find route boundaries; e.g. `app/(auth)/layout.tsx` scopes auth pages.
- Auth state is client-side in `src/contexts/AuthContext.tsx` (marked `use client`). It calls `authApi` and relies on cookies for some flows and localStorage tokens for others.
- API calls go through `src/lib/api/axios.ts` which:
  - Uses `process.env.NEXT_PUBLIC_API_URL` as base URL.
  - Adds `Authorization: Bearer <token>` from `localStorage.accessToken` in request interceptor.
  - Handles 401 by attempting a refresh and retrying the original request; on failure it clears tokens and redirects to `/login`.
- Domain APIs: use `src/lib/api/auth.ts`, `src/lib/api/chat.ts` etc. Prefer those over calling axios directly.

# Key workflows & commands
- Development: `npm run dev` (uses `next dev --turbopack`).
- Build: `npm run build` (uses `next build --turbopack`).
- Start: `npm run start`.
- Lint: `npm run lint` (runs `eslint`).

# Project-specific conventions
- Client/server: Files using React hooks or browser APIs include `"use client"` at top. Keep heavy data fetching in server components or the API layer.
- API usage: Always call prebuilt API helpers under `src/lib/api/*` (e.g., `authApi.login`, `chatApi.*`) to benefit from centralized interceptors and refresh logic.
- Auth flow:
  - `register` returns an email and expects email verification (`/verify-email`) before full login.
  - `AuthProvider` calls `authApi.getCurrentUser()` on mount; do not duplicate this logic elsewhere.
  - Use `useAuth()` from `src/contexts/AuthContext.tsx` for auth state and actions.
- Types & validation: TS types live in `src/lib/types/*`. Forms use `react-hook-form` + `zod` + `@hookform/resolvers` — follow existing patterns in `src/components/auth/*`.
- UI components: Use the primitives in `src/components/ui/*` for consistent styling (Button, Input, Card, etc.). Shadcn utilities are present (`shadcn` dependency).

# Integration points & env
- Env: `NEXT_PUBLIC_API_URL` controls backend URL. Watch for other env usage in `next.config.ts` or server code.
- Token storage: `localStorage` keys `accessToken` and `refreshToken` are used by the axios wrapper; clearing them triggers a redirect to `/login`.
- Navigation: Client code uses `next/navigation` router (`useRouter`) — prefer `router.push(...)` used in `AuthContext` for redirects.

# What to watch for when changing code
- Avoid breaking the axios interceptor contract — refresh flows and `_retry` flags are used to retry requests.
- Do not move auth initialization (the initial `getCurrentUser()` call) out of `AuthProvider` without preserving its semantics.
- When adding pages, follow the `app/` nested layout pattern so shared UI (sidebars/header) remains consistent.

# Helpful file references (start here)
- Auth context & hooks: [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) and [src/lib/hooks/useAuth.ts](src/lib/hooks/useAuth.ts)
- Axios wrapper: [src/lib/api/axios.ts](src/lib/api/axios.ts)
- Auth API: [src/lib/api/auth.ts](src/lib/api/auth.ts)
- Types: [src/lib/types/](src/lib/types/)
- UI primitives: [src/components/ui/](src/components/ui/)
- Route groups: [app/(auth)/](app/(auth)/), [app/(main)/](app/(main)/), [app/dashboard](app/dashboard)

# Quick examples
- Use auth API instead of raw axios:

  import { authApi } from 'src/lib/api/auth';
  await authApi.login({ email, password });

- For token-safe requests rely on `apiClient` in [src/lib/api/axios.ts](src/lib/api/axios.ts) (it handles refresh and retry automatically).

# Questions for maintainers
- Is the backend expected to set cookies on verify/login flows (AuthContext assumes cookies are used for some endpoints)?
- Are there any additional environment variables or CI commands not captured in `package.json`?

If anything above is unclear or you'd like me to call out additional files or patterns, tell me what to expand and I'll iterate.
