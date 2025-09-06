# Cross‑Subdomain Auth (community.bazaar.it)

Goal: Users log in once and actions on `community.bazaar.it` (favorite/use) reflect in the main app and vice‑versa.

## Strategy
- Single auth backend (NextAuth) + same DB and `AUTH_SECRET`.
- Set cookie domain to `.bazaar.it` so session cookie is shared across subdomains.
- Keep CSRF/session protection intact by using same secret and compatible cookie names.

## NextAuth Config Sketch
```ts
// src/server/auth.ts (or where NextAuth is configured)
export const authOptions: NextAuthOptions = {
  // ...providers, callbacks, etc.
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        domain: '.bazaar.it', // critical: share across subdomains
        secure: process.env.NODE_ENV === 'production',
      },
    },
    // (If using other cookies like callbackUrl/state, mirror domain config)
  },
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET,
};
```

## Environment & Deployment
- Both the main app and subdomain must use the same `AUTH_SECRET` and database.
- `NEXTAUTH_URL` should point to the respective domain per deployment, but cookie `domain` ensures the session is shared.
- For local dev, use `community.localhost` (hosts entry) or `127.0.0.1.nip.io` to simulate subdomain sharing.

## Deep Link for “Use Template”
- From community site: open `https://bazaar.it/projects/:id?importTemplate=:templateId`
- If no projectId provided: route to a chooser or create a new project then import.
- Ensure handler on main app consumes `importTemplate` param once (idempotent) and records a `use` event.

## Security Notes
- Keep cookie `SameSite=Lax` (or `None` + Secure if needed) depending on flows; avoid third‑party contexts.
- Do not mix different `AUTH_SECRET`s; it invalidates sessions.
- Validate ownership/permissions server‑side for all mutations.

