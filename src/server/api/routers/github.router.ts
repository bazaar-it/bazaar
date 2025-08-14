/**
 * GitHub Integration Router
 * Handles GitHub connection, disconnection, and component search
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { githubConnections } from "~/server/db/schema/github-connections";
import { eq, and } from "drizzle-orm";
import { Octokit } from "@octokit/rest";

export const githubRouter = createTRPCRouter({
  getConnection: protectedProcedure.query(async ({ ctx }) => {
    const connections = await ctx.db
      .select()
      .from(githubConnections)
      .where(and(
        eq(githubConnections.userId, ctx.session.user.id),
        eq(githubConnections.isActive, true)
      ));
    
    const connection = connections[0];
    
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
      const { data: repos } = await octokit.repos.listForAuthenticatedUser({
        per_page: 100,
        sort: 'updated',
      });
      
      return {
        isConnected: true,
        username: user.login,
        repoCount: repos.length,
        repositories: repos.map(r => r.full_name),
        selectedRepos: connection.selectedRepos || [],
        connectedAt: connection.createdAt,
      };
    } catch (error) {
      console.error('Failed to fetch GitHub data:', error);
      return {
        isConnected: true,
        username: 'Unknown',
        repoCount: 0,
        repositories: [],
        selectedRepos: connection.selectedRepos || [],
        connectedAt: connection.createdAt,
      };
    }
  }),
  
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(githubConnections)
      .set({ isActive: false })
      .where(
        and(
          eq(githubConnections.userId, ctx.session.user.id),
          eq(githubConnections.isActive, true)
        )
      );
    
    return { success: true };
  }),
  
  updateSelectedRepos: protectedProcedure
    .input(z.object({
      repositories: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log('[GitHub Router] Updating selected repos for user:', ctx.session.user.id);
      console.log('[GitHub Router] Repositories to save:', input.repositories);
      
      const connections = await ctx.db
        .select()
        .from(githubConnections)
        .where(and(
          eq(githubConnections.userId, ctx.session.user.id),
          eq(githubConnections.isActive, true)
        ));
      
      const connection = connections[0];
      
      if (!connection) {
        throw new Error('No GitHub connection found');
      }
      
      // Update selected repos
      await ctx.db
        .update(githubConnections)
        .set({
          selectedRepos: input.repositories,
        })
        .where(eq(githubConnections.id, connection.id));
      
      console.log('[GitHub Router] Successfully updated repos for connection:', connection.id);
      
      return { success: true, count: input.repositories.length };
    }),
  
  getRepoDetails: protectedProcedure
    .input(z.object({
      repositories: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const connections = await ctx.db
        .select()
        .from(githubConnections)
        .where(and(
          eq(githubConnections.userId, ctx.session.user.id),
          eq(githubConnections.isActive, true)
        ));
      
      const connection = connections[0];
      
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
    const connections = await ctx.db
      .select()
      .from(githubConnections)
      .where(and(
        eq(githubConnections.userId, ctx.session.user.id),
        eq(githubConnections.isActive, true)
      ));
    
    const connection = connections[0];
    
    if (!connection) {
      throw new Error('No GitHub connection found');
    }
    
    // Reset selected repos to empty array
    await ctx.db
      .update(githubConnections)
      .set({
        selectedRepos: [],
      })
      .where(eq(githubConnections.id, connection.id));
    
    return { success: true };
  }),

  testConnection: protectedProcedure.mutation(async ({ ctx }) => {
    const connections = await ctx.db
      .select()
      .from(githubConnections)
      .where(and(
        eq(githubConnections.userId, ctx.session.user.id),
        eq(githubConnections.isActive, true)
      ));
    
    const connection = connections[0];
    
    if (!connection) {
      throw new Error('No GitHub connection found');
    }
    
    try {
      const octokit = new Octokit({
        auth: connection.accessToken,
      });
      
      const { data: repos } = await octokit.repos.listForAuthenticatedUser({
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
});