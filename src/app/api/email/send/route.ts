import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { render } from '@react-email/render';
import WelcomeEmailTemplate from '~/components/email/WelcomeEmailTemplate';
import NewsletterEmailTemplate from '~/components/email/NewsletterEmailTemplate';

// Resend API configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_BASE_URL = 'https://api.resend.com';

// Email from address - use bazaar.it domain
const FROM_EMAIL = process.env.NODE_ENV === 'production' 
  ? 'Bazaar <create@bazaar.it>'
  : 'Bazaar <create@bazaar.it>';

// Email validation schemas
const welcomeEmailSchema = z.object({
  type: z.literal('welcome'),
  to: z.string().email(),
  firstName: z.string().optional(),
});

const newsletterEmailSchema = z.object({
  type: z.literal('newsletter'),
  to: z.string().email(),
  firstName: z.string().optional(),
  subject: z.string(),
  content: z.string(),
  ctaText: z.string().optional(),
  ctaUrl: z.string().url().optional(),
});

const customEmailSchema = z.object({
  type: z.literal('custom'),
  to: z.string().email(),
  subject: z.string(),
  reactCode: z.string(),
});

const emailSchema = z.discriminatedUnion('type', [
  welcomeEmailSchema,
  newsletterEmailSchema,
  customEmailSchema,
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const emailData = emailSchema.parse(body);

    let emailHtml: string;
    let subject: string;

    switch (emailData.type) {
      case 'welcome':
        emailHtml = await render(WelcomeEmailTemplate({ 
          firstName: emailData.firstName || 'there' 
        }));
        subject = 'Welcome to Bazaar! 🎬';
        break;

      case 'newsletter':
        emailHtml = await render(NewsletterEmailTemplate({
          firstName: emailData.firstName || 'there',
          subject: emailData.subject,
          content: emailData.content,
          ctaText: emailData.ctaText,
          ctaUrl: emailData.ctaUrl,
        }));
        subject = emailData.subject;
        break;

      case 'custom':
        // For custom React code emails, we would need to compile the React code
        // For now, we'll send a plain HTML version with the code as content
        emailHtml = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #3B82F6;">Custom Email</h1>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <pre style="white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 14px;">${emailData.reactCode}</pre>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                This is a custom email generated from React code.
              </p>
            </body>
          </html>
        `;
        subject = emailData.subject;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    // Send email via Resend API
    const response = await fetch(`${RESEND_BASE_URL}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [emailData.to],
        subject,
        html: emailHtml,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', result);
      return NextResponse.json(
        { 
          error: 'Failed to send email',
          details: result.message || 'Unknown error',
          status: response.status 
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      data: result,
    });

  } catch (error) {
    console.error('Email sending error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid email data',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Test endpoint to verify the API is working
export async function GET() {
  return NextResponse.json({ 
    message: 'Email API is working',
    timestamp: new Date().toISOString(),
    fromEmail: FROM_EMAIL,
    environment: process.env.NODE_ENV
  });
} 