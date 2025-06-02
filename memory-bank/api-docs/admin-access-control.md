admin-access-control.md
# Admin Access Control System

## Overview
The admin access control system restricts access to the admin dashboard to designated admin users only. It includes database-level permissions, UI enhancements, and secure authentication flows.

## Database Schema
- **Column**: `isAdmin` boolean field in `users` table
- **Default**: `false` for all new users
- **Migration**: Added via migration `0020_light_hellcat.sql`

## Designated Admin Users
- jack@josventures.ie
- markushogne@gmail.com

## Implementation Details

### Backend (tRPC)
- **Middleware**: `adminOnlyProcedure` - Checks `users.isAdmin` field
- **Endpoints**: All admin routes protected with admin-only middleware
- **Error Handling**: Returns proper TRPCError for unauthorized access

### Frontend (UI)
- **User Menu**: Admin users see "Admin Dashboard" option in dropdown
- **Access Control**: Non-admin users see access denied page
- **Navigation**: Seamless flow from user avatar → Admin Dashboard

### Security Features
- **Database-level permissions**: Only users with `isAdmin: true` can access admin endpoints
- **UI conditional rendering**: Admin menu only appears for authorized users
- **Proper error handling**: Graceful fallback for unauthorized access attempts

## Usage
1. Admin users log in normally
2. Click on user avatar in top-right corner
3. Select "Admin Dashboard" from dropdown menu
4. Access full admin functionality

## Technical Implementation
- **AppHeader Component**: Added tRPC admin check query
- **Conditional Rendering**: Admin menu item only shows for `adminCheck?.isAdmin`
- **Link Navigation**: Uses Next.js Link component for proper routing
- **Icon**: Settings icon for visual clarity

## Files Modified
- `src/components/AppHeader.tsx` - Added admin menu item
- `src/server/api/routers/admin.ts` - Admin-only procedures
- `drizzle/migrations/0020_light_hellcat.sql` - Database migration
- Admin dashboard pages - Access control implementation

## Testing
- ✅ jack@josventures.ie can access admin dashboard
- ✅ Admin menu appears in user dropdown
- ✅ Non-admin users see access denied page
- ✅ Database migration successfully applied 