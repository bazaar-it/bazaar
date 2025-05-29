//memory-bank/sprints/sprint31/FEATURE-FEEDBACK-BUTTON.md
# User Feedback Collection Feature

## Overview
This document outlines the implementation of an enhanced, persistent, non-intrusive feedback collection mechanism for the Bazaar video generation platform. The feature consists of a floating thumbs-up button in the bottom left corner that expands into a feedback modal. This modal allows users to submit free-text comments, prioritize upcoming features via a checklist, and provide their name (optional for logged-in users), while also giving them visibility into our product roadmap.

## User Experience

### Components
1. **Floating Button**
   - Small, subtle thumbs-up icon button fixed to the bottom left corner
   - Visible across all application pages
   - Semi-transparent until hover (to minimize distraction)
   - Accessible (proper contrast and keyboard navigation)

2. **Feedback Modal**
   - Opens when the floating button is clicked
   - Contains:
     - Brief introduction explaining we value feedback.
     - "Prioritize Features" section with a checklist of potential new features (e.g., GitHub integration, MP4 export, HubSpot Integration).
     - Text area for general user comments and suggestions.
     - Optional "Name" field (pre-filled if user is logged in and name is available).
     - Email field (pre-filled and non-editable if user is logged in; optional for anonymous users).
     - Submit button.
     - Close button/icon.
   - Non-blocking (user can continue using the app without submitting)

### User Flow
1. User notices the thumbs-up button while using the application
2. User clicks the button, opening the feedback modal
3. Modal displays the feature prioritization checklist, roadmap preview, and feedback form.
4. User selects prioritized features, enters their name (optional if logged in), provides free-text feedback, and confirms their email (if anonymous).
5. User clicks submit.
6. System shows confirmation message and closes modal after a brief delay
7. Team receives email notification with the feedback details

## Technical Implementation

### 1. UI Components

Details on UI components like `FeedbackButton.tsx` and `FeedbackModal.tsx` (as partially shown above and implemented previously).

### 2. Backend Setup & Database

- **Database Schema (`src/server/db/schema.ts`)**: 
  - Defined the `feedback` table with fields for `id`, `content`, `name`, `email`, `userId`, `prioritizedFeatures`, `createdAt`, `status`, and `adminNotes`.
  - Established relations for the `feedback` table.
- **tRPC Router (`src/server/api/routers/feedback.ts`)**:
  - Created `feedbackRouter` with a `submit` mutation.
  - Implemented input validation using Zod for the submission payload (`name`, `email`, `content`, `prioritizedFeatures`).
  - The `submit` mutation inserts feedback into the `feedback` table, linking `userId` if a user is logged in.
- **Root Router (`src/server/api/root.ts`)**:
  - Integrated `feedbackRouter` into the main `appRouter`.
- **Client-Side Integration (`FeedbackModal.tsx`)**:
  - Resolved lint errors related to tRPC client types and payload for the `submitFeedbackMutation`.
- **Database Migration**: 
  - The user has confirmed that the database schema, including the `feedback` table, has been successfully applied/pushed to the database environment.

### 3. Email Notifications (Future Step if confirmed)
- Utilize Resend API for sending notifications to designated admin emails upon new feedback submission (details to be fleshed out if pursued).

### 4. Next Steps
- Conduct end-to-end testing of the feedback submission flow from the UI.
- Implement email notifications if required.

#### Floating Button Component
```tsx
// src/components/ui/FeedbackButton.tsx
import { useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import FeedbackModal from './FeedbackModal';

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 flex items-center justify-center w-10 h-10 
                  rounded-full bg-primary/80 hover:bg-primary text-white shadow-lg 
                  transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2"
        aria-label="Provide feedback"
      >
        <ThumbsUp size={16} />
      </button>
      
      {isOpen && <FeedbackModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
```

#### Feedback Modal Component
```tsx
// src/components/ui/FeedbackModal.tsx
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox'; // Assuming you have a Checkbox component
import { Label } from '@/components/ui/label'; // Assuming you have a Label component
import { X } from 'lucide-react';
import { feedbackFeatureOptions } from '@/config/feedbackFeatures'; // Source of truth for features

interface FeedbackModalProps {
  onClose: () => void;
}

export default function FeedbackModal({ onClose }: FeedbackModalProps) {
  const { data: session } = useSession();
  const [name, setName] = useState(session?.user?.name || '');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [feedback, setFeedback] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
    }
  }, [session]);

  const handleFeatureChange = (featureId: string) => {
    setSelectedFeatures(prev => ({ ...prev, [featureId]: !prev[featureId] }));
  };

  const submitFeedbackMutation = api.feedback.submit.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
      setIsSubmitting(false);
      setTimeout(() => {
        onClose();
      }, 2000);
    },
    onError: (error) => {
      console.error('Feedback submission error:', error);
      setIsSubmitting(false);
      // Optionally show an error message to the user
    }
  });

  const handleSubmit = () => {
    if (!feedback.trim() && Object.values(selectedFeatures).every(v => !v)) return; // Require either text or a feature selection

    setIsSubmitting(true);
    const prioritized = Object.entries(selectedFeatures)
      .filter(([,isSelected]) => isSelected)
      .map(([featureId]) => featureId);

    submitFeedbackMutation.mutate({
      content: feedback,
      name: name || undefined,
      email: email || undefined, // Email is pre-filled for logged-in users
      userId: session?.user?.id,
      prioritizedFeatures: prioritized,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg p-6 bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          aria-label="Close feedback form"
        >
          <X size={20} />
        </button>

        {isSubmitted ? (
          <div className="text-center py-10">
            <h3 className="text-xl font-semibold text-green-600">Thank you for your feedback!</h3>
            <p className="mt-2 text-gray-600">Your input helps us improve Bazaar.</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">We'd Love Your Feedback</h2>

            <div className="mb-6 p-4 bg-sky-50 border border-sky-200 rounded-md">
              <h3 className="text-md font-medium text-sky-800">Help us prioritize!</h3>
              <p className="text-sm text-sky-700 mb-3">What features are most important to you?</p>
              <div className="space-y-2">
                {feedbackFeatureOptions.map((feature) => (
                  <div key={feature.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`feature-${feature.id}`} 
                      checked={selectedFeatures[feature.id] || false} 
                      onCheckedChange={() => handleFeatureChange(feature.id)}
                    />
                    <Label htmlFor={`feature-${feature.id}`} className="text-sm font-normal text-gray-700">
                      {feature.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name (Optional)
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={session?.user?.name ? '' : "Your Name"}
                  className="mt-1 block w-full"
                  disabled={!!session?.user?.name} // Can be enabled if user wants to override
                />
              </div>

              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email {session?.user ? '' : '(Optional)'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={session?.user?.email ? '' : "your@email.com"}
                  className="mt-1 block w-full"
                  disabled={!!session?.user?.email}
                />
              </div>

              <div>
                <Label htmlFor="feedback" className="block text-sm font-medium text-gray-700">
                  Additional Comments
                </Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share your thoughts, other feature requests, or report issues..."
                  className="mt-1 block w-full"
                  rows={4}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || (!feedback.trim() && Object.values(selectedFeatures).every(v => !v))}
                className="w-full bg-primary hover:bg-primary-dark text-white py-2.5"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

### 2. Database Schema

Add a new `feedback` table to store user submissions:

```typescript
// src/server/db/schema.ts
import { text, timestamp, pgTable } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const feedback = pgTable('feedback', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  content: text('content').notNull(), // For free-text comments
  name: text('name'), // Optional name provided by user
  email: text('email'), // Optional for anonymous, pre-filled for logged-in
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  prioritizedFeatures: jsonb('prioritized_features').$type<string[]>(), // Array of selected feature IDs/names
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  status: text('status').default('new').notNull(), // e.g., 'new', 'reviewed', 'planned', 'implemented', 'archived'
  adminNotes: text('admin_notes'), // For internal team notes
});
```

### 3. tRPC API Endpoint

Create a feedback API endpoint to handle submissions:

```typescript
// src/server/api/routers/feedback.ts
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { feedback } from '@/server/db/schema';
import { sendFeedbackNotificationEmail } from '@/server/utils/email';

export const feedbackRouter = createTRPCRouter({
  submit: publicProcedure
    .input(z.object({
      content: z.string().max(5000).optional(), // Optional if features are prioritized
      name: z.string().max(100).optional(),
      email: z.string().email().optional(),
      userId: z.string().optional(),
      prioritizedFeatures: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.content && (!input.prioritizedFeatures || input.prioritizedFeatures.length === 0)) {
        throw new Error('Either feedback content or prioritized features must be provided.');
      }

      const result = await ctx.db.insert(feedback).values({
        content: input.content || '', // Ensure content is at least an empty string if not provided
        name: input.name,
        email: input.email,
        userId: input.userId,
        prioritizedFeatures: input.prioritizedFeatures,
      }).returning();
      
      await sendFeedbackNotificationEmail({
        feedbackId: result[0].id,
        content: input.content || 'N/A',
        name: input.name,
        email: input.email,
        userId: input.userId,
        prioritizedFeatures: input.prioritizedFeatures,
      });
      
      return { success: true, feedbackId: result[0].id };
    }),
});

// Add to your main router
// src/server/api/root.ts
export const appRouter = createTRPCRouter({
  // ...other routers
  feedback: feedbackRouter,
});
```

### 4. Email Notification System

Create a utility for sending email notifications when feedback is submitted:

```typescript
// src/server/utils/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface FeedbackEmailProps {
  feedbackId: string;
  content: string;
  name?: string;
  email?: string;
  userId?: string;
  prioritizedFeatures?: string[];
}

export async function sendFeedbackNotificationEmail({
  feedbackId,
  content,
  name,
  email,
  userId,
  prioritizedFeatures,
}: FeedbackEmailProps) {
  const adminEmails = (process.env.FEEDBACK_NOTIFICATION_EMAILS || '').split(',');
  
  if (!adminEmails.length) {
    console.warn('No admin emails configured for feedback notifications');
    return;
  }
  
  let userInfo = 'From: Anonymous user';
  if (name && email) {
    userInfo = `From: ${name} (${email})`;
  } else if (name) {
    userInfo = `From: ${name}`;
  } else if (email) {
    userInfo = `From: ${email}`;
  }
  if (userId) {
    userInfo += ` (User ID: ${userId})`;
  }

  const prioritizedFeaturesText = prioritizedFeatures && prioritizedFeatures.length > 0
    ? `<li><strong>Prioritized Features:</strong> ${prioritizedFeatures.join(', ')}</li>`
    : '';
  
  const feedbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/feedback/${feedbackId}`;
  
  await resend.emails.send({
    from: 'Bazaar Feedback <feedback@bazaar.it>',
    to: adminEmails,
    subject: 'New Feedback Received on Bazaar',
    html: `
      <h2>New Feedback Received</h2>
      <p><strong>Feedback ID:</strong> ${feedbackId}</p>
      <p><strong>${userInfo}</strong></p>
      <ul>
        ${prioritizedFeaturesText}
        <li><strong>Feedback Content:</strong>
          <div style="white-space: pre-wrap; background: #f7f7f7; padding: 15px; border-radius: 5px; margin-top: 5px;">${content}</div>
        </li>
      </ul>
      <p style="margin-top: 20px;"><a href="${feedbackUrl}" style="background: #0070f3; color: white; padding: 10px 15px; border-radius: 5px; text-decoration: none;">View in Admin Panel</a></p>
    `,
  });
}
```

### 5. Application Integration

#### Add the feedback button to the main layout:

```tsx
// src/app/layout.tsx
import FeedbackButton from '@/components/ui/FeedbackButton';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <FeedbackButton />
      </body>
    </html>
  );
}
```

### 6. Configuration for Feature Checklist

Create a configuration file for the list of features that users can prioritize. This allows easy updates to the checklist without code deployment if managed via a CMS or simple config update.

```typescript
// src/config/feedbackFeatures.ts
export interface FeedbackFeatureOption {
  id: string;
  label: string;
  description?: string; // Optional: for tooltips or more info
}

export const feedbackFeatureOptions: FeedbackFeatureOption[] = [
  { id: 'github_integration', label: 'GitHub Integration (better code analysis)' },
  { id: 'mp4_export', label: 'MP4 Export Functionality' },
  { id: 'image_upload', label: 'Image Upload and Rendering' },
  { id: 'animation_templates', label: 'Enhanced Animation Templates' },
  { id: 'hubspot_integration', label: 'HubSpot Integration' },
  // Add more features here as they become relevant for feedback
];
```

### 7. Environment Variables

Add the following environment variables:

```
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxx
FEEDBACK_NOTIFICATION_EMAILS=admin@bazaar.it,product@bazaar.it
NEXT_PUBLIC_APP_URL=http://localhost:3000 # Or your production URL
```

## Implementation Considerations

### Simplicity and Maintainability
The proposed solution balances simplicity with functionality:
- Stateless UI components using React hooks
- Type-safe database interactions via Drizzle ORM
- Secure email handling through Resend API
- Clear separation of concerns (UI, API, database, email)

### Privacy and Security
- Only collect necessary data (feedback content, optional email)
- Validate inputs with Zod schema
- Use environment variables for sensitive configuration
- Allow anonymous feedback while supporting authenticated user tracking

### Performance Impact
- Minimal bundle size impact (small, targeted components)
- Modal loads lazily only when feedback button is clicked
- No impact on initial page load performance
- Email sent asynchronously to prevent blocking

### Email Notification Reliability
The system uses [Resend](https://resend.com/) for reliable email delivery, which provides:
- Delivery tracking and analytics
- High deliverability rates
- Simple API integration
- Low monthly costs for typical feedback volumes

## Viewing and Analyzing Feedback

### Source of Truth
- The `feedback` table in your PostgreSQL database is the primary source of truth for all submitted feedback, including free-text comments, user details (if provided), and prioritized features.

### Retrieval and Analysis
- **Admin Dashboard**: To effectively manage and analyze feedback, an admin dashboard or a dedicated section within your existing admin panel is recommended. This dashboard could allow:
    - Viewing all feedback entries, sortable and filterable by date, status, user, etc.
    - Seeing counts and trends for prioritized features (e.g., "GitHub Integration was prioritized by X users this month").
    - Updating the status of feedback items (e.g., 'new', 'reviewed', 'planned', 'implemented').
    - Adding internal notes to feedback items.
- **Direct Database Queries**: For ad-hoc analysis, you can run SQL queries directly against the `feedback` table.
  ```sql
  -- Example: Count how many times each feature was prioritized
  SELECT feature, COUNT(*) as priority_count
  FROM feedback, unnest(prioritized_features) AS feature
  GROUP BY feature
  ORDER BY priority_count DESC;
  ```
- **Email Summaries**: While individual emails provide immediate notification, consider setting up a weekly/monthly digest email summarizing feedback trends, possibly generated by a scheduled script or service that queries the database.

## Alternative Approaches Considered

### 1. Third-Party Feedback Widgets
**Pros**: Quick to implement, extensive features
**Cons**: External dependency, potential privacy concerns, less customizable, monthly costs

### 2. Simple Form Without Database
**Pros**: Extremely simple imπplementation
**Cons**: No record keeping, limited analytics, cannot track resolution status

### 3. Slack/Discord Integration
**Pros**: Real-time team notifications
**Cons**: Less structured data, harder to track/resolve, depends on team tools

## Implementation Effort

- **UI Components**: 1.5 days (floating button, enhanced modal with checklist, form logic)
- **Database Schema**: 0.5 day (feedback table update, migrations)
- **Feature Checklist Config**: 0.5 day (setup config file/simple backend for features)
- **tRPC Endpoint**: 1 day (updated mutation, validation for new fields)
- **Email Integration**: 0.5 day (update email template and sending logic)
- **Testing & Refinement**: 1 day
- **Total Effort**: Approximately 5 days

## Next Steps

1. **Design Review**: Review UI mockups with the design team
2. **Database Migration**: Add the feedback table to the schema
3. **Email Template Design**: Finalize the email notification template
4. **Implementation**: Develop components, API, and email functionality
5. **Testing**: Verify form submission, database storage, and email notifications
6. **Analytics**: Consider adding feedback analytics to the admin panel

## Conclusion

This enhanced feedback collection feature provides a more structured and insightful way to gather user input, including prioritization of specific features, while still showcasing the product roadmap. The implementation follows Bazaar's architectural patterns, maintains type safety, and delivers a polished user experience. The asynchronous email notifications, now richer with prioritized feature data, ensure the team stays informed. Managing the feature checklist via a configuration file offers flexibility for future updates. An admin interface would be the next logical step for effectively analyzing this richer feedback data.

*Document created on 2025-05-29 as part of Sprint 31 planning for Bazaar video generation system enhancements.*
