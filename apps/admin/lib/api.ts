// Re-export the tRPC API from the provider with proper typing
// This provides a cleaner import path for components
import { api as rawApi } from "./trpc-provider";
import type { APIType } from "./trpc-types";

export const api = rawApi as unknown as APIType;