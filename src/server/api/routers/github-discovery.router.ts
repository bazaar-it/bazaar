// src/server/api/routers/github-discovery.router.ts
/**
 * GitHub Component Discovery Router
 * API endpoints for discovering and cataloging components
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { ComponentIndexerService } from "~/server/services/github/component-indexer.service";
import { db } from "~/server/db";
import { githubConnections } from "~/server/db/schema/github-connections";
import { eq, and } from "drizzle-orm";
import type { UICatalog } from "~/server/services/github/component-indexer.service";

// Cache discovered components for 5 minutes
const discoveryCache = new Map<string, { catalog: UICatalog; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const githubDiscoveryRouter = createTRPCRouter({
  /**
   * Discover components in selected repositories
   */
  discoverComponents: protectedProcedure
    .input(z.object({
      forceRefresh: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const cacheKey = `discovery:${userId}`;
      
      // Check cache first
      if (!input?.forceRefresh) {
        const cached = discoveryCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          console.log('[Discovery] Returning cached catalog');
          return cached.catalog;
        }
      }
      
      // Get user's GitHub connection
      const connections = await db
        .select()
        .from(githubConnections)
        .where(and(
          eq(githubConnections.userId, userId),
          eq(githubConnections.isActive, true)
        ));
      
      const connection = connections[0];
      
      if (!connection) {
        console.log('[Discovery] No GitHub connection found');
        return {
          core: [],
          auth: [],
          commerce: [],
          interactive: [],
          content: [],
          custom: [],
        } as UICatalog;
      }
      
      if (!connection.selectedRepos || connection.selectedRepos.length === 0) {
        console.log('[Discovery] No repositories selected');
        return {
          core: [],
          auth: [],
          commerce: [],
          interactive: [],
          content: [],
          custom: [],
        } as UICatalog;
      }
      
      console.log(`[Discovery] Discovering components in ${connection.selectedRepos.length} repositories`);
      
      // Initialize indexer
      const indexer = new ComponentIndexerService(connection.accessToken);
      
      // Aggregate components from all selected repos
      const aggregatedCatalog: UICatalog = {
        core: [],
        auth: [],
        commerce: [],
        interactive: [],
        content: [],
        custom: [],
      };
      
      // Process each selected repository
      for (const repoFullName of connection.selectedRepos) {
        try {
          const [owner, repo] = repoFullName.split('/');
          if (!owner || !repo) continue;
          
          console.log(`[Discovery] Indexing ${repoFullName}`);
          const catalog = await indexer.discoverComponents(owner, repo);
          
          // Merge catalogs
          Object.keys(catalog).forEach(category => {
            aggregatedCatalog[category as keyof UICatalog].push(
              ...catalog[category as keyof UICatalog]
            );
          });
        } catch (error) {
          console.error(`[Discovery] Error indexing ${repoFullName}:`, error);
          // Continue with other repos
        }
      }
      
      // Sort and limit each category
      Object.keys(aggregatedCatalog).forEach(category => {
        aggregatedCatalog[category as keyof UICatalog] = 
          aggregatedCatalog[category as keyof UICatalog]
            .sort((a, b) => b.score - a.score)
            .slice(0, 30); // Top 30 per category
      });
      
      // Cache the result
      discoveryCache.set(cacheKey, {
        catalog: aggregatedCatalog,
        timestamp: Date.now(),
      });
      
      console.log(`[Discovery] Found components:`, {
        core: aggregatedCatalog.core.length,
        auth: aggregatedCatalog.auth.length,
        commerce: aggregatedCatalog.commerce.length,
        interactive: aggregatedCatalog.interactive.length,
        content: aggregatedCatalog.content.length,
        custom: aggregatedCatalog.custom.length,
      });
      
      return aggregatedCatalog;
    }),

  /**
   * Return discovery status (last indexed timestamp)
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const cacheKey = `discovery:${userId}`;
    const cached = discoveryCache.get(cacheKey);
    return {
      lastIndexedAt: cached ? new Date(cached.timestamp).toISOString() : null,
    };
  }),

  /**
   * Force re-indexing of selected repositories
   */
  reindex: protectedProcedure.mutation(async ({ ctx }) => {
    // Simply call discoverComponents with forceRefresh=true
    const catalog = await githubDiscoveryRouter.createCaller({
      db,
      session: ctx.session,
    }).discoverComponents({ forceRefresh: true });
    return {
      success: true,
      lastIndexedAt: new Date().toISOString(),
      counts: Object.fromEntries(
        Object.entries(catalog).map(([k, v]) => [k, v.length])
      ),
    };
  }),
  
  /**
   * Get component preview (first N lines of code)
   */
  getComponentPreview: protectedProcedure
    .input(z.object({
      repo: z.string(),
      path: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Get user's GitHub connection
      const connections = await db
        .select()
        .from(githubConnections)
        .where(and(
          eq(githubConnections.userId, userId),
          eq(githubConnections.isActive, true)
        ));
      
      const connection = connections[0];
      
      if (!connection) {
        throw new Error('No GitHub connection found');
      }
      
      const [owner, repo] = input.repo.split('/');
      if (!owner || !repo) {
        throw new Error('Invalid repository format');
      }
      
      const indexer = new ComponentIndexerService(connection.accessToken);
      const preview = await indexer.getComponentPreview(owner, repo, input.path);
      
      return { preview };
    }),
});