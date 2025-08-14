# 🚨 GitHub Repository Transfer Checklist - ZERO DOWNTIME

## Current Setup
- **GitHub**: `Lysaker1/bazaar-vid`
- **New Location**: `bazaar-it/bazaar`
- **Live Users**: YES - Must maintain service

---

## 📋 PRE-TRANSFER CHECKLIST (Do First!)

### 1. Backup Everything
```bash
# Create a complete backup
cd /Users/markushogne/Documents/APPS/bazaar-vid
cp -r bazaar-vid bazaar-vid-backup-$(date +%Y%m%d)

# Push any uncommitted changes
cd bazaar-vid
git add .
git commit -m "Pre-transfer backup"
git push
```

### 2. Document Current Settings

#### Vercel Environment Variables
Go to: https://vercel.com → Your Project → Settings → Environment Variables

Copy ALL of these:
```env
# Database
DATABASE_URL=
DIRECT_DATABASE_URL=

# Auth
AUTH_SECRET=
NEXTAUTH_URL=

# OpenAI
OPENAI_API_KEY=

# Cloudflare R2
CLOUDFLARE_R2_BUCKET_NAME=
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_PUBLIC_BUCKET_URL=

# GitHub App (WILL NEED UPDATE)
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# AWS Lambda
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
REMOTION_FUNCTION_NAME=
REMOTION_BUCKET_NAME=

# Email
RESEND_API_KEY=
```

#### Vercel Domains
- bazaar.it
- www.bazaar.it
- Any other custom domains

---

## 🔄 TRANSFER PROCESS

### Step 1: Transfer GitHub Repository
1. Go to: https://github.com/Lysaker1/bazaar-vid/settings
2. Scroll to "Danger Zone"
3. Click "Transfer ownership"
4. New owner: `bazaar-it`
5. Repository name: `bazaar`
6. Type: `Lysaker1/bazaar-vid` to confirm
7. Click "I understand, transfer"

**✅ GITHUB AUTOMATICALLY REDIRECTS OLD URLS!**
- Old: `github.com/Lysaker1/bazaar-vid`
- Redirects to: `github.com/bazaar-it/bazaar`
- **No immediate breakage!**

---

## 🔧 POST-TRANSFER FIXES (In Order)

### 1. Vercel (5 minutes) - MOST CRITICAL

**Option A: Reconnect Existing Project (Recommended)**
1. Go to: https://vercel.com/dashboard
2. Click your project
3. Settings → Git
4. You'll see warning: "Repository not found"
5. Click "Disconnect"
6. Click "Connect Git Repository"
7. Select GitHub
8. **Choose organization**: bazaar-it
9. Select repository: `bazaar`
10. Deploy from: `main` branch
11. Click "Connect"

**Verification**:
```bash
# Make a small change
echo "# Transfer test" >> README.md
git add . && git commit -m "Test Vercel deployment"
git push
# Check Vercel dashboard for new deployment
```

### 2. Update Local Git Remote (2 minutes)
```bash
cd /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid

# Check current remote
git remote -v

# Update to new location
git remote set-url origin https://github.com/bazaar-it/bazaar.git

# Verify
git remote -v
git pull
```

### 3. GitHub App Transfer (10 minutes)

**Option A: Transfer Existing App**
1. Go to: https://github.com/settings/apps
2. Click your GitHub App
3. Transfer ownership → Select `bazaar-it`

**Option B: Create New App (Cleaner)**
1. Go to: https://github.com/organizations/bazaar-it/settings/apps
2. New GitHub App
3. Settings:
```
App name: Bazaar
Homepage: https://bazaar.it
Callback URL: https://bazaar.it/api/auth/callback/github
Webhook URL: https://bazaar.it/api/github/webhook

Permissions:
- Repository contents: Read & Write
- Pull requests: Read & Write
- Issues: Read
- Metadata: Read
```

4. Update Vercel environment variables:
```env
GITHUB_APP_ID=new_app_id
GITHUB_APP_PRIVATE_KEY=new_private_key
GITHUB_CLIENT_ID=new_client_id
GITHUB_CLIENT_SECRET=new_client_secret
```

### 4. Cloudflare R2 CORS (5 minutes)

Check if CORS rules reference GitHub URLs:

1. Go to: Cloudflare Dashboard → R2
2. Select your bucket
3. Settings → CORS
4. Check if any rules reference `github.com/Lysaker1`
5. If yes, add new rule for `github.com/bazaar-it`

**Typical CORS rule**:
```json
{
  "AllowedOrigins": [
    "https://bazaar.it",
    "http://localhost:3000",
    "https://github.com/bazaar-it"
  ],
  "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
  "AllowedHeaders": ["*"]
}
```

### 5. Update Code References (15 minutes)

```bash
# Find all references to old GitHub URL
grep -r "github.com/Lysaker1" . --exclude-dir=node_modules --exclude-dir=.next

# Update common files:
# - package.json (repository field)
# - README.md (badges, links)
# - Contributing.md
# - Any documentation
```

**Key files to update**:
- `/package.json` - repository URL
- `/README.md` - all GitHub links
- Any GitHub badges or shields

### 6. GitHub OAuth App (If separate from GitHub App)
1. Go to: https://github.com/settings/developers
2. Update OAuth App
3. Transfer to organization or create new
4. Update callback URLs if needed

---

## ✅ VERIFICATION CHECKLIST

After everything is done, verify:

- [ ] **Website still works**: https://bazaar.it
- [ ] **Users can log in**: Test authentication
- [ ] **GitHub integration works**: Test "Connect GitHub"
- [ ] **Vercel deploys**: Push a test commit
- [ ] **R2 uploads work**: Upload an image/video
- [ ] **API works**: Generate a video
- [ ] **Database connected**: Check user data loads

### Quick Smoke Test:
1. Open incognito browser
2. Go to bazaar.it
3. Sign up/login
4. Create a test project
5. Generate a simple video
6. Try GitHub integration

---

## 🚨 ROLLBACK PLAN (If Something Breaks)

### If Vercel breaks:
1. Go to Vercel → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"
4. Site back online instantly

### If GitHub App breaks:
1. Use old app temporarily (it redirects)
2. Update environment variables back
3. Fix at leisure

### If totally broken:
1. Transfer repo BACK to personal account
2. Reconnect everything to old URLs
3. Debug offline

---

## 📞 MONITORING DURING TRANSFER

Keep these open:
1. **Vercel Dashboard**: Watch for deploy failures
2. **Browser Tab**: Your live site
3. **Terminal**: For git commands
4. **This document**: Check off items

---

## ⏱️ TIMELINE

**Total time**: ~30 minutes
- Pre-transfer prep: 10 min
- GitHub transfer: 2 min
- Vercel reconnect: 5 min
- GitHub App: 10 min
- Testing: 5 min

**Best time to do it**:
- Low traffic period
- When you have 1 hour free
- Not right before launch!

---

## 🎯 FINAL NOTES

1. **GitHub redirects work** - Old URLs won't break immediately
2. **Vercel is the critical path** - Fix this first
3. **Users won't notice** if done quickly
4. **Test in incognito** to verify like a real user

---

## AFTER SUCCESS

- [ ] Tweet: "Bazaar is now officially an organization on GitHub!"
- [ ] Update all documentation
- [ ] Consider team members for org
- [ ] Set up branch protection rules

---

**Remember**: The site stays live during transfer. Only GitHub connection temporarily breaks, which you fix in minutes!