# Project Editing Interface

This directory contains the main editing interface for Bazaar-Vid projects. The interface is built using Next.js 15 (App Router) and follows a modern React architecture with Zustand for state management.

## Architecture Overview

### Main Components

1. **InterfaceShell.tsx**
   - Root component that orchestrates the entire editing interface
   - Manages project state and API interactions
   - Uses `react-resizable-panels` for layout management
   - Contains:
     - Sidebar (project navigation)
     - TopBar (project title and actions)
     - ChatPanel (AI interaction)
     - PreviewPanel (video preview)

2. **Sidebar.tsx**
   - Mobile-first slide-out navigation
   - Lists all user projects
   - Handles project switching
   - Includes project creation functionality

3. **TopBar.tsx**
   - Project title display and renaming
   - Action buttons (render, share, settings)
   - Project management actions (duplicate, delete)

### Panels System

The interface uses a panel-based layout system with three main panels:

1. **ChatPanel.tsx**
   - AI-powered video editing interface
   - Uses tRPC for backend communication
   - Implements optimistic updates with Zustand
   - Handles JSON patch operations for video changes
   - Features:
     - Real-time message display
     - Optimistic UI updates
     - Database synchronization
     - Error handling and retry logic

2. **PreviewPanel.tsx**
   - Video preview using Remotion
   - Dynamic video composition rendering
   - Real-time preview updates
   - Features:
     - Auto-play and looping
     - Controls integration
     - Responsive layout
     - Loading states

### State Management

Uses Zustand for global state management:
- `videoState.ts`: Manages:
  - Project data and properties
  - Chat history
  - Optimistic updates
  - Database synchronization

### Database Integration

- Uses Drizzle ORM with PostgreSQL
- tRPC for API communication
- Chat history persistence
- Project state management

### Key Features

1. **Real-time Collaboration**
   - Immediate preview updates
   - Optimistic UI updates
   - Synchronized database state

2. **AI Integration**
   - Natural language video editing
   - JSON patch-based modifications
   - Error handling and recovery

3. **Responsive Design**
   - Mobile-first approach
   - Flexible panel layout
   - Touch-friendly controls

### Technical Stack

- Next.js 15 (App Router)
- React
- TypeScript
- Tailwind CSS
- Drizzle ORM
- tRPC
- Remotion
- Zustand
- react-resizable-panels

### Development Notes

1. **State Management**
   - Use `useVideoState` hook for global state
   - Implement optimistic updates for better UX
   - Handle database synchronization carefully

2. **Error Handling**
   - Implement proper error boundaries
   - Handle network failures gracefully
   - Provide user feedback for errors

3. **Performance**
   - Optimize video preview rendering
   - Implement proper loading states
   - Use memoization where appropriate

4. **Testing**
   - Write component tests for UI
   - Test API interactions
   - Verify state management

### Future Improvements

1. **Performance**
   - Implement video preview caching
   - Optimize chat history loading
   - Add lazy loading for panels

2. **Features**
   - Add export options
   - Implement undo/redo functionality
   - Add more video editing controls

3. **UX**
   - Improve mobile experience
   - Add keyboard shortcuts
   - Implement dark mode

Last updated: 2025-04-29
