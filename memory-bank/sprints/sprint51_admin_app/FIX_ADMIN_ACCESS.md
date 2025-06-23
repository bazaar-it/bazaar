# Fix Admin Access - Critical Issue

## The Problem
You're getting "Access Denied" because your user account doesn't have admin privileges in the database.

From the production screenshots, I can see:
- You're logged in as "Елена" (e719383@gmail.com)
- The production app shows real data: 30 users, 269 projects, 310 scenes
- But in the monorepo version, you get "Access Denied"

## The Solution

### Option 1: Direct Database Update (Quickest)
Connect to your PostgreSQL database and run:

```sql
-- First, check if your user exists and see current admin status
SELECT id, email, "isAdmin" FROM users WHERE email = 'e719383@gmail.com';

-- Make yourself an admin
UPDATE users SET "isAdmin" = true WHERE email = 'e719383@gmail.com';

-- Verify the change
SELECT id, email, "isAdmin" FROM users WHERE email = 'e719383@gmail.com';
```

### Option 2: Using Database UI Tools
If you have access to a database UI tool like pgAdmin, TablePlus, or DBeaver:
1. Connect to your database
2. Find the `users` table
3. Find your user record (email: e719383@gmail.com)
4. Change `isAdmin` from `false` (or NULL) to `true`
5. Save the change

### Option 3: Using Drizzle Studio
From the project root:
```bash
npm run db:studio
```
This will open a web UI where you can:
1. Navigate to the `users` table
2. Find your user
3. Edit the `isAdmin` field to `true`

## After Fixing

Once you've updated your admin status:
1. Refresh the admin app (localhost:3001)
2. You should now see the dashboard with data
3. The "Access Denied" message should be gone

## Why This Happened

In the monorepo migration:
- The authentication is working correctly (you're logged in)
- The cross-app communication is working (checkAdminAccess is being called)
- But your user simply doesn't have admin privileges in the database

This is actually good news - it means the monorepo setup is working perfectly! The only issue was the admin flag.

## Verification

After making the change, you should see in the logs:
```
GET /api/trpc/admin.checkAdminAccess?batch=1&input=%7B%7D 200
```
And the response should include `{"isAdmin": true}`