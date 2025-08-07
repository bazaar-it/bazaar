import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { creditPackages, paywallEvents, promoCodes, promoCodeUsage } from "~/server/db/schema";
import { eq, and, gt, lte, or, isNull, sql } from "drizzle-orm";
import { stripe } from "~/lib/stripe";
import { env } from "~/env";

export const paymentRouter = createTRPCRouter({
  /**
   * Get available prompt packages for purchase
   */
  getPackages: publicProcedure
    .query(async () => {
      const packages = await db.select()
        .from(creditPackages)
        .where(eq(creditPackages.active, true))
        .orderBy(creditPackages.price);
      
      return packages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        promptCount: pkg.credits, // Using 'credits' field from schema
        price: pkg.price,
        description: `${pkg.credits} prompts for your projects`, // Generate description
        popular: pkg.popular, // Use popular field from schema
        pricePerPrompt: Math.round(pkg.price / pkg.credits), // cents per prompt
        savings: pkg.credits > 50 ? Math.round(((500 - (pkg.price / pkg.credits)) / 500) * 100) : 0 // % savings vs $5 pack
      }));
    }),

  /**
   * Create Stripe checkout session
   */
  createCheckout: protectedProcedure
    .input(z.object({
      packageId: z.string(),
      promoCode: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get the package details
      const [pkg] = await db.select()
        .from(creditPackages)
        .where(eq(creditPackages.id, input.packageId))
        .limit(1);

      if (!pkg) {
        throw new Error("Package not found");
      }

      if (!pkg.active) {
        throw new Error("Package is not available");
      }

      let finalPrice = pkg.price;
      let promoId: string | null = null;
      let discountAmount = 0;
      let bonusCredits = 0;

      // Validate and apply promo code if provided
      if (input.promoCode) {
        const now = new Date();
        const [promo] = await db.select()
          .from(promoCodes)
          .where(
            and(
              eq(promoCodes.code, input.promoCode.toUpperCase()),
              lte(promoCodes.validFrom, now),
              or(
                isNull(promoCodes.validUntil),
                gt(promoCodes.validUntil, now)
              )
            )
          )
          .limit(1);

        if (promo && (!promo.maxUses || promo.usesCount < promo.maxUses)) {
          // Check if user hasn't used this code
          const [existingUsage] = await db.select()
            .from(promoCodeUsage)
            .where(
              and(
                eq(promoCodeUsage.promoCodeId, promo.id),
                eq(promoCodeUsage.userId, ctx.session.user.id)
              )
            )
            .limit(1);

          if (!existingUsage) {
            // Apply promo code
            promoId = promo.id;
            
            switch (promo.discountType) {
              case "percentage":
                discountAmount = Math.round(pkg.price * (promo.discountValue / 100));
                finalPrice = pkg.price - discountAmount;
                break;
              case "fixed_amount":
                discountAmount = Math.min(promo.discountValue, pkg.price);
                finalPrice = pkg.price - discountAmount;
                break;
              case "free_credits":
                bonusCredits = promo.discountValue;
                // No price change for free credits
                break;
            }
          }
        }
      }

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: pkg.name,
              description: `${pkg.credits + bonusCredits} prompts for your video projects${
                bonusCredits > 0 ? ` (includes ${bonusCredits} bonus credits!)` : ''
              }`,
            },
            unit_amount: finalPrice, // Price in cents after discount
          },
          quantity: 1,
        }],
        metadata: {
          userId: ctx.session.user.id,
          packageId: input.packageId,
          promptCount: (pkg.credits + bonusCredits).toString(),
          promoCodeId: promoId || '',
          originalPrice: pkg.price.toString(),
          discountAmount: discountAmount.toString(),
          bonusCredits: bonusCredits.toString(),
        },
        success_url: `${process.env.NEXTAUTH_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/purchase/cancelled`,
      });

      return {
        checkoutUrl: session.url!,
        packageName: pkg.name,
        promptCount: pkg.credits,
        price: pkg.price
      };
    }),

  /**
   * Track paywall interaction events
   */
  trackPaywallEvent: protectedProcedure
    .input(z.object({
      eventType: z.enum(['viewed', 'clicked_package', 'initiated_checkout', 'completed_purchase']),
      packageId: z.string().uuid().optional(),
      metadata: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Insert the event
      await db.insert(paywallEvents).values({
        userId: ctx.session.user.id,
        eventType: input.eventType,
        packageId: input.packageId,
        metadata: input.metadata,
      });

      // TODO: Update analytics aggregation (could be done via a cron job for better performance)
      
      return { success: true };
    }),

  /**
   * Validate a promo code
   */
  validatePromoCode: protectedProcedure
    .input(z.object({
      code: z.string().min(1).max(50),
      packageId: z.string().uuid().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const now = new Date();
      
      // Find the promo code
      const [promo] = await db.select()
        .from(promoCodes)
        .where(
          and(
            eq(promoCodes.code, input.code.toUpperCase()),
            lte(promoCodes.validFrom, now),
            or(
              isNull(promoCodes.validUntil),
              gt(promoCodes.validUntil, now)
            )
          )
        )
        .limit(1);

      if (!promo) {
        return { valid: false, error: "Invalid promo code" };
      }

      // Check if max uses reached
      if (promo.maxUses && promo.usesCount >= promo.maxUses) {
        return { valid: false, error: "Promo code has reached its usage limit" };
      }

      // Check if user has already used this code
      const [existingUsage] = await db.select()
        .from(promoCodeUsage)
        .where(
          and(
            eq(promoCodeUsage.promoCodeId, promo.id),
            eq(promoCodeUsage.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (existingUsage) {
        return { valid: false, error: "You have already used this promo code" };
      }

      // Check if code applies to specific packages
      if (promo.applicablePackages && promo.applicablePackages.length > 0 && input.packageId) {
        if (!promo.applicablePackages.includes(input.packageId)) {
          return { valid: false, error: "This promo code doesn't apply to the selected package" };
        }
      }

      // Get package details if packageId provided
      let packagePrice = 0;
      if (input.packageId) {
        const [pkg] = await db.select()
          .from(creditPackages)
          .where(eq(creditPackages.id, input.packageId))
          .limit(1);
        
        if (pkg) {
          packagePrice = pkg.price;
        }
      }

      // Check minimum purchase amount
      if (promo.minPurchaseAmount && packagePrice < promo.minPurchaseAmount) {
        return { 
          valid: false, 
          error: `Minimum purchase of €${(promo.minPurchaseAmount / 100).toFixed(2)} required` 
        };
      }

      // Calculate discount
      let discount = 0;
      let discountDisplay = "";
      
      switch (promo.discountType) {
        case "percentage":
          discount = Math.round(packagePrice * (promo.discountValue / 100));
          discountDisplay = `${promo.discountValue}% off`;
          break;
        case "fixed_amount":
          discount = Math.min(promo.discountValue, packagePrice);
          discountDisplay = `€${(promo.discountValue / 100).toFixed(2)} off`;
          break;
        case "free_credits":
          // Free credits don't reduce price but add bonus credits
          discount = 0;
          discountDisplay = `+${promo.discountValue} free credits`;
          break;
      }

      return {
        valid: true,
        promoId: promo.id,
        code: promo.code,
        description: promo.description,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        discountAmount: discount,
        discountDisplay,
        finalPrice: packagePrice - discount,
      };
    }),
});