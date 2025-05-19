// src/server/api/root.ts
import { projectRouter } from "~/server/api/routers/project";
import { chatRouter } from "~/server/api/routers/chat";
import { renderRouter } from "~/server/api/routers/render";
import { customComponentRouter } from "./routers/customComponent";
import { customComponentFixRouter } from "./routers/customComponentFix";
import { timelineRouter } from "~/server/api/routers/timeline";
import { videoRouter } from "~/server/api/routers/video";
import { animationRouter } from "~/server/api/routers/animation";
import { a2aRouter } from "~/server/api/routers/a2a";
import { a2aTestRouter } from "~/server/api/routers/a2a-test";
import { evaluationRouter } from "~/server/api/routers/evaluation";
import { debugRouter } from "~/server/api/routers/debug";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
// Import server initialization to start background processes
import "~/server/init";

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
  customComponentFix: customComponentFixRouter,
  timeline: timelineRouter,
  video: videoRouter,
  animation: animationRouter,
  a2a: a2aRouter,
  a2aTest: a2aTestRouter,
  evaluation: evaluationRouter,
  debug: debugRouter,
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
