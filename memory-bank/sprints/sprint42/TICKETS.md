# Sprint 42: Unified Architecture Implementation Tickets

## Overview
Transform Bazaar-Vid into a blazing-fast, idiot-proof motion graphics video generator using natural language and images. Users should be able to create, edit, and refine videos through simple prompts and screenshots.

## Priority 1: Foundation (Must Complete First)

### TICKET-001: Generate Types from Database Schema
**Priority**: Critical
**Estimate**: 4 hours
**Description**: 
Create automated type generation from Drizzle schema to ensure `tsxCode` is used everywhere (never `code`, `existingCode`, or `sceneCode`).

**Tasks**:
- [ ] Create `scripts/generate-types.ts` that reads Drizzle schema
- [ ] Generate `src/generated/entities.ts` with exact DB field names
- [ ] Add npm script `generate:types` to package.json
- [ ] Update all imports to use generated types
- [ ] Remove all manual type definitions for Scene

**Success Criteria**:
- TypeScript compilation fails if anyone tries to use `existingCode`
- All Scene types come from generated file
- Build process automatically generates types

---

### TICKET-002: Create Universal Response Format
**Priority**: Critical
**Estimate**: 3 hours
**Description**:
Implement UniversalResponse wrapper for ALL API responses to ensure consistency.

**Tasks**:
- [ ] Create `src/lib/types/api/universal.ts` with UniversalResponse interface
- [ ] Define Operation and Entity enums
- [ ] Create ErrorCode enum with standard errors
- [ ] Add helper functions for creating success/error responses
- [ ] Add request ID generation utility

**Success Criteria**:
- Every API endpoint returns UniversalResponse
- Consistent error handling across all endpoints
- Request IDs for tracing every operation

---

## Priority 2: Core Refactoring

### TICKET-003: Refactor Tools to Pure Functions
**Priority**: High
**Estimate**: 6 hours
**Description**:
Tools should ONLY generate/transform content. NO database access allowed.

**Affected Files**:
- `src/tools/add/add.ts`
- `src/tools/edit/edit.ts`
- `src/tools/delete/delete.ts`

**Tasks**:
- [ ] Remove all database imports from tools
- [ ] Change tool outputs to return generated content (not entities)
- [ ] Update AddSceneTool to return `{ tsxCode, duration, layoutJson, props }`
- [ ] Update EditSceneTool to accept `currentTsxCode` and return `{ tsxCode, duration?, props? }`
- [ ] Ensure all field names match database exactly

**Success Criteria**:
- Tools have zero database dependencies
- Tools are pure functions (same input = same output)
- Tools use correct field names (tsxCode, not existingCode)

---

### TICKET-004: Move Database Operations to Router
**Priority**: High
**Estimate**: 8 hours
**Description**:
Router becomes the orchestrator that handles all database operations.

**Tasks**:
- [ ] Update `generation.ts` to fetch current scene data before calling tools
- [ ] Add database save logic after tool execution
- [ ] Implement `getNextOrder()` helper in router
- [ ] Add transaction support for complex operations
- [ ] Implement fire-and-forget background tasks (events, cache, storage)

**Success Criteria**:
- Only the router touches the database
- Tools receive and return plain objects
- Background tasks don't block responses

---

### TICKET-005: Enhance Brain for Smart Context Building
**Priority**: High
**Estimate**: 8 hours
**Description**:
Brain should understand user intent perfectly and provide rich context to tools.

**Tasks**:
- [ ] Update brain to analyze images when user says "make it look like this"
- [ ] Build context from previous scenes for continuity
- [ ] Extract user preferences from conversation history
- [ ] Implement smart tool selection based on intent
- [ ] Add confidence scoring to decisions

**Example Flows**:
1. User: "Add intro scene" → Brain: Provides brand colors, style from previous scenes
2. User: "Make it look like this" + screenshot → Brain: Calls edit tool with image analysis
3. User: "No, faster" → Brain: Understands it's about duration, not style

**Success Criteria**:
- Brain makes correct tool choices 95% of the time
- Context includes relevant project history
- Image uploads are properly analyzed

---

## Priority 3: User Experience

### TICKET-006: Optimize ChatPanelG for Speed
**Priority**: High
**Estimate**: 4 hours
**Description**:
Make the chat interface lightning fast with optimistic updates.

**Tasks**:
- [ ] Implement optimistic UI updates for user messages
- [ ] Add loading states that show progress
- [ ] Handle image uploads efficiently (compress before upload)
- [ ] Show AI responses as they stream in
- [ ] Add retry logic for failed requests

**Success Criteria**:
- User sees immediate feedback for every action
- Image uploads don't block the UI
- Failed requests can be retried easily

---

### TICKET-007: Real-time Preview Updates
**Priority**: High
**Estimate**: 6 hours
**Description**:
PreviewPanelG should update instantly when scenes change.

**Tasks**:
- [ ] Implement SSE subscription in PreviewPanelG
- [ ] Add optimistic rendering for new scenes
- [ ] Handle scene updates without full reload
- [ ] Implement smooth transitions between updates
- [ ] Add error boundaries for render failures

**Success Criteria**:
- Preview updates within 100ms of scene creation
- No flickering or jarring updates
- Graceful handling of render errors

---

### TICKET-008: Edit with Image Support
**Priority**: High
**Estimate**: 6 hours
**Description**:
When users upload images saying "make it like this", the system should understand and update perfectly.

**Tasks**:
- [ ] Update EditSceneTool to accept image context
- [ ] Implement image analysis in brain
- [ ] Create specialized prompts for image-based edits
- [ ] Add visual diff preview (before/after)
- [ ] Support multiple image uploads for reference

**User Flow**:
1. User sees current scene in preview
2. User: "Make it look like this" + uploads screenshot
3. Brain analyzes image + current scene
4. Edit tool generates new code matching the style
5. Preview updates instantly

**Success Criteria**:
- Image-based edits work on first try 90% of time
- Clear visual feedback during processing
- Support for common image formats

---

## Priority 4: Performance & Reliability

### TICKET-009: Implement Smart Caching
**Priority**: Medium
**Estimate**: 4 hours
**Description**:
Cache frequently used data for instant responses.

**Tasks**:
- [ ] Add Redis caching for scene data
- [ ] Implement cache invalidation on updates
- [ ] Cache AI decisions for similar prompts
- [ ] Add cache warming for popular scenes
- [ ] Monitor cache hit rates

**Success Criteria**:
- 90% cache hit rate for read operations
- Cache updates don't block main flow
- Stale data is never served

---

### TICKET-010: Add Distributed Tracing
**Priority**: Medium
**Estimate**: 3 hours
**Description**:
Every operation should be traceable for debugging.

**Tasks**:
- [ ] Implement TraceSpan class
- [ ] Add tracing to all service methods
- [ ] Include trace IDs in error messages
- [ ] Create trace visualization dashboard
- [ ] Add performance metrics to traces

**Success Criteria**:
- Can trace any request through entire system
- Performance bottlenecks are visible
- Error diagnosis takes < 5 minutes

---

### TICKET-011: Background Job Processing
**Priority**: Medium
**Estimate**: 4 hours
**Description**:
Heavy operations should not block user responses.

**Tasks**:
- [ ] Implement job queue for video rendering
- [ ] Add worker process for background tasks
- [ ] Create progress tracking for long operations
- [ ] Add job retry logic with exponential backoff
- [ ] Implement job status webhooks

**Success Criteria**:
- API responses return in < 500ms
- Long operations provide progress updates
- Failed jobs are automatically retried

---

## Priority 5: Testing & Documentation

### TICKET-012: Comprehensive Testing Suite
**Priority**: Medium
**Estimate**: 8 hours
**Description**:
Ensure the system is truly idiot-proof with extensive tests.

**Tasks**:
- [ ] Unit tests for all pure functions (tools)
- [ ] Integration tests for router → tool → database flow
- [ ] E2E tests for complete user journeys
- [ ] Performance tests for response times
- [ ] Chaos testing for error scenarios

**Test Scenarios**:
1. User creates 10 scenes rapidly
2. User uploads 5MB image
3. Network fails during generation
4. AI returns invalid response
5. Database connection drops

**Success Criteria**:
- 95% code coverage
- All user flows have E2E tests
- System recovers gracefully from all errors

---

### TICKET-013: Developer Documentation
**Priority**: Low
**Estimate**: 4 hours
**Description**:
Document the architecture for future developers.

**Tasks**:
- [ ] Create architecture diagrams
- [ ] Document data flow with examples
- [ ] Add inline code documentation
- [ ] Create troubleshooting guide
- [ ] Add performance tuning guide

---

## Sprint Timeline

### Week 1: Foundation
- TICKET-001: Generate types (Day 1)
- TICKET-002: Universal response (Day 2)
- TICKET-003: Refactor tools (Day 3-4)
- TICKET-004: Router refactoring (Day 4-5)

### Week 2: Core Features
- TICKET-005: Brain enhancement (Day 1-2)
- TICKET-006: Chat optimization (Day 3)
- TICKET-007: Real-time preview (Day 4)
- TICKET-008: Image editing (Day 5)

### Week 3: Performance
- TICKET-009: Caching (Day 1)
- TICKET-010: Tracing (Day 2)
- TICKET-011: Background jobs (Day 3)
- TICKET-012: Testing (Day 4-5)

### Week 4: Polish
- Bug fixes
- Performance optimization
- Documentation
- Deployment preparation

## Success Metrics

1. **Speed**: Scene generation < 2 seconds
2. **Reliability**: 99.9% uptime
3. **Accuracy**: Brain makes correct decision 95% of time
4. **User Satisfaction**: "It just works" - idiot-proof
5. **Developer Experience**: New features take < 1 day to add

## Key Principles

1. **User First**: Every decision optimizes for user experience
2. **Speed Matters**: Nothing should feel slow
3. **Fail Gracefully**: Errors should never break the flow
4. **Simple Implementation**: Code should be obvious
5. **Type Safety**: Impossible to use wrong field names