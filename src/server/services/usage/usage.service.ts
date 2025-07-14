import { db } from "~/server/db";
import { userUsage, usageLimits, userCredits } from "~/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export class UsageService {
  /**
   * Check if user can use a prompt
   */
  static async checkPromptUsage(userId: string): Promise<{ allowed: boolean; used: number; limit: number; message?: string }> {
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Get daily prompt limit
    const [limitConfig] = await db.select()
      .from(usageLimits)
      .where(eq(usageLimits.limitKey, 'daily_prompts'))
      .limit(1);
    
    const dailyLimit = limitConfig?.freeTierLimit || 20;
    
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
    
    if (currentUsage >= dailyLimit) {
      return {
        allowed: false,
        used: currentUsage,
        limit: dailyLimit,
        message: `Daily limit reached (${dailyLimit} prompts). Buy more prompts to continue.`
      };
    }
    
    return {
      allowed: true,
      used: currentUsage,
      limit: dailyLimit
    };
  }
  
  /**
   * Increment prompt usage
   */
  static async incrementPromptUsage(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
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
  }
  
  /**
   * Get user's prompt usage for today
   */
  static async getTodayPromptUsage(userId: string): Promise<{ used: number; limit: number; remaining: number; purchased: number }> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get limit
    const [limitConfig] = await db.select()
      .from(usageLimits)
      .where(eq(usageLimits.limitKey, 'daily_prompts'))
      .limit(1);
    
    const dailyLimit = limitConfig?.freeTierLimit || 20;
    
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
    
    return {
      used,
      limit: dailyLimit,
      remaining: Math.max(0, dailyLimit - used),
      purchased
    };
  }
}