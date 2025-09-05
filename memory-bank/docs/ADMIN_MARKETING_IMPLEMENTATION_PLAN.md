# 📊 Admin Marketing Panel - Implementation Plan

## Overview
Create a comprehensive marketing and user management interface within the admin panel that allows filtering users, selecting groups, and executing bulk actions like sending emails and giving credits.

---

## 🎯 Core Features

### 1. User Browse & Filter System
- Advanced filtering with multiple criteria
- Real-time search and filter updates
- Saved filter presets
- Export filtered results

### 2. Dynamic Email Campaigns
- Template-based emails with variables
- Preview before sending
- Schedule sending
- Track open rates and clicks

### 3. Bulk Actions
- Give/remove credits
- Send emails
- Add tags/labels
- Export user data
- Account modifications

---

## 📐 Architecture Design

### Frontend Structure
```
/admin/marketing/
├── page.tsx                 # Main marketing dashboard
├── users/
│   ├── page.tsx            # User browser with filters
│   └── [id]/page.tsx       # Individual user details
├── campaigns/
│   ├── page.tsx            # Email campaigns list
│   ├── new/page.tsx        # Create new campaign
│   └── [id]/page.tsx       # Campaign details & analytics
├── templates/
│   ├── page.tsx            # Email templates
│   └── editor/page.tsx     # Template editor
└── analytics/
    └── page.tsx            # Marketing analytics
```

### Backend Structure
```
/src/server/api/routers/
├── adminMarketing.ts       # Main marketing router
├── userFilters.ts          # User filtering logic
├── emailCampaigns.ts       # Campaign management
└── bulkActions.ts          # Bulk operation handlers

/src/server/services/
├── marketing/
│   ├── userSegmentation.ts
│   ├── emailBuilder.ts
│   ├── campaignScheduler.ts
│   └── analyticsTracker.ts
```

---

## 🔍 Filter System Design

### Available Filters

#### User Activity
- **Last Active**: Today, This Week, This Month, Custom Range
- **Login Frequency**: Daily, Weekly, Monthly, Inactive
- **Session Count**: Range selector
- **Total Time Spent**: Range selector

#### Project & Creation
- **Project Count**: Equal to, Greater than, Less than, Range
- **Last Project Created**: Date range
- **Total Scenes Created**: Number range
- **Export Count**: Number range
- **Templates Used**: Specific templates

#### Credits & Usage
- **Current Credit Balance**: Range
- **Lifetime Credits Used**: Range
- **Purchased Credits**: Yes/No, Amount range
- **Daily Credits Used**: Average per day

#### Account Information
- **Registration Date**: Date range
- **Email Domain**: Specific domains (gmail, company, etc)
- **Account Type**: Free, Pro, Enterprise
- **Email Verified**: Yes/No
- **Country/Region**: Geographic filtering

#### Engagement
- **Feature Usage**: Specific features used
- **Integration Connected**: GitHub, Figma, etc
- **Feedback Submitted**: Yes/No
- **Support Tickets**: Count range

### Filter UI Components

```tsx
interface FilterConfig {
  id: string;
  label: string;
  type: 'date' | 'number' | 'select' | 'multiselect' | 'boolean' | 'text';
  operators: ('equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in')[];
  options?: { value: string; label: string }[];
}

const filterConfigs: FilterConfig[] = [
  {
    id: 'lastActive',
    label: 'Last Active',
    type: 'date',
    operators: ['between', 'gt', 'lt']
  },
  {
    id: 'projectCount',
    label: 'Project Count',
    type: 'number',
    operators: ['equals', 'gt', 'lt', 'between']
  },
  // ... more filters
];
```

---

## 📧 Dynamic Email System

### Email Template Variables

```typescript
interface EmailVariables {
  // User Info
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  
  // Account Stats
  projectCount: number;
  creditBalance: number;
  daysSinceSignup: number;
  lastActiveDate: string;
  
  // Custom Variables
  customMessage?: string;
  promoCode?: string;
  creditAmount?: number;
  expiryDate?: string;
}
```

### Email Template Editor

```tsx
// Template with variables
const emailTemplate = `
Hi {{firstName}},

We noticed you've created {{projectCount}} amazing projects!

As a thank you, we're giving you {{creditAmount}} free credits.
Your new balance is {{creditBalance}} credits.

Use code: {{promoCode}} for an extra bonus!

{{customMessage}}

Best,
The Bazaar Team
`;
```

### Email Campaign Types

1. **Instant Send**: Send immediately to selected users
2. **Scheduled**: Set date/time for sending
3. **Drip Campaign**: Series of emails over time
4. **Triggered**: Based on user actions
5. **A/B Testing**: Test different versions

---

## 🎬 Bulk Actions System

### Available Actions

```typescript
enum BulkActionType {
  // Credits
  GIVE_CREDITS = 'give_credits',
  SET_CREDITS = 'set_credits',
  RESET_DAILY_CREDITS = 'reset_daily_credits',
  
  // Email
  SEND_EMAIL = 'send_email',
  ADD_TO_CAMPAIGN = 'add_to_campaign',
  
  // Account
  ADD_TAG = 'add_tag',
  REMOVE_TAG = 'remove_tag',
  CHANGE_PLAN = 'change_plan',
  
  // Export
  EXPORT_CSV = 'export_csv',
  EXPORT_JSON = 'export_json',
  
  // Moderation
  SUSPEND_ACCOUNT = 'suspend_account',
  DELETE_PROJECTS = 'delete_projects',
}

interface BulkAction {
  type: BulkActionType;
  params: Record<string, any>;
  userIds: string[];
  scheduledAt?: Date;
  requiresConfirmation: boolean;
}
```

### Action Confirmation Modal

```tsx
interface ActionConfirmation {
  action: string;
  affectedUsers: number;
  summary: string;
  warnings?: string[];
  estimatedTime?: string;
}

// Example
{
  action: "Give 30 credits",
  affectedUsers: 47,
  summary: "This will add 30 credits to 47 users' accounts",
  warnings: ["This action cannot be undone"],
  estimatedTime: "~5 seconds"
}
```

---

## 🖥️ UI/UX Design

### Main Marketing Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  Admin > Marketing                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │
│  │ Total Users │ │ Active Today│ │ Credits Given│     │
│  │    1,247    │ │     342     │ │   15,420    │     │
│  └─────────────┘ └─────────────┘ └─────────────┘     │
│                                                         │
│  Quick Actions:                                        │
│  [Browse Users] [New Campaign] [Email Templates]       │
│                                                         │
│  Recent Campaigns:                                     │
│  ┌──────────────────────────────────────────────┐    │
│  │ Welcome Series      | Sent: 145 | Open: 67%  │    │
│  │ Feature Update      | Sent: 892 | Open: 45%  │    │
│  │ Credit Gift         | Sent: 47  | Open: 89%  │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### User Browser Interface

```
┌─────────────────────────────────────────────────────────┐
│  Users Browser                                [Export]  │
├─────────────────────────────────────────────────────────┤
│  Filters:                                              │
│  [+Add Filter] [Save Preset] [Clear All]              │
│                                                         │
│  Active Filters:                                       │
│  [Last Active: This Week ×] [Projects > 10 ×]        │
│                                                         │
│  Showing 47 of 1,247 users                            │
│                                                         │
│  [□] Select All                                       │
│  ┌──────────────────────────────────────────────┐    │
│  │ □ | Name        | Email      | Projects | Credits│
│  │ □ | John Doe    | john@...   | 23       | 145   │
│  │ □ | Jane Smith  | jane@...   | 45       | 320   │
│  │ □ | Bob Wilson  | bob@...    | 12       | 67    │
│  └──────────────────────────────────────────────┘    │
│                                                         │
│  Selected: 0 users                                     │
│  [Bulk Actions ▼]                                     │
└─────────────────────────────────────────────────────────┘
```

### Email Campaign Builder

```
┌─────────────────────────────────────────────────────────┐
│  New Email Campaign                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Campaign Name: [____________________]                 │
│                                                         │
│  Recipients:                                           │
│  ○ All Users (1,247)                                  │
│  ● Filtered Users (47)                                │
│  ○ Import List                                        │
│                                                         │
│  Subject: [____________________]                       │
│                                                         │
│  Template: [Select Template ▼]                        │
│                                                         │
│  ┌──────────────────────────────────────────────┐    │
│  │ Hi {{firstName}},                            │    │
│  │                                              │    │
│  │ Your content here...                         │    │
│  │                                              │    │
│  │ Available Variables:                         │    │
│  │ {{firstName}} {{projectCount}} {{credits}}   │    │
│  └──────────────────────────────────────────────┘    │
│                                                         │
│  Actions with Email:                                   │
│  □ Give credits: [30] credits                         │
│  □ Add tag: [___________]                             │
│                                                         │
│  [Preview] [Save Draft] [Send Now] [Schedule]         │
└─────────────────────────────────────────────────────────┘
```

---

## 💾 Database Schema Updates

### New Tables Needed

```sql
-- Email campaigns table
CREATE TABLE "bazaar-vid_email_campaigns" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  template TEXT NOT NULL,
  recipient_filter JSONB,
  recipient_count INTEGER,
  status VARCHAR(50), -- draft, scheduled, sending, sent
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Campaign analytics
CREATE TABLE "bazaar-vid_campaign_analytics" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES "bazaar-vid_email_campaigns"(id),
  user_id VARCHAR(255),
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  unsubscribed_at TIMESTAMP
);

-- User tags for segmentation
CREATE TABLE "bazaar-vid_user_tags" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  tag VARCHAR(100),
  added_at TIMESTAMP DEFAULT NOW(),
  added_by VARCHAR(255)
);

-- Saved filter presets
CREATE TABLE "bazaar-vid_filter_presets" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  filters JSONB,
  created_by VARCHAR(255),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔧 Implementation Steps

### Phase 1: Foundation (Week 1)
1. Create database tables
2. Set up basic admin routes
3. Build user filtering API
4. Create basic UI layout

### Phase 2: User Management (Week 2)
1. Implement advanced filters
2. Build user browser interface
3. Add selection system
4. Create export functionality

### Phase 3: Email System (Week 3)
1. Build email template editor
2. Implement variable replacement
3. Create campaign management
4. Add Resend integration

### Phase 4: Bulk Actions (Week 4)
1. Implement credit giving system
2. Add bulk email sending
3. Create action confirmation flow
4. Add undo/rollback capability

### Phase 5: Analytics & Polish (Week 5)
1. Add email tracking
2. Build analytics dashboard
3. Create saved presets
4. Add scheduling system
5. Testing and optimization

---

## 🚀 API Endpoints

### User Management
```typescript
// Get filtered users
GET /api/admin/marketing/users
  ?filters={...}
  &page=1
  &limit=50
  &sort=lastActive

// Get user details
GET /api/admin/marketing/users/:id

// Bulk action on users
POST /api/admin/marketing/users/bulk-action
{
  userIds: string[],
  action: BulkActionType,
  params: {...}
}
```

### Email Campaigns
```typescript
// Create campaign
POST /api/admin/marketing/campaigns
{
  name: string,
  subject: string,
  template: string,
  recipientFilter: {...},
  scheduledAt?: Date
}

// Send campaign
POST /api/admin/marketing/campaigns/:id/send

// Get campaign analytics
GET /api/admin/marketing/campaigns/:id/analytics
```

### Filter Presets
```typescript
// Save filter preset
POST /api/admin/marketing/filters/presets
{
  name: string,
  filters: {...},
  isPublic: boolean
}

// Get saved presets
GET /api/admin/marketing/filters/presets
```

---

## 🔒 Security Considerations

1. **Role-Based Access**: Only admin users can access
2. **Action Logging**: All bulk actions logged for audit
3. **Rate Limiting**: Prevent email spam
4. **Confirmation Required**: For destructive actions
5. **Rollback Capability**: Undo recent actions
6. **Data Export Limits**: Prevent data scraping

---

## 📊 Success Metrics

- **Efficiency**: Reduce time to execute bulk actions by 90%
- **Engagement**: Increase email open rates to 60%+
- **Accuracy**: Zero accidental bulk actions
- **Usage**: Admin team uses daily
- **Scalability**: Handle 10,000+ users smoothly

---

## 🎯 MVP Features (Start Here)

### Week 1 Deliverable
1. Basic user browser with 5 key filters:
   - Last active date
   - Project count
   - Credit balance
   - Registration date
   - Email domain

2. Two bulk actions:
   - Give credits
   - Send basic email

3. Simple email template:
   - Subject line
   - Body with {{firstName}} variable
   - Preview before sending

This MVP would already be incredibly useful and can be expanded incrementally!