# GitHub Organization Setup for Bazaar

## 1. Create Organization
- [ ] Go to: https://github.com/organizations/new
- [ ] Organization name: `bazaar-ai` (or `bazaar-video`, `bazaar-motion`)
- [ ] Email: team@bazaar.it
- [ ] Plan: Free (upgrade later if needed)

## 2. Organization Profile
```markdown
# Profile README.md for github.com/bazaar-ai

# Bazaar - AI Motion Graphics Generator 🎬

Bazaar.it is an AI-powered motion graphics generator that transforms text prompts into professional videos.

## 🚀 What is Bazaar?
Bazaar is an open-source AI motion graphics generator - an alternative to Runway, After Effects, and Canva. Create stunning motion graphics in seconds, not hours.

## ✨ Features
- 🤖 AI-powered generation from text prompts
- ⚡ 60-second generation time
- 🎨 Professional motion graphics templates
- 📹 Export to MP4, WebM, GIF
- 🔓 Open source and transparent
- 💰 Free tier with no watermarks

## 🛠️ Tech Stack
- Next.js 15
- Remotion for video rendering
- GPT-4 for AI generation
- Tailwind CSS
- TypeScript

## 🔗 Links
- 🌐 Website: [bazaar.it](https://bazaar.it)
- 📖 Documentation: [docs.bazaar.it](https://docs.bazaar.it)
- 💬 Discord: [Join our community](https://discord.gg/bazaar)
- 🐦 Twitter: [@bazaar_ai](https://twitter.com/bazaar_ai)

## 📊 Stats
- Ranked #6 AI Video Generator by ChatGPT & Perplexity
- 1000+ videos created daily
- Open source with MIT license

## 🤝 Contributing
We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md).

---
Built with ❤️ from a motorhome in the Alps 🏔️🚐
```

## 3. Update Environment Variables
```env
# Old
GITHUB_APP_ID=your_personal_app_id
GITHUB_APP_PRIVATE_KEY=your_personal_key
GITHUB_CLIENT_ID=your_personal_client
GITHUB_CLIENT_SECRET=your_personal_secret

# New
GITHUB_APP_ID=bazaar_org_app_id
GITHUB_APP_PRIVATE_KEY=bazaar_org_private_key
GITHUB_CLIENT_ID=bazaar_org_client_id
GITHUB_CLIENT_SECRET=bazaar_org_client_secret
GITHUB_ORG_NAME=bazaar-ai
```

## 4. Update Code References

### Update GitHub Integration UI
```typescript
// src/components/github/GitHubConnect.tsx
const APP_NAME = "Bazaar";
const ORG_NAME = "bazaar-ai";
const REPO_URL = "https://github.com/bazaar-ai/bazaar";
```

### Update OAuth URLs
```typescript
// src/lib/auth/github.ts
const GITHUB_OAUTH_URL = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo,user`;
// This will now show "Bazaar wants to access your repositories"
```

## 5. Repository Structure
```
bazaar-ai/
├── bazaar             # Main application (rename from bazaar-vid)
├── bazaar-examples    # Example projects and templates
├── bazaar-docs        # Documentation site
├── bazaar-prompts     # Prompt library
├── awesome-bazaar     # Curated resources
└── .github/
    └── profile/
        └── README.md  # Organization profile
```

## 6. Update All Links

### In Your Codebase
```bash
# Find and replace all GitHub URLs
git grep -l "github.com/lysaker1" | xargs sed -i '' 's/github.com\/lysaker1/github.com\/bazaar-ai/g'
```

### In Documentation
- README.md
- CONTRIBUTING.md
- Package.json repository field
- All documentation links

## 7. GitHub App Manifest (for easy reinstall)
```json
{
  "name": "Bazaar",
  "url": "https://bazaar.it",
  "hook_attributes": {
    "url": "https://bazaar.it/api/github/webhook"
  },
  "redirect_url": "https://bazaar.it/api/auth/callback/github",
  "description": "AI motion graphics generator - GitHub integration",
  "public": true,
  "default_events": [
    "push",
    "pull_request"
  ],
  "default_permissions": {
    "contents": "write",
    "pull_requests": "write",
    "issues": "read",
    "metadata": "read"
  }
}
```

## 8. Migration Checklist
- [ ] Create GitHub Organization
- [ ] Set up organization profile
- [ ] Transfer repository ownership
- [ ] Create new GitHub App under org
- [ ] Create new OAuth App under org
- [ ] Update environment variables
- [ ] Update code references
- [ ] Test GitHub integration
- [ ] Update documentation
- [ ] Announce to users

## 9. Benefits After Migration
✅ Professional appearance: "Bazaar wants to access"
✅ Better branding and trust
✅ Separate personal from business
✅ Team collaboration ready
✅ Organization-level settings and security
✅ Better for LLM visibility (org repos rank higher)

## 10. Post-Migration Tasks
1. Add team members to organization
2. Set up branch protection rules
3. Configure organization security settings
4. Add organization secrets for CI/CD
5. Update GitHub badges in README
6. Add topics to repositories for discoverability

## Important URLs After Setup
- Organization: https://github.com/bazaar-ai
- Main repo: https://github.com/bazaar-ai/bazaar
- Apps settings: https://github.com/organizations/bazaar-ai/settings/apps
- OAuth apps: https://github.com/organizations/bazaar-ai/settings/applications

---

## Notes
- Keep your personal account as owner/admin
- You can transfer back if needed
- GitHub Apps can be transferred between accounts
- All stars, forks, and watches are preserved during transfer