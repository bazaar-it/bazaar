//memory-bank/sprints/sprint27/github-style-bootstrapper/planning.md
# Planning: GitHub-Powered Video Generation (Style Bootstrapper) - BAZAAR-307

This document outlines planning for an MVP of the GitHub Integration feature, focusing on bootstrapping video styles and content from a user's repository, and its integration with the existing system.

## 1. Core Concept (MVP)
Allow users to connect their GitHub repository. The system performs a lightweight analysis to extract basic branding (colors, fonts via live URL analysis if possible), key text snippets (from README), and a logo. These elements pre-configure the video workspace (global style, initial scenes).

**User Flow (MVP):**
1. User connects GitHub via OAuth in `src/app/projects/[id]/generate/page.tsx`.
2. User selects a repository and optionally provides a live URL for their project.
3. Frontend calls a new tRPC procedure in `src/server/api/routers/project.ts` (or a new `github.ts` router), e.g., `analyzeRepositoryForBranding(repoOwner, repoName, liveUrl?)`.
4. This procedure:
    a. If `liveUrl` provided: Triggers the Image Vision pipeline (BAZAAR-306, e.g., `api.generation.analyzeImageByUrl` on a screenshot of the live URL) to get styles.
    b. Fetches `README.md` via GitHub API for text snippets.
    c. Attempts to find a logo file (e.g., `logo.svg`, `logo.png`) in common paths via GitHub API.
5. Returns `ExtractedBrandElements` (colors, fonts, logo URL, text snippets) to the client (`page.tsx`).
6. Client-side logic in `page.tsx` applies these: sets a global style, pre-populates 1-2 scenes.

## 2. Integration with Current System

### Backend (`src/server/api/routers/project.ts` or new `github.ts`)
*   **New tRPC Procedures**:
    *   `getGithubRepos()`: Lists repositories for the authenticated user.
    *   `analyzeRepositoryForBranding(repoOwner: string, repoName: string, liveUrl?: string): Promise<ExtractedBrandElements>`:
        *   Handles GitHub API calls to fetch `README.md`, search for logo files.
        *   If `liveUrl` is provided, it orchestrates taking a screenshot (e.g., via a headless browser service – could be complex for MVP, or simplify to user-uploaded screenshot) and then calls `api.generation.analyzeImageByUrl`.
        *   Consolidates findings into `ExtractedBrandElements`.
*   **Impact on `generation.ts`**:
    *   `generateStyle`: Will be called by the frontend with `ExtractedBrandElements.colors` and `ExtractedBrandElements.fonts` to set the initial global style.
    *   `planScenes` (or frontend logic before calling `generateComponentCode`): Could use `ExtractedBrandElements.logoUrl` and `ExtractedBrandElements.textSnippets` to define props for initial scenes (e.g., a title card with logo and tagline).

### Frontend (`src/app/projects/[id]/generate/page.tsx` & Components)
*   **UI for GitHub Connection**:
    *   "Connect GitHub" button (using NextAuth GitHub provider).
    *   Modal/dropdown to select a repository from the user's list (fetched via `api.project.getGithubRepos.useQuery()`).
    *   Input field to optionally provide a live project URL.
*   **Workflow Orchestration**:
    1.  After repo selection (and optional URL), call `api.project.analyzeRepositoryForBranding.useMutation()`.
    2.  Display loading state (e.g., "Analyzing repository...").
    3.  On success:
        *   Store `ExtractedBrandElements` in workspace state.
        *   Automatically call `api.generation.generateStyle.useMutation()` with extracted colors/fonts.
        *   Automatically add 1-2 pre-defined scenes to the `StoryboardPanelG` with props derived from extracted logo/text, then trigger their generation via `api.generation.generateComponentCode`.
*   **UI Feedback**: "Connected to: <repo_name>" indicator. Option to re-sync or disconnect.

## 3. MVP Strategy & Considerations

*   **OAuth**: Leverage NextAuth for GitHub authentication.
*   **Live URL Prioritization**: Strongly encourage users to provide a live URL. Screenshotting this URL and using the BAZAAR-306 Image Vision pipeline is the most reliable way to get visual styles for MVP.
    *   *Self-screenshotting (headless browser) might be too complex for initial MVP. Alternative: User uploads a screenshot of their live site, which then feeds into BAZAAR-306.* This simplifies the GitHub part to primarily text/logo fetching if no user-provided screenshot.
*   **Repo Analysis (Fallback)**: If no live URL/screenshot, keep file analysis minimal: fetch `README.md` for title/tagline. Fetch `logo.png`/`logo.svg` from `/public` or `/assets`.
*   **No Full Clone**: Use GitHub REST API to fetch individual files. Avoid cloning full repos.
*   **Pre-defined Initial Scenes**: Have 1-2 template scene structures (e.g., "Title Splash", "Intro Text") that get populated with extracted data.

## 4. Iteration Path (Post-MVP)
*   Automated headless browser screenshotting service for live URLs.
*   More robust parsing of repo files (CSS, Tailwind config, package.json) for styles and metadata if live URL analysis isn't sufficient.
*   Deeper content extraction (feature lists, more text snippets).
*   Detecting more asset types (hero images, icons).
*   Allowing users to guide the crawler (e.g., specify paths to key files/pages).
