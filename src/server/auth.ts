import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "~/server/db";
import { users, accounts, verificationTokens } from "~/server/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    // sessionsTable: sessions,  <-- DO NOT PASS sessions here
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "jwt",  // ✅ Only JWTs, no DB sessions
  },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID || "",
      clientSecret: process.env.AUTH_GITHUB_SECRET || "",
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtectedRoute = nextUrl.pathname.startsWith('/dashboard') || nextUrl.pathname.startsWith('/projects');
      const isApiRoute = nextUrl.pathname.startsWith('/api/');
      if (isProtectedRoute || isApiRoute) {
        if (isLoggedIn) return true;
        return false;
      }
      return true;
    },
  },
});