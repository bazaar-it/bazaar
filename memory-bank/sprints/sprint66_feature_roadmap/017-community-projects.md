# Feature 017: Community Projects

**Status**: Not Started  
**Priority**: Medium  
**Complexity**: High (4-5 days)  
**Sprint**: 66 - Feature Roadmap

## Overview

Create a public template gallery where users can share their projects as templates, discover community creations, and fork templates for their own use. This feature transforms Bazaar from a solo creation tool into a collaborative creative platform.

## Problem Statement

**Current Limitations**:
- All projects are private with no sharing mechanism
- Users recreate similar videos from scratch
- No way to learn from other creators
- Missing viral/social growth potential
- No template marketplace opportunity

**User Pain Points**:
- "I want to see what others are creating for inspiration"
- "I made something cool and want to share it"
- "Starting from scratch every time is inefficient"
- "How do I create videos like the examples?"

## Requirements

### Functional Requirements

1. **Publishing System**:
   - Toggle project visibility (private/public)
   - Add template metadata (title, description, tags)
   - Preview generation for gallery
   - Usage rights/license selection

2. **Gallery Features**:
   - Browse templates by category
   - Search templates
   - Filter by style, duration, use case
   - Sort by popular, recent, trending
   - Template preview without forking

3. **Social Features**:
   - Like/favorite templates
   - Save templates to collections
   - View count tracking
   - Creator profiles
   - Follow creators

4. **Forking System**:
   - One-click fork to own projects
   - Attribution to original creator
   - Fork count tracking
   - Remix history

### Non-Functional Requirements
- Gallery loads in <2 seconds
- Support 10,000+ public templates
- Real-time popularity updates
- Content moderation capability
- SEO optimized gallery pages

## Technical Design

### Database Schema
```sql
-- Template metadata
CREATE TABLE template_metadata (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  preview_url TEXT,
  category VARCHAR(100),
  use_case VARCHAR(100),
  tags TEXT[],
  license VARCHAR(50) DEFAULT 'CC-BY',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Social interactions
CREATE TABLE template_likes (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES template_metadata(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

CREATE TABLE template_saves (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES template_metadata(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  collection_id UUID REFERENCES user_collections(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

CREATE TABLE template_views (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES template_metadata(id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE template_forks (
  id UUID PRIMARY KEY,
  original_template_id UUID REFERENCES template_metadata(id),
  forked_project_id UUID REFERENCES projects(id),
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User collections
CREATE TABLE user_collections (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Creator following
CREATE TABLE creator_follows (
  id UUID PRIMARY KEY,
  follower_id VARCHAR(255) NOT NULL,
  creator_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, creator_id)
);

-- Indexes for performance
CREATE INDEX idx_templates_category ON template_metadata(category);
CREATE INDEX idx_templates_public ON projects(is_public) WHERE is_public = true;
CREATE INDEX idx_template_likes_count ON template_likes(template_id);
CREATE INDEX idx_template_views_recent ON template_views(created_at DESC);
```

### API Routes
```typescript
// Template publishing
publishAsTemplate: protectedProcedure
  .input(z.object({
    projectId: z.string(),
    title: z.string(),
    description: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
    license: z.enum(['CC-BY', 'CC-BY-SA', 'CC0', 'Custom'])
  }))
  .mutation(async ({ input, ctx }) => {
    // Generate thumbnail and preview
    // Create template metadata
    // Update project visibility
  }),

// Gallery browsing
getTemplateGallery: publicProcedure
  .input(z.object({
    category: z.string().optional(),
    search: z.string().optional(),
    tags: z.array(z.string()).optional(),
    sort: z.enum(['popular', 'recent', 'trending']).optional(),
    cursor: z.string().optional(),
    limit: z.number().default(20)
  }))
  .query(async ({ input, ctx }) => {
    // Fetch templates with pagination
    // Include social metrics
    // Apply filters and sorting
  }),

// Social interactions
likeTemplate: protectedProcedure
  .input(z.object({
    templateId: z.string()
  }))
  .mutation(async ({ input, ctx }) => {
    // Toggle like status
    // Update like count cache
  }),

// Forking
forkTemplate: protectedProcedure
  .input(z.object({
    templateId: z.string(),
    projectName: z.string()
  }))
  .mutation(async ({ input, ctx }) => {
    // Deep clone project
    // Copy all scenes and assets
    // Track fork relationship
    // Attribute original creator
  })
```

### Caching Strategy
```typescript
// Redis cache for popular templates
interface TemplateCache {
  templateId: string;
  likeCount: number;
  viewCount: number;
  forkCount: number;
  trending_score: number;
  last_updated: Date;
}

// Cache warming for gallery
const warmGalleryCache = async () => {
  // Pre-cache top 100 templates
  // Update trending scores hourly
  // Invalidate on interactions
};
```

## Implementation Plan

### Phase 1: Publishing Infrastructure (Day 1-2)
1. Database schema for templates
2. Publishing flow UI
3. Thumbnail/preview generation
4. Basic gallery page
5. Template metadata editing

### Phase 2: Gallery & Discovery (Day 2-3)
1. Gallery UI with categories
2. Search and filter functionality
3. Template preview modal
4. Pagination and performance
5. SEO optimization

### Phase 3: Social Features (Day 3-4)
1. Like/save functionality
2. View tracking
3. User collections
4. Creator profiles
5. Following system

### Phase 4: Forking & Attribution (Day 4-5)
1. Fork mechanism
2. Attribution system
3. Fork history tracking
4. Remix relationships
5. Testing and polish

## UI/UX Considerations

### Gallery Layout
```
┌─────────────────────────────────────────────────┐
│  Discover Templates            [Search] [Filter] │
├─────────────────────────────────────────────────┤
│ Categories: All | Marketing | Social | Education│
├─────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │ Template│ │ Template│ │ Template│ │ Template││
│ │ Preview │ │ Preview │ │ Preview │ │ Preview ││
│ │         │ │         │ │         │ │         ││
│ │ ❤️ 234   │ │ ❤️ 567   │ │ ❤️ 123   │ │ ❤️ 890   ││
│ │ 👁️ 1.2k  │ │ 👁️ 3.4k  │ │ 👁️ 987   │ │ 👁️ 2.1k  ││
│ │ by @user│ │ by @user│ │ by @user│ │ by @user││
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘│
└─────────────────────────────────────────────────┘
```

### Template Preview Modal
- Full video preview
- Scene breakdown
- Creator info
- Stats (likes, views, forks)
- One-click fork button
- Share options

## Testing Strategy

### Performance Testing
- Gallery load time with 10k templates
- Search response time
- Concurrent forking operations
- Cache effectiveness

### Security Testing
- Content moderation
- License compliance
- Attribution preservation
- Private project protection

### User Testing
- Discovery patterns
- Publishing flow
- Fork and customize workflow
- Social feature adoption

## Success Metrics

### Quantitative
- 500+ templates published in first month
- 30% of new projects start from templates
- 50% user engagement with gallery
- 10% of users publish templates

### Qualitative
- Community engagement increase
- Quality of published templates
- Creator satisfaction
- Reduced time to first video

## Content Moderation

### Automated Checks
- Inappropriate content detection
- Copyright violation scanning
- Spam/duplicate detection

### Manual Review
- Flag/report system
- Moderator queue
- Take-down process
- Appeal mechanism

## Migration & Rollback

### Migration
- Add is_public flag (default false)
- Create template tables
- Enable gallery behind feature flag
- Seed with staff-created templates

### Rollback
- Feature flag disables gallery
- Templates remain but hidden
- No data loss
- Gradual re-enable possible

## Dependencies

### Internal
- Project system
- User profiles
- Storage system for previews
- Video rendering for thumbnails

### External
- CDN for template assets
- Redis for caching
- Content moderation API
- Analytics service

## Risks & Mitigations

### Risk 1: Inappropriate Content
**Mitigation**: Moderation system, community reporting, automated scanning

### Risk 2: Copyright Violations
**Mitigation**: Clear license terms, DMCA process, user education

### Risk 3: Performance at Scale
**Mitigation**: Aggressive caching, CDN distribution, pagination

### Risk 4: Low Quality Templates
**Mitigation**: Quality guidelines, featured templates, creator verification

## Future Enhancements

1. **Template Marketplace**:
   - Paid premium templates
   - Revenue sharing with creators
   - Template subscriptions
   - Exclusive content

2. **Advanced Discovery**:
   - AI-powered recommendations
   - Similar template suggestions
   - Trending by industry
   - Seasonal collections

3. **Creator Tools**:
   - Analytics dashboard
   - A/B testing templates
   - Template versioning
   - Collaboration features

4. **Enterprise Templates**:
   - Private team templates
   - Brand template libraries
   - Approval workflows
   - Usage analytics

## References

- Canva template gallery
- Figma Community
- GitHub template repositories
- CodePen showcase
- Adobe Stock templates