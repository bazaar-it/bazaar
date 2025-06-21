# Bazaar Admin App

This is the admin dashboard for Bazaar-Vid, separated into its own app for independent development.

## Quick Start

1. **Install dependencies** (from root directory):
   ```bash
   npm install
   ```

2. **Copy environment variables**:
   ```bash
   cp ../main/.env.local .env.local
   ```
   
   Then update `NEXTAUTH_URL` in `.env.local`:
   ```
   NEXTAUTH_URL="http://localhost:3001"
   ```

3. **Start both apps**:
   ```bash
   # Terminal 1 - Start main app (required for API)
   npm run dev:main
   
   # Terminal 2 - Start admin app
   npm run dev:admin
   ```

4. **Access admin dashboard**:
   - Open http://localhost:3001
   - Login with your admin account

## Important Notes

- The admin app depends on the main app's API, so the main app must be running
- Authentication is shared between apps via the same database
- Admin features are protected by role-based access control

## Development Workflow

1. Make your changes in the admin app
2. Test locally with both apps running
3. Commit and push your changes
4. Deploy admin app separately to admin.bazaar.it

## Adding New Features

### Email Marketing
The email marketing feature is already scaffolded in the sidebar. To implement:
1. Create the page at `app/email-marketing/page.tsx`
2. Use the existing UI components from `@bazaar/ui`
3. Create new tRPC endpoints in the main app if needed
4. Follow the same patterns as other admin pages

### Other Features
Follow the existing patterns in pages like:
- `app/users/page.tsx` - User management
- `app/analytics/page.tsx` - Analytics dashboard
- `app/feedback/page.tsx` - User feedback

## Troubleshooting

### CORS Errors
If you see CORS errors, ensure:
1. The main app is running on port 3000
2. You're accessing admin on port 3001
3. Both apps are using the same database

### Authentication Issues
If you can't login:
1. Check that `.env.local` has the correct database URL
2. Ensure `NEXTAUTH_URL` is set to `http://localhost:3001`
3. Try clearing cookies and logging in again

## Production Deployment

For production:
1. Deploy main app to bazaar.it
2. Deploy admin app to admin.bazaar.it
3. Update environment variables:
   - `NEXTAUTH_URL=https://admin.bazaar.it`
   - `NEXT_PUBLIC_MAIN_APP_URL=https://bazaar.it`
4. Configure authentication to work across subdomains