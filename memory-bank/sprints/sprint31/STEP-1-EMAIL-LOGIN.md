//memory-bank/sprints/sprint31/STEP-1-EMAIL-LOGIN.md
# Step 1 - Email-Based Authentication

## Overview
This document outlines a design for implementing email-based authentication in the Bazaar video generation platform, providing an alternative for users who prefer not to connect with GitHub or Google OAuth. Email authentication can significantly expand the potential user base by removing the dependency on third-party services while maintaining security and a streamlined onboarding experience.

## Current Authentication System
- **OAuth-Only**: Currently, authentication relies exclusively on OAuth providers (GitHub, Google).
- **Advantages**: Simplifies onboarding with one-click authentication, delegates identity verification to trusted providers, and eliminates password management.
- **Disadvantages**: Limits user base to those with GitHub/Google accounts and willing to connect them, creates third-party dependency, and may raise privacy concerns for some users.

## Proposed Email Authentication System
### Key Features
- **Email & Password Registration**: Allow users to sign up with email address and password.
- **Email Verification**: Send verification link to confirm email ownership before activation.
- **Password Reset Flow**: Standard secure password recovery process.
- **Multiple Auth Methods**: Support both OAuth and email authentication simultaneously.

### Technical Design
#### 1. Authentication Library Integration
- Extend the existing NextAuth.js implementation to include the [Email Provider](https://next-auth.js.org/providers/email) alongside OAuth providers.
- Configure the Credentials provider for email/password login after verification.

#### 2. Database Schema Changes
- Enhance the existing `users` table to support email authentication:
  ```sql
  ALTER TABLE users 
  ADD COLUMN email_verified TIMESTAMP NULL,
  ADD COLUMN password_hash TEXT NULL,
  ADD CONSTRAINT unique_email UNIQUE(email);
  ```
- Add a `verification_tokens` table for managing email verification:
  ```sql
  CREATE TABLE verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL,
    expires TIMESTAMP NOT NULL,
    PRIMARY KEY (identifier, token)
  );
  ```

#### 3. Authentication Flows
##### Registration Flow:
1. User enters email and password on sign-up form.
2. System validates email format and password strength.
3. Password is hashed (using bcrypt or Argon2) before storage.
4. System generates a verification token with expiration (24 hours).
5. Verification email is sent with secure link containing token.
6. User remains in a "pending verification" state until email is confirmed.

##### Verification Flow:
1. User clicks verification link in email.
2. System validates token against `verification_tokens` table.
3. If valid, sets `email_verified` timestamp in `users` table.
4. User is automatically logged in and redirected to the main application.
5. Verification token is deleted to prevent reuse.

##### Login Flow:
1. User enters email and password.
2. System validates credentials against stored hash.
3. If valid and verified, creates authenticated session.
4. If valid but unverified, prompts to complete verification.
5. If invalid, shows generic error (not specifying which field is incorrect).

##### Password Reset Flow:
1. User requests password reset via "Forgot Password" link.
2. System generates reset token and sends email with secure link.
3. User sets new password via the link.
4. System updates password hash and invalidates reset token.

#### 4. Security Considerations
- **Password Storage**: Use industry-standard hashing algorithms (bcrypt with sufficient cost factor) with unique salts.
- **Rate Limiting**: Implement throttling on login attempts to prevent brute force attacks.
- **Email Security**: Verify email uniqueness to prevent account hijacking.
- **CSRF Protection**: Use CSRF tokens for all form submissions.
- **Session Management**: Implement secure session handling with appropriate cookie settings.

#### 5. User Experience
- **Login UI**: Update login modal to include email/password form alongside OAuth buttons.
- **Form Validation**: Implement client-side validation for immediate feedback on email format and password requirements.
- **Progressive Enhancement**: Guide users through the verification process with clear instructions and error handling.
- **Account Linking**: Optionally allow users to link OAuth accounts to their email account later.

### Implementation with NextAuth.js
```typescript
// Example NextAuth configuration with Email provider
import { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { comparePasswords } from "@/lib/auth";

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        
        const user = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.email, credentials.email),
        });
        
        if (!user || !user.email_verified || !user.password_hash) return null;
        
        const isValid = await comparePasswords(
          credentials.password,
          user.password_hash
        );
        
        return isValid ? user : null;
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  callbacks: {
    // Custom callbacks for session handling, JWT, etc.
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
```

### Trade-offs
| **Approach**              | **Pros**                                                       | **Cons**                                                                 | **Implementation Effort**                                      |
|---------------------------|----------------------------------------------------------------|--------------------------------------------------------------------------|----------------------------------------------------------------|
| **OAuth-Only (Status Quo)** | - Simplest user experience<br>- No password management<br>- Leverages trusted identity providers | - Limited to users with GitHub/Google accounts<br>- Third-party dependency<br>- Some users have privacy concerns | No new work — keep existing OAuth providers. |
| **Email Authentication**  | - Broadens potential user base<br>- No third-party dependencies<br>- Users maintain privacy | - Password management complexity<br>- Email verification steps add friction<br>- Security responsibilities shift to platform | - Extend NextAuth.js configuration<br>- Implement email delivery service<br>- Build verification and reset flows<br>- Update UI for email auth. |

### Implementation Effort Estimation
- **Database Schema Changes**: 1 day (adding necessary columns and tables).
- **NextAuth.js Configuration**: 1-2 days (integrating Email and Credentials providers).
- **Email Delivery Service**: 1-2 days (setting up reliable email delivery with templates).
- **Authentication Flows**: 2-3 days (implementing registration, verification, login, reset).
- **UI Updates**: 1-2 days (forms, validation, error handling).
- **Security Hardening**: 1-2 days (rate limiting, CSRF protection, etc.).
- **Total Effort**: Approximately 7-12 days, similar to the Guest Mode implementation.

### Recommendation for Sprint 31
Email-based authentication provides significant user acquisition benefits with moderate complexity. While not as simple as maintaining OAuth-only, it addresses a genuine user need. Consider implementing in Sprint 31 if user acquisition is a priority, or defer to a near-term follow-up sprint if other UX enhancements (welcome animation, chat greeting) are deemed more critical for immediate user satisfaction.

### Open Questions
- **Email Provider Selection**: Which email delivery service should be used? (SendGrid, Amazon SES, etc.)
- **Password Requirements**: What password strength policy balances security with user friction?
- **Verification Expiry**: How long should verification tokens remain valid? (24 hours is standard)
- **Account Recovery**: What additional recovery methods might be needed beyond email reset?

## Next Steps
- Determine priority relative to other Sprint 31 enhancements.
- Select email delivery provider and establish account.
- Create email templates for verification and password reset.
- Set up testing environment for auth flow validation.

*Document created on 2025-05-29 as part of Sprint 31 planning for Bazaar video generation system enhancements.*
