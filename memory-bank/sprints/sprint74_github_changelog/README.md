# GitHub Changelog Video Generation System

## The Vision 🎯

Transform boring text changelogs into **engaging motion graphic videos** that automatically generate from GitHub PRs. Every merged PR becomes a beautiful video announcement that proves you're shipping fast.

## How It Works

### For Bazaar (Our Own Changelog)
1. We merge a PR
2. GitHub webhook triggers
3. System analyzes the changes
4. Generates branded motion graphic video
5. Posts to our changelog page
6. Comments on PR with video link

### As a Service (For Other Projects)
1. Install Bazaar Changelog GitHub App
2. Tag `@bazaar-vid` in PR or auto-trigger on merge
3. Get beautiful changelog video in < 2 minutes
4. Embed in README, share on social, display on site

## The Magic ✨

### Automatic Brand Detection
- Reads logo from repository
- Extracts colors from CSS/themes
- Detects project style from content
- Creates on-brand videos automatically

### Smart Content Generation
- **Features**: Exciting announcements with animations
- **Fixes**: Clean, professional bug fix videos
- **Breaking Changes**: Clear migration guides
- **Performance**: Before/after metrics visualization

### Zero Configuration Required
Works out of the box, but customizable via `.github/bazaar.json`:
```json
{
  "changelog": {
    "style": "branded",
    "videoFormat": "landscape",
    "autoDeploy": true
  }
}
```

## Implementation Status

### ✅ Completed
- GitHub webhook endpoint
- PR analysis engine
- Brand detection system
- Video generation pipeline
- Changelog templates
- Database schema

### 🚧 In Progress
- Changelog website UI
- GitHub bot for PR comments

### 📋 TODO
- Production deployment
- GitHub Marketplace listing
- Analytics dashboard

## Why This Matters

### For Open Source
- **Engagement**: Videos get 10x more engagement than text
- **Recognition**: Contributors see their work celebrated
- **Growth**: Beautiful changelogs attract more users

### For Products
- **Marketing**: Every PR becomes shareable content
- **Transparency**: Show customers you're actively improving
- **Team Morale**: Celebrate wins with style

### For Bazaar
- **Dogfooding**: Use our own product for our changelog
- **Showcase**: Demonstrate video generation capabilities
- **Growth**: Viral potential from GitHub integration

## Quick Start

1. **Set Environment Variables**
```bash
GITHUB_WEBHOOK_SECRET=your-secret-here
GITHUB_APP_ID=your-app-id
GITHUB_PRIVATE_KEY=your-private-key
```

2. **Run Database Migration**
```bash
npm run db:generate
npm run db:push
```

3. **Start Development**
```bash
npm run dev
```

4. **Test Webhook**
```bash
# Use ngrok for local testing
ngrok http 3000

# Configure GitHub webhook to ngrok URL
# Merge a test PR
```

## Architecture Highlights

### Modular Design
- **Webhook Handler**: Secure GitHub event processing
- **PR Analyzer**: Intelligent change detection
- **Video Generator**: Template-based Remotion components
- **Queue System**: Async processing with status tracking

### Performance
- < 2 minute video generation
- Parallel processing support
- CDN distribution ready
- Automatic caching

### Security
- Webhook signature verification
- Rate limiting per repository
- Sandboxed video generation
- Private repo support

## The Future 🚀

### Phase 1 (Current)
- Basic video generation
- Bazaar dogfooding
- Manual triggers

### Phase 2
- GitHub Marketplace launch
- Custom branding UI
- Analytics dashboard

### Phase 3
- AI-powered narratives
- Multi-language support
- Social media integration
- Weekly digest videos

## Resources

- [Architecture Document](./github-changelog-architecture.md)
- [Progress Tracking](./progress.md)
- [GitHub App Setup](https://docs.github.com/en/apps)
- [Remotion Docs](https://remotion.dev)

---

**"Ship with style. Every PR deserves a spotlight."** 🎬