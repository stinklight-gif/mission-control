# Mission Control

Stock recommendations dashboard built with Next.js 14 App Router, Clerk, and Supabase.

## Setup

1. Install dependencies

```bash
npm install
```

2. Create `.env.local` from the template

```bash
cp .env.local.example .env.local
```

3. Fill in Clerk and Supabase environment variables.

4. Run the Supabase migration

```sql
-- Execute in Supabase SQL editor
supabase/migrations/001_stock_recommendations.sql
```

5. Start the dev server

```bash
npm run dev
```

## Deployment

1. Provision a Supabase project and apply the migration.
2. Create a Clerk application and configure the redirect URLs.
3. Add the environment variables in your hosting provider.
4. Deploy with `npm run build` and `npm run start`.

## Notes

- The dashboard fetches the last 7 days of `stock_recommendations` ordered by date.
- All routes are protected by Clerk except `/sign-in`.
