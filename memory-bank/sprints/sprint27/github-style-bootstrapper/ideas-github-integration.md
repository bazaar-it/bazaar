//memory-bank/sprints/sprint27/ideas-github-integration.md
# Ideas: GitHub-Powered Video Generation (Style Bootstrapper)

This document outlines strategic thinking for an MVP of the GitHub Integration feature, focusing on rapidly delivering value by bootstrapping video styles and content from a user's repository.

## Core Concept (MVP)

The goal is to allow users (especially those who have deployed apps, even if they are not deeply technical coders) to connect their GitHub repository. The system then attempts to extract basic branding elements (colors, fonts), key text snippets, and potentially a visual snapshot of their application's homepage. These extracted elements are used to pre-configure the video workspace, providing an initial set of scenes and styles that align with the user's existing brand, thus accelerating their video creation process.

**User Flow (MVP):**
1. User connects their GitHub account (OAuth).
2. User selects a repository.
3. System performs a lightweight analysis:
    a. **Style Extraction**: Attempts to identify primary colors and fonts. For MVP, this could be by: i) Fetching and analyzing a live URL (e.g., GitHub Pages site, or user-provided URL) using the "Image Vision Mode" pipeline (BAZAAR-306). ii) If no live URL, very basic parsing of CSS files or `tailwind.config.js` for common properties.
    b. **Text Snippet Extraction**: Fetches `README.md` or `index.html` to extract a potential title/tagline and a few bullet points.
    c. **Asset Harvest (Minimal)**: Looks for `logo.svg` or `logo.png` in common directories (`/public`, `/assets`).
4. Extracted elements are used to:
    a. Set a global style (colors, fonts) via `generateStyle`.
    b. Pre-populate 1-2 initial scenes (e.g., a brand splash, a headline scene).

## Key Considerations for MVP & Startup Context

*   **Lean Implementation**: Focus on the quickest way to get *some* useful branding information. Avoid deep, complex repository analysis for the MVP.
*   **OAuth & Security**: Implementing GitHub OAuth correctly is crucial. Request only the minimal necessary permissions (e.g., read-only access to repo contents, user profile).
*   **Parsing Complexity**: Frontend projects are diverse. Robustly parsing CSS/JS for styles is hard. For MVP:
    *   **Prioritize Live URL Analysis**: If a live URL (GitHub Pages, Vercel, Netlify, or user-provided) is available, using the "Image Vision Mode" (BAZAAR-306) to screenshot and analyze it is likely the most effective way to get visual styles quickly.
    *   **Fallback to Simple File Parsing**: If no live URL, attempt very simple regex for colors in CSS or look for `tailwind.config.js`. Accept that this might not work for all repos.
*   **Asset Discovery**: Reliably finding the "correct" logo can be tricky. Start with common filenames and locations.
*   **User Experience**: Clear communication about what's being accessed and what the system can realistically extract. Provide fallbacks or manual overrides if extraction is poor.
*   **Cost**: If using Vision API for screenshot analysis, the same cost considerations as BAZAAR-306 apply. Cache results per repo/commit SHA.
*   **Private Repos**: For MVP, might be simpler to focus on public repos or clearly gate private repo access with explicit user consent regarding what's fetched.

## Potential MVP Strategies

*   **OAuth + Repo Picker**: Standard NextAuth GitHub provider. Simple UI to list user's repos and select one.
*   **Style Extraction - Live URL First**: 
    1.  Ask user for their project's live URL. If provided, use headless Chromium to screenshot it and feed to the Image Vision pipeline (BAZAAR-306) for color/font/layout extraction. This is likely the highest yield for MVP.
    2.  If no live URL, check for a GitHub Pages site associated with the repo.
    3.  Fallback (if no URL): Attempt to fetch `tailwind.config.js` if it exists. As a last resort, very basic regex on CSS files for common color definitions.
*   **Text Snippet Extraction - README Focus**: Fetch `README.md`. Extract the main title (first H1) and perhaps the first list as bullet points.
*   **Asset Harvest - Logo Only**: Look for `logo.svg`, `logo.png`, `favicon.ico` in root, `/public`, `/assets`, `/static` via GitHub API file tree traversal.
*   **Generator Adapters**: 
    *   `generateStyle`: If styles are successfully extracted (especially from Vision API), use these directly, bypassing LLM for initial style generation.
    *   `planScenes`: Pre-seed with a "Brand Splash" (using extracted logo and primary color) and a "Hero Headline" (using extracted title from README).
*   **No Full Repo Clone for MVP**: Use GitHub's API to fetch specific files (`README.md`, `tailwind.config.js`, specific CSS files, image assets) rather than cloning entire repositories, to keep it lightweight.
*   **UI Polish**: "Connected to: <repo_name>" indicator. A button to "Re-sync with GitHub" (re-crawl latest commit of default branch).

## Iteration Path (Post-MVP)

*   More robust CSS/JS parsing for style extraction from repo files.
*   Deeper content analysis (e.g., extracting feature lists from landing pages, pricing info).
*   Support for multiple live URLs (e.g., homepage, pricing page, about page).
*   Detecting and extracting more types of assets (hero images, icons beyond just the logo).
*   Allowing users to specify paths to key files if auto-detection fails.
*   Integration with deployed environments (Vercel, Netlify) beyond just GitHub Pages for easier live site detection.

## Relation to Other Features

*   **Image Vision Mode (BAZAAR-306)**: This is a critical prerequisite or co-requisite, as the screenshot analysis part of GitHub integration relies heavily on it.
*   **Prompt Engineering System (BAZAAR-305)**: Extracted brand elements and text will inform the prompts sent to the LLM, making generated content more relevant.
*   **My Projects (BAZAAR-308)**: The state of GitHub connection and extracted styles could be associated with a project.
