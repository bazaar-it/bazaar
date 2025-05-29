# Main TODO List

## Critical / High Priority

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
