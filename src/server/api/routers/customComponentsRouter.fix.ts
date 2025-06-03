// @ts-nocheck
// src/server/api/routers/customComponentsRouter.fix.ts

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { customComponentJobs } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { preprocessTsx, isErrorFixableByPreprocessor } from '~/server/utils/tsxPreprocessor';
import { buildCustomComponent } from '~/server/utils/buildCustomComponent';
import logger from '~/lib/logger';

/**
 * Extension of the custom components router to add component fix functionality
 */
export const customComponentsFixRouter = createTRPCRouter({
  getFixableByProjectId: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { projectId } = input;
      
      // Get components that are marked as fixable for this project
      const fixableComponents = await ctx.db.query.customComponentJobs.findMany({
        where: (jobs) => {
          return eq(jobs.projectId, projectId) && 
                 eq(jobs.status, 'fixable');
        },
        orderBy: (jobs) => [jobs.createdAt],
      });
      
      return fixableComponents;
    }),
  
  tryToFix: protectedProcedure
    .input(z.object({
      componentId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const { componentId } = input;
      
      // Find the component
      const component = await ctx.db.query.customComponentJobs.findFirst({
        where: eq(customComponentJobs.id, componentId)
      });
      
      if (!component) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Component not found'
        });
      }
      
      if (component.status !== 'fixable') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Component is not fixable'
        });
      }
      
      try {
        // Update status to fixing
        await ctx.db.update(customComponentJobs)
          .set({ status: 'fixing' })
          .where(eq(customComponentJobs.id, componentId));
        
        // Get the code to fix (original code if available, otherwise current code)
        const tsxCode = component.originalTsxCode || component.tsxCode;
        if (!tsxCode) {
          throw new Error('No TSX code found to fix');
        }
        
        const componentName = component.effect || 'Component';
        
        logger.info(`Attempting to fix component ${componentId} (${componentName})`);
        
        // Apply the preprocessor
        const { code: fixedCode, issues, fixed } = preprocessTsx(tsxCode, componentName);
        
        if (!fixed) {
          logger.warn(`No fixes were applied to component ${componentId}`);
          // Reset status to fixable
          await ctx.db.update(customComponentJobs)
            .set({ 
              status: 'fixable',
              errorMessage: 'No fixes could be applied'
            })
            .where(eq(customComponentJobs.id, componentId));
            
          return { 
            success: false, 
            message: 'No fixes could be applied to this component' 
          };
        }
        
        // Update with fixed code and tracking info
        await ctx.db.update(customComponentJobs)
          .set({ 
            tsxCode: fixedCode,
            lastFixAttempt: new Date(),
            fixIssues: issues.join(', '),
            originalTsxCode: component.originalTsxCode || tsxCode // Save original if not already saved
          })
          .where(eq(customComponentJobs.id, componentId));
        
        logger.info(`Applied fixes to component ${componentId}: ${issues.join(', ')}`);
        
        // Try to build the component now that it's fixed
        const buildResult = await buildCustomComponent(componentId);
        
        if (buildResult) {
          logger.info(`Successfully built fixed component ${componentId}`);
          // Component is now complete, return success
          return { 
            success: true, 
            status: 'complete',
            message: `Component fixed and built successfully. Applied fixes: ${issues.join(', ')}` 
          };
        } else {
          logger.warn(`Fixed component ${componentId} but build still failed`);
          // Build failed, but we did fix some issues
          // Update status back to fixable for another attempt
          await ctx.db.update(customComponentJobs)
            .set({ 
              status: 'fixable', 
              errorMessage: 'Fixed some issues but build still failed' 
            })
            .where(eq(customComponentJobs.id, componentId));
            
          return { 
            success: false, 
            status: 'fixable', 
            message: `Applied fixes (${issues.join(', ')}) but build still failed` 
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error fixing component ${componentId}: ${errorMessage}`);
        
        // Update status back to fixable
        await ctx.db.update(customComponentJobs)
          .set({ 
            status: 'fixable', 
            errorMessage: `Fix attempt failed: ${errorMessage}` 
          })
          .where(eq(customComponentJobs.id, componentId));
        
        return { 
          success: false, 
          message: errorMessage
        };
      }
    }),
    
  /**
   * Check if a component can be fixed
   */
  canBeFixed: protectedProcedure
    .input(z.object({
      componentId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const { componentId } = input;
      
      const component = await ctx.db.query.customComponentJobs.findFirst({
        where: eq(customComponentJobs.id, componentId)
      });
      
      if (!component || component.status !== 'failed') {
        return { fixable: false };
      }
      
      const errorMsg = component.errorMessage;
      const tsxCode = component.tsxCode;
      
      if (!errorMsg || !tsxCode) {
        return { fixable: false };
      }
      
      const canFix = isErrorFixableByPreprocessor(new Error(errorMsg), tsxCode);
      
      // If fixable, update the status
      if (canFix) {
        await ctx.db.update(customComponentJobs)
          .set({ status: 'fixable' })
          .where(eq(customComponentJobs.id, componentId));
      }
      
      return { fixable: canFix };
    })
});