// src/server/api/routers/emailSubscriber.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { emailSubscribers } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const emailSubscriberInputSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address"
  }),
  source: z.string().default('homepage'),
});

export const emailSubscriberRouter = createTRPCRouter({
  subscribe: publicProcedure
    .input(emailSubscriberInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if email already exists using direct query
        const existingSubscriber = await db
          .select()
          .from(emailSubscribers)
          .where(eq(emailSubscribers.email, input.email))
          .limit(1);

        if (existingSubscriber.length > 0) {
          // Email already exists
          const subscriber = existingSubscriber[0];
          if (subscriber?.status === 'active') {
            throw new Error('Email address already signed up for updates');
          } else if (subscriber?.status === 'unsubscribed') {
            // Reactivate subscription
            await db
              .update(emailSubscribers)
              .set({ 
                status: 'active',
                subscribedAt: new Date(),
                source: input.source,
                userId: ctx.session?.user?.id || null
              })
              .where(eq(emailSubscribers.email, input.email));
            
            return { 
              success: true, 
              message: 'Successfully resubscribed to updates!',
              isResubscription: true 
            };
          }
        }

        // Create new subscription
        const newSubscriber = await db
          .insert(emailSubscribers)
          .values({
            email: input.email,
            source: input.source,
            status: 'active',
            userId: ctx.session?.user?.id || null,
          })
          .returning();

        console.log('Email subscription created:', newSubscriber[0]?.id);

        return { 
          success: true, 
          message: 'Successfully subscribed to updates!',
          isResubscription: false 
        };
      } catch (error) {
        console.error('Email subscription error:', error);
        
        // Handle specific error messages
        if (error instanceof Error) {
          if (error.message.includes('already signed up')) {
            throw new Error('Email address already signed up for updates');
          }
          if (error.message.includes('unique constraint')) {
            throw new Error('Email address already signed up for updates');
          }
        }
        
        throw new Error('Failed to subscribe. Please try again later.');
      }
    }),
}); 