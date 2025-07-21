# Sprint 80: V3 Go-Live Checklist

## Overview
This checklist tracks all critical items that must be addressed before pushing v3 to production (main branch).

**Target Date**: TBD
**Current Status**: IN PROGRESS

---

## 🚨 CRITICAL ITEMS (Must Fix)

### 1. Database & Migrations
- [ ] **Verify dev vs prod database separation**
  - Status: PENDING
  - Ensure dev branch points to dev database
  - Ensure main/prod branch points to production database
  - Check DATABASE_URL in different environments
  
- [ ] **Review pending migrations**
  - Status: PENDING
  - Check for any destructive migrations
  - Ensure all migrations are safe for production data
  - Test migration rollback plan

- [ ] **Cascade deletion verification**
  - Status: PENDING
  - Test project deletion cascades to:
    - All scenes in project
    - All chat messages
    - All uploaded images
    - All generated components
  - Verify no orphaned data remains
  - Check foreign key constraints

### 2. Payment & Billing
- [ ] **Stripe configuration**
  - Status: PENDING
  - Verify Stripe keys (test vs live)
  - Check webhook endpoints
  - Ensure correct pricing/products
  - Test payment flow end-to-end
  - Currency settings (EUR vs USD)

- [ ] **Rate limiting & quotas**
  - Status: PENDING
  - Daily export limits working correctly
  - Purchase modal triggers on rate limit
  - Quota reset timing (timezone aware)

### 3. AI & Generation Pipeline
- [x] **Remove Scene Planner for v3**
  - Status: COMPLETED ✅
  - Comment out scene planner tool in brain orchestrator
  - Scene planner is v4 feature only
  - Ensure brain doesn't select this tool
  - Verified: Already disabled in brain-orchestrator.ts prompt
  
- [x] **Multi-format code generation**
  - Status: COMPLETED ✅
  - Fixed all hardcoded dimensions in prompts:
    - CODE_GENERATOR: Removed hardcoded 1920x1080, added format-aware text sizing
    - TYPOGRAPHY_GENERATOR: Fixed 1840px/1000px checks, added format support
    - IMAGE_RECREATOR: Made padding and scaling format-aware
  - All prompts now use {{WIDTH}}, {{HEIGHT}}, {{FORMAT}} placeholders
  - Text sizes scale based on format (5% for portrait, 8% for landscape)
  - Still needs testing with actual generation
  
- [x] **Auto-fix system**
  - Status: COMPLETED ✅
  - Silent progressive fixing works
  - Loop detection functional
  - No infinite retry loops
  - Event system properly initialized
  - Rate limiting in place

- [ ] **Brain orchestrator**
  - Status: PENDING
  - Verify tool selection logic
  - Test context building
  - Check conversation history handling
  - Confirm scene planner is excluded

- [x] **Prompt Enhancer Optimization**
  - Status: COMPLETED ✅
  - Fixed: Now focused on Bazaar-Vid's specific strengths
  - Enhanced to suggest:
    - Specific animation types we support (typewriter, fade-in, slide-in, bounce)
    - Timing details ("2-second intro", "0.5s stagger")
    - Visual hierarchy terms ("large hero text", "smaller supporting")
    - Format-specific optimizations for portrait/square/landscape
    - Executable instructions instead of vague descriptions
  - Reduced temperature to 0.4 for consistency
  - Shortened max tokens to 300 for conciseness
  - Added examples to guide the AI

### 4. Infrastructure & Deployment
- [ ] **Environment variables**
  - Status: PENDING
  - All required env vars documented
  - Separate configs for dev/staging/prod
  - AWS Lambda settings correct
  - Cloudflare R2 credentials valid

- [ ] **AWS Lambda video export**
  - Status: PENDING
  - Lambda function deployed
  - S3 bucket permissions configured
  - Public read access set up
  - Test export functionality
  - **Export button working correctly**
  - Download triggers properly
  - Progress tracking accurate

### 4.5 Smart Logo Detection & Usage
- [ ] **Logo Detection System**
  - Status: PENDING
  - When user uploads an image in chat:
    - Detect if it's a logo (transparent bg, simple design, brand-like)
    - Tag the image with "logo" metadata
    - Store logo URL in project context
  - Brain orchestrator should:
    - Know when a logo is available
    - Include logo in relevant scenes (intros, outros, watermarks)
    - Pass logo URL to generation tools
  - Implementation Plan:
    1. **Update Upload Route** (`/api/upload/route.ts`):
       - Add "isLogo" detection logic
       - Check for: transparent background, aspect ratio, file name contains "logo"
       - Add metadata tag to S3 upload
    2. **Store Logo in Project Memory** (`projectMemory` table):
       - Create memory entry: type="brand_logo", content={url, dimensions}
       - One logo per project (latest overwrites)
    3. **Update Brain Context** (`brain/contextBuilder.ts`):
       - Check projectMemory for logo
       - Add logoUrl to context if exists
    4. **Modify Generation Prompts**:
       - CODE_GENERATOR: Accept {{LOGO_URL}} placeholder
       - Add instructions for logo placement
    5. **Smart Usage Rules**:
       - First scene: Logo reveal animation
       - Last scene: Logo with CTA
       - Long videos: Subtle watermark
       - Don't use in every scene

### 5. Frontend & UX
- [x] **SSE streaming**
  - Status: COMPLETED ✅
  - No duplicate messages
  - Proper error handling
  - Connection recovery
  - Verified working in test

- [ ] **Chat functionality**
  - Status: PENDING
  - Voice input working
  - Image upload with compression
  - Message history correct
  
- [ ] **Preview panel**
  - Status: PENDING
  - Live preview updates
  - Format switching (mobile/desktop)
  - Export button functionality
  - **Fix multiple update glitches**
  - Prevent redundant state updates
  - Smooth preview rendering
  - No flickering or re-renders

### 6. Performance & Optimization
- [x] **Generation speed**
  - Status: COMPLETED ✅
  - Target: 60-90 seconds
  - Achieved: ~21 seconds for scene generation
  - No unnecessary delays
  - Efficient API calls

- [ ] **Build & bundle size**
  - Status: PENDING
  - Production build succeeds
  - Bundle size reasonable
  - Build warnings exist (mlly dependency)
  - Font loading needs optimization (126 requests)

---

## ⚠️ IMPORTANT ITEMS (Should Fix)

### 7. Error Handling
- [ ] **User-facing errors**
  - Status: PENDING
  - Clear error messages
  - Proper error boundaries
  - Graceful degradation

### 8. Analytics & Monitoring
- [ ] **Error tracking**
  - Status: PENDING
  - Sentry or similar configured
  - Critical errors reported
  
- [ ] **Usage analytics**
  - Status: PENDING
  - User actions tracked
  - Performance metrics

### 9. Documentation
- [ ] **User documentation**
  - Status: PENDING
  - How-to guides updated
  - FAQ section current
  
- [ ] **API documentation**
  - Status: PENDING
  - Endpoints documented
  - Authentication explained

---

## ✅ NICE TO HAVE (Optional)

### 10. Features
- [ ] **Email marketing**
  - Status: PENDING
  - Resend configured
  - Welcome emails tested
  
- [ ] **Social sharing**
  - Status: PENDING
  - Export formats optimized
  - Metadata for sharing

---

## 🔍 KNOWN ISSUES TO FIX

### Critical Bugs
1. **Timeline utils broken imports**
   - File: TBD
   - Error: Import resolution failing
   - Impact: HIGH
   - Status: NOT FIXED

2. **Scene compilation errors**
   - Frequency: Intermittent
   - Auto-fix handles most cases
   - Status: PARTIALLY FIXED

3. **Memory leaks in preview**
   - During long sessions
   - Impact: MEDIUM
   - Status: NOT FIXED

4. **Excessive re-renders (FIXED)**
   - ChatPanelG was re-rendering on every keystroke
   - Console.log statements in render causing issues
   - Status: FIXED ✅
   - Solution: Removed debug logs, fixed useCallback dependencies

### Minor Issues
1. **UI glitches on mobile**
   - Responsive design issues
   - Status: NOT FIXED

2. **Slow initial load**
   - Bundle splitting needed
   - Status: NOT FIXED

---

## 📋 PRE-LAUNCH CHECKLIST

### Final Steps Before Push
- [ ] Run full test suite
- [ ] Check TypeScript errors (`npm run typecheck`)
- [ ] Run linter (`npm run lint`)
- [ ] Test production build locally
- [ ] Backup production database
- [ ] Prepare rollback plan
- [ ] Schedule maintenance window
- [ ] Notify users (if needed)

### Post-Launch Monitoring
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Watch for user reports
- [ ] Be ready for hotfixes

---

## 📝 NOTES

### Branch Strategy
- **dev branch**: Connected to development database
- **main branch**: Connected to production database
- **NEVER merge without completing this checklist**

### Emergency Contacts
- Database admin: TBD
- AWS/Lambda support: TBD
- Payment (Stripe) support: TBD

### Rollback Plan
1. Git revert to previous stable commit
2. Database rollback from backup
3. Clear CDN caches
4. Notify users of temporary issues

---

**Last Updated**: 2025-07-21
**Updated By**: Claude