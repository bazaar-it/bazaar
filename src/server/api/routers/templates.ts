import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { templates, scenes, projects, templateUsages } from "~/server/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Input schemas
const createTemplateSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  supportedFormats: z.array(z.enum(['landscape', 'portrait', 'square'])).optional(),
  isOfficial: z.boolean().optional(),
});

const updateTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  supportedFormats: z.array(z.enum(['landscape', 'portrait', 'square'])).optional(),
  isActive: z.boolean().optional(),
  isOfficial: z.boolean().optional(),
});

const getTemplatesSchema = z.object({
  category: z.string().optional(),
  isOfficial: z.boolean().optional(),
  format: z.enum(['landscape', 'portrait', 'square']).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const templatesRouter = createTRPCRouter({
  // Create a new template from a scene (Admin only)
  create: adminProcedure
    .input(createTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, sceneId, ...templateData } = input;
      
      // Verify the admin owns or has access to the project
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
      });
      
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }
      
      // Get the scene to extract code
      const scene = await db.query.scenes.findFirst({
        where: and(
          eq(scenes.id, sceneId),
          eq(scenes.projectId, projectId)
        ),
      });
      
      if (!scene) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Scene not found",
        });
      }
      
      // Process the scene code to make it template-ready
      let templateCode = scene.tsxCode;
      
      // Remove any project-specific IDs or references
      // This is a simplified version - you might want more sophisticated processing
      templateCode = templateCode.replace(/Scene_[a-zA-Z0-9]{8}/g, 'TemplateScene');
      
      // Create the template
      const [newTemplate] = await db.insert(templates).values({
        name: templateData.name,
        description: templateData.description,
        tsxCode: templateCode,
        duration: scene.duration,
        category: templateData.category,
        tags: templateData.tags || [],
        supportedFormats: templateData.supportedFormats || ['landscape', 'portrait', 'square'],
        isOfficial: templateData.isOfficial || false,
        isActive: true,
        createdBy: ctx.session.user.id,
        sourceProjectId: projectId,
        sourceSceneId: sceneId,
      }).returning();
      
      return newTemplate;
    }),

  // Get all active templates (Public - for template panel)
  getAll: publicProcedure
    .input(getTemplatesSchema)
    .query(async ({ input }) => {
      const { category, isOfficial, format, limit, offset } = input;
      
      // Build where conditions
      const conditions = [eq(templates.isActive, true)];
      
      if (category) {
        conditions.push(eq(templates.category, category));
      }
      
      if (isOfficial !== undefined) {
        conditions.push(eq(templates.isOfficial, isOfficial));
      }
      
      // Get templates
      const allTemplates = await db.query.templates.findMany({
        where: and(...conditions),
        orderBy: [desc(templates.isOfficial), desc(templates.usageCount), desc(templates.createdAt)],
        limit,
        offset,
        with: {
          creator: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      // Filter by format if specified
      let filteredTemplates = allTemplates;
      if (format) {
        filteredTemplates = allTemplates.filter(template => {
          const formats = template.supportedFormats as string[];
          return formats.includes(format);
        });
      }
      
      return filteredTemplates;
    }),

  // Get template by ID (Public - for preview)
  getById: publicProcedure
    .input(z.string().uuid())
    .query(async ({ input }) => {
      const template = await db.query.templates.findFirst({
        where: and(
          eq(templates.id, input),
          eq(templates.isActive, true)
        ),
        with: {
          creator: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }
      
      return template;
    }),

  // Update template (Admin only)
  update: adminProcedure
    .input(updateTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      
      // Verify the template exists
      const existingTemplate = await db.query.templates.findFirst({
        where: eq(templates.id, id),
      });
      
      if (!existingTemplate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }
      
      // Only allow creator or admin to update
      if (existingTemplate.createdBy !== ctx.session.user.id && !ctx.session.user.isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this template",
        });
      }
      
      // Update the template
      const [updatedTemplate] = await db.update(templates)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(templates.id, id))
        .returning();
      
      return updatedTemplate;
    }),

  // Delete template (Admin only - soft delete)
  delete: adminProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const existingTemplate = await db.query.templates.findFirst({
        where: eq(templates.id, input),
      });
      
      if (!existingTemplate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }
      
      // Soft delete by setting isActive to false
      await db.update(templates)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(templates.id, input));
      
      return { success: true };
    }),

  // Get template categories (Public)
  getCategories: publicProcedure.query(async () => {
    const result = await db
      .select({
        category: templates.category,
        count: sql<number>`count(*)::int`,
      })
      .from(templates)
      .where(and(
        eq(templates.isActive, true),
        sql`${templates.category} IS NOT NULL`
      ))
      .groupBy(templates.category)
      .orderBy(desc(sql`count(*)`));
    
    return result;
  }),

  // Track template usage (Protected - when a user adds a template)
  trackUsage: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input, ctx }) => {
      await db.update(templates)
        .set({
          usageCount: sql`${templates.usageCount} + 1`,
        })
        .where(eq(templates.id, input));
      // Also persist usage event for timeframe analytics
      await db.insert(templateUsages).values({
        templateId: input,
        userId: ctx.session.user.id,
      });
      return { success: true };
    }),

  // Get user's created templates (Protected)
  getUserTemplates: protectedProcedure.query(async ({ ctx }) => {
    const userTemplates = await db.query.templates.findMany({
      where: eq(templates.createdBy, ctx.session.user.id),
      orderBy: desc(templates.createdAt),
      with: {
        sourceProject: {
          columns: {
            id: true,
            name: true,
          },
        },
        sourceScene: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    return userTemplates;
  }),
});