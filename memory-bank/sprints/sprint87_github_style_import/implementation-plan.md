# Sprint 87: GitHub Style Import Implementation

## Overview
Allow users to connect their GitHub repos to automatically learn and apply their coding style/brand to generated videos.

## Architecture

### 1. Database Schema
```sql
CREATE TABLE github_connections (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  scopes TEXT[],
  connected_at TIMESTAMP,
  last_sync TIMESTAMP
);

CREATE TABLE user_style_profiles (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  github_repos TEXT[], -- repos analyzed
  style_data JSONB, -- extracted style
  extracted_at TIMESTAMP,
  active BOOLEAN DEFAULT true
);
```

### 2. OAuth Flow
```typescript
// /api/auth/github/connect
- Redirect to GitHub OAuth
- Scopes: repo:read, user:read
- Store tokens encrypted

// /api/auth/github/callback
- Exchange code for token
- Store in github_connections
- Redirect to repo selector
```

### 3. Style Extraction Service
```typescript
interface ExtractedStyle {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    semantic: Record<string, string>; // success, error, warning
  };
  typography: {
    fontFamily: {
      heading: string;
      body: string;
      mono: string;
    };
    scale: number[]; // size scale
  };
  motion: {
    duration: {
      fast: number;
      normal: number;
      slow: number;
    };
    easing: string[];
    preferredLibrary: 'framer-motion' | 'react-spring' | 'css';
  };
  spacing: {
    unit: number;
    scale: number[];
  };
  components: {
    borderRadius: string;
    shadows: string[];
    patterns: string[]; // 'cards', 'gradients', 'glassmorphism'
  };
  brand: {
    tone: 'professional' | 'playful' | 'minimal' | 'bold';
    complexity: 'simple' | 'moderate' | 'complex';
    audience: 'developer' | 'designer' | 'business' | 'consumer';
  };
}
```

### 4. Extraction Logic
```typescript
// Analyze these files:
1. tailwind.config.js/ts → Direct style tokens
2. styles/*.css → CSS variables
3. theme.js/ts → Theme configuration
4. package.json → UI libraries used
5. *.tsx components → Inline styles, motion
6. README.md → Brand voice/tone
7. .github/CONTRIBUTING.md → Style guide

// Smart inference:
- If using Material UI → Extract theme
- If using Tailwind → Parse config
- If using styled-components → Extract theme
- Fallback: Analyze most common colors/fonts
```

### 5. Integration Points

#### A. Generation Tools
```typescript
// Already supported in our tools!
const tools = {
  add: {
    execute: async (context) => {
      // context.userStyle automatically included
      const { colors, typography, motion } = context.userStyle || {};
      
      // Pass to AI prompt
      const prompt = `
        Generate a video scene.
        User's brand colors: ${JSON.stringify(colors)}
        Preferred fonts: ${JSON.stringify(typography)}
        Motion style: ${motion.preferredLibrary}
        ...existing prompt
      `;
    }
  }
};
```

#### B. Brain Orchestrator
```typescript
// Minimal change needed
class BrainOrchestrator {
  async process(input, userId) {
    // Fetch user's style profile
    const styleProfile = await db.query.userStyleProfiles.findFirst({
      where: and(
        eq(userStyleProfiles.userId, userId),
        eq(userStyleProfiles.active, true)
      )
    });
    
    // Include in context
    const context = {
      ...this.buildContext(),
      userStyle: styleProfile?.styleData,
      styleSource: styleProfile ? 'github' : 'default'
    };
    
    return this.executeTools(tools, context);
  }
}
```

### 6. UI Flow

1. **Settings Page**
   ```tsx
   <GitHubStyleConnect>
     <ConnectButton /> // OAuth trigger
     <RepoSelector /> // After connection
     <StylePreview /> // Show extracted style
     <ToggleSwitch /> // Enable/disable
   </GitHubStyleConnect>
   ```

2. **Generation Interface**
   ```tsx
   // Show when style is active
   <StyleIndicator>
     Using your GitHub style profile
     [View] [Disable for this session]
   </StyleIndicator>
   ```

## Implementation Steps

### Phase 1: OAuth Setup (4 hours)
1. Create GitHub OAuth App
2. Add connect/callback endpoints
3. Store encrypted tokens
4. Test connection flow

### Phase 2: Style Extraction (8 hours)
1. Build file scanner service
2. Implement style parsers:
   - Tailwind parser
   - CSS variable extractor
   - Package.json analyzer
3. Create style profile schema
4. Test with various repo types

### Phase 3: Storage & Management (3 hours)
1. Create database tables
2. Build CRUD operations
3. Add encryption for tokens
4. Implement refresh logic

### Phase 4: Integration (4 hours)
1. Update orchestrator context
2. Modify generation prompts
3. Add style to tool inputs
4. Test generation with styles

### Phase 5: UI Components (6 hours)
1. Build connect flow UI
2. Create repo selector
3. Add style preview
4. Build settings panel
5. Add indicators to generation UI

## Security Considerations

1. **Token Storage**
   - Encrypt at rest
   - Use refresh tokens
   - Expire after 90 days

2. **Scope Limitations**
   - Read-only access only
   - No private repo access by default
   - User can revoke anytime

3. **Rate Limiting**
   - Cache extracted styles
   - Limit re-extraction to once per day
   - Use GitHub API efficiently

## Success Metrics

1. **Adoption**
   - 30% of users connect GitHub
   - 50% keep style active after trying

2. **Quality**
   - Generated videos match repo style 80%+
   - Reduced "change colors" requests by 40%

3. **Performance**
   - Style extraction < 30 seconds
   - No impact on generation speed

## Future Enhancements

1. **Style Learning**
   - Learn from user's edits
   - Refine style over time
   - A/B test style variations

2. **Team Styles**
   - Share styles across team
   - Organization-wide styles
   - Style versioning

3. **Multi-Source**
   - Figma integration
   - Storybook extraction
   - Design system imports

## Estimated Timeline
- **Total: 3-4 days**
- Can be built incrementally
- MVP (connect + basic extraction): 1 day
- Full implementation: 3-4 days