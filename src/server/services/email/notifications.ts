// src/server/services/email/notifications.ts
import type { User } from "next-auth";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_BASE_URL = 'https://api.resend.com';
const FROM_EMAIL = 'Bazaar <notifications@bazaar.it>';
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'jack@bazaar.it';

/**
 * Send email notification to admin when a new user signs up
 */
export async function sendNewUserNotification(user: User, provider?: string) {
  // Skip if no Resend API key
  if (!RESEND_API_KEY) {
    console.log('[Email] Skipping new user notification - no RESEND_API_KEY');
    return;
  }

  try {
    const signupDate = new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a; margin-bottom: 24px;">🎉 New Bazaar User Signup!</h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 8px 0;"><strong>Name:</strong> ${user.name || 'Not provided'}</p>
          <p style="margin: 8px 0;"><strong>Email:</strong> ${user.email || 'Not provided'}</p>
          <p style="margin: 8px 0;"><strong>User ID:</strong> ${user.id}</p>
          <p style="margin: 8px 0;"><strong>Provider:</strong> ${provider || 'Unknown'}</p>
          <p style="margin: 8px 0;"><strong>Signed up:</strong> ${signupDate} PST</p>
        </div>

        <div style="padding: 20px 0; border-top: 1px solid #e5e5e5;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            Total users can be viewed in the <a href="https://bazaar.it/admin/users" style="color: #ec4899;">admin dashboard</a>
          </p>
        </div>
      </div>
    `;

    const response = await fetch(`${RESEND_BASE_URL}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `🎉 New Bazaar User: ${user.name || user.email || 'Unknown'}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Email] Failed to send new user notification:', error);
    } else {
      console.log(`[Email] New user notification sent to ${ADMIN_EMAIL} for ${user.email}`);
    }
  } catch (error) {
    // Don't throw - we don't want to break signup flow
    console.error('[Email] Error sending new user notification:', error);
  }
}