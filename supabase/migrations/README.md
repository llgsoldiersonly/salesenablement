# Supabase migrations

Numbered SQL files apply in order. Apply by either:

1. **Supabase Studio**: open the project → SQL Editor → paste the file → Run.
2. **psql / supabase CLI**: `psql $DATABASE_URL -f supabase/migrations/0001_sales_leads.sql`.

Each migration is one-shot — do not re-run a file that has already been applied.

After applying a migration that adds tables or columns, regenerate
`app/src/lib/database.types.ts`:

```bash
npx supabase gen types typescript --project-id <project-ref> > app/src/lib/database.types.ts
```
