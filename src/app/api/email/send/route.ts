import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { WelcomeEmailTemplate } from '~/components/email/WelcomeEmailTemplate';
import { NewsletterEmailTemplate } from '~/components/email/NewsletterEmailTemplate';
import { z } from 'zod';

const resend = new Resend(process.env.RESEND_API_KEY || 're_gWkijeDk_HZFELnWcPSAWg7EZRkK4kSJq');

// Input validation schemas
const welcomeEmailSchema = z.object({
  type: z.literal('welcome'),
  to: z.string().email(),
  firstName: z.string(),
});

const newsletterEmailSchema = z.object({
  type: z.literal('newsletter'),
  to: z.union([z.string().email(), z.array(z.string().email())]),
  firstName: z.string(),
  subject: z.string(),
  content: z.string(),
  ctaText: z.string().optional(),
  ctaUrl: z.string().url().optional(),
});

const emailSchema = z.union([welcomeEmailSchema, newsletterEmailSchema]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = emailSchema.parse(body);

    let emailData;

    if (validatedData.type === 'welcome') {
      emailData = {
        from: 'Bazaar-Vid <onboarding@bazaar-vid.com>',
        to: validatedData.to,
        subject: 'Welcome to Bazaar-Vid! 🎉',
        react: WelcomeEmailTemplate({
          firstName: validatedData.firstName,
          userEmail: validatedData.to,
        }),
      };
    } else if (validatedData.type === 'newsletter') {
      const recipients = Array.isArray(validatedData.to) ? validatedData.to : [validatedData.to];
      
      emailData = {
        from: 'Bazaar-Vid <newsletter@bazaar-vid.com>',
        to: recipients,
        subject: validatedData.subject,
        react: NewsletterEmailTemplate({
          firstName: validatedData.firstName,
          userEmail: Array.isArray(validatedData.to) ? validatedData.to[0]! : validatedData.to,
          subject: validatedData.subject,
          content: validatedData.content,
          ctaText: validatedData.ctaText,
          ctaUrl: validatedData.ctaUrl,
        }),
      };
    } else {
      return NextResponse.json(
        { error: 'Invalid email type' },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Email sent successfully' 
    });

  } catch (error) {
    console.error('Email sending error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Test endpoint to verify the API is working
export async function GET() {
  return NextResponse.json({ 
    message: 'Email API is working',
    timestamp: new Date().toISOString()
  });
} 