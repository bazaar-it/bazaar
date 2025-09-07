# Sprint 115: TODO List

## 🔴 Critical Path (Must Have for MVP)

### Database Setup
- [ ] Create migration: community_templates
- [ ] Create migration: community_template_scenes
- [ ] Create migration: community_favorites
- [ ] Create migration: community_events
- [ ] Create migration: community_metrics_daily
- [ ] Run migrations on dev database
- [ ] Update Drizzle schema with new tables
- [ ] Generate TypeScript types

### Core API
- [ ] Implement createTemplate endpoint
- [x] Implement listTemplates endpoint
- [x] Implement getTemplate endpoint
- [x] Implement favoriteTemplate endpoint
- [x] Implement useTemplate endpoint (copy scenes to project)

### Template Creation UI
- [ ] Add "Share to Community" button to project page
- [ ] Create scene selection modal
- [ ] Build template metadata form (title, description, tags)
- [ ] Implement template publish action
- [ ] Add success/error notifications

### Community Panel (In-App)
- [ ] Rename "Templates" to "Community" in navigation
- [x] Add tabs: "Explore", "My Favorites", "My Templates"
- [x] Implement template grid display
- [x] Add search bar
- [x] Add category filter
- [x] Implement "Use Template" flow

### Basic Metrics
- [x] Emit community_events: view/favorite/unfavorite/use
- [x] Update cached counters on community_templates
- [ ] Nightly rollups into community_metrics_daily
- [x] Display counters on template cards

## 🔄 Alignment With Sprint 106 (Optional, Post-MVP)
- [ ] Add optional `js_code`, `js_compiled_at`, `compilation_error` to `community_template_scene`
- [ ] On publish: copy `js_code` from source scene when available
- [ ] Community preview prefers `js_code` (fallback to TSX)

## 🟡 Important (Should Have)

### Enhanced Discovery
- [ ] Implement trending algorithm
- [ ] Add sorting options (recent, popular, trending)
- [ ] Implement tag-based filtering
- [ ] Add pagination or infinite scroll
- [ ] Create template preview on hover

### Creator Features
- [ ] Build "My Templates" management page
- [ ] Add edit template metadata capability
- [ ] Implement delete template (soft delete)
- [ ] Show basic analytics per template
- [ ] Add creator profile section

### Subdomain (community.bazaar.it)
- [ ] Set up Next.js project for subdomain
- [ ] Configure Vercel for subdomain
- [ ] Build homepage with featured templates
- [ ] Create browse/search page
- [ ] Implement template detail page
- [ ] Add responsive design for mobile

### Cross-Domain Auth
- [ ] Configure shared session between domains
- [ ] Set up CORS for API calls
- [ ] Implement session validation
- [ ] Test login/logout sync
- [ ] Handle deep linking from subdomain to main app

## 🟢 Nice to Have (Could Have)

### Advanced Features
- [ ] Template collections/playlists
- [ ] User comments on templates
- [ ] Template ratings (1-5 stars)
- [ ] Social sharing buttons
- [ ] Embed widget for templates
- [ ] Template versioning

### Analytics Dashboard
- [ ] Time-series charts for template metrics
- [ ] Creator leaderboard
- [ ] Popular tags analysis
- [ ] User engagement metrics
- [ ] Export analytics data

### Performance Optimization
- [ ] Implement Redis caching
- [ ] Add CDN for thumbnails
- [ ] Optimize database queries
- [ ] Add request batching
- [ ] Implement lazy loading

### Admin Tools
- [ ] Content moderation queue
- [ ] Featured templates selection
- [ ] User management interface
- [ ] System health dashboard
- [ ] Bulk operations tools

## 📋 Technical Debt

### From Previous Sprints
- [ ] Optimize scene compilation performance
- [ ] Improve error handling in scene rendering
- [ ] Add comprehensive logging
- [ ] Update documentation

### Testing
- [ ] Write unit tests for API endpoints
- [ ] Add integration tests for workflows
- [ ] Create E2E tests for critical paths
- [ ] Set up performance benchmarks
- [ ] Add security testing

## 🚀 Quick Wins

### Today
- [ ] Create database migrations
- [ ] Set up basic router structure
- [ ] Add "Share to Community" button (non-functional)
- [ ] Update navigation labels

### This Week
- [ ] Basic create/list/get API
- [ ] Simple template grid UI
- [ ] Favorite functionality
- [ ] Use template (copy to project)

## 📊 Success Metrics

### Week 1 Goals
- [ ] Database schema deployed
- [ ] Basic API functional
- [ ] Template creation working
- [ ] Community panel showing templates

### Week 2 Goals
- [ ] Subdomain live
- [ ] Cross-domain auth working
- [ ] Analytics tracking
- [ ] 50+ test templates created

### Launch Criteria
- [ ] All critical path items complete
- [ ] Performance benchmarks met
- [ ] Security review passed
- [ ] Documentation updated
- [ ] Beta testing complete

## 🔍 Open Questions

### Product Decisions
- [ ] Maximum scenes per template?
- [ ] Default visibility settings?
- [ ] Moderation requirements?
- [ ] Categories to include?
- [ ] Tag suggestions/limits?

### Technical Decisions
- [ ] Thumbnail generation approach?
- [ ] Caching strategy?
- [ ] Rate limiting thresholds?
- [ ] Database backup strategy?
- [ ] CDN provider for assets?

### UX Decisions
- [ ] Template preview format?
- [ ] Mobile navigation pattern?
- [ ] Onboarding flow?
- [ ] Error message tone?
- [ ] Loading states design?

## 📝 Notes

### Dependencies
- Existing template system code
- Authentication system
- Scene compilation pipeline
- Project management system

### Risks
- Performance with large scenes
- User-generated content moderation
- Cross-domain complexity
- Database migration safety

### References
- Sprint 93: Admin Templates
- Current template implementation
- Authentication documentation

## 🔗 External Lineage (Prod IDs)

- [ ] Add `external_scene_id` (text) to `community_template_scene` (additive migration; FK‑safe in dev).
- [ ] Update dev→dev seed to set `external_scene_id = sourceSceneId` for redundancy.
- [ ] Update prod→dev seed to set `external_scene_id = prod scene id` and keep `sourceSceneId = null`.
- [ ] Trending: if no `sourceSceneId` but `external_scene_id` present and `PROD_DATABASE_URL` configured, fetch iteration counts from prod and sum per template; else depth=0.
- [ ] Re‑run prod seeding (21 days, limit 200–500) and verify non‑zero “Prompts n” for prod‑sourced templates.
- Vercel subdomain guide
