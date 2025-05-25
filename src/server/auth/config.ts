// src/server/auth/config.ts
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
// Use validated env import if you set it up in env.js/mjs
// import { env } from "~/env";
import { db } from "~/server/db";
import {
  accounts,
  users,
  verificationTokens,
} from "~/server/db/schema";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    verificationTokensTable: verificationTokens,
    // DO NOT add sessionsTable here
  }),
  providers: [
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID || "",
      clientSecret: process.env.AUTH_GITHUB_SECRET || "",
    }),
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Add the JWT callback needed for JWT strategy
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // Session callback reads from the token
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string, // Ensure ID from token is put into session user
      },
    }),
    // Your authorized callback can likely stay here too
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtectedRoute = nextUrl.pathname.startsWith('/dashboard') || nextUrl.pathname.startsWith('/projects');
      // Consider if API should be protected differently (e.g., allow unauthed access to specific tRPC routes?)
      const isApiRoute = nextUrl.pathname.startsWith('/api/');
      if (isProtectedRoute || (isApiRoute && !nextUrl.pathname.startsWith('/api/auth'))) { // Example: Protect API except auth routes
        if (isLoggedIn) return true;
        return false; // Redirect for protected routes
      }
      return true; // Allow public routes
    },
  },
  // secret: env.AUTH_SECRET, // Implicitly uses AUTH_SECRET env var in v5
  pages: { signIn: "/login" }, // Custom login page
} satisfies NextAuthConfig;
