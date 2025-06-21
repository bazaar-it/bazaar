# Admin App Deployment Checklist

## Pre-deployment
- [ ] Environment variables set in Vercel
- [ ] Database URL configured
- [ ] Auth secret matches main app
- [ ] CORS configured in main app (if needed)

## Vercel Configuration
- [ ] Root directory: `apps/admin`
- [ ] Build command: `cd ../.. && npm run build --filter=admin`
- [ ] Install command: `cd ../.. && npm install`
- [ ] Node version: 18.x or higher

## Post-deployment
- [ ] Test authentication flow
- [ ] Verify admin can access main app data
- [ ] Check HTTPS is working
- [ ] Test cookie sharing between domains
- [ ] Monitor for CORS issues

## Environment Variables Required
```
DATABASE_URL
AUTH_SECRET
NEXTAUTH_URL=https://admin.bazaar.it
NEXTAUTH_COOKIE_DOMAIN=.bazaar.it
NEXT_PUBLIC_APP_URL=https://admin.bazaar.it
NEXT_PUBLIC_MAIN_APP_URL=https://bazaar.it
```

## Common Issues
1. **Auth not working**: Check cookie domain setting
2. **API calls failing**: Add CORS headers to main app
3. **Build failing**: Ensure monorepo dependencies are installed
4. **404 errors**: Verify Vercel root directory setting