// src/server/api/routers/github.router.ts
/**
 * GitHub Integration Router
 * Handles GitHub connection, disconnection, and component search
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { githubConnections } from "~/server/db/schema/github-connections";
import { eq, and, sql } from "drizzle-orm";
import { Octokit } from "@octokit/rest";

type GithubConnectionRow = typeof githubConnections.$inferSelect;
type DatabaseInstance = typeof import("~/server/db").db;

type LegacyGithubConnectionRow = {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  github_user_id: string | number | null;
  github_username: string | null;
  github_email: string | null;
  scope: string | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
};

const isMissingColumnError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = (error as { code?: string }).code;
  return code === "42703";
};

const coerceDate = (value: string | Date | null | undefined) => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const fetchActiveGithubConnection = async (
  db: DatabaseInstance,
  userId: string,
): Promise<GithubConnectionRow | null> => {
  try {
    const connections = await db
      .select()
      .from(githubConnections)
      .where(and(eq(githubConnections.userId, userId), eq(githubConnections.isActive, true)));
    return connections[0] ?? null;
  } catch (error) {
    if (!isMissingColumnError(error)) {
      throw error;
    }

    console.warn("[GitHub Router] Schema mismatch detected for githubConnections; falling back to legacy columns.");

    const legacyResult = await db.execute(sql<LegacyGithubConnectionRow>`
      SELECT
        id,
        user_id,
        access_token,
        refresh_token,
        github_user_id,
        github_username,
        github_email,
        scope,
        created_at,
        updated_at
      FROM "bazaar-vid_github_connection"
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const legacyRow = legacyResult.rows?.[0];
    if (!legacyRow) {
      return null;
    }

    const fallbackConnection: GithubConnectionRow = {
      id: legacyRow.id,
      userId: legacyRow.user_id,
      accessToken: legacyRow.access_token,
      refreshToken: legacyRow.refresh_token ?? null,
      tokenType: "bearer",
      scope: legacyRow.scope ?? null,
      githubUserId: legacyRow.github_user_id != null ? String(legacyRow.github_user_id) : "",
      githubUsername: legacyRow.github_username ?? "",
      githubEmail: legacyRow.github_email ?? null,
      connectedAt: coerceDate(legacyRow.created_at) ?? new Date(0),
      lastSyncedAt: coerceDate(legacyRow.updated_at),
      isActive: true,
      selectedRepos: [] as string[],
      styleProfile: null,
    };

    return fallbackConnection;
  }
};

export const githubRouter = createTRPCRouter({
  getConnection: protectedProcedure.query(async ({ ctx }) => {
    const connection = await fetchActiveGithubConnection(ctx.db, ctx.session.user.id);
    
    if (!connection) {
      return {
        isConnected: false,
      };
    }
    
    // Get repository count
    try {
      const octokit = new Octokit({
        auth: connection.accessToken,
      });
      
      const { data: user } = await octokit.users.getAuthenticated();
        // Paginate all repos for the authenticated user
        const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
          per_page: 100,
          sort: 'updated',
        });
      
      return {
        isConnected: true,
        username: user.login,
         repoCount: repos.length,
         repositories: repos.map((r: any) => r.full_name),
        selectedRepos: connection.selectedRepos || [],
        connectedAt: connection.connectedAt,
      };
    } catch (error) {
      console.error('Failed to fetch GitHub data:', error);
      return {
        isConnected: true,
        username: 'Unknown',
        repoCount: 0,
        repositories: [],
        selectedRepos: connection.selectedRepos || [],
        connectedAt: connection.connectedAt,
      };
    }
  }),
  
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    const connection = await fetchActiveGithubConnection(ctx.db, ctx.session.user.id);

    if (!connection) {
      return { success: true };
    }

    try {
      await ctx.db
        .update(githubConnections)
        .set({ isActive: false })
        .where(eq(githubConnections.id, connection.id));
    } catch (error) {
      if (!isMissingColumnError(error)) {
        throw error;
      }

      console.warn('[GitHub Router] Legacy githubConnections schema detected during disconnect; deleting row.');
      await ctx.db.execute(sql`
        DELETE FROM "bazaar-vid_github_connection"
        WHERE id = ${connection.id}
      `);
    }

    return { success: true };
  }),
  
  updateSelectedRepos: protectedProcedure
    .input(z.object({
      repositories: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log('[GitHub Router] Updating selected repos for user:', ctx.session.user.id);
      console.log('[GitHub Router] Repositories to save:', input.repositories);
      
      const connection = await fetchActiveGithubConnection(ctx.db, ctx.session.user.id);
      
      if (!connection) {
        throw new Error('No GitHub connection found');
      }
      
      // Update selected repos
      try {
        await ctx.db
          .update(githubConnections)
          .set({
            selectedRepos: input.repositories,
          })
          .where(eq(githubConnections.id, connection.id));
      } catch (error) {
        if (!isMissingColumnError(error)) {
          throw error;
        }
        console.warn('[GitHub Router] Legacy githubConnections schema lacks selected_repos; skipping repo persistence.');
      }
      
      console.log('[GitHub Router] Successfully updated repos for connection:', connection.id);
      
      return { success: true, count: input.repositories.length };
    }),
  
  getRepoDetails: protectedProcedure
    .input(z.object({
      repositories: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const connection = await fetchActiveGithubConnection(ctx.db, ctx.session.user.id);
      
      if (!connection) {
        throw new Error('No GitHub connection found');
      }
      
      try {
        const octokit = new Octokit({
          auth: connection.accessToken,
        });
        
        // Get details for each repo
        const repoDetails = await Promise.all(
          input.repositories.slice(0, 30).map(async (repoFullName) => {
            try {
              const [owner, repo] = repoFullName.split('/');
              const { data } = await octokit.repos.get({ owner, repo });
              
              return {
                name: data.name,
                fullName: data.full_name,
                description: data.description,
                language: data.language,
                updatedAt: data.updated_at,
                private: data.private,
              };
            } catch (error) {
              // If we can't get details, return basic info
              return {
                name: repoFullName.split('/')[1] || repoFullName,
                fullName: repoFullName,
              };
            }
          })
        );
        
        return repoDetails;
      } catch (error) {
        throw new Error('Failed to fetch repository details');
      }
    }),
  
  resetRepositorySelection: protectedProcedure.mutation(async ({ ctx }) => {
    const connection = await fetchActiveGithubConnection(ctx.db, ctx.session.user.id);
    
    if (!connection) {
      throw new Error('No GitHub connection found');
    }
    
    // Reset selected repos to empty array
    try {
      await ctx.db
        .update(githubConnections)
        .set({
          selectedRepos: [],
        })
        .where(eq(githubConnections.id, connection.id));
    } catch (error) {
      if (!isMissingColumnError(error)) {
        throw error;
      }
      console.warn('[GitHub Router] Legacy githubConnections schema lacks selected_repos; reset is a no-op.');
    }
    
    return { success: true };
  }),

  testConnection: protectedProcedure.mutation(async ({ ctx }) => {
    const connection = await fetchActiveGithubConnection(ctx.db, ctx.session.user.id);
    
    if (!connection) {
      throw new Error('No GitHub connection found');
    }
    
    try {
      const octokit = new Octokit({
        auth: connection.accessToken,
      });
      
      const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
        per_page: 100,
      });
      
      return {
        success: true,
         repoCount: repos.length,
      };
    } catch (error) {
      throw new Error('GitHub connection test failed');
    }
  }),

  listRepos: protectedProcedure.query(async ({ ctx }) => {
    const connection = await fetchActiveGithubConnection(ctx.db, ctx.session.user.id);
    if (!connection) return { repos: [], count: 0 };

    const octokit = new Octokit({ auth: connection.accessToken });
    const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
      per_page: 100,
      sort: 'updated',
    });

    return {
      repos: repos.map((r: any) => ({
        fullName: r.full_name as string,
        private: !!r.private,
        updatedAt: r.updated_at as string,
      })),
      count: repos.length,
    };
  }),

  searchComponents: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      maxResults: z.number().int().min(1).max(20).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const connection = await fetchActiveGithubConnection(ctx.db, ctx.session.user.id);
      if (!connection) throw new Error('No GitHub connection found');

      const { GitHubComponentSearchService } = await import('~/server/services/github/component-search.service');
      const repositories = connection.selectedRepos ?? [];

      if (repositories.length === 0) {
        return { results: [], count: 0 };
      }

      const service = new GitHubComponentSearchService(connection.accessToken, ctx.session.user.id);
      const results = await service.searchComponent(input.query, {
        repositories,
        maxResults: input.maxResults ?? 10,
        useCache: true,
      });

      return {
        results: results.map((r) => ({
          name: r.name,
          repository: r.repository,
          path: r.path,
          score: r.score,
          language: r.language,
          lastModified: r.lastModified,
        })),
        count: results.length,
      };
    }),
});
