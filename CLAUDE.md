# CLAUDE.md

## Commands

```bash
npm run dev       # local dev server on :3000
npm run build     # production build (requires env vars in .env.local)
npm run lint      # ESLint
npx tsc --noEmit  # TypeScript check (strict mode, zero any)
```

## Architecture

Next.js 14 App Router. All dashboard routes are `force-dynamic` (no static generation). Auth via Clerk with `publicMetadata` as the access-control mechanism.

### Key invariant
Every Supabase query must filter `.eq("client_id", clientId)` where `clientId` comes from `user.publicMetadata.client_id`. Never omit this filter.

### Data access split
- `lib/supabase-server.ts` — `createServerSupabaseClient()` uses service role key. Only used in server components and API routes.
- `lib/supabase-client.ts` — `getSupabaseClient()` uses anon key. Only used in client components.

### Services gating
`user.publicMetadata.services: string[]` controls what each client sees. Before rendering any section, check `services.includes("receptionist")` or `services.includes("outbound")`.

## Stack
- Next.js 14, TypeScript strict, Tailwind CSS
- Clerk v6 (auth)
- Supabase JS v2 (database)
- Recharts (charts)
- lucide-react (icons)

## Theme
Dark mode default. Toggle persists in `localStorage["on-agency-theme"]`. Applied via `.dark` class on `<html>`. All color values use CSS custom properties (`var(--bg-base)`, etc.) defined in `globals.css`.
