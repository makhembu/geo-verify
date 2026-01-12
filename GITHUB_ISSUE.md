# 🚀 Good First Issue: Connect Supabase and PostgreSQL

## Description

This issue involves replacing the current in-memory database implementation with a real Supabase/PostgreSQL backend. This is a great first contribution to understand the project's architecture and learn about Supabase integration.

## Background

Currently, the project uses in-memory storage (see `lib/db.ts`) which resets every time the server restarts. We need to connect to Supabase/PostgreSQL for persistent data storage in production.

## What's Already Done ✅

The groundwork has been laid to make this integration smooth:

1. **Supabase Client**: `lib/supabase.ts` - Configuration for connecting to Supabase
2. **Database Schema**: `supabase-schema.sql` - Complete PostgreSQL schema with PostGIS support
3. **Supabase Implementation**: `lib/db-supabase.ts` - Full implementation of all database functions
4. **Environment Template**: `.env.local.example` - Environment variables template

## Your Task 📝

### Step 1: Set Up Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Copy your project URL and anon key from Project Settings > API

### Step 2: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. Fill in your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### Step 3: Run Database Migrations

1. In your Supabase project dashboard, go to SQL Editor
2. Copy the contents of `supabase-schema.sql`
3. Run the SQL script to create all tables, functions, and seed data

### Step 4: Update Import References

Replace all imports of `lib/db` with `lib/db-supabase` in the following files:
- `app/api/campaigns/route.ts`
- `app/api/redemptions/route.ts`
- `app/api/verify/route.ts`
- `app/api/consent/route.ts`
- Any other files importing from `lib/db`

### Step 5: Test the Integration

1. Start the development server: `npm run dev`
2. Test the following features:
   - View campaigns on the home page
   - Create a new campaign (as business user)
   - Verify location and redeem reward
   - Check redemptions list

### Step 6: Rename Files (Optional but Recommended)

Once everything works:
1. Rename `lib/db.ts` to `lib/db-memory.ts` (keep for reference)
2. Rename `lib/db-supabase.ts` to `lib/db.ts`
3. Update any remaining import references

## Acceptance Criteria ✓

- [ ] Supabase project is created and configured
- [ ] Environment variables are set up correctly
- [ ] Database schema is migrated to Supabase
- [ ] All API routes use the Supabase implementation
- [ ] Application runs without errors
- [ ] Campaigns are fetched from PostgreSQL
- [ ] Redemptions can be created and retrieved
- [ ] Data persists across server restarts

## Learning Outcomes 🎓

By completing this issue, you'll learn:
- How to set up and configure Supabase
- PostgreSQL with PostGIS for geographic data
- Database migrations and schema design
- Converting in-memory storage to persistent database
- Row Level Security (RLS) policies
- TypeScript type mapping between API and database

## Resources 📚

- [Supabase Documentation](https://supabase.com/docs)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

## Need Help?

If you encounter any issues:
1. Check the console for error messages
2. Verify your environment variables are correct
3. Ensure the database schema was applied successfully
4. Check Supabase logs in the dashboard
5. Comment on this issue with specific questions

## Labels

`good first issue` `database` `supabase` `postgresql` `enhancement`

---

**Note**: This is marked as a good first issue because all the implementation code is already provided. Your job is to integrate it and ensure everything works together. This is a great way to understand the project structure!
