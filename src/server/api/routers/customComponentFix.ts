import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { customComponentJobs, db } from "~/server/db";
import { eq } from "drizzle-orm";
import { preprocessTsx } from "~/server/utils/tsxPreprocessor";
import { componentLogger } from "~/lib/logger";

/**
 * Router for handling custom component fixes
 */
export const customComponentFixRouter = createTRPCRouter({
  /**
   * Get all components that can be fixed for a project
   */
  getFixableByProjectId: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const components = await db.query.customComponentJobs.findMany({
        where: (jobs, { eq, and }) => 
          and(
            eq(jobs.projectId, input.projectId),
            eq(jobs.status, "fixable")
          )
      });
      
      return components;
    }),
    
  /**
   * Check if a component can be fixed
   */
  canBeFixed: protectedProcedure
    .input(z.object({
      componentId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const component = await db.query.customComponentJobs.findFirst({
        where: eq(customComponentJobs.id, input.componentId)
      });
      
      if (!component) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Component not found"
        });
      }
      
      // Component is already marked as fixable
      if (component.status === "fixable") {
        return { canBeFixed: true };
      }
      
      // Only failed components with TSX code can be analyzed
      if (component.status !== "failed" || !component.tsxCode) {
        return { canBeFixed: false };
      }
      
      // Check if we can fix it with the preprocessor
      try {
        const { fixed } = preprocessTsx(component.tsxCode, component.effect);
        return { canBeFixed: fixed };
      } catch (error) {
        return { canBeFixed: false };
      }
    }),
    
  /**
   * Try to fix a component using the TSX preprocessor
   */
  tryToFix: protectedProcedure
    .input(z.object({
      componentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the component to fix
      const component = await db.query.customComponentJobs.findFirst({
        where: eq(customComponentJobs.id, input.componentId)
      });
      
      if (!component) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Component not found"
        });
      }
      
      if (component.status !== "fixable" && component.status !== "failed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Component is not in a fixable state (current status: ${component.status})`
        });
      }
      
      if (!component.tsxCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Component has no TSX code to fix"
        });
      }
      
      // Update status to fixing
      await db.update(customComponentJobs)
        .set({ 
          status: "fixing",
          updatedAt: new Date()
        })
        .where(eq(customComponentJobs.id, input.componentId));
        
      componentLogger.start(input.componentId, `Attempting to fix component ${component.effect}`);
      
      // Try to fix the code with the preprocessor
      const result = preprocessTsx(component.tsxCode, component.effect);
      
      if (!result.fixed) {
        // Update status back to fixable
        await db.update(customComponentJobs)
          .set({ 
            status: "fixable", 
            errorMessage: "Could not fix component automatically",
            lastFixAttempt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(customComponentJobs.id, input.componentId));
          
        componentLogger.error(input.componentId, "Failed to fix component", { result });
        
        return {
          fixed: false,
          issues: result.issues,
          componentId: input.componentId,
          status: "fixable"
        };
      }
      
      // Store the original code if not already saved
      if (!component.originalTsxCode) {
        await db.update(customComponentJobs)
          .set({ originalTsxCode: component.tsxCode })
          .where(eq(customComponentJobs.id, input.componentId));
      }
      
      // Update with fixed code
      const updated = await db.update(customComponentJobs)
        .set({ 
          tsxCode: result.code,
          lastFixAttempt: new Date(),
          fixIssues: result.issues.join(', '),
          status: "building", // Set to building so the build system will pick it up
          updatedAt: new Date()
        })
        .where(eq(customComponentJobs.id, input.componentId))
        .returning();
      
      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update component"
        });
      }
      
      componentLogger.info(input.componentId, `Fixed component with ${result.issues.length} issues, triggering build`, { issues: result.issues });
      
      // Try to build the component now that it's fixed
      try {
        const buildModule = await import('~/server/workers/buildCustomComponent');
        await buildModule.buildCustomComponent(input.componentId);
        
        componentLogger.complete(input.componentId, "Successfully built fixed component");
        
        // Return success
        return {
          fixed: true,
          issues: result.issues,
          componentId: input.componentId,
          status: "complete"
        };
      } catch (buildError) {
        componentLogger.error(input.componentId, `Error building fixed component: ${buildError instanceof Error ? buildError.message : String(buildError)}`);
        
        // Update status back to fixable
        await db.update(customComponentJobs)
          .set({ 
            status: "fixable", 
            errorMessage: `Fix succeeded but build failed: ${buildError instanceof Error ? buildError.message : String(buildError)}`,
            updatedAt: new Date()
          })
          .where(eq(customComponentJobs.id, input.componentId));
        
        // Return partial success
        return {
          fixed: true,
          buildSucceeded: false,
          issues: result.issues,
          componentId: input.componentId,
          status: "fixable"
        };
      }
    }),
}); 