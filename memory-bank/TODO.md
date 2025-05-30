# Main TODO List

## ✅ Recently Completed

- [x] **CRITICAL: Fix Inconsistent Project Creation Pathways** (COMPLETED & CORRECTED - 2025-01-25)
  - **Problem**: Two different project creation systems existed, causing unpredictable user experiences
  - **User Requirement**: One unified system with welcome video BUT nice UI default message (not ugly green database message)
  - **Corrected Solution**: 
    - Unified both routes to use identical logic (same title, same props, same behavior)
    - Kept welcome video (`createDefaultProjectProps()`)
    - Removed database welcome message creation from both routes
    - Let UI show the clean, helpful default message instead
  - **Perfect Result**: All new projects now have consistent welcome video + nice UI message regardless of creation path

## Critical / High Priority
- [ ] State manager. Now. If a user goes away from the page. and goes back again. Everything is lost. its bacl to the welcome video. how can that be? i think its inane that we have such a stupid system. bevcaus eevery page they ar ein - every porject page has a uniwe id - likef or example - http://localhost:3000/projects/97511c39-3021-4c69-bdd3-5f4e2d55f676/generate- such that when you go away fror the page, and go back again. i cant believen that then suddely the remotion video is showing the welcome video - inteq of the vode you had their previuously. THAT WELCOME VIDEO AND WELVOME MESSAGE - ITS JUST FOR NEW PROEJCTS. THEN IT SHOULD NEVER BE SEEN AGAIN. and we store the jsx code in a databse, so when you are working in a porject, and go to another page, then go back - THE VIDEO SHOULD BE AS YOU LEFT IT. THE CODEPANEL SHOULD BU SET TO THE LAST SCENE. WHY DONT WE HAVE FIXED THAT YET? IT SHOULD BE EASY AS FUCK?? 
- [ ]  lets focus on the edit scenefunctilaity. please analys ehow the edti scene functilaity - the tentire piline is working now. or should we say how its not working... Its very slow and it doesnt apply the new ode into the scene. 

- [ ] **Investigate Welcome Video/Message Initialization Failure**: Analyze console logs after USER reproduces bug (cache clear, new project) to identify why welcome elements are missing. (Current Focus)

This file tracks outstanding tasks for the project.

## Sprint 31

- [ ] Implement User Feedback Collection Feature (as designed in `sprints/sprint31/FEATURE-FEEDBACK-BUTTON.md`)
  - [ ] Create `FeedbackButton.tsx` component
  - [ ] Create `FeedbackModal.tsx` component (using `src/config/feedbackFeatures.ts`)
  - [ ] Update `feedback` table schema in Drizzle
  - [ ] Update `feedbackRouter` tRPC endpoint
  - [ ] Update `sendFeedbackNotificationEmail` function
  - [ ] Add floating feedback button to main app layout
  - [ ] Thoroughly test logged-in and anonymous user flows

## SEO Enhancements

- [ ] Create OpenGraph image at `/public/og-image.png` (1200x630px)
- [ ] Set up and verify Google Search Console
  - [ ] Submit sitemap.xml
  - [ ] Monitor crawl errors
- [ ] Set up Core Web Vitals monitoring
- [ ] Implement FAQ page with structured data
- [ ] Add dynamic project routes to sitemap generator

## General Tasks

- [ ] Review and update documentation for new features.
- [ ] **Address `analytics.track` Lint Error in `ChatPanelG.tsx`**:
  - **Issue**: `Property 'track' does not exist on type ...` (ID: `4fbf1f86-81e9-4f4a-a586-d0efe973d1a7`).
  - **Task**: Investigate and fix the typing or implementation of the `analytics.track` call.
