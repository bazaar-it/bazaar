# GitHub Integration Strategy - Sprint 27+

**Context**: `/projects/[id]/generate/page.tsx` workspace enhancement  
**Target Users**: No-code developers (Lovable, Bolt, Replit, v0, etc.)  
**Goal**: Extract visual DNA from deployed apps to auto-generate matching video branding  
**Approach**: MVP-first, focus on style extraction over code tours  

## 🎯 Vision Statement

Enable no-code developers to connect their GitHub repos and automatically extract visual styling (colors, fonts, layouts) from their deployed applications to generate promotional videos that match their app's branding.

## 🎨 Core Value Proposition

**Problem**: No-code developers build beautiful apps but struggle to create promotional videos that match their branding  
**Solution**: "Connect GitHub → Extract Visual DNA → Generate Matching Videos"  
**Outcome**: Professional promotional videos in minutes, not hours  

## 🚀 MVP Strategy: "Visual DNA Extraction"

### Core User Flow (Simplest Path)
1. **Connect**: User authorizes GitHub access via OAuth
2. **Select**: Choose repo from dropdown list
3. **Analyze**: System fetches deployed app, extracts visual properties
4. **Generate**: Create video scenes using extracted branding
5. **Iterate**: User refines with prompts while maintaining brand consistency

### Target Use Cases (MVP Focus)

#### Primary: Landing Page Branding
```
User has: Next.js app deployed on Vercel
We extract: Colors, typography, layout patterns, component styles
We generate: Hero section videos, feature highlights, call-to-action scenes
```

#### Secondary: Component Showcases
```
User has: React component library
We extract: Design system tokens, component patterns
We generate: Component demo videos, feature walkthroughs
```

## 🔧 Technical Architecture (MVP)

### Option A: GitHub API + Static Analysis ⭐
```
GitHub Integration Flow:
├── OAuth GitHub authentication
├── Fetch repo file tree via GitHub API
├── Download key files (CSS, config, components)
├── Parse for design tokens and styles
└── Generate scenes with extracted branding
```

**Pros**: No deployment access needed, works with any repo  
**Cons**: Limited to static analysis, may miss runtime styles  
**Effort**: 3-4 days  

### Option B: Deployed App Scraping (Advanced)
```
Deployment Analysis Flow:
├── User provides deployed URL
├── Puppeteer/Playwright screenshots
├── CSS extraction from live site
├── Color/font analysis from DOM
└── Generate matching video scenes
```

**Pros**: Gets actual rendered styles, more accurate  
**Cons**: Requires deployment URL, more complex  
**Effort**: 5-7 days  

### Option C: Hybrid Approach (Recommended) ⭐
```
Smart Detection Flow:
├── GitHub OAuth + repo selection
├── Auto-detect deployment (Vercel, Netlify patterns)
├── Fallback to static analysis if no deployment
├── Combine both approaches for best results
└── Cache results for performance
```

**Pros**: Best of both worlds, graceful degradation  
**Cons**: More complex logic, multiple failure points  
**Effort**: 4-5 days  

## 🔍 Visual DNA Extraction Strategy

### 1. Static File Analysis (MVP Core)

#### CSS/Tailwind Analysis
```typescript
interface VisualDNA {
  // Colors (highest priority)
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  
  // Typography
  primaryFont: string;
  secondaryFont: string;
  fontSizes: string[];
  
  // Layout patterns
  borderRadius: string;
  spacing: string[];
  shadows: string[];
  
  // Brand elements
  logoUrl?: string;
  brandName?: string;
  tagline?: string;
}
```

#### File Parsing Targets
```typescript
const targetFiles = [
  // Tailwind/CSS
  'tailwind.config.js',
  'tailwind.config.ts', 
  'globals.css',
  'styles.css',
  
  // Design tokens
  'design-tokens.json',
  'theme.json',
  'tokens.js',
  
  // Component libraries
  'components.json', // shadcn/ui
  'stitches.config.js',
  'styled-system.js',
  
  // Framework configs
  'next.config.js',
  'package.json', // for dependencies
];
```

### 2. Intelligent Parsing Logic

#### Tailwind Config Extraction
```typescript
const extractTailwindDNA = (configContent: string): Partial<VisualDNA> => {
  const config = parseJavaScript(configContent);
  
  return {
    primaryColor: config.theme?.colors?.primary || config.theme?.colors?.blue?.[500],
    secondaryColor: config.theme?.colors?.secondary || config.theme?.colors?.gray?.[600],
    accentColor: config.theme?.colors?.accent || config.theme?.colors?.purple?.[500],
    primaryFont: config.theme?.fontFamily?.sans?.[0] || 'Inter',
    borderRadius: config.theme?.borderRadius?.lg || '0.5rem',
    // ... more extraction logic
  };
};
```

#### CSS Custom Properties
```typescript
const extractCSSVariables = (cssContent: string): Partial<VisualDNA> => {
  const variables = cssContent.match(/--[\w-]+:\s*[^;]+/g) || [];
  
  return variables.reduce((dna, variable) => {
    const [name, value] = variable.split(':').map(s => s.trim());
    
    if (name.includes('primary')) dna.primaryColor = value;
    if (name.includes('background')) dna.backgroundColor = value;
    if (name.includes('font')) dna.primaryFont = value.replace(/['"]/g, '');
    
    return dna;
  }, {} as Partial<VisualDNA>);
};
```

### 3. Framework-Specific Strategies

#### Next.js Apps
```typescript
const analyzeNextjsApp = async (repoFiles: GitHubFile[]) => {
  const packageJson = findFile(repoFiles, 'package.json');
  const dependencies = JSON.parse(packageJson.content).dependencies;
  
  // Detect UI library
  if (dependencies['@shadcn/ui']) return analyzeShadcnApp(repoFiles);
  if (dependencies['@chakra-ui/react']) return analyzeChakraApp(repoFiles);
  if (dependencies['@mantine/core']) return analyzeMantineApp(repoFiles);
  
  // Fallback to generic analysis
  return analyzeGenericReactApp(repoFiles);
};
```

#### Lovable/v0 Detection
```typescript
const detectNoCodePlatform = (repoFiles: GitHubFile[]) => {
  const indicators = {
    lovable: ['lovable.config.js', '.lovable/'],
    v0: ['v0.config.json', 'components/ui/'],
    bolt: ['bolt.config.js', '.bolt/'],
    replit: ['replit.nix', '.replit'],
  };
  
  // Adjust extraction strategy based on platform
};
```

## 🔗 GitHub Integration Implementation

### 1. OAuth Setup
```typescript
// In auth.ts (NextAuth)
export const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email repo', // repo access for private repos
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === 'github') {
        token.githubAccessToken = account.access_token;
      }
      return token;
    },
  },
};
```

### 2. GitHub API Integration
```typescript
// New service: src/server/services/github.ts
export class GitHubService {
  constructor(private accessToken: string) {}
  
  async getUserRepos() {
    const response = await fetch('https://api.github.com/user/repos', {
      headers: { Authorization: `token ${this.accessToken}` },
    });
    return response.json();
  }
  
  async getRepoFiles(owner: string, repo: string, path = '') {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: { Authorization: `token ${this.accessToken}` } }
    );
    return response.json();
  }
  
  async getFileContent(owner: string, repo: string, path: string) {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: { Authorization: `token ${this.accessToken}` } }
    );
    const data = await response.json();
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }
}
```

### 3. tRPC Integration
```typescript
// In generation.ts router
export const extractGitHubDNA = publicProcedure
  .input(z.object({
    repoOwner: z.string(),
    repoName: z.string(),
    branch: z.string().default('main'),
  }))
  .mutation(async ({ input, ctx }) => {
    const githubService = new GitHubService(ctx.session.githubAccessToken);
    
    // 1. Fetch target files
    const files = await githubService.getTargetFiles(input.repoOwner, input.repoName);
    
    // 2. Extract visual DNA
    const visualDNA = await extractVisualDNA(files);
    
    // 3. Store for reuse
    await ctx.db.insert(githubIntegrations).values({
      userId: ctx.session.user.id,
      repoOwner: input.repoOwner,
      repoName: input.repoName,
      visualDNA,
      extractedAt: new Date(),
    });
    
    return visualDNA;
  });
```

## 🎨 UI Integration in Workspace

### Option A: New GitHub Panel (Clean Separation)
```
New GitHubPanel.tsx in workspace
├── GitHub OAuth button
├── Repository selector dropdown
├── Visual DNA preview
├── "Generate Scene with Brand" button
└── Integration with existing scene generation
```

### Option B: Enhanced Chat Integration ⭐
```
Enhanced ChatPanelG.tsx
├── "Connect GitHub" button in header
├── Repo selector appears after connection
├── Visual DNA applied to all generations
├── "Use [RepoName] branding" toggle
└── Seamless integration with existing flow
```

### Option C: Project-Level Integration
```
Enhanced Project Settings
├── GitHub connection at project level
├── Visual DNA applied to entire project
├── Consistent branding across all scenes
└── One-time setup, ongoing benefit
```

## 📊 Database Schema

### GitHub Integrations Table
```sql
CREATE TABLE github_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  repo_owner VARCHAR(255) NOT NULL,
  repo_name VARCHAR(255) NOT NULL,
  branch VARCHAR(255) DEFAULT 'main',
  visual_dna JSONB NOT NULL,
  deployment_url VARCHAR(500),
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, repo_owner, repo_name)
);

CREATE INDEX idx_github_integrations_user ON github_integrations(user_id);
```

### Project-GitHub Linking
```sql
-- Add to existing projects table
ALTER TABLE projects ADD COLUMN github_integration_id UUID REFERENCES github_integrations(id);
ALTER TABLE projects ADD COLUMN use_github_branding BOOLEAN DEFAULT false;
```

## 🚀 Implementation Phases

### Phase 1: Basic GitHub Connection (Week 1)
- [ ] GitHub OAuth setup
- [ ] Repository listing
- [ ] Basic file fetching
- [ ] Simple Tailwind config parsing
- [ ] Color extraction only

### Phase 2: Enhanced DNA Extraction (Week 2)
- [ ] Multiple file type support
- [ ] Typography extraction
- [ ] Layout pattern detection
- [ ] Framework-specific parsing
- [ ] Visual DNA preview UI

### Phase 3: Scene Generation Integration (Week 3)
- [ ] Apply DNA to scene generation
- [ ] Brand-consistent templates
- [ ] Project-level branding
- [ ] Performance optimization
- [ ] Error handling & fallbacks

## 🎯 Startup Considerations

### MVP Scope Decisions
- **Focus**: Style extraction over code analysis
- **Platforms**: Prioritize Vercel/Netlify deployments
- **Files**: Start with Tailwind, expand to other frameworks
- **UI**: Integrate with existing chat flow

### Competitive Advantages
- **Speed**: GitHub → Branded video in <2 minutes
- **Accuracy**: Better brand matching than manual input
- **Integration**: Seamless with existing workflow
- **Targeting**: Built specifically for no-code developers

### Technical Debt Management
- Start with public repos only
- Cache extracted DNA to avoid re-processing
- Make framework detection extensible
- Plan for rate limiting and API costs

### Monetization Considerations
- **Free Tier**: 3 GitHub connections, basic extraction
- **Pro Tier**: Unlimited connections, advanced features
- **Enterprise**: Custom extraction rules, team sharing

## 📈 Success Metrics

### Technical Metrics
- [ ] GitHub connection success rate > 95%
- [ ] DNA extraction completion time < 10 seconds
- [ ] Color accuracy (user feedback)
- [ ] Framework detection accuracy > 80%

### User Experience Metrics
- [ ] Users connect GitHub in >40% of sessions
- [ ] GitHub-branded scenes require fewer edits
- [ ] User satisfaction with brand matching
- [ ] Increased video creation completion rate

### Business Metrics
- [ ] Conversion from free to paid (GitHub features)
- [ ] User retention improvement
- [ ] Reduced time-to-first-video
- [ ] Word-of-mouth referrals from no-code community

## 🔮 Future Enhancements

### Advanced Features (Post-MVP)
- Component library analysis
- Design system token extraction
- Multi-repo brand consistency
- Automated brand guideline generation
- Integration with Figma/design tools

### Platform Expansions
- GitLab support
- Bitbucket integration
- Direct Vercel/Netlify connections
- Figma plugin integration
- Design system APIs

---

**Next Steps**: Start with Phase 1, focus on Tailwind config extraction, integrate with existing ChatPanelG for seamless user experience. 