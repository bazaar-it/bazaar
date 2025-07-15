import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { creditPackages } from "~/server/db/schema";
import { eq } from "drizzle-orm";
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

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: pkg.name,
              description: `${pkg.credits} prompts for your video projects`,
            },
            unit_amount: pkg.price, // Price in cents
          },
          quantity: 1,
        }],
        metadata: {
          userId: ctx.session.user.id,
          packageId: input.packageId,
          promptCount: pkg.credits.toString(),
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
});