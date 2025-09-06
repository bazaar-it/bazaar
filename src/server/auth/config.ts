// src/server/auth/config.ts
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
// Use validated env import if you set it up in env.js/mjs
// import { env } from "~/env";
import { db } from "~/server/db";
import { eq } from "drizzle-orm";
import {
  accounts,
  users,
  userCredits,
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
      isAdmin?: boolean;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    isAdmin?: boolean;
    // ...other properties
    // role: UserRole;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  debug: process.env.NODE_ENV === "development",
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    // DO NOT add sessionsTable here
    // verificationTokensTable: verificationTokens, // Removed due to type mismatch
  }),
  providers: [
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID || "",
      clientSecret: process.env.AUTH_GITHUB_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
      checks: ["state"], // Use state instead of PKCE to fix login issues
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Add the JWT callback needed for JWT strategy
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        // Fetch admin status from database
        const adminStatus = await db
          .select({ isAdmin: users.isAdmin })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        token.isAdmin = adminStatus[0]?.isAdmin || false;
      }
      return token;
    },
    // Session callback reads from the token
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string, // Ensure ID from token is put into session user
        isAdmin: token.isAdmin as boolean, // Include admin status from token
      },
    }),
    // Handle account linking for OAuth providers
    async signIn({ account }) {
      // Allow all OAuth sign-ins
      if (account?.provider === "google" || account?.provider === "github") {
        return true;
      }
      return true;
    },
    // Your authorized callback can likely stay here too
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtectedRoute = nextUrl.pathname.startsWith('/projects');
      // Consider if API should be protected differently (e.g., allow unauthed access to specific tRPC routes?)
      const isApiRoute = nextUrl.pathname.startsWith('/api/');
      if (isProtectedRoute || (isApiRoute && !nextUrl.pathname.startsWith('/api/auth'))) { // Example: Protect API except auth routes
        if (isLoggedIn) return true;
        return false; // Redirect for protected routes
      }
      return true; // Allow public routes
    },
  },
  events: {
    async createUser({ user }) {
      // Create initial credits for new user
      console.log(`[Auth] Creating initial credits for new user: ${user.email}`);
      try {
        await db.insert(userCredits).values({
          userId: user.id,
          dailyCredits: 5,
          purchasedCredits: 100, // 100 signup bonus - increased from 20
          lifetimeCredits: 100,
          dailyResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        console.log(`[Auth] Successfully created credits for user: ${user.email}`);
      } catch (error) {
        console.error(`[Auth] Failed to create credits for user ${user.email}:`, error);
        // Don't throw - let signup continue even if credits fail
      }

      // Send email notification to admin about new user
      try {
        // Import the notification function
        const { sendNewUserNotification } = await import('~/server/services/email/notifications');
        
        // Try to determine the provider from recent account entries
        // Fixed: accounts table doesn't have createdAt column, just get the first account
        const recentAccount = await db.query.accounts.findFirst({
          where: eq(accounts.userId, user.id),
        });
        const provider = recentAccount?.provider || 'Unknown';
        
        // Send notification email
        await sendNewUserNotification(user, provider);
      } catch (error) {
        console.error(`[Auth] Failed to send new user notification:`, error);
        // Don't throw - notifications should not break signup
      }
    }
  },
  // secret: env.AUTH_SECRET, // Implicitly uses AUTH_SECRET env var in v5
  pages: { signIn: "/login" }, // Custom login page
} satisfies NextAuthConfig;
