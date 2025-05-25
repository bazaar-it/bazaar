# BAZAAR-305: Architecture & State Management Cleanup

## 🏗️ Context & Architecture Overview

### Current System Architecture
Bazaar-Vid operates with a **dual-page architecture** developed across multiple sprints:

**🆕 New System (Sprint 24-26)**: `/projects/[id]/generate/page.tsx`
- **Primary Focus**: Modern workspace with scene-first generation
- **Key Features**: Chat-driven scene creation, real-time preview, Monaco code editor
- **Architecture**: 4-panel workspace (Chat, Preview, Storyboard, Code)
- **State Management**: Zustand-based video state with tRPC integration
- **Development Period**: Sprints 24, 25, 26 - our latest and most advanced functionality

**🔄 Legacy System (Sprint 16-22)**: `/projects/[id]/edit/page.tsx`  
- **Purpose**: Original timeline-based editor with complex panel system
- **Features**: Timeline editing, custom components panel, scene planning history
- **Architecture**: Resizable panels with drag-and-drop, timeline-centric workflow
- **Development Period**: Sprints 16, 19, 20, 21, 22 - stable but older approach

### 🎯 Sprint 27 Goal
**Clean up the NEW generate page foundations** to ensure solid, idiot-proof architecture before implementing next-generation features (GitHub integration, image analysis, prompt engineering).

### 📋 Approach
1. **Focus Exclusively on `/generate` Page**: All improvements target the modern workspace
2. **Preserve Legacy System**: Keep `/edit` page intact for backward compatibility
3. **Foundation First**: Establish bulletproof state management before adding features
4. **Documentation Reference**: Sprint 24-26 folders contain the architectural decisions

---

**Priority**: P0 - Critical Foundation  
**Estimate**: 12-16 hours  
**Sprint**: 27  
**Status**: Planning  

## 🎯 Objective

Clean up Sprint 26 foundations to ensure solid, idiot-proof architecture before implementing new features. Focus on state management consistency, project listing, and system boundaries.

## 🔍 Current Issues Identified

### 1. Project Listing Inconsistency
- `/projects/page.tsx` redirects to latest project instead of showing dashboard
- No proper "My Projects" listing UI for users
- Sidebar shows projects but no central management interface
- Users can create projects but can't easily navigate between them

### 2. State Management Fragmentation
- Multiple state management patterns: Zustand, React Context, local state
- `TimelineContext.tsx` duplicates some video state logic
- Inconsistent data flow between components
- No single source of truth for user session/project data

### 3. Architecture Boundaries
- Mixed client/server component patterns
- Inconsistent tRPC usage vs direct API calls
- State synchronization issues between panels
- No clear data ownership patterns

## 📋 Tasks

### Task 1: Consolidate Project Management (4h)
- [ ] **Fix `/projects/page.tsx` to show proper dashboard**
  - Remove auto-redirect logic
  - Create `ProjectGrid` component for project listing
  - Add project search and filtering
  - Implement project management actions (rename, delete, duplicate)

- [ ] **Enhance ProjectsPanel for sidebar integration**
  - Ensure consistent project data flow
  - Add real-time project updates
  - Fix project switching logic

### Task 2: State Management Cleanup (6h)
- [ ] **Audit and consolidate state patterns**
  - Document current state management usage
  - Identify redundant state stores
  - Create state management guidelines
  - Consolidate timeline state with video state

- [ ] **Improve Zustand store architecture**
  - Add proper TypeScript types for all state
  - Implement state persistence patterns
  - Add state validation and error boundaries
  - Create state debugging tools

### Task 3: System Boundaries & Data Flow (4h)
- [ ] **Establish clear component boundaries**
  - Document client vs server component patterns
  - Standardize tRPC usage across all API calls
  - Remove direct fetch calls in favor of tRPC
  - Create component communication guidelines

- [ ] **Implement proper error boundaries**
  - Add React error boundaries for each major section
  - Implement graceful fallbacks for failed states
  - Add user-friendly error messages
  - Create error reporting system

### Task 4: User Session & Project Context (2h)
- [ ] **Improve user session management**
  - Ensure consistent user data across components
  - Add proper loading states for authentication
  - Implement session persistence patterns
  - Add user preferences management

## 🎯 Success Criteria

1. **Project Management**
   - Users can see all their projects in a grid layout
   - Project switching works seamlessly
   - Project actions (rename, delete) work reliably

2. **State Consistency**
   - Single source of truth for project data
   - No state synchronization issues between panels
   - Clear data flow patterns throughout the app

3. **System Reliability**
   - No console errors during normal usage
   - Graceful handling of edge cases
   - Consistent loading and error states

4. **Developer Experience**
   - Clear documentation of state management patterns
   - Consistent component architecture
   - Easy to debug state issues

## 🔧 Technical Implementation

### State Management Consolidation
```typescript
// Proposed unified state structure
interface AppState {
  user: UserState;
  projects: ProjectsState;
  currentProject: CurrentProjectState;
  ui: UIState;
}

// Clear separation of concerns
const useUserState = create<UserState>(...);
const useProjectsState = create<ProjectsState>(...);
const useCurrentProjectState = create<CurrentProjectState>(...);
```

### Component Architecture Guidelines
- Server components for data fetching
- Client components only when necessary (hooks, interactivity)
- tRPC for all API communication
- Zustand for client-side state
- React Context only for component-specific state

## 🚨 Risk Mitigation

- **Breaking Changes**: Implement changes incrementally
- **State Migration**: Ensure backward compatibility
- **Testing**: Add tests for critical state transitions
- **Rollback Plan**: Keep current implementation until new one is verified

## 📝 Notes

This ticket focuses on making the system "idiot-proof" and establishing solid foundations. No new features - just cleaning up what exists to ensure reliability before building GitHub integration, image analysis, and prompt engineering features.

## 🔗 Related Tickets

- BAZAAR-306: GitHub Style Bootstrapper (depends on this)
- BAZAAR-307: Image Vision Integration (depends on this)
- BAZAAR-308: Prompt Engineering System (depends on this) 