------------------------------------------------------------- Done ✅ -------------------------------------------------------------

Sprint Goal: Establish core project structure, set up basic DB schema with Drizzle, configure basic Auth.js, create placeholder UI layout, integrate Remotion structure, and display a static Remotion composition via @remotion/player within the Next.js app.
Okay, let's combine the best of both plans to create a clear, actionable 3-hour sprint plan for you and your Cursor agent. This focuses on getting a clickable skeleton running, verifying core integrations, and adhering to the principles and stack we've defined in the "v4 Definitive" context document.

-----

**Bazaar-Vid: Initial 3-Hour Development Sprint Plan**

**Sprint Goal:** Have the `bazaar-vid` repository running in the browser (`npm run dev`) with:
✅ Working Auth.js sign-in (using GitHub provider).
✅ A `/dashboard` page listing one "Untitled project \#1" seeded in the Neon dev database for the logged-in user.
✅ An editor route (`/projects/[id]/edit`) showing the split-screen layout (Chat placeholder + Preview placeholder) containing a **static** "Hello Remotion" preview rendered by `@remotion/player`.

*(No LLM integration, JSON patching, WebSockets, file uploads, or Remotion Lambda triggering in this sprint).*

**Sprint Principles:**

1.  **Context is King:** All actions must adhere strictly to the "Bazaar‑Vid – Full Project Context & Implementation Guide - v4 (Definitive)" document.
2.  **Vertical Slices:** Each task should result in a testable, incremental change.
3.  **Leave Stubs, Not TODOs:** Use empty functions/components with basic return values (`null`, `<div>Placeholder</div>`) to keep TypeScript/ESLint happy if full logic isn't implemented yet.
4.  **Atomic Commits:** Aim for small, logical commits (perhaps per task) with clear messages. Use the suggested "First commit" message at the end if preferred.
5.  **CI Must Pass:** Ensure `npm check && npm db:generate -- --check` (or equivalent configured checks) passes after changes.

-----

**Task List & Timeboxes (Estimate \~20-30 min per Cursor task)**

| \# | Task                      | Who    | Prompt / Instructions for Cursor Agent (or Human Steps)                                                                                                                                                                                                                                                                                          | Verification / Check                                                                                                                                                                                                    |
| :- | :------------------------ | :----- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0** | **Bootstrap Environment** | **Human** | 1. Clone the repo (`bazaar-vid`) if not already done. \<br\> 2. Copy `.env.example` to `.env.local`. \<br\> 3. Fill in `.env.local` with: \<br\>   - `DATABASE_URL`: Your **Neon Dev Branch Pooled Connection String** (important: use pooled for app). \<br\>   - `AUTH_SECRET`: Generate a strong secret (`openssl rand -base64 32`). \<br\>   - `AUTH_GITHUB_ID` & `AUTH_GITHUB_SECRET`: From your GitHub OAuth App settings. \<br\> 4. Run `npm install`. \<br\> 5. Start the local dev database if using the T3 Docker setup (`./start-database.sh`) or ensure your Neon dev branch is ready. | `.env.local` file exists with necessary keys filled. `npm install` completed without errors. Local DB container running or Neon accessible.                                                                         |
| **1** | **Init Drizzle Schema** | **Cursor** | **Prompt:** "Based on Context Doc v4 Section 3 & 7, create/update `/db/schema.ts`. Define the required Auth.js tables (`users`, `accounts`, `sessions`, `verificationTokens`) using `pgTable`. Also define the `projects` table with `id` (uuid, default random, pk), `userId` (varchar, references users.id), `title` (varchar), `props` (jsonb, `$type<InputProps>`). Ensure imports from `drizzle-orm/pg-core` are correct. Create `/types/input-props.ts` with a basic placeholder `export type InputProps = Record<string, any>;` for now." | `/db/schema.ts` exists and contains correct table definitions. `/types/input-props.ts` exists. `npm typecheck` passes.                                                                                      |
| **2** | **Push Schema & Generate Types** | **Cursor** | **Prompt:** "Run the command `npm db:push` to synchronize the schema defined in `/db/schema.ts` with the development database specified by `DATABASE_URL` in `.env.local`. Afterwards, run `npm db:generate`."                                                                                                                            | Command `npm db:push` completes successfully, reporting schema synchronization. Command `npm db:generate` completes. Check Neon/local DB to confirm tables exist.                                                     |
| **3** | **Wire Auth.js Config** | **Cursor** | **Prompt:** "Based on Context Doc v4 Section 2 & 7, create/update `/auth.ts`. Configure `NextAuth` using the `DrizzleAdapter` (imported from `@auth/drizzle-adapter`, pass the `db` instance from `/lib/db.ts` - create `/lib/db.ts` to initialize and export the Drizzle client using `postgres` and the `DATABASE_URL`). Set `session: { strategy: 'jwt' }`. Add the `GitHub` provider using the environment variables. Implement a basic `callbacks.authorized` function that returns `!!auth?.user` (only allow logged-in users). Ensure the Route Handler at `/app/api/auth/[...nextauth]/route.ts` exists and correctly exports `handlers` from `/auth.ts`." | `/auth.ts` exists and is configured. `/lib/db.ts` exists. `/app/api/auth/[...nextauth]/route.ts` exists. `npm typecheck` passes.                                                                                   |
| **4.A** | **Create Seeding Script** | **Cursor** | **Prompt:** "Create a script at `/scripts/dev-seed.ts`. This script should: 1. Import the `db` instance from `/lib/db.ts` and the `projects` table schema. 2. Define a placeholder `userId` (e.g., use your GitHub user ID or a fixed string like 'dev-user-id' - **State which you used**). 3. Define placeholder `InputProps` (e.g., `{ meta: { duration: 90, title: 'Placeholder' }, scenes: [] }`). 4. Use Drizzle (`db.insert(projects).values(...)`) to insert **one** project titled 'Untitled project \#1' linked to the placeholder `userId` with the placeholder `props`. Add basic console logging for success/error." | `/scripts/dev-seed.ts` exists with the described logic.                                                                                                                                                           |
| **4.B** | **Run Seeding Script** | **Cursor** | **Prompt:** "Run the seeding script using `npm tsx scripts/dev-seed.ts`."                                                                                                                                                                                                                                                                   | Script runs successfully in the terminal. Run `npm db:studio` and verify that one project exists in the `projects` table associated with the placeholder user ID.                                                  |
| **5** | **Dashboard Page (RSC)** | **Cursor** | **Prompt:** "Create the dashboard page at `/app/dashboard/page.tsx`. This should be a React Server Component (default). 1. Use `await auth()` from `/auth.ts` to get the session. Redirect or show error if no session. 2. If session exists, fetch projects for the logged-in user (`session.user.id`) from the database using the `db` instance and Drizzle (`db.select().from(projects).where(...)`). 3. Render a simple list (`ul`/`li`) displaying the project titles. Each title should be a Next.js `<Link>` pointing to `/projects/[id]/edit` (using the project's actual ID)." | `/app/dashboard/page.tsx` exists. Log in via GitHub (requires running `npm dev`). Navigate to `/dashboard`. Verify "Untitled project \#1" is listed and links to `/projects/1/edit` (or similar ID).                  |
| **6** | **Editor Layout & Remotion Deps** | **Cursor** | **Prompt:** "1. Run `npm add @remotion/core@4.0.290 @remotion/player@4.0.290 @remotion/cli@4.0.290` (ensure exact versions or align with context doc v4). 2. Create the Remotion structure: `/remotion/index.ts`, `/remotion/Root.tsx`, `/remotion/Composition.tsx` as defined in the previous sprint plan (Step 4), rendering a basic static 'Hello Remotion' composition with ID 'StaticPreview'. 3. Add the `remotion` script to `package.json`: `"remotion": "npx remotion studio"`. 4. Create the editor layout route group: `/app/projects/[id]/edit/(editor)/layout.tsx`. Use Tailwind flex/grid for a two-column layout. Render `<ChatPanelPlaceholder />` on the left and `<PreviewPanelPlaceholder />` on the right (create these basic client components in `/components/client/` if they don't exist)." | Remotion packages installed. `/remotion` directory structure exists. `remotion` script added. Editor layout file exists. Placeholder components exist. `npm run remotion` launches Studio successfully. `npm typecheck` passes. |
| **7** | **Static PlayerShell** | **Cursor** | **Prompt:** "Modify `/components/client/PreviewPanelPlaceholder.tsx` (rename to `PlayerShell.tsx` if preferred). Ensure it has `"use client"`. Import `Player` from `@remotion/player` and `Composition` from `~/remotion/Composition`. Render the `<Player>` component inside the placeholder's container. Pass the imported `Composition` to the `component` prop. Hardcode props `durationInFrames={150}`, `fps={30}`, `compositionWidth={1280}`, `compositionHeight={720}`, `inputProps={{}}`, `style={{ width: '100%', height: 'auto', aspectRatio: '16/9' }}`, `controls`. " | `PlayerShell.tsx` exists and uses `"use client"`. Imports are correct. `<Player>` is rendered with required props. `npm typecheck` passes.                                                                        |
| **8** | **Final Dev Run & Check** | **Human** | 1. Stop any running dev server. \<br\> 2. Run `npm dev`. \<br\> 3. Open `localhost:3000`. \<br\> 4. Sign in using GitHub. \<br\> 5. Navigate to `/dashboard`. \<br\> 6. Click the link for "Untitled project \#1". \<br\> 7. Verify you see the split-screen layout at `/projects/[id]/edit`. \<br\> 8. Verify the right panel shows the Remotion player rendering the static "Hello Remotion" composition with controls. \<br\> 9. Check browser console and terminal for errors. | Application runs, authentication works, navigation works, static Remotion player is embedded and functional.                                                                                                                                                                                     |

-----

**Command Cheat-Sheet (Primarily for Cursor):**

```bash
# Install dependencies (after cloning/scaffolding)
npm install

# Sync DB schema (after editing schema.ts)
npm db:push

# Generate migration files (alternative/complementary to push)
npm db:generate

# Run DB Studio (visual data inspection)
npm db:studio

# Run seeding script
npm tsx scripts/dev-seed.ts

# Run Next.js dev server
npm dev

# Run Remotion Studio
npm run remotion

# Run type checking
npm typecheck

# Run linter
npm lint
```

-----

**Ready-to-paste "First Commit" Message:**

```
feat(core): bootstrap T3 app, Drizzle/Neon, Auth.js, static Remotion preview

- Configures Drizzle ORM and pushes initial schema (users, projects, auth tables) to Neon dev database.
- Sets up Auth.js v5 with Drizzle adapter and GitHub provider.
- Adds seeding script to create an initial project for development.
- Creates dashboard page (RSC) listing seeded projects.
- Implements editor route (`/projects/[id]/edit`) with basic split-screen layout.
- Installs Remotion core packages and sets up basic file structure (`/remotion`).
- Adds Remotion Player (`@remotion/player`) to editor layout, displaying a static composition.
- Configures basic CI workflow for checks.
```

-----

