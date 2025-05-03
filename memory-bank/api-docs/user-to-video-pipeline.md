// /memory-bank/api-docs/user-to-video-pipeline.md

# User Prompt to Video Update Pipeline Documentation

This document details the end-to-end process flow within the Bazaar Vid application, starting from a user's natural language input in the chat interface to the final update of the Remotion video preview, with a focus on how custom components are generated and integrated.

## Technologies Involved

*   **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, `@remotion/player`
*   **Backend:** Next.js API Routes (minimal), tRPC
*   **API Communication:** tRPC
*   **Database:** Neon (Postgres) via Drizzle ORM
*   **Authentication:** Auth.js (NextAuth)
*   **LLM:** OpenAI API (GPT-4 with Tools API)
*   **Video:** Remotion
*   **File Storage (Potentially):** Cloudflare R2 (for assets/generated code - TBC), Local `public/` directory (for generated components - current evidence suggests this)

## Pipeline Stages

**1. User Interaction (Frontend - Chat Input)**

*   **File(s):** `src/app/projects/[id]/edit/page.tsx`, `src/components/ChatPanel.tsx` (or similar chat UI component)
*   **Process:**
    1.  The user is on the project editing page (`/projects/[id]/edit`).
    2.  They type a message into the chat input field within the `ChatPanel` component.
    3.  Submitting the message (e.g., pressing Enter or clicking a Send button) triggers an event handler.
    4.  This handler likely calls a tRPC mutation, for example, `project.sendMessage`, passing the user's message content and the current `projectId`.
    5.  The UI might optimistically display the user's message while waiting for the backend response.

**2. Backend Processing (tRPC Endpoint)**

*   **File(s):** `src/server/api/root.ts`, `src/server/api/routers/project.ts` (or relevant router)
*   **Process:**
    1.  The tRPC router receives the `project.sendMessage` call.
    2.  **Authentication:** The procedure verifies the user's session using `getServerAuthSession` from `src/lib/auth.ts` to ensure they are logged in and authorized to modify the project.
    3.  **Input Validation:** The input (message content, `projectId`) is validated (likely using Zod schema defined within the router).
    4.  **Database Interaction (User Message):** The user's message is saved to the database (e.g., `messages` table) associated with the `projectId` using Drizzle ORM (`src/lib/db.ts`).
    5.  **Trigger LLM:** The procedure then calls a server-side function/service dedicated to handling LLM interactions, passing the conversation history (including the new message) and project context.

**3. LLM Interaction (Code Generation)**

*   **File(s):** `src/server/lib/llm.ts` (or similar service file), potentially utils for prompt construction.
*   **Process:**
    1.  **Prompt Construction:** A detailed prompt is assembled. This includes:
        *   The current conversation history.
        *   System instructions defining the LLM's role (video generation assistant).
        *   Available Remotion scene types and their props (potentially referencing `/memory-bank/remotion/scene-types-reference.md` or similar structured data).
        *   Definitions of available tools (functions) the LLM can call, specifically tools for generating Remotion component code (`generate_remotion_component`) or updating the video timeline/structure (`update_timeline_structure`).
        *   Context about existing custom components for this project (if any).
    2.  **OpenAI API Call:** The service calls the OpenAI Chat Completions API (`openai.chat.completions.create`) using the structured prompt and the `tools` parameter (as per Memory `7a9140d6`). `tool_choice` might be set to `"auto"` or directed towards a specific tool if the user intent is clear.
    3.  **Response Handling:** The service waits for the OpenAI API response.

**4. Handling LLM Response (Backend)**

*   **File(s):** `src/server/lib/llm.ts`, back in `src/server/api/routers/project.ts`.
*   **Process:**
    1.  **Parse Response:** The LLM response is parsed.
    2.  **Text Response:** If the response contains a simple text message (`content`), it's saved to the `messages` table in the database and sent back to the frontend via the tRPC procedure's return value.
    3.  **Tool Call Response:** If the response contains `tool_calls`:
        *   The specific tool call (e.g., `generate_remotion_component`) is identified.
        *   The arguments provided by the LLM (e.g., component name, props, JS/TSX code string) are extracted.
        *   **Code Validation (Basic):** Minimal validation might occur (e.g., checking if the code string is non-empty).
        *   **Store/Update Project Data:** The tRPC procedure updates the project's data in the database (e.g., adding the new component to a list/timeline structure in the `projects` table or a related table) using Drizzle.
        *   **Handle Generated Code:** This is a critical step with potential variations:
            *   **Current Hypothesis (Based on open file `public/custom-components_*.js`):** The generated JavaScript code string is likely written to a project-specific file in the `public/` directory. This might happen via a standard Node.js `fs` call within the tRPC procedure *or* potentially by calling the API route `src/app/api/components/[id]/route.ts` internally.
            *   **Alternative (R2):** If R2 is used, the code would be uploaded there, and a URL or identifier stored in the database.
            *   **Alternative (Database):** The code string itself could be stored in the database (less likely for JS execution).

**5. Custom Component Storage & Serving**

*   **File(s):** `public/` directory, potentially `src/app/api/components/[id]/route.ts`.
*   **Process (Assuming `public/` directory):**
    1.  **Filename:** A unique filename is determined, likely incorporating the `projectId` (e.g., `custom-components_PROJECT_ID.js`).
    2.  **Writing:** The generated JS code is written to this file. **Potential Issue:** How are *multiple* custom components handled? Is the file overwritten each time, or are components appended? Appending could lead to issues if not managed carefully (e.g., duplicate definitions, growing file size). Overwriting means only the *latest* generated component is available unless the LLM generates a bundle of *all* custom components for the project each time.
    3.  **Serving:** Files in the `public/` directory are automatically served statically by Next.js. The component code becomes available at a URL like `/custom-components_PROJECT_ID.js`.
*   **Process (If using `api/components/[id]/route.ts`):**
    1.  **POST:** A `POST` request (likely from the tRPC procedure) sends the generated code and `projectId`. The route handler saves this code (method TBD - `public/` file seems most plausible given evidence).
    2.  **GET:** A `GET` request to `/api/components/[projectId]` would serve the corresponding JS file.

**6. Updating Video Preview (Frontend)**

*   **File(s):** `src/app/projects/[id]/edit/page.tsx`, `src/components/PreviewPanel.tsx` (or similar player component), `src/remotion/Root.tsx`.
*   **Process:**
    1.  **Data Update:** The frontend receives the updated project data (new timeline, new component references) from the tRPC backend. This could be through:
        *   The return value of the `project.sendMessage` mutation.
        *   tRPC subscriptions (if implemented).
        *   Polling/refetching project data.
    2.  **State Update:** The React state holding the project data and Remotion input props is updated.
    3.  **Loading the Custom Component Code:** This is the **most critical and potentially suboptimal** part:
        *   **Mechanism:** How does the browser get the *new* JavaScript code from `/custom-components_PROJECT_ID.js`?
            *   **A) `<script>` Tag:** The main page (`page.tsx`) might render a `<script>` tag pointing to the project-specific JS file. When the project data updates, if the *filename* itself changes (e.g., includes a version hash), React could render a new `<script>` tag. If the filename *doesn't* change, the browser might have the old version cached. A hard refresh might be needed, or dynamic script loading logic.
            *   **B) Dynamic Import in Remotion:** Remotion compositions *can* use dynamic `import()`, but this usually requires the files to be part of the build bundle or served in a way Remotion understands during rendering. It's less likely to work directly with arbitrary code injected into `public/` post-build without specific handling.
            *   **C) `eval()` or `new Function()` (Less Ideal):** The code string could be fetched and executed directly, but this has security implications and makes debugging harder.
        *   **Current Best Guess:** A `<script>` tag in `page.tsx` whose `src` attribute is dynamically set based on the project ID (and potentially a version/timestamp to break cache). The components defined in this script become globally accessible.
    4.  **Remotion Player Update:** The `@remotion/player` component receives the updated `inputProps` (containing the new timeline/data). It re-renders the composition.
    5.  **Remotion Composition (`src/remotion/Root.tsx`):** The composition accesses the custom components. Since they were likely loaded globally via the `<script>` tag, it can reference them (e.g., `window.MyCustomComponent`). It renders the video based on the updated timeline and component references passed in `inputProps`.

**7. Database (`src/lib/db/schema.ts`)**

*   Stores:
    *   `users`: User information.
    *   `accounts`, `sessions`, `verificationTokens`: NextAuth tables.
    *   `projects`: Core project data, including `id`, `name`, `userId`, timeline structure (JSONB?), references to custom components (IDs, names, or potentially the URL of the generated JS file).
    *   `messages`: Chat history for each project.
    *   Potentially a `custom_components` table if managing them more formally.

**8. Authentication (`src/lib/auth.ts`)**

*   Handles user login, sessions, and protects tRPC procedures and potentially API routes.
*   Ensures users can only access and modify their own projects.

## Potential Bottlenecks / Suboptimal Areas

*   **Custom Component Loading:** As highlighted in step 6, the exact mechanism for loading the dynamically generated JS code into the browser and making it available to the Remotion composition is crucial and potentially inefficient. If relying on a single, overwritten `public/` file and browser caching, updates might not appear without refreshes, or managing multiple components could be problematic.
*   **Code Generation Quality:** The LLM might generate incorrect or inefficient Remotion code, requiring robust validation or error handling.
*   **State Management:** Ensuring the frontend state (project data, Remotion props) updates reliably and triggers the player re-render correctly after backend changes.
*   **Scalability of `public/` storage:** Storing many large JS files directly in `public/` might not scale well long-term compared to dedicated object storage like R2.
*   **Error Handling:** Robust error handling is needed at each stage (API calls, code generation, file writing, database updates).
