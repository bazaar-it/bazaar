# Admin Dashboard System

## Overview
The admin dashboard provides a comprehensive backend management interface for monitoring Bazaar-Vid system metrics and user feedback, with full user management capabilities.

## API Endpoints

### Authentication & Access Control

### `api.admin.checkAdminAccess`
**Type**: `protectedProcedure.query()`
**Description**: Check if current user has admin privileges

**Response Schema**:
```typescript
{
  isAdmin: boolean
}
```

### `api.admin.toggleUserAdmin`
**Type**: `adminOnlyProcedure.mutation()`
**Input**: 
```typescript
{
  userId: string,
  isAdmin: boolean
}
```
**Description**: Toggle admin status for a user (admin only)

**Response**: Updated user object with admin status

### Dashboard Metrics (All Admin-Only)

### `api.admin.getDashboardMetrics`
**Type**: `adminOnlyProcedure.query()`
**Description**: Fetches comprehensive dashboard metrics in a single optimized query

**Response Schema**:
```typescript
{
  users: {
    all: number,
    last30Days: number,
    last24Hours: number
  },
  projects: {
    all: number,
    last30Days: number, 
    last24Hours: number
  },
  scenes: {
    all: number,
    last30Days: number,
    last24Hours: number
  },
  recentFeedback: Array<{
    id: string,
    content: string | null,
    name: string | null,
    email: string | null,
    createdAt: Date,
    status: string
  }>
}
```

### Analytics Endpoints (All Admin-Only)

### `api.admin.getAnalyticsData`
**Type**: `adminOnlyProcedure.query()`
**Input**: 
```typescript
{
  timeframe: '24h' | '7d' | '30d',
  metric: 'users' | 'projects' | 'scenes' | 'prompts'
}
```
**Description**: Get time-series analytics data for visualization

**Response**:
```typescript
{
  timeframe: string,
  metric: string,
  data: Array<{
    label: string,
    timestamp: string,
    count: number,
    cumulative: number
  }>,
  totalCount: number,
  periodStart: string,
  periodEnd: string
}
```

### `api.admin.getAnalyticsOverview`
**Type**: `adminOnlyProcedure.query()`
**Input**: 
```typescript
{
  timeframe: '24h' | '7d' | '30d'
}
```
**Description**: Get overview metrics for all metric types

**Response**:
```typescript
{
  timeframe: string,
  metrics: {
    users: number,
    projects: number,
    scenes: number,
    prompts: number
  },
  periodStart: string,
  periodEnd: string
}
```

### User Management Endpoints (All Admin-Only)

### `api.admin.getUsers`
**Type**: `adminOnlyProcedure.query()`
**Input**: 
```typescript
{
  page?: number,        // Default: 1
  limit?: number,       // Default: 20
  search?: string       // Optional search by name/email
}
```
**Description**: Get paginated list of users with search functionality and admin status

**Response**:
```typescript
{
  users: Array<{
    id: string,
    name: string | null,
    email: string,
    emailVerified: Date | null,
    image: string | null,
    isAdmin: boolean     // New field
  }>,
  total: number,
  page: number,
  limit: number,
  totalPages: number
}
```

### `api.admin.getUser`
**Type**: `adminOnlyProcedure.query()`
**Input**: `{ userId: string }`
**Description**: Get detailed user information including admin status, project count and latest activity

**Response**:
```typescript
{
  id: string,
  name: string | null,
  email: string,
  emailVerified: Date | null,
  image: string | null,
  isAdmin: boolean,      // New field
  projectCount: number,
  latestProject: {
    id: string,
    title: string,
    createdAt: Date,
    updatedAt: Date
  } | null,
  promptCount: number    // Enhanced with messages table count
}
```

### `api.admin.updateUser`
**Type**: `adminOnlyProcedure.mutation()`
**Input**: 
```typescript
{
  userId: string,
  data: {
    name?: string,
    email?: string,
    image?: string | null,
    isAdmin?: boolean     // New field
  }
}
```
**Description**: Update user information including admin status

### `api.admin.getUserActivity`
**Type**: `adminOnlyProcedure.query()`
**Input**: `{ userId: string }`
**Description**: Get user's activity including projects, scenes, and feedback

**Response**:
```typescript
{
  projects: Array<ProjectSummary>,
  scenes: Array<SceneSummary>,
  feedback: Array<FeedbackSummary>
}
```

## Admin Access Control

### Security Implementation
- **Admin-Only Middleware**: All admin endpoints use `adminOnlyProcedure` which checks `users.isAdmin` field
- **Database Schema**: Added `isAdmin` boolean field with default `false` and proper indexing
- **Initial Admins**: `jack@josventures.ie` and `markushogne@gmail.com` set as default admins
- **Access Denied UI**: Non-admin users see proper access denied screen with navigation back to homepage
- **Route Protection**: Admin routes check access on both server and client side

### Admin Toggle Features
- **User Management UI**: Toggle switches in user list for admin status
- **Confirmation Dialogs**: Admin status changes require confirmation
- **Visual Indicators**: Admin users have purple "Admin" badges in user lists
- **Real-time Updates**: Admin status changes reflected immediately in UI

## Analytics Dashboard

### Chart Visualizations
- **Interactive Bar Charts**: Simple, responsive bar charts with hover effects
- **Color-Coded Metrics**: Each metric type has distinct colors (users=blue, projects=green, scenes=yellow, prompts=purple)
- **Clickable Metric Cards**: Overview cards switch the main chart data when clicked
- **Timeframe Filtering**: 24-hour, 7-day, and 30-day views with appropriate time intervals
- **Cumulative Calculations**: Charts show both incremental and cumulative data

### Time-Series Data Processing
- **Dynamic Intervals**: 1-hour intervals for 24h, daily intervals for 7d/30d
- **Data Aggregation**: Server-side aggregation into time slots for efficient visualization
- **Real-time Queries**: Analytics data fetched with proper date filtering and joins
- **Prompt Counting**: Accurate user message counting via `messages` table joins through projects

## Routes
- `/admin` - Main dashboard (admin only)
- `/admin/users` - User management list (admin only)
- `/admin/users/[userId]` - User detail view (admin only)
- `/admin/users/[userId]/edit` - User edit form (admin only)
- `/admin/analytics` - Analytics dashboard with charts (admin only)

## Security Features
- **Access Control**: Complete admin-only access control system
- **Error Handling**: Proper tRPC error responses for unauthorized access
- **Database Security**: Admin checks prevent unauthorized data access
- **UI Protection**: Access denied screens for non-admin users

## Files Created/Modified
- `src/server/db/schema.ts` - Added `isAdmin` field to users table
- `src/server/api/routers/admin.ts` - Enhanced with admin access control and analytics endpoints
- `src/app/admin/page.tsx` - Added admin access control and analytics navigation
- `src/app/admin/analytics/page.tsx` - New analytics dashboard with chart visualizations
- `src/app/admin/users/page.tsx` - Added admin toggle functionality
- `src/scripts/set-initial-admins.ts` - Script to set initial admin users
- `memory-bank/api-docs/admin-dashboard.md` - This updated documentation 