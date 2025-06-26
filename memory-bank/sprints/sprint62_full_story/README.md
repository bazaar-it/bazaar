# Sprint 62: Full Story - Narrative Intelligence & Product Hunt Automation

## Vision

Transform Bazaar from a single-scene generator into a **narrative-aware video creation platform** that understands storytelling structure and can automatically create compelling multi-scene videos.

## Core Concept: Product Hunt Daily Showcase

### The Idea
Automatically create daily/weekly/monthly videos showcasing Product Hunt's top products:

```
[Example Video Structure - 30 seconds total]

🎬 Intro (3 sec)
- "Top 3 on Product Hunt Today 🏆"
- Animated leaderboard with logos sliding in
- Energetic music

🥉 Product #3 (7 sec)
- Uses their actual brand colors/fonts (via web agent)
- Key value proposition
- Website screenshot integration
- "Why it's unique" callout

🥈 Product #2 (8 sec)
- Different style matching their brand
- Feature highlights animation
- User testimonials or traction numbers
- Problem → Solution flow

🥇 Product #1 (9 sec)
- Premium treatment
- Full brand immersion
- Detailed problem/solution narrative
- Call-to-action with website

🎬 Outro (3 sec)
- "Created with Bazaar"
- Social links
```

### Why This Works

1. **Free Marketing for Startups**: They'll share videos featuring them
2. **Shows Platform Power**: Demonstrates Bazaar's capabilities daily
3. **Viral Potential**: Product Hunt community loves sharing
4. **Zero Manual Work**: Fully automated pipeline
5. **Consistent Content**: Daily presence on social media

## Technical Architecture

### Current Limitation
Our system generates individual scenes well but lacks understanding of **narrative structure**. When users ask for "a video about X", we generate one scene instead of a complete story.

### Proposed Solution: Narrative Intelligence

#### 1. Story Templates
```typescript
const STORY_TEMPLATES = {
  PRODUCT_LAUNCH: {
    structure: ["hook", "problem", "solution", "benefits", "cta"],
    timings: [3, 5, 7, 5, 3], // seconds
    transitions: ["fade", "swipe", "morph", "zoom", "fade"]
  },
  
  STARTUP_SHOWCASE: {
    structure: ["attention", "problem", "unique_solution", "traction", "vision"],
    timings: [2, 4, 6, 4, 3]
  },
  
  EXPLAINER: {
    structure: ["question", "context", "answer", "examples", "summary"],
    timings: [3, 4, 6, 5, 2]
  }
}
```

#### 2. Enhanced Brain Orchestrator
```typescript
// Current: "Make a video about Stripe" → Single scene
// Future: "Make a video about Stripe" → Full narrative with 5 scenes
```

#### 3. Story-Aware Generation
Each scene would know its role in the narrative:
- **Hook**: Grab attention (2-3 seconds)
- **Problem**: Create tension (4-6 seconds)
- **Solution**: Provide relief (6-8 seconds)
- **Benefits**: Build desire (4-5 seconds)
- **CTA**: Drive action (2-3 seconds)

## Product Hunt Automation Pipeline

### Phase 1: Data Collection
```typescript
// Daily cron job
const topProducts = await fetchProductHuntAPI({
  date: "today",
  limit: 3
});
```

### Phase 2: Brand Analysis
```typescript
// For each product
const webContext = await webAgent.analyze(product.website);
// Extracts: colors, fonts, style, screenshots
```

### Phase 3: Story Generation
```typescript
// Generate narrative-aware scenes
const scenes = await generateProductShowcase({
  product,
  webContext,
  template: "STARTUP_SHOWCASE",
  position: 1 // 1st, 2nd, or 3rd place
});
```

### Phase 4: Auto-Publishing
```typescript
// Publish to social platforms
await publishVideo({
  platforms: ['twitter', 'linkedin', 'youtube'],
  video: compiledVideo,
  caption: generateCaption(topProducts)
});
```

## Implementation Complexity

Instead of building a complex StoryTool system, we could start simpler:

### MVP Approach
1. **Hardcode Product Hunt template** in the Brain Orchestrator
2. **Detect keywords** like "showcase", "explainer", "launch video"
3. **Generate multiple scenes** with specific prompts for each narrative beat
4. **Let existing tools** handle the individual scene generation

### Example Implementation
```typescript
// In Brain Orchestrator
if (prompt.includes("product hunt showcase")) {
  return {
    tool: "add",
    multiScene: true,
    scenes: [
      { prompt: "Create intro: Top 3 Product Hunt today", duration: 90 },
      { prompt: `Showcase ${product3.name}: ${product3.tagline}`, webContext: web3 },
      { prompt: `Showcase ${product2.name}: ${product2.tagline}`, webContext: web2 },
      { prompt: `Showcase ${product1.name}: ${product1.tagline}`, webContext: web1 },
      { prompt: "Create outro: Made with Bazaar", duration: 90 }
    ]
  };
}
```

## Marketing Strategy

### Content Calendar
- **Daily**: Top 3 Product Hunt
- **Weekly**: Week's Best Launches Compilation
- **Monthly**: Month in Review - Top 10

### Distribution
- Twitter/X thread with video
- LinkedIn post targeting founders
- YouTube Shorts
- Instagram Reels
- TikTok (if applicable)

### Metrics to Track
- Views/engagement per video
- Click-throughs to featured products
- Click-throughs to Bazaar
- Sign-ups from this campaign
- Products that share the videos

## Next Steps

1. **Test Manual Version**: Create one Product Hunt video manually to validate the concept
2. **Build Simple Automation**: Start with hardcoded template approach
3. **Integrate Product Hunt API**: Automate data fetching
4. **Add Publishing Pipeline**: Auto-post to social platforms
5. **Measure & Iterate**: Track what works, refine the format

## Future Vision

Once this works for Product Hunt, expand to:
- **GitHub Trending**: Daily dev tool showcases
- **App Store Features**: New app launches
- **Design Inspiration**: Dribbble/Behance features
- **News Summaries**: Tech news in motion graphics
- **Earnings Reports**: Visualized financial data

The goal: **Bazaar becomes the platform that turns any information into engaging motion graphics automatically.**