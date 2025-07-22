import { db } from "~/server/db";
import { userUsage, usageLimits, userCredits, users } from "~/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getUserLocalDate } from "~/lib/utils/timezone";

export class UsageService {
  /**
   * Check if user can use a prompt
   * @param userId - User ID
   * @param userTimezone - User's timezone (passed from client)
   */
  static async checkPromptUsage(userId: string, userTimezone: string = "UTC"): Promise<{ allowed: boolean; used: number; limit: number; message?: string; purchasedCredits?: number }> {
    // Check if user is admin first
    const [user] = await db.select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    // Admins have unlimited prompts
    if (user?.isAdmin) {
      return {
        allowed: true,
        used: 0,
        limit: 999999, // Show a high number for UI purposes
        message: "Admin - Unlimited prompts"
      };
    }
    
    // Get today's date in user's timezone
    const today = getUserLocalDate(userTimezone);
    
    // Get daily prompt limit (changing default to 5 free daily prompts)
    const [limitConfig] = await db.select()
      .from(usageLimits)
      .where(eq(usageLimits.limitKey, 'daily_prompts'))
      .limit(1);
    
    const dailyLimit = limitConfig?.freeTierLimit || 5; // Changed from 20 to 5
    
    // Get current usage
    const [usage] = await db.select()
      .from(userUsage)
      .where(and(
        eq(userUsage.userId, userId),
        eq(userUsage.date, today),
        eq(userUsage.usageType, 'prompts')
      ))
      .limit(1);
    
    const currentUsage = usage?.count || 0;
    
    // Get purchased credits
    const [credits] = await db.select({
      purchasedCredits: userCredits.purchasedCredits
    })
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1);
    
    const purchasedCredits = credits?.purchasedCredits || 0;
    
    // Check if user has available prompts (either daily or purchased)
    if (currentUsage >= dailyLimit && purchasedCredits <= 0) {
      return {
        allowed: false,
        used: currentUsage,
        limit: dailyLimit,
        purchasedCredits,
        message: `Daily limit reached (${dailyLimit} free prompts) and no purchased prompts available. Buy more prompts to continue.`
      };
    }
    
    return {
      allowed: true,
      used: currentUsage,
      limit: dailyLimit,
      purchasedCredits
    };
  }
  
  /**
   * Increment prompt usage
   * @param userId - User ID
   * @param userTimezone - User's timezone (passed from client)
   */
  static async incrementPromptUsage(userId: string, userTimezone: string = "UTC"): Promise<void> {
    // Check if user is admin first
    const [user] = await db.select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    const isAdmin = user?.isAdmin || false;
    
    const today = getUserLocalDate(userTimezone);
    
    // Get daily limit
    const [limitConfig] = await db.select()
      .from(usageLimits)
      .where(eq(usageLimits.limitKey, 'daily_prompts'))
      .limit(1);
    
    const dailyLimit = limitConfig?.freeTierLimit || 5;
    
    // Get current daily usage
    const [usage] = await db.select()
      .from(userUsage)
      .where(and(
        eq(userUsage.userId, userId),
        eq(userUsage.date, today),
        eq(userUsage.usageType, 'prompts')
      ))
      .limit(1);
    
    const currentUsage = usage?.count || 0;
    
    // Always track usage (including for admins)
    await db.insert(userUsage)
      .values({
        userId,
        date: today,
        usageType: 'prompts',
        count: 1
      })
      .onConflictDoUpdate({
        target: [userUsage.userId, userUsage.date, userUsage.usageType],
        set: {
          count: sql`${userUsage.count} + 1`,
          updatedAt: new Date()
        }
      });
    
    // Handle credit deduction for ALL users (including admins)
    // Admins have unlimited access but still consume their purchased credits
    // If beyond daily limit, deduct from purchased credits
    if (currentUsage >= dailyLimit) {
      await db.update(userCredits)
        .set({
          purchasedCredits: sql`${userCredits.purchasedCredits} - 1`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(userCredits.userId, userId),
          sql`${userCredits.purchasedCredits} > 0`
        ));
    }
  }
  
  /**
   * Get user's prompt usage for today
   * @param userId - User ID
   * @param userTimezone - User's timezone (passed from client)
   */
  static async getTodayPromptUsage(userId: string, userTimezone: string = "UTC"): Promise<{ used: number; limit: number; remaining: number; purchased: number; isAdmin?: boolean }> {
    // Check if user is admin first
    const [user] = await db.select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    const isAdmin = user?.isAdmin || false;
    
    const today = getUserLocalDate(userTimezone);
    
    // Get limit
    const [limitConfig] = await db.select()
      .from(usageLimits)
      .where(eq(usageLimits.limitKey, 'daily_prompts'))
      .limit(1);
    
    const dailyLimit = limitConfig?.freeTierLimit || 5;
    
    // Get usage
    const [usage] = await db.select()
      .from(userUsage)
      .where(and(
        eq(userUsage.userId, userId),
        eq(userUsage.date, today),
        eq(userUsage.usageType, 'prompts')
      ))
      .limit(1);
    
    const used = usage?.count || 0;
    
    // Get purchased credits (which represent purchased prompts)
    const [credits] = await db.select({
      purchasedCredits: userCredits.purchasedCredits
    })
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1);
    
    const purchased = credits?.purchasedCredits || 0;
    
    // For admins, show unlimited limit but real usage
    if (isAdmin) {
      return {
        used,
        limit: 999999,
        remaining: 999999,
        purchased,
        isAdmin: true
      };
    }
    
    return {
      used,
      limit: dailyLimit,
      remaining: Math.max(0, dailyLimit - used),
      purchased,
      isAdmin: false
    };
  }
}