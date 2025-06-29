# Resend Email Integration

## Overview
The Bazaar-Vid admin dashboard now includes email marketing functionality powered by [Resend](https://resend.com), a modern email API for developers.

## Features
- **Welcome Emails**: Automated welcome emails for new users
- **Newsletter Campaigns**: Customizable newsletters with rich content
- **User Targeting**: Send to all users or select specific recipients
- **Email Templates**: Professional, responsive email templates
- **Admin Dashboard**: Complete email management interface

## API Integration

### Authentication
The system uses the Resend API key for authentication:
```
Authorization: Bearer re_gWkijeDk_HZFELnWcPSAWg7EZRkK4kSJq
```

### Base URL
All requests are made to: `https://api.resend.com`

## Email Templates

### 1. Welcome Email Template
**File**: `src/components/email/WelcomeEmailTemplate.tsx`
- Personalized greeting with user's first name
- Platform introduction and feature highlights
- Call-to-action button linking to the app
- Professional Bazaar-Vid branding

### 2. Newsletter Template
**File**: `src/components/email/NewsletterEmailTemplate.tsx`
- Customizable subject line and content
- Feature highlights section
- Optional call-to-action with custom text and URL
- Social media links
- Unsubscribe options

## API Routes

### Email Sending API
**Endpoint**: `/api/email/send`
**Method**: POST

**Request Body**:
```typescript
// Welcome Email
{
  type: 'welcome',
  to: 'user@example.com',
  firstName: 'John'
}

// Newsletter
{
  type: 'newsletter',
  to: ['user1@example.com', 'user2@example.com'],
  firstName: 'John',
  subject: 'Latest Updates from Bazaar-Vid',
  content: 'Your newsletter content here...',
  ctaText: 'Get Started', // optional
  ctaUrl: 'https://bazaar-vid.com' // optional
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    id: 'email_id_from_resend'
  },
  message: 'Email sent successfully'
}
```

## Admin Dashboard Integration

### tRPC Endpoints

#### `api.admin.sendWelcomeEmail`
**Type**: `adminOnlyProcedure.mutation()`
**Input**: `{ userId: string }`
**Description**: Send welcome email to a specific user

#### `api.admin.sendNewsletter`
**Type**: `adminOnlyProcedure.mutation()`
**Input**: 
```typescript
{
  userIds?: string[],
  sendToAll?: boolean,
  subject: string,
  content: string,
  ctaText?: string,
  ctaUrl?: string
}
```
**Description**: Send newsletter to selected users or all users

#### `api.admin.getEmailStats`
**Type**: `adminOnlyProcedure.query()`
**Description**: Get email marketing statistics and metrics

### Admin UI Features

#### Email Marketing Dashboard
**Route**: `/admin/email-marketing`

**Features**:
- Email statistics dashboard with key metrics
- Newsletter campaign creation with rich editor
- User selection interface for targeted campaigns
- Welcome email sending for specific users
- Email template previews

**Statistics Displayed**:
- Total users available for email campaigns
- Recent users (last 30 days)
- Emails sent today
- Email open rates (placeholder for future implementation)

## Email Statistics

### Current Metrics
- **Total Users**: Count of all registered users
- **Recent Users**: Users who signed up in the last 30 days
- **Emails Sent**: Daily and monthly email counts (TODO: implement tracking)
- **Engagement**: Open rates and click rates (TODO: implement tracking)

### Future Enhancements
- Email delivery tracking
- Open rate analytics
- Click-through rate monitoring
- Bounce rate tracking
- Unsubscribe management

## Security & Access Control

### Admin-Only Access
All email marketing features are restricted to admin users:
- `adminOnlyProcedure` middleware ensures only admins can access endpoints
- Admin dashboard UI checks user permissions
- Proper error handling for unauthorized access

### Rate Limiting
Resend provides built-in rate limiting:
- Standard HTTP status codes (429 for rate limit exceeded)
- Proper error handling in the API routes

## Error Handling

### API Error Responses
```typescript
// Validation Error
{
  error: 'Invalid request data',
  details: [/* Zod validation errors */]
}

// Resend API Error
{
  error: 'Failed to send email',
  details: {/* Resend error details */}
}

// Server Error
{
  error: 'Internal server error'
}
```

### Status Codes
- `200`: Successful email send
- `400`: Invalid request data or Resend API error
- `401`: Missing API key
- `403`: Invalid API key
- `404`: Resource not found
- `429`: Rate limit exceeded
- `500`: Internal server error

## Installation & Setup

### 1. Install Resend Package
```bash
npm install resend
```

### 2. Environment Variables
Add to your environment configuration:
```
RESEND_API_KEY=re_gWkijeDk_HZFELnWcPSAWg7EZRkK4kSJq
```

### 3. Admin Navigation
The email marketing tab is automatically added to the admin sidebar navigation.

## Files Created/Modified

### New Files
- `src/components/email/WelcomeEmailTemplate.tsx` - Welcome email template
- `src/components/email/NewsletterEmailTemplate.tsx` - Newsletter template
- `src/app/api/email/send/route.ts` - Email sending API route
- `src/app/admin/email-marketing/page.tsx` - Admin email marketing dashboard

### Modified Files
- `src/server/api/routers/admin.ts` - Added email marketing endpoints
- `src/components/AdminSidebar.tsx` - Added email marketing navigation

## Usage Examples

### Send Welcome Email
```typescript
// From admin dashboard
const result = await api.admin.sendWelcomeEmail.mutate({
  userId: 'user_123'
});
```

### Send Newsletter Campaign
```typescript
// Send to all users
const result = await api.admin.sendNewsletter.mutate({
  sendToAll: true,
  subject: 'New Features in Bazaar-Vid!',
  content: 'Check out our latest updates...',
  ctaText: 'Explore Now',
  ctaUrl: 'https://bazaar-vid.com/features'
});

// Send to specific users
const result = await api.admin.sendNewsletter.mutate({
  userIds: ['user_1', 'user_2', 'user_3'],
  subject: 'Personal Update',
  content: 'Special message for selected users...'
});
```

## Best Practices

### Email Content
- Keep subject lines under 50 characters
- Use clear, actionable call-to-action buttons
- Ensure content is mobile-responsive
- Include unsubscribe options for newsletters

### User Experience
- Confirm email sends with success messages
- Show progress indicators for bulk operations
- Provide clear error messages for failures
- Allow preview of email templates

### Performance
- Use batch operations for large user lists
- Implement proper error handling and retries
- Monitor email delivery rates
- Cache user lists for better performance

## Monitoring & Analytics

### Current Implementation
- Basic email statistics in admin dashboard
- Success/failure tracking for individual sends
- User count metrics for targeting

### Future Enhancements
- Integration with Resend webhooks for delivery tracking
- Email engagement analytics dashboard
- A/B testing for email campaigns
- Automated email sequences
- Segmentation and targeting improvements 