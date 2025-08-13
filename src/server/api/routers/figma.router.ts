/**
 * Figma API Router
 * Handles Figma integration endpoints
 */

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { FigmaAuthService } from '~/server/services/figma/figma-auth.service';
import { FigmaDiscoveryService } from '~/server/services/figma/figma-discovery.service';
import { FigmaConverterService } from '~/server/services/figma/figma-converter.service';
import { db } from '~/server/db';
import { figmaFileCache, figmaImports } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import type { UICatalog } from '~/lib/types/figma.types';

export const figmaRouter = createTRPCRouter({
  /**
   * Connect Figma account (OAuth or PAT)
   */
  connect: protectedProcedure
    .input(
      z.object({
        method: z.enum(['oauth', 'pat']),
        code: z.string().optional(), // OAuth code
        pat: z.string().optional(), // Personal Access Token
      })
    )
    .mutation(async ({ input, ctx }) => {
      const authService = new FigmaAuthService();
      const userId = ctx.session.user.id;

      if (input.method === 'pat' && input.pat) {
        // Validate PAT
        const figmaUser = await authService.validatePAT(input.pat);
        
        // Save connection with PAT
        await authService.saveConnection(
          userId,
          { access_token: input.pat },
          figmaUser
        );

        return {
          success: true,
          user: figmaUser,
        };
      } else if (input.method === 'oauth' && input.code) {
        // Exchange code for tokens
        const tokens = await authService.exchangeCodeForTokens(input.code);
        
        // Get user info
        const figmaUser = await authService.getCurrentUser(tokens.access_token);
        
        // Save connection
        await authService.saveConnection(userId, tokens, figmaUser);

        return {
          success: true,
          user: figmaUser,
        };
      }

      throw new Error('Invalid connection method');
    }),

  /**
   * Get connection status
   */
  getConnectionStatus: protectedProcedure.query(async ({ ctx }) => {
    // Check for environment PAT first
    const envPat = process.env.FIGMA_PAT;
    if (envPat) {
      return {
        connected: true,
        figmaUser: {
          id: 'env-pat',
          email: 'Using environment PAT',
          handle: 'shared',
        },
      };
    }
    
    const authService = new FigmaAuthService();
    const connection = await authService.getConnection(ctx.session.user.id);

    if (!connection) {
      return { connected: false };
    }

    return {
      connected: true,
      figmaUser: {
        id: connection.figmaUserId,
        email: connection.figmaUserEmail,
        handle: connection.figmaUserHandle,
      },
    };
  }),
  
  /**
   * Check connection (alias for UI compatibility)
   */
  checkConnection: protectedProcedure.query(async ({ ctx }) => {
    // Check for environment PAT first
    const envPat = process.env.FIGMA_PAT;
    if (envPat) {
      return {
        connected: true,
        user: {
          email: 'Using environment PAT',
        },
      };
    }
    
    const authService = new FigmaAuthService();
    const connection = await authService.getConnection(ctx.session.user.id);

    return {
      connected: !!connection,
      user: connection ? {
        email: connection.figmaUserEmail,
      } : undefined,
    };
  }),

  /**
   * Disconnect Figma account
   */
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    const authService = new FigmaAuthService();
    await authService.disconnect(ctx.session.user.id);
    return { success: true };
  }),

  /**
   * List accessible files (teams -> projects -> files)
   */
  listFiles: protectedProcedure
    .input(
      z.object({
        teamId: z.string().optional(),
        projectId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const authService = new FigmaAuthService();
      const connection = await authService.getConnection(ctx.session.user.id);

      if (!connection) {
        throw new Error('Figma not connected');
      }

      const discoveryService = new FigmaDiscoveryService(connection.accessToken);

      // If projectId provided, get files in that project
      if (input.projectId) {
        const files = await discoveryService.listFiles(input.projectId);
        return { files };
      }

      // If teamId provided, get projects in that team
      if (input.teamId) {
        const projects = await discoveryService.listProjects(input.teamId);
        return { projects };
      }

      // Otherwise, get teams
      try {
        const teams = await discoveryService.listTeams();
        return { teams };
      } catch (error) {
        // Teams endpoint doesn't work with PAT, return empty
        console.warn('Could not fetch teams (might be using PAT):', error);
        return { teams: [], message: 'Using Personal Access Token - browse files directly' };
      }
    }),

  /**
   * Index a file and discover components
   */
  indexFile: protectedProcedure
    .input(
      z.object({
        fileKey: z.string(),
        fileName: z.string().optional(),
        forceRefresh: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Use environment PAT if available
      const envPat = process.env.FIGMA_PAT;
      let accessToken: string;
      
      if (envPat) {
        accessToken = envPat;
      } else {
        const authService = new FigmaAuthService();
        const connection = await authService.getConnection(ctx.session.user.id);
        if (!connection) {
          throw new Error('Figma not connected');
        }
        accessToken = connection.accessToken;
      }

      // Check cache first
      if (!input.forceRefresh) {
        const cached = await db
          .select()
          .from(figmaFileCache)
          .where(eq(figmaFileCache.fileKey, input.fileKey))
          .limit(1);

        if (cached.length > 0 && cached[0]?.indexedAt) {
          // Check if cache is still fresh (24 hours)
          const cacheAge = Date.now() - new Date(cached[0]!.indexedAt).getTime();
          if (cacheAge < 24 * 60 * 60 * 1000) {
            const cachedCatalog = cached[0]!.componentCatalog as UICatalog;
            const cachedComponents = Object.values(cachedCatalog).flat().map(item => ({
              id: item.nodeId || item.name,
              name: item.name,
              type: item.category,
              thumbnailUrl: item.previewUrl,
              description: `${item.category} component`
            }));
            
            return {
              catalog: cachedCatalog,
              components: cachedComponents,
              fromCache: true,
            };
          }
        }
      }

      // Index the file
      const discoveryService = new FigmaDiscoveryService(accessToken);
      const catalog = await discoveryService.indexFile(input.fileKey);

      // Save to cache
      const cacheData = {
        fileKey: input.fileKey,
        fileName: input.fileName || input.fileKey,
        indexedAt: new Date(),
        componentCatalog: catalog as any,
        updatedAt: new Date(),
      };

      // Upsert cache entry
      await db
        .insert(figmaFileCache)
        .values(cacheData)
        .onConflictDoUpdate({
          target: figmaFileCache.fileKey,
          set: cacheData,
        });

      // Flatten catalog into components array for UI
      const components = Object.values(catalog).flat().map(item => ({
        id: item.nodeId || item.name,
        name: item.name,
        type: item.category,
        thumbnailUrl: item.previewUrl,
        description: `${item.category} component`
      }));
      
      // Return simplified format for UI
      return {
        catalog,
        components,
        fromCache: false,
      };
    }),

  /**
   * Get cached file catalog
   */
  getFileCatalog: protectedProcedure
    .input(z.object({ fileKey: z.string() }))
    .query(async ({ input }) => {
      const cached = await db
        .select()
        .from(figmaFileCache)
        .where(eq(figmaFileCache.fileKey, input.fileKey))
        .limit(1);

      if (cached.length === 0) {
        return null;
      }

      return {
        catalog: cached[0].componentCatalog as UICatalog,
        indexedAt: cached[0].indexedAt,
      };
    }),

  /**
   * Import a design into a project
   */
  importDesign: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        fileKey: z.string(),
        nodeId: z.string(),
        nodeName: z.string(),
        nodeType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const authService = new FigmaAuthService();
      const connection = await authService.getConnection(ctx.session.user.id);

      if (!connection) {
        throw new Error('Figma not connected');
      }

      // For MVP, just create a simple conversion
      const converterService = new FigmaConverterService();
      
      // Create a mock node for now (in production, fetch actual node data)
      const mockNode = {
        id: input.nodeId,
        name: input.nodeName,
        type: 'FRAME' as const,
        children: [],
      };

      const remotionCode = converterService.convertToRemotionCode(mockNode);

      // Save import record
      const importRecord = await db.insert(figmaImports).values({
        projectId: input.projectId,
        fileKey: input.fileKey,
        nodeId: input.nodeId,
        nodeName: input.nodeName,
        nodeType: input.nodeType || 'FRAME',
        remotionCode,
        exportFormat: 'png',
      }).returning();

      return {
        success: true,
        importId: importRecord[0].id,
        remotionCode,
      };
    }),

  /**
   * Get OAuth URL for connecting Figma
   */
  getOAuthUrl: protectedProcedure.query(async ({ ctx }) => {
    const authService = new FigmaAuthService();
    const state = Buffer.from(ctx.session.user.id).toString('base64');
    const url = authService.getAuthorizationUrl(state);
    
    return { url };
  }),
});