# Development Testing Guide for Admin App

## The Problem
- Can't share cookies between ports 3000 and 3001
- Admin app has no login page (redirects to /login which doesn't exist)
- Can't test admin functionality in development

## Solution 1: Temporary Dev-Only Authentication Bypass (Quick & Dirty)

Create a development-only environment variable to bypass auth checks:

### Step 1: Add to admin app's .env.local
```
NEXT_PUBLIC_DEV_ADMIN_BYPASS=true
DEV_ADMIN_USER_ID=7425a5bd-758b-46fc-b68a-613d5673a6e0  # Your user ID from database
```

### Step 2: Modify useAdminAuthTRPC hook
```typescript
export function useAdminAuthTRPC(): AdminAuthState {
  const { data: session, status } = useSession();
  
  // DEV ONLY: Bypass auth in development
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_ADMIN_BYPASS === 'true') {
    return {
      isAuthenticated: true,
      isAdmin: true,
      user: {
        id: process.env.DEV_ADMIN_USER_ID || '7425a5bd-758b-46fc-b68a-613d5673a6e0',
        name: 'Dev Admin',
        email: 'markushogne@gmail.com',
        image: null,
      },
      isLoading: false,
    };
  }
  
  // ... rest of the normal auth logic
}
```

## Solution 2: Create a Dev Login Page (Better)

Add a simple login page to the admin app that only works in development:

### Step 1: Create apps/admin/app/api/auth/dev-login/route.ts
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev login only available in development' }, { status: 403 });
  }
  
  // Set a fake session cookie for development
  cookies().set('dev-admin-session', 'true', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
  });
  
  return NextResponse.redirect(new URL('/', request.url));
}
```

### Step 2: Create apps/admin/app/login/page.tsx
```typescript
export default function DevLogin() {
  if (process.env.NODE_ENV !== 'development') {
    return <div>Not available in production</div>;
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Development Login</h1>
        <p className="mb-4">This is only available in development mode</p>
        <a
          href="/api/auth/dev-login"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Login as Admin (Dev Only)
        </a>
      </div>
    </div>
  );
}
```

## Solution 3: Use Next.js Rewrites (Recommended)

This is the cleanest solution - make the admin app accessible from the main app's port:

### In apps/main/next.config.js, add:
```javascript
async rewrites() {
  return [
    {
      source: '/admin',
      destination: 'http://localhost:3001',
    },
    {
      source: '/admin/:path*',
      destination: 'http://localhost:3001/:path*',
    },
  ];
}
```

Then access admin at: **http://localhost:3000/admin**

This way, cookies are shared because everything is on port 3000!

## Solution 4: Direct API Calls (Testing Only)

For testing specific features, you can directly call the tRPC endpoints:

```bash
# Get dashboard metrics directly
curl -X GET "http://localhost:3000/api/trpc/admin.getDashboardMetrics?batch=1&input=%7B%7D" \
  -H "Cookie: [copy your session cookie from browser]"
```

## Which Solution to Use?

1. **For Quick Testing**: Solution 1 (Dev bypass)
2. **For Proper Development**: Solution 3 (Rewrites)
3. **For Understanding the System**: Solution 2 (Dev login)
4. **For API Testing**: Solution 4 (Direct calls)

## Important Notes

- These are DEVELOPMENT ONLY solutions
- Never deploy these bypasses to production
- The production setup with subdomains will work correctly
- Focus on testing the functionality, not the authentication flow