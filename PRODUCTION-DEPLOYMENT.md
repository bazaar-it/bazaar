# 🚀 Production Deployment Strategy

## **Branch Structure**

### **Main Branches**
- `main` - Production-ready code only
- `development` - Full development environment with all tools
- `allnighter` - Current working branch (merge to development, then clean to main)

### **What Goes to Production (main)**
✅ **Core Application**
- Landing page: `src/app/page.tsx`
- Generate workspace: `src/app/projects/[id]/generate/page.tsx`
- Authentication & user management
- Database schema & migrations
- Core tRPC APIs
- Remotion video generation
- Essential UI components

✅ **Essential Scripts**
- `scripts/setup-env.sh`
- `scripts/start-database.sh`

### **What Stays in Development**
❌ **Development Artifacts**
- `/memory-bank/` - Documentation & notes
- `/logs/` & `/tmp/` - Runtime logs
- `/analysis/` - Component analysis outputs
- `/scripts/` (except essential ones)

❌ **A2A System** (Separate Project)
- `/src/server/a2a/`
- `/src/agents/`
- `/src/scripts/a2a-test/`
- `/src/scripts/log-agent/`
- `/src/app/api/a2a/`

❌ **Development/Test Pages**
- `/src/app/test/`
- `/src/app/remotion-demo/`
- `/src/app/api/debug/`
- `/src/app/api/test/`

❌ **Legacy Edit System** (Keep in development for reference)
- `/src/app/projects/[id]/edit/` - Old workspace (Sprint 16-22)

## **Deployment Process**

### **Step 1: Commit Current Work**
```bash
git add .
git commit -m "Sprint 28: Production-ready merge with analytics"
```

### **Step 2: Create Clean Production Branch**
```bash
# Create production branch from current state
git checkout -b production

# Remove development artifacts (they're now gitignored)
git rm -r --cached memory-bank/ logs/ tmp/ analysis/ scripts/ || true
git rm -r --cached src/server/a2a/ src/agents/ src/scripts/a2a-test/ || true
git rm -r --cached src/app/api/a2a/ src/app/api/debug/ src/app/api/test/ || true
git rm -r --cached src/app/test/ src/app/remotion-demo/ || true

# Commit clean state
git commit -m "Production: Remove development artifacts"
```

### **Step 3: Merge to Main**
```bash
git checkout main
git merge production
git push origin main
```

### **Step 4: Keep Development Branch**
```bash
git checkout allnighter
git checkout -b development
git push origin development
```

## **Production Architecture**

### **Core Pages**
1. **Landing** (`/`) - Marketing & auth
2. **Generate** (`/projects/[id]/generate`) - Main workspace

### **Key Features**
- ✅ Scene-first video generation
- ✅ 4-panel workspace (Chat, Preview, Storyboard, Code)
- ✅ Real-time streaming updates
- ✅ Database persistence
- ✅ OAuth authentication
- ✅ Remotion video rendering

### **Missing from Production** (Future Sprints)
- ❌ "My Projects" dashboard
- ❌ Publish/share functionality UI
- ❌ Image analysis integration
- ❌ GitHub integration
- ❌ Model switching UI

## **Environment Setup**

### **Required Environment Variables**
```bash
# Database
DATABASE_URL=

# Authentication
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://bazaar.it
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# OpenAI
OPENAI_API_KEY=

# Analytics (Sprint 28)
NEXT_PUBLIC_GA_MEASUREMENT_ID=
VERCEL_ANALYTICS_ID=

# Application
NEXT_PUBLIC_BASE_URL=https://bazaar.it
```

### **Production Checklist**
- [ ] Environment variables configured
- [ ] Database migrated
- [ ] R2 bucket configured with CORS
- [ ] OAuth configured for bazaar.it
- [ ] Analytics tracking implemented
- [ ] Error monitoring setup
- [ ] Performance monitoring active

## **Monitoring & Analytics**

### **Implemented in Sprint 28**
- Google Analytics 4 with custom events
- Vercel Analytics for performance
- Reddit referral tracking
- Error tracking with Sentry
- Core Web Vitals monitoring

### **Key Metrics to Track**
- User registration/login rates
- Video generation completion rates
- Time to first video
- Error rates by feature
- Performance metrics (LCP, FID, CLS)

## **Future Development**

### **Development Workflow**
1. Work in `development` branch
2. Test features thoroughly
3. Create feature branches for production-ready features
4. Merge clean features to `main`
5. Keep development artifacts in `development` branch

### **Next Sprint Priorities**
1. "My Projects" dashboard
2. Publish/share functionality
3. Image analysis integration
4. GitHub integration for no-code developers 