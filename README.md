# On Agency — Client Portal

Private client dashboard for On Agency's AI voice agent services. Clients view inbound receptionist and outbound call performance metrics, transcripts, and recordings in real time.

---

## Prerequisites

- Node.js 18.17 or later
- A [Clerk](https://clerk.com) application
- A [Supabase](https://supabase.com) project with the `calls` table and `client_call_stats` view provisioned
- Retell AI account configured to send webhooks to your deployment URL

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (from Clerk Dashboard > API Keys) |
| `CLERK_SECRET_KEY` | Clerk secret key (server-only) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (client-side queries) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, bypasses RLS) |

**Security note:** `SUPABASE_SERVICE_ROLE_KEY` and `CLERK_SECRET_KEY` are never exposed to the browser. They are only used in server components, server actions, and API routes.

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/sign-in`.

---

## Clerk User Metadata Schema

Each client user must have `publicMetadata` set via the Clerk Dashboard or Clerk Backend API:

```json
{
  "client_id": "churrascos",
  "business_name": "Churrascos The Woodlands",
  "services": ["receptionist", "outbound"]
}
```

| Field | Type | Description |
|---|---|---|
| `client_id` | `string` | Must match the `client_id` column in the Supabase `calls` table |
| `business_name` | `string` | Displayed in the dashboard header |
| `services` | `string[]` | Controls which nav sections and stat cards are shown. Valid values: `"receptionist"`, `"outbound"` |

All Supabase queries filter by `client_id` from this metadata. A user can only ever see their own data.

---

## Retell Webhook Configuration

In your Retell AI dashboard, set the webhook URL to:

```
https://your-domain.com/api/webhooks/retell
```

The endpoint handles two events:

- **`call_ended`** — upserts the call record with call metadata, transcript, and recording URL
- **`call_analyzed`** — updates the existing record with call summary, sentiment, and success status

The endpoint always returns HTTP 200 regardless of outcome, as required by Retell AI's retry policy. Errors are logged server-side but never surfaced to the client.

Each call's `raw_payload` column stores the full webhook body for debugging.

**Metadata required on each Retell call:** Set `metadata.client_id` on every call object so the webhook can associate it with the correct client.

---

## Vercel Deployment

1. Push this repository to GitHub.
2. Import the project into [Vercel](https://vercel.com/new).
3. Add all five environment variables in the Vercel project settings under **Settings > Environment Variables**.
4. Deploy. Vercel auto-detects Next.js and configures the build.
5. Update your Retell webhook URL to the production Vercel domain.

All routes under `/dashboard` are server-rendered on demand (`force-dynamic`). No sensitive data is ever included in static generation.
