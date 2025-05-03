// src/server/api/root.ts
import { projectRouter } from "~/server/api/routers/project";
import { chatRouter } from "~/server/api/routers/chat";
import { renderRouter } from "~/server/api/routers/render";
import { customComponentRouter } from "~/server/api/routers/customComponent";
import { timelineRouter } from "~/server/api/routers/timeline";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  project: projectRouter,
  chat: chatRouter,
  render: renderRouter,
  customComponent: customComponentRouter,
  timeline: timelineRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
