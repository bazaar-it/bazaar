# FilesPanel Component

## Overview
The FilesPanel is a comprehensive file management interface within the video editing workspace. It provides four specialized tabs for different types of content that can be used in video projects:

1. **Projects**: Displays user projects with video previews
2. **Templates**: Stores reusable scene templates for quick video creation
3. **Scenes**: Manages user-generated scenes that can be reused across projects
4. **Uploads**: Handles all user-uploaded files (images, videos, audio, etc.)

## Features

### General Features
- Clean, streamlined tab-based interface for organized content management
- Responsive grid-based layout for file items
- File context menu for operations (rename, delete)
- Drag-and-drop file upload support throughout the entire panel
- Empty state UI for each tab when no content exists
- Ability to set initial active tab via props
- Vertical scrolling within tab content for better navigation

### Content-Specific Features
- **Projects Tab**: Shows project thumbnails with video previews on hover
- **Templates Tab**: Displays reusable scene templates for quick project creation
- **Scenes Tab**: Shows saved scenes for reuse in other projects
- **Uploads Tab**: Provides intuitive dropzone UI with clear instructions

## UI Improvements
- **Cleaner Headers**: Single "Files" header with tabs directly underneath
- **Improved Organization**: Removed redundant headers and buttons
- **Enhanced Upload UI**: Visual dropzone with instructional text
- **Better Scrolling**: Fixed overflow issues with proper scrolling within tabs

## Technical Implementation

### Data Management
- Uses tRPC procedures for all data operations:
  - `list`: Retrieves all files of a specific type
  - `create`: Creates/uploads new files
  - `delete`: Deletes files
  - `rename`: Renames existing files

### UI Components
- `FilesTab`: Reusable component for all four tabs with empty state handling
- `FileItem`: Grid item component for displaying file previews with context menu

### Props
- `projects`: Array of project objects (optional)
- `currentProjectId`: ID of the currently active project (optional)
- `initialTab`: String to set which tab is active when component mounts (defaults to "projects")
  - Valid values: "projects", "templates", "scenes", "uploads"

### Dialogs
- Rename dialog with input validation
- Delete confirmation dialog with safety checks

## API Integration

### tRPC Routes
- `upload.*`: Handles file upload operations
- `scene.*`: Manages scene operations
- `template.*`: Handles template operations
- `project.*`: Manages project operations (already existing)

## Specialized Components
- **ProjectsPanel**: A wrapper around FilesPanel that automatically shows the projects tab
- **UploadsPanel**: A wrapper around FilesPanel that automatically shows the uploads tab

## Usage Examples

```tsx
// Basic usage with all tabs
<FilesPanel 
  projects={projects} 
  currentProjectId={currentProjectId}
/>

// Show only uploads tab
<FilesPanel 
  projects={projects} 
  currentProjectId={currentProjectId}
  initialTab="uploads"
/>

// Use specialized components
<ProjectsPanel projects={projects} currentProjectId={currentProjectId} />
<UploadsPanel projectId={projectId} />
```

## Future Enhancements
- Ability to create folders for better organization
- Advanced filtering and search capabilities
- Batch operations (move, delete, rename multiple files)
- Additional preview capabilities for more file types 