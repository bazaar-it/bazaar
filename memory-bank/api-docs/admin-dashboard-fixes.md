 Admin Dashboard Fixes - Sidebar Consistency & 7-Day Metrics

## Overview
Fixed critical issues with the admin dashboard: sidebar consistency across sections, broken 7-day user metrics, and missing prompt counts in user list.

## Issues Resolved

### 1. Sidebar Consistency Problem
**Problem**: Each admin page had its own sidebar implementation, causing:
- Sidebar reloading when navigating between sections
- Inconsistent navigation experience
- Empty/duplicate sidebar content

**Solution**: 
- Created shared `AdminSidebar` component (`src/components/AdminSidebar.tsx`)
- Updated admin layout (`src/app/admin/layout.tsx`) to use shared sidebar
- Removed individual sidebar implementations from admin pages
- Implemented consistent navigation with proper active state highlighting

### 2. Broken 7-Day User Metrics
**Problem**: "New Users (last 7 days)" showed zero despite recent user registrations
- Missing 7-day timeframe in dashboard metrics query
- Incorrect user counting logic

**Solution**:
- Added 7-day calculations to `getDashboardMetrics` tRPC procedure
- Fixed user counting to use `emailVerified` timestamp with proper null handling
- Added 7-day support to all metric types (users, projects, scenes)
- Updated frontend to display 7-day metrics in timeframe selector

### 3. Prompt Count Not Showing in Users List
**Problem**: In the admin users dashboard, the "Activity" column showed `0 prompts` for all users even when they had created prompts.

**Root Cause**: The `getUsers` query in `src/server/api/routers/admin.ts` was not calculating the `totalPrompts` field, but the UI component `src/app/admin/users/page.tsx` was trying to display `user.totalPrompts`.

**Solution**: Modified the `getUsers` query to:
1. Fetch the list of users as before
2. Get all user IDs from the result
3. Query the prompt counts by joining `messages` and `projects` tables
4. Group by user ID to get count per user
5. Map the prompt counts back to the users array

**Code Changes**:
- Added `inArray` import to drizzle-orm imports
- Added prompt count calculation logic after fetching users
- Used `inArray(projects.userId, userIds)` to efficiently query prompt counts for multiple users
- Added `totalPrompts` field to each user object in the response

**Technical Implementation**:
The prompt count calculation uses:
```sql
SELECT projects.userId, COUNT(messages.id)
FROM messages
INNER JOIN projects ON messages.projectId = projects.id
WHERE projects.userId IN (...userIds...) AND messages.role = 'user'
GROUP BY projects.userId
```

This approach:
- Only counts user messages (not assistant responses)
- Uses proper joins for data integrity
- Groups by user ID for aggregation
- Uses `inArray` for safe SQL parameter binding

## Technical Implementation

### Shared AdminSidebar Component
```typescript
// src/components/AdminSidebar.tsx
- Uses Next.js usePathname() for active section detection
- Provides consistent navigation across all admin pages
- Includes proper Link components for client-side routing
- Responsive design with hover states and icons
```

### Updated Admin Layout
```typescript
// src/app/admin/layout.tsx
- Wraps all admin pages with shared sidebar
- Provides consistent flex layout structure
- Eliminates need for individual page sidebars
```

### Enhanced Metrics Query
```typescript
// src/server/api/routers/admin.ts
- Added 7-day timeframe calculations for all metrics
- Fixed emailVerified timestamp handling with null checks
- Added prompt count calculation for user lists
- Parallel query execution for optimal performance
- Proper date range calculations for accurate counts
```

### Updated Admin Pages
- **Dashboard** (`src/app/admin/page.tsx`): Removed sidebar, added 7-day support
- **User Management** (`src/app/admin/users/page.tsx`): Removed sidebar, now displays correct prompt counts
- **Analytics** (`src/app/admin/analytics/page.tsx`): Removed duplicate sidebar to work with shared layout

## Database Schema
No database changes required - uses existing `emailVerified` field for user registration tracking and existing `messages`/`projects` tables for prompt counting.

## User Experience Improvements
1. **Consistent Navigation**: Sidebar remains static across all admin sections
2. **Accurate Metrics**: 7-day user counts now display correctly
3. **Better Performance**: Shared component reduces re-rendering
4. **Improved UX**: No more sidebar reloading or empty states
5. **Accurate User Activity**: Prompt counts now display correctly in user list

## Testing
- ✅ Sidebar consistency across /admin, /admin/users, /admin/analytics
- ✅ 7-day metrics display accurate counts
- ✅ All timeframe filters (24h/7d/30d/all) working correctly
- ✅ Navigation between sections maintains sidebar state
- ✅ Prompt counts display correctly in user management page
- ✅ TypeScript compilation without errors

## Files Modified
- `src/components/AdminSidebar.tsx` (created)
- `src/app/admin/layout.tsx` (updated)
- `src/app/admin/page.tsx` (updated)
- `src/app/admin/users/page.tsx` (updated)
- `src/app/admin/analytics/page.tsx` (updated - removed duplicate sidebar)
- `src/server/api/routers/admin.ts` (updated - added prompt count calculation)
- `memory-bank/progress.md` (updated)

## Impact
- Resolved user-reported sidebar inconsistency issue
- Fixed broken 7-day metrics that were showing zero
- Fixed missing prompt counts in user activity display
- Improved overall admin dashboard user experience
- Established pattern for future admin page development