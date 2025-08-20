import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { iconUsage } from "~/server/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
// Import removed - will use dynamic approach

// Common icon collections for software/developer demos
const DEVELOPER_COLLECTIONS = [
  'mdi', 'fa6-solid', 'fa6-brands', 'simple-icons', 'heroicons', 
  'lucide', 'tabler', 'carbon', 'devicon', 'logos', 'vscode-icons', 
  'octicon', 'codicon', 'bi', 'ri', 'ph'
];

// Build icon suggestions based on query
const buildIconSuggestions = (query: string, limit: number = 50) => {
  const results: string[] = [];
  const q = query.toLowerCase();
  
  // Special handling for common developer terms
  const developerTermMappings: Record<string, string[]> = {
    'github': [
      'mdi:github', 'fa6-brands:github', 'simple-icons:github',
      'octicon:mark-github-16', 'codicon:github', 'devicon:github-original',
      'bi:github', 'tabler:brand-github', 'ri:github-fill'
    ],
    'git': [
      'mdi:git', 'fa6-brands:git-alt', 'simple-icons:git',
      'devicon:git-plain', 'bi:git', 'tabler:brand-git'
    ],
    'code': [
      'mdi:code-tags', 'mdi:code-braces', 'mdi:code-json',
      'fa6-solid:code', 'heroicons:code-bracket', 'bi:code-slash',
      'tabler:code', 'lucide:code', 'carbon:code'
    ],
    'terminal': [
      'mdi:console', 'mdi:terminal', 'fa6-solid:terminal',
      'heroicons:command-line', 'bi:terminal', 'lucide:terminal',
      'tabler:terminal', 'carbon:terminal'
    ],
    'api': [
      'mdi:api', 'mdi:api-off', 'tabler:api', 'carbon:api',
      'simple-icons:fastapi', 'simple-icons:graphql'
    ],
    'database': [
      'mdi:database', 'fa6-solid:database', 'heroicons:circle-stack',
      'bi:database', 'tabler:database', 'lucide:database',
      'simple-icons:postgresql', 'simple-icons:mysql', 'simple-icons:mongodb'
    ],
    'cloud': [
      'mdi:cloud', 'mdi:cloud-upload', 'mdi:cloud-download',
      'fa6-solid:cloud', 'heroicons:cloud', 'bi:cloud',
      'simple-icons:amazonaws', 'simple-icons:googlecloud', 'simple-icons:azure'
    ],
    'docker': [
      'mdi:docker', 'simple-icons:docker', 'devicon:docker-plain',
      'logos:docker-icon', 'fa6-brands:docker'
    ],
    'react': [
      'simple-icons:react', 'devicon:react-original', 'logos:react',
      'tabler:brand-react-native', 'fa6-brands:react'
    ],
    'vue': [
      'simple-icons:vuedotjs', 'devicon:vuejs-plain', 'logos:vue',
      'mdi:vuejs', 'tabler:brand-vue'
    ],
    'apple': [
      'mdi:apple', 'fa6-brands:apple', 'simple-icons:apple',
      'bi:apple', 'tabler:brand-apple', 'lucide:apple'
    ]
  };
  
  // Check if query matches a known term
  if (developerTermMappings[q]) {
    return developerTermMappings[q].slice(0, limit);
  }
  
  // Generate variations for the query
  for (const collection of DEVELOPER_COLLECTIONS) {
    const variations = [
      `${collection}:${q}`,
      `${collection}:${q}-outline`,
      `${collection}:${q}-filled`,
      `${collection}:${q}-solid`,
      `${collection}:brand-${q}`,
      `${collection}:logo-${q}`,
    ];
    
    results.push(...variations);
    if (results.length >= limit * 2) break;
  }
  
  return Array.from(new Set(results)).slice(0, limit);
};

export const iconsRouter = createTRPCRouter({
  // Real-time icon search across all collections  
  searchIcons: publicProcedure
    .input(z.object({
      query: z.string(),
      collection: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const query = input.query.toLowerCase().trim();
      
      // If no query, return popular developer icons
      if (!query) {
        const popularIcons = [
          'mdi:github', 'fa6-brands:github', 'simple-icons:github',
          'mdi:home', 'mdi:settings', 'mdi:account-circle',
          'mdi:search', 'mdi:menu', 'mdi:close', 'mdi:chevron-right',
          'mdi:download', 'mdi:upload', 'mdi:file-code', 'mdi:folder',
          'simple-icons:react', 'simple-icons:nodejs', 'simple-icons:typescript',
          'simple-icons:javascript', 'simple-icons:python', 'simple-icons:docker',
          'mdi:database', 'mdi:api', 'mdi:cloud', 'mdi:git', 'mdi:terminal',
          'bi:github', 'tabler:brand-github', 'octicon:mark-github-16',
          'codicon:github', 'devicon:github-original', 'logos:github-icon',
        ];
        
        return {
          icons: popularIcons.slice(0, input.limit),
          total: popularIcons.length,
          hasMore: false,
        };
      }

      // Get icon suggestions based on query
      const results = buildIconSuggestions(query, input.limit);
      
      // Filter by collection if specified
      let filteredResults = results;
      if (input.collection && input.collection !== 'all') {
        filteredResults = results.filter((icon: string) => icon.startsWith(input.collection + ':'));
      }

      return {
        icons: filteredResults,
        total: filteredResults.length,
        hasMore: false,
      };
    }),

  // Track icon usage
  trackUsage: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid().optional(),
      sceneId: z.string().uuid().optional(),
      iconName: z.string(),
      action: z.enum(["selected", "copied", "inserted", "generated"]),
      source: z.enum(["picker", "chat", "ai_generated"]),
      metadata: z.object({
        searchQuery: z.string().optional(),
        fromRecent: z.boolean().optional(),
        dragDrop: z.boolean().optional(),
        fontSize: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Extract collection from icon name (e.g., "mdi:home" -> "mdi")
      const iconCollection = input.iconName.includes(':') 
        ? input.iconName.split(':')[0]
        : null;

      await ctx.db.insert(iconUsage).values({
        userId: ctx.session.user.id,
        projectId: input.projectId,
        sceneId: input.sceneId,
        iconName: input.iconName,
        iconCollection,
        action: input.action,
        source: input.source,
        metadata: input.metadata,
      });

      return { success: true };
    }),

  // Get popular icons
  getPopularIcons: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      timeframe: z.enum(["24h", "7d", "30d", "all"]).default("7d"),
    }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      let dateFilter;

      switch (input.timeframe) {
        case "24h":
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFilter = null;
      }

      const whereClause = dateFilter 
        ? gte(iconUsage.createdAt, dateFilter)
        : undefined;

      const popularIcons = await ctx.db
        .select({
          iconName: iconUsage.iconName,
          iconCollection: iconUsage.iconCollection,
          usageCount: sql<number>`COUNT(*)`.as('usage_count'),
          uniqueUsers: sql<number>`COUNT(DISTINCT ${iconUsage.userId})`.as('unique_users'),
          copiedCount: sql<number>`COUNT(CASE WHEN ${iconUsage.action} = 'copied' THEN 1 END)`.as('copied_count'),
          insertedCount: sql<number>`COUNT(CASE WHEN ${iconUsage.action} = 'inserted' THEN 1 END)`.as('inserted_count'),
          generatedCount: sql<number>`COUNT(CASE WHEN ${iconUsage.action} = 'generated' THEN 1 END)`.as('generated_count'),
        })
        .from(iconUsage)
        .where(whereClause)
        .groupBy(iconUsage.iconName, iconUsage.iconCollection)
        .orderBy(desc(sql`usage_count`))
        .limit(input.limit);

      return popularIcons;
    }),

  // Get user's recently used icons
  getUserRecentIcons: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const recentIcons = await ctx.db
        .select({
          iconName: iconUsage.iconName,
          iconCollection: iconUsage.iconCollection,
          lastUsed: sql<Date>`MAX(${iconUsage.createdAt})`.as('last_used'),
          usageCount: sql<number>`COUNT(*)`.as('usage_count'),
        })
        .from(iconUsage)
        .where(eq(iconUsage.userId, ctx.session.user.id))
        .groupBy(iconUsage.iconName, iconUsage.iconCollection)
        .orderBy(desc(sql`last_used`))
        .limit(input.limit);

      return recentIcons;
    }),

  // Get icon analytics for admin
  getIconAnalytics: protectedProcedure
    .query(async ({ ctx }) => {
      // Check if user is admin
      const user = await ctx.db.query.users.findFirst({
        where: eq(ctx.db.schema.users.id, ctx.session.user.id),
      });

      if (!user?.isAdmin) {
        throw new Error("Unauthorized - Admin access required");
      }

      // Get overall stats
      const [totalStats] = await ctx.db
        .select({
          totalUsage: sql<number>`COUNT(*)`.as('total_usage'),
          uniqueIcons: sql<number>`COUNT(DISTINCT ${iconUsage.iconName})`.as('unique_icons'),
          uniqueUsers: sql<number>`COUNT(DISTINCT ${iconUsage.userId})`.as('unique_users'),
          uniqueProjects: sql<number>`COUNT(DISTINCT ${iconUsage.projectId})`.as('unique_projects'),
        })
        .from(iconUsage);

      // Get collection breakdown
      const collectionStats = await ctx.db
        .select({
          collection: iconUsage.iconCollection,
          usageCount: sql<number>`COUNT(*)`.as('usage_count'),
          uniqueIcons: sql<number>`COUNT(DISTINCT ${iconUsage.iconName})`.as('unique_icons'),
        })
        .from(iconUsage)
        .groupBy(iconUsage.iconCollection)
        .orderBy(desc(sql`usage_count`))
        .limit(10);

      // Get action breakdown
      const actionStats = await ctx.db
        .select({
          action: iconUsage.action,
          count: sql<number>`COUNT(*)`.as('count'),
        })
        .from(iconUsage)
        .groupBy(iconUsage.action)
        .orderBy(desc(sql`count`));

      // Get source breakdown
      const sourceStats = await ctx.db
        .select({
          source: iconUsage.source,
          count: sql<number>`COUNT(*)`.as('count'),
        })
        .from(iconUsage)
        .groupBy(iconUsage.source)
        .orderBy(desc(sql`count`));

      // Get top 20 most used icons
      const topIcons = await ctx.db
        .select({
          iconName: iconUsage.iconName,
          iconCollection: iconUsage.iconCollection,
          usageCount: sql<number>`COUNT(*)`.as('usage_count'),
          uniqueUsers: sql<number>`COUNT(DISTINCT ${iconUsage.userId})`.as('unique_users'),
        })
        .from(iconUsage)
        .groupBy(iconUsage.iconName, iconUsage.iconCollection)
        .orderBy(desc(sql`usage_count`))
        .limit(20);

      // Get usage over time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const usageOverTime = await ctx.db
        .select({
          date: sql<string>`DATE(${iconUsage.createdAt})`.as('date'),
          count: sql<number>`COUNT(*)`.as('count'),
        })
        .from(iconUsage)
        .where(gte(iconUsage.createdAt, thirtyDaysAgo))
        .groupBy(sql`DATE(${iconUsage.createdAt})`)
        .orderBy(sql`date`);

      return {
        totalStats,
        collectionStats,
        actionStats,
        sourceStats,
        topIcons,
        usageOverTime,
      };
    }),

  // Track multiple icons from generated scene
  trackGeneratedIcons: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      sceneId: z.string().uuid(),
      icons: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.icons.length === 0) return { success: true };

      const iconRecords = input.icons.map(iconName => ({
        userId: ctx.session.user.id,
        projectId: input.projectId,
        sceneId: input.sceneId,
        iconName,
        iconCollection: iconName.includes(':') ? iconName.split(':')[0] : null,
        action: "generated" as const,
        source: "ai_generated" as const,
        metadata: null,
      }));

      await ctx.db.insert(iconUsage).values(iconRecords);

      return { success: true, trackedCount: iconRecords.length };
    }),
});