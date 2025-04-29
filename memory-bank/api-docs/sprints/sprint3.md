------------------------------------------------------------- Done ✅ -------------------------------------------------------------


Focus for Sprint 3 (Implementing the Core Loop - No WebSockets Yet):

Based on the remaining tasks and our revised plan (deferring WebSockets), here's what completing Sprint 3 should focus on:

Backend - Implement chat.sendMessage tRPC Mutation (in src/server/api/routers/chat.ts):

Input: Accept projectId, message, currentInputProps (validate with Zod).
LLM Call: Use helpers (e.g., from ~/lib/llm.ts) to call GPT-4o. Provide a clear prompt including the current inputProps, user message, instructions to return only a JSON Patch, and the inputProps Zod schema for context. Request JSON output format from the LLM.
Patch Validation: Receive the response, parse the JSON, and rigorously validate the resulting patch array using your jsonPatchSchema (from ~/lib/zodSchemas.ts or ~/types/json-patch.ts). Implement the auto-repair loop if validation fails initially.
State Update: Apply the validated patch to the currentInputProps using applyValidatedPatch (from ~/lib/patch.ts).
Result Validation: Validate the resulting newInputProps against the main inputPropsSchema.
DB Persistence:
Save the full newInputProps object to the projects table in Neon using Drizzle (db.update(projects)...).
Save the validated patch itself to the patches table using Drizzle (db.insert(patches)...).
Return Value: Return the validated patch object directly in the mutation's success response.
Error Handling: Add try/catch blocks around LLM calls, parsing, validation, patch application, and DB operations. Return appropriate tRPC errors.
Frontend - Wire up UI and State:

Shared State (src/stores/videoState.ts): Ensure your store holds the currentInputProps and provides an action/method to update the state by applying a received JSON Patch immutably.
PlayerShell.tsx (src/components/client/):
Read currentInputProps from the shared state store.
Pass these props to the <Player component={DynamicVideo} inputProps={...} />.
ChatInterface.tsx (Replace ChatPanelPlaceholder):
Implement the actual chat input and message display.
Read the latest currentInputProps from the shared state store.
Use the api.chat.sendMessage.useMutation tRPC hook.
On form submit, call the mutation, passing the message and the current props read from the store.
Implement the onSuccess handler for the mutation: get the returned patch from the response data and call the action in your shared state store to apply it.
Handle isLoading and error states from the mutation hook to provide UI feedback.
---------


Below is a clean, incremental backlog that picks up exactly where your repo stands today – so you can finish the MVP without ripping-up the current codebase.

⸻

🎯 Sprint 3 | “From Demo to Editable MVP”

Track	Deliverable	Owner	New / touched files
State / API	chat.sendMessage tRPC mutation that calls the LLM, returns a validated JSON-Patch	Backend	src/server/api/routers/chat.ts
State / Client	Shared useVideoState update inside mutation onSuccess	Frontend	src/stores/videoState.ts + ChatInterface
Player wiring	PlayerShell subscribes to the store (already done)	(kept)	src/components/client/PlayerShell.tsx
Scenes	Add a TitleCard (text) & ImageSlide (image) scene to /remotion/components/scenes/ and register in DynamicVideo.tsx	Remotion	src/remotion/components/scenes/* DynamicVideo.tsx
UI	Replace placeholders with real ChatInterface (send box + scrollable history)	Frontend	src/components/client/ChatInterface.tsx
UX polish	Grid layout – 1 / 3 (chat)	2 / 3 (player)	Frontend

❗ No WebSockets, Lambda, or asset uploads in this sprint – they will be Sprint 4.
We keep it request → response only, so everything still works on Vercel.

⸻

1 ️⃣ tRPC sendMessage mutation

// src/server/api/routers/chat.ts
import { z } from "zod";
import { inputPropsSchema } from "~/types/input-props";
import { jsonPatchSchema } from "~/types/json-patch";
import { applyPatch } from "fast-json-patch";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { projects } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { openai } from "~/server/lib/openai";        // <-- you already stubbed this

export const chatRouter = createTRPCRouter({
  sendMessage: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        message: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch current props
      const [project] = await ctx.db
        .select({ props: projects.props })
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project) throw new Error("Project not found");

      // 2. ✨ Call GPT-4o in JSON-mode to get patch
      const llmResp = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Return ONLY an RFC-6902 JSON Patch array as `operations` that updates the inputProps.",
          },
          {
            role: "user",
            content: JSON.stringify({
              inputProps: project.props,
              request: input.message,
            }),
          },
        ],
      });

      const parsed = jsonPatchSchema.safeParse(
        JSON.parse(llmResp.choices[0].message.content).operations,
      );
      if (!parsed.success) {
        throw new Error("LLM returned invalid patch");
      }
      const patch = parsed.data;

      // 3. Apply & validate
      const nextProps = applyPatch(structuredClone(project.props), patch)
        .newDocument;
      const validated = inputPropsSchema.parse(nextProps);

      // 4. Persist
      await ctx.db
        .update(projects)
        .set({ props: validated, updatedAt: new Date() })
        .where(eq(projects.id, input.projectId));

      // 5. Return patch (client will merge)
      return { patch };
    }),
});

Add the router to src/server/api/root.ts if not yet merged.

⸻

2 ️⃣ Client mutation hook & store update

// src/components/client/ChatInterface.tsx
"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { useVideoState } from "~/stores/videoState";
import { applyPatch } from "fast-json-patch";

export function ChatInterface({ projectId }: { projectId: string }) {
  const [msg, setMsg] = useState("");
  const { inputProps, applyPatch: applyToStore } = useVideoState();
  const sendMessage = api.chat.sendMessage.useMutation({
    onSuccess: ({ patch }) => {
      // optimistic – apply on client
      applyToStore(patch);
      setMsg("");
    },
    onError: (e) => alert(e.message),
  });

  return (
    <div className="flex flex-col h-full">
      {/* message list placeholder */}
      <div className="flex-1 overflow-auto" />
      {/* input */}
      <div className="flex border-t p-2">
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          className="flex-1 rounded border px-2"
          placeholder="Describe a change..."
        />
        <button
          onClick={() => sendMessage.mutate({ projectId, message: msg })}
          disabled={!msg.trim() || sendMessage.isPending}
          className="ml-2 rounded bg-blue-600 px-3 py-1 text-white"
        >
          Send
        </button>
      </div>
    </div>
  );
}

No changes needed in PlayerShell – it already re-reads the store.

⸻

3 ️⃣ Layout fix

// src/app/dashboard/page.tsx
"use client";
import { PlayerShell } from "~/components/client/PlayerShell";
import { ChatInterface } from "~/components/client/ChatInterface";

export default function Dashboard({ searchParams }: { searchParams: { id: string } }) {
  const projectId = searchParams.id;          // ?id=uuid coming from link

  return (
    <div className="grid h-screen grid-cols-1 md:grid-cols-3 gap-px bg-border">
      <section className="md:col-span-1 overflow-hidden bg-background p-4">
        <ChatInterface projectId={projectId} />
      </section>

      <section className="md:col-span-2 overflow-hidden bg-muted p-4">
        <PlayerShell projectId={projectId} />
      </section>
    </div>
  );
}



⸻

4 ️⃣ Extra scene types

You already stubbed TextScene.tsx and ImageScene.tsx – import them in DynamicVideo.tsx:

// src/remotion/compositions/DynamicVideo.tsx
import { TextScene } from "../components/scenes/TextScene";
import { ImageScene } from "../components/scenes/ImageScene";
...

Add a quick fade transition scene later (simple opacity tween between sequences).

⸻

5 ️⃣ Test checklist
	1.	Seed a project (your /scripts/dev-seed.ts) and start npm run dev.
	2.	Open /dashboard?id=<projectId>.
	3.	Type “Change the title text to red” → Expect:
	•	POST /api/trpc/chat.sendMessage returns {patch:[...]}.
	•	Player re-renders with red title.
	4.	Invalid prompt (“asdfasdf”) → mutation returns error toast.
	5.	Refresh page → Remotion player loads persisted props from DB.

⸻
