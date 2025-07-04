# Feature 016: User Database Management

**Status**: Not Started  
**Priority**: Medium  
**Complexity**: Medium (2-3 days)  
**Sprint**: 66 - Feature Roadmap

## Overview

Implement comprehensive content organization features including folders, categories, search/filter capabilities, tags, metadata, and archive functionality to help users manage their growing collection of video projects.

## Problem Statement

**Current Limitations**:
- Basic flat project list with no organization
- No way to categorize or group projects
- Limited search capabilities
- No archival system for old projects
- Difficult to find specific projects as library grows

**User Pain Points**:
- "I have 50+ projects and can't find the one I need"
- "No way to organize projects by client or campaign"
- "Old test projects clutter my workspace"
- "Can't tag projects for easy filtering"

## Requirements

### Functional Requirements

1. **Folder System**:
   - Create, rename, delete folders
   - Nested folder support (2-3 levels max)
   - Move projects between folders
   - Folder icons and colors

2. **Search & Filter**:
   - Full-text search across project names and descriptions
   - Filter by date created/modified
   - Filter by status (draft, completed, archived)
   - Filter by tags
   - Sort options (name, date, size)

3. **Tags & Metadata**:
   - Add multiple tags per project
   - Tag autocomplete
   - Bulk tag operations
   - Custom metadata fields

4. **Archive System**:
   - Archive projects (hide from main view)
   - Bulk archive old projects
   - Archive view/restore functionality
   - Auto-archive after X days of inactivity

### Non-Functional Requirements
- Search results in <200ms
- Support 1000+ projects per user
- Maintain performance with complex folder structures
- Backward compatible with existing projects

## Technical Design

### Database Schema Updates
```sql
-- New tables
CREATE TABLE folders (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES folders(id),
  color VARCHAR(7),
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE project_tags (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, tag)
);

CREATE TABLE project_metadata (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, key)
);

-- Update projects table
ALTER TABLE projects 
ADD COLUMN folder_id UUID REFERENCES folders(id),
ADD COLUMN archived_at TIMESTAMP,
ADD COLUMN description TEXT;

-- Indexes for performance
CREATE INDEX idx_projects_folder ON projects(folder_id);
CREATE INDEX idx_projects_archived ON projects(archived_at);
CREATE INDEX idx_project_tags_tag ON project_tags(tag);
CREATE INDEX idx_projects_search ON projects USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

### API Routes
```typescript
// Folder management
createFolder: protectedProcedure
  .input(z.object({
    name: z.string(),
    parentId: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional()
  }))
  .mutation(async ({ input, ctx }) => {
    // Create folder with hierarchy validation
  }),

// Search and filter
searchProjects: protectedProcedure
  .input(z.object({
    query: z.string().optional(),
    folderId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    archived: z.boolean().optional(),
    sortBy: z.enum(['name', 'created', 'modified']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  }))
  .query(async ({ input, ctx }) => {
    // Full-text search with filters
  }),

// Tag management
addProjectTags: protectedProcedure
  .input(z.object({
    projectId: z.string(),
    tags: z.array(z.string())
  }))
  .mutation(async ({ input, ctx }) => {
    // Add tags with deduplication
  }),

// Archive operations
archiveProjects: protectedProcedure
  .input(z.object({
    projectIds: z.array(z.string())
  }))
  .mutation(async ({ input, ctx }) => {
    // Set archived_at timestamp
  })
```

### State Management
```typescript
interface ProjectOrganizerState {
  folders: Map<string, Folder>;
  currentFolderId: string | null;
  searchQuery: string;
  filters: {
    tags: string[];
    archived: boolean;
    dateRange?: { start: Date; end: Date };
  };
  sortBy: 'name' | 'created' | 'modified';
  sortOrder: 'asc' | 'desc';
}
```

## Implementation Plan

### Phase 1: Folder System (Day 1)
1. Database schema updates
2. Folder CRUD API endpoints
3. Folder tree UI component
4. Drag-and-drop project moving
5. Folder navigation

### Phase 2: Search & Filter (Day 1.5)
1. Full-text search implementation
2. Filter UI components
3. Search results display
4. Sort functionality
5. Performance optimization

### Phase 3: Tags & Archive (Day 2-2.5)
1. Tag system implementation
2. Tag UI with autocomplete
3. Archive functionality
4. Archive view page
5. Bulk operations UI

## UI/UX Considerations

### Layout Changes
```
┌─────────────────────────────────────────────────┐
│  My Projects                          [Search]   │
├─────────────┬───────────────────────────────────┤
│ Folders     │  Projects                         │
│             │  ┌─────┐ ┌─────┐ ┌─────┐         │
│ 📁 All      │  │     │ │     │ │     │         │
│ 📁 Clients  │  │ Prj1│ │ Prj2│ │ Prj3│         │
│  └ 📁 ACME  │  │     │ │     │ │     │         │
│  └ 📁 Tech  │  └─────┘ └─────┘ └─────┘         │
│ 📁 Personal │                                   │
│ 🗄️ Archived │  Tags: [Finance] [Demo] [2024]   │
└─────────────┴───────────────────────────────────┘
```

### Interaction Patterns
- Drag projects to folders
- Right-click context menus
- Bulk select with checkboxes
- Quick tag addition
- Search as you type

## Testing Strategy

### Unit Tests
- Folder hierarchy validation
- Search algorithm accuracy
- Tag deduplication
- Archive date handling

### Integration Tests
- Complex folder operations
- Search with multiple filters
- Bulk operations
- Performance with large datasets

### User Testing
- Folder organization patterns
- Search behavior expectations
- Tag usage patterns
- Archive workflow

## Success Metrics

### Quantitative
- 70% reduction in project finding time
- <200ms search response time
- 50% of users using folders within first month
- 30% reduction in support tickets about finding projects

### Qualitative
- Users report better organization
- Increased project creation (less clutter fear)
- Positive feedback on search functionality

## Migration & Rollback

### Migration Steps
1. Add new database tables
2. Migrate existing projects to "All" folder
3. Enable features behind flag
4. Gradual rollout

### Rollback Plan
- Feature flags for each component
- Keep flat view as fallback
- No destructive changes to existing data

## Dependencies

### Internal
- Project list components
- Database schema
- Search infrastructure

### External
- PostgreSQL full-text search
- Possible ElasticSearch for scale

## Risks & Mitigations

### Risk 1: Complex Folder Hierarchies
**Mitigation**: Limit nesting to 3 levels, provide flat view option

### Risk 2: Search Performance
**Mitigation**: Database indexes, consider search service for scale

### Risk 3: Migration Complexity
**Mitigation**: Phased rollout, extensive testing, data backup

## Future Enhancements

1. **Smart Folders**:
   - Dynamic folders based on rules
   - "Recent" and "Favorites" folders
   - Shared team folders

2. **Advanced Metadata**:
   - Custom fields per project type
   - Metadata templates
   - Bulk metadata editing

3. **Project Templates**:
   - Save projects as templates
   - Template categories
   - Template marketplace

4. **Collaboration**:
   - Shared folders with teams
   - Folder permissions
   - Activity tracking

## References

- Google Drive folder structure
- Notion database organization
- Adobe Creative Cloud Libraries
- Figma project organization