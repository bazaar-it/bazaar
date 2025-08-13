# Technical Deep Dive: Component Animation System

## 1. GitHub API Integration Details

### Authentication and Permissions

```typescript
// OAuth App Configuration
const GITHUB_OAUTH_CONFIG = {
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/github/callback`,
  scopes: [
    'repo',        // Full repo access (includes private)
    'read:user',   // Read user profile
    'read:org',    // Read org repos
  ],
};

// Token Management
class GitHubTokenManager {
  async getAccessToken(userId: string): Promise<string> {
    const connection = await db.query.githubConnections.findFirst({
      where: eq(githubConnections.userId, userId),
    });
    
    if (!connection) {
      throw new Error('No GitHub connection found');
    }
    
    // Check if token needs refresh
    if (this.isTokenExpired(connection)) {
      return await this.refreshToken(connection);
    }
    
    return this.decrypt(connection.accessToken);
  }
  
  private async refreshToken(connection: GitHubConnection): Promise<string> {
    // GitHub tokens don't expire, but we can implement rotation
    // for security if needed
    return this.decrypt(connection.accessToken);
  }
}
```

### Code Search API Usage

```typescript
class GitHubSearchService {
  private octokit: Octokit;
  
  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }
  
  async searchComponents(
    componentName: string,
    repos: string[]
  ): Promise<ComponentSearchResult[]> {
    const results: ComponentSearchResult[] = [];
    
    // GitHub Search API has limitations:
    // - Max 1000 results per search
    // - Rate limit: 30 requests/minute for authenticated
    // - Can't search across more than 50 repos at once
    
    // Strategy: Batch repos and use multiple search strategies
    const repoBatches = this.batchRepos(repos, 10); // 10 repos per search
    
    for (const batch of repoBatches) {
      const repoQuery = batch.map(r => `repo:${r}`).join(' ');
      
      // Try multiple search patterns
      const searchQueries = [
        // Filename search
        `${repoQuery} filename:${componentName}.tsx`,
        `${repoQuery} filename:${componentName}.jsx`,
        
        // Component definition search
        `${repoQuery} "export function ${componentName}"`,
        `${repoQuery} "export const ${componentName}"`,
        
        // Path-based search
        `${repoQuery} path:components/${componentName}`,
      ];
      
      for (const query of searchQueries) {
        try {
          const response = await this.octokit.search.code({
            q: query,
            per_page: 10,
            sort: 'indexed', // Most recently indexed first
          });
          
          results.push(...this.processSearchResults(response.data.items));
          
          // Rate limit handling
          await this.handleRateLimit(response.headers);
          
        } catch (error) {
          if (error.status === 403) {
            // Rate limit hit, wait and retry
            await this.waitForRateLimit();
          }
          // Continue with next query
        }
      }
    }
    
    // Rank and deduplicate results
    return this.rankResults(results, componentName);
  }
  
  private async getFileContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<string> {
    const response = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
    });
    
    if ('content' in response.data) {
      return Buffer.from(response.data.content, 'base64').toString();
    }
    
    throw new Error('File content not available');
  }
  
  private rankResults(
    results: ComponentSearchResult[],
    componentName: string
  ): ComponentSearchResult[] {
    // Scoring system for ranking results
    return results
      .map(result => ({
        ...result,
        score: this.calculateScore(result, componentName),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10 results
  }
  
  private calculateScore(
    result: ComponentSearchResult,
    componentName: string
  ): number {
    let score = 0;
    
    // Exact filename match
    if (result.filename === `${componentName}.tsx`) score += 100;
    if (result.filename === `${componentName}.jsx`) score += 90;
    
    // Path indicates it's a component
    if (result.path.includes('/components/')) score += 50;
    if (result.path.includes('/ui/')) score += 40;
    
    // Recent modification
    const daysSinceModified = 
      (Date.now() - new Date(result.lastModified).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceModified < 30) score += 30;
    
    // File size (prefer reasonable sizes)
    if (result.size > 100 && result.size < 1000) score += 20;
    
    return score;
  }
}
```

## 2. AST Parsing Implementation

### Complete Parser with Error Recovery

```typescript
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';

class RobustComponentParser {
  private code: string;
  private ast: any;
  private errors: ParseError[] = [];
  
  constructor(code: string) {
    this.code = code;
    this.parseWithRecovery();
  }
  
  private parseWithRecovery() {
    try {
      // Try with TypeScript
      this.ast = parse(this.code, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          ['decorators', { decoratorsBeforeExport: true }],
          'classProperties',
          'classPrivateProperties',
          'classPrivateMethods',
          'dynamicImport',
          'nullishCoalescingOperator',
          'optionalChaining',
        ],
        errorRecovery: true, // Continue parsing despite errors
      });
    } catch (error) {
      // Fallback to plain JavaScript
      try {
        this.ast = parse(this.code, {
          sourceType: 'module',
          plugins: ['jsx'],
          errorRecovery: true,
        });
      } catch (fallbackError) {
        // Last resort: extract what we can with regex
        this.errors.push({ type: 'parse', message: fallbackError.message });
        this.ast = this.createMinimalAST();
      }
    }
  }
  
  extractComponent(): ExtractedComponent {
    const component: ExtractedComponent = {
      name: '',
      type: 'unknown',
      props: {},
      state: {},
      jsx: null,
      styles: {},
      content: {},
      imports: [],
      exports: [],
    };
    
    if (!this.ast) {
      return this.extractWithRegex();
    }
    
    traverse(this.ast, {
      // Handle different component patterns
      Program: {
        enter(path) {
          // Detect framework from imports
          component.framework = detectFramework(path.node);
        },
      },
      
      // React Function Components
      FunctionDeclaration(path) {
        if (isReactComponent(path.node)) {
          component.type = 'function';
          component.name = path.node.id?.name || 'Anonymous';
          component.props = extractFunctionProps(path.node);
          component.jsx = findJSXInFunction(path.node);
        }
      },
      
      // Arrow Function Components
      VariableDeclarator(path) {
        if (t.isArrowFunctionExpression(path.node.init) ||
            t.isFunctionExpression(path.node.init)) {
          const name = path.node.id.name;
          if (isComponentName(name)) {
            component.type = 'arrow';
            component.name = name;
            component.props = extractFunctionProps(path.node.init);
            component.jsx = findJSXInFunction(path.node.init);
          }
        }
      },
      
      // Class Components
      ClassDeclaration(path) {
        if (isReactClassComponent(path.node)) {
          component.type = 'class';
          component.name = path.node.id?.name || 'Anonymous';
          component.state = extractClassState(path.node);
          component.jsx = findRenderMethod(path.node);
        }
      },
      
      // Vue Components
      ExportDefaultDeclaration(path) {
        if (isVueComponent(path.node)) {
          component.type = 'vue';
          component.name = extractVueName(path.node);
          component.props = extractVueProps(path.node);
          component.template = extractVueTemplate(path.node);
        }
      },
      
      // Extract all JSX for analysis
      JSXElement(path) {
        if (!component.jsx) {
          component.jsx = path.node;
        }
        
        // Extract inline styles
        const styleAttr = path.node.openingElement.attributes.find(
          attr => t.isJSXAttribute(attr) && attr.name.name === 'style'
        );
        
        if (styleAttr) {
          const styles = extractInlineStyles(styleAttr);
          Object.assign(component.styles, styles);
        }
        
        // Extract class names
        const classAttr = path.node.openingElement.attributes.find(
          attr => t.isJSXAttribute(attr) && 
                  (attr.name.name === 'className' || attr.name.name === 'class')
        );
        
        if (classAttr) {
          component.styles.classes = extractClasses(classAttr);
        }
      },
      
      // Extract imports
      ImportDeclaration(path) {
        component.imports.push({
          source: path.node.source.value,
          specifiers: path.node.specifiers.map(spec => ({
            type: spec.type,
            name: spec.local?.name,
          })),
        });
      },
    });
    
    // Post-processing
    component.content = this.extractContent(component.jsx);
    component.animations = this.detectExistingAnimations(component);
    component.interactions = this.detectInteractions(component.jsx);
    
    return component;
  }
  
  private extractContent(jsx: any): ComponentContent {
    const content = {
      text: [],
      images: [],
      icons: [],
      data: [],
    };
    
    if (!jsx) return content;
    
    traverse(jsx, {
      JSXText(path) {
        const text = path.node.value.trim();
        if (text) content.text.push(text);
      },
      
      JSXExpressionContainer(path) {
        // Handle {variable} expressions
        if (t.isIdentifier(path.node.expression)) {
          content.data.push({
            type: 'variable',
            name: path.node.expression.name,
          });
        }
        
        // Handle {items.map(...)} patterns
        if (t.isCallExpression(path.node.expression)) {
          const callee = path.node.expression.callee;
          if (t.isMemberExpression(callee) && 
              callee.property?.name === 'map') {
            content.data.push({
              type: 'list',
              source: generate(callee.object).code,
            });
          }
        }
      },
      
      JSXElement(path) {
        const name = path.node.openingElement.name?.name;
        
        // Detect images
        if (name === 'img' || name === 'Image') {
          const src = getJSXAttribute(path.node, 'src');
          const alt = getJSXAttribute(path.node, 'alt');
          content.images.push({ src, alt });
        }
        
        // Detect icons
        if (isIconComponent(name)) {
          content.icons.push({
            name: name,
            props: extractJSXProps(path.node),
          });
        }
      },
    }, null, jsx);
    
    return content;
  }
}
```

## 3. Animation Strategy System

### Strategy Pattern Implementation

```typescript
// Base strategy interface
interface AnimationStrategy {
  name: string;
  apply(component: ParsedComponent): AnimatedComponent;
  getTimingFunction(): string;
  getDuration(): number;
}

// Concrete strategies
class SlideInStrategy implements AnimationStrategy {
  name = 'slide-in';
  
  constructor(
    private direction: 'left' | 'right' | 'top' | 'bottom',
    private distance: number = 100
  ) {}
  
  apply(component: ParsedComponent): AnimatedComponent {
    const axis = ['left', 'right'].includes(this.direction) ? 'X' : 'Y';
    const startValue = this.direction === 'left' || this.direction === 'top' 
      ? -this.distance 
      : this.distance;
    
    return {
      ...component,
      animations: [
        {
          property: 'transform',
          from: `translate${axis}(${startValue}px)`,
          to: `translate${axis}(0px)`,
          timing: 'spring',
          config: {
            fps: 30,
            durationInFrames: 30,
          },
        },
      ],
    };
  }
  
  getTimingFunction(): string {
    return 'spring({ fps: 30, from: 0, to: 1, durationInFrames: 30 })';
  }
  
  getDuration(): number {
    return 30; // frames
  }
}

class StaggerStrategy implements AnimationStrategy {
  name = 'stagger';
  
  constructor(
    private delay: number = 5, // frames between items
    private itemAnimation: AnimationStrategy = new FadeInStrategy()
  ) {}
  
  apply(component: ParsedComponent): AnimatedComponent {
    const children = extractChildren(component.jsx);
    
    return {
      ...component,
      animations: children.map((child, index) => ({
        target: child.id,
        delay: index * this.delay,
        animation: this.itemAnimation.apply(child),
      })),
    };
  }
  
  getTimingFunction(): string {
    return `(index) => interpolate(
      frame,
      [${this.delay} * index, ${this.delay} * index + 20],
      [0, 1],
      { extrapolateRight: 'clamp' }
    )`;
  }
  
  getDuration(): number {
    return 60; // Total duration for all items
  }
}

class MorphStrategy implements AnimationStrategy {
  name = 'morph';
  
  constructor(
    private fromShape: string,
    private toShape: string
  ) {}
  
  apply(component: ParsedComponent): AnimatedComponent {
    // Complex SVG path morphing
    const fromPath = this.parseShape(this.fromShape);
    const toPath = this.parseShape(this.toShape);
    
    return {
      ...component,
      animations: [
        {
          property: 'd', // SVG path data
          from: fromPath,
          to: toPath,
          timing: 'interpolate',
          config: {
            extrapolateRight: 'clamp',
          },
        },
      ],
    };
  }
  
  private parseShape(shape: string): string {
    // Convert shape descriptions to SVG paths
    const shapes = {
      'circle': 'M 50,50 m -25,0 a 25,25 0 1,0 50,0 a 25,25 0 1,0 -50,0',
      'square': 'M 25,25 L 75,25 L 75,75 L 25,75 Z',
      'triangle': 'M 50,25 L 75,75 L 25,75 Z',
    };
    
    return shapes[shape] || shape;
  }
  
  getTimingFunction(): string {
    return 'interpolate(frame, [0, 30], [0, 1])';
  }
  
  getDuration(): number {
    return 30;
  }
}

// Strategy selector
class AnimationStrategySelector {
  private strategies: Map<string, AnimationStrategy> = new Map();
  
  constructor() {
    this.registerDefaultStrategies();
  }
  
  private registerDefaultStrategies() {
    // Movement strategies
    this.strategies.set('slide-left', new SlideInStrategy('left'));
    this.strategies.set('slide-right', new SlideInStrategy('right'));
    this.strategies.set('slide-up', new SlideInStrategy('bottom'));
    this.strategies.set('slide-down', new SlideInStrategy('top'));
    
    // Opacity strategies
    this.strategies.set('fade', new FadeInStrategy());
    this.strategies.set('fade-up', new CompositeStrategy([
      new FadeInStrategy(),
      new SlideInStrategy('bottom', 30),
    ]));
    
    // Scale strategies
    this.strategies.set('scale', new ScaleStrategy(0, 1));
    this.strategies.set('zoom', new ScaleStrategy(0.5, 1));
    this.strategies.set('pop', new ScaleStrategy(0, 1.1, 1));
    
    // Rotation strategies
    this.strategies.set('rotate', new RotateStrategy(0, 360));
    this.strategies.set('flip-x', new FlipStrategy('x'));
    this.strategies.set('flip-y', new FlipStrategy('y'));
    
    // Complex strategies
    this.strategies.set('stagger', new StaggerStrategy());
    this.strategies.set('cascade', new CascadeStrategy());
    this.strategies.set('parallax', new ParallaxStrategy());
    this.strategies.set('morph', new MorphStrategy('circle', 'square'));
  }
  
  selectStrategy(
    animationType: string,
    component: ParsedComponent
  ): AnimationStrategy {
    // Direct match
    if (this.strategies.has(animationType)) {
      return this.strategies.get(animationType)!;
    }
    
    // Intelligent selection based on component
    return this.inferStrategy(animationType, component);
  }
  
  private inferStrategy(
    hint: string,
    component: ParsedComponent
  ): AnimationStrategy {
    // Analyze component structure
    const analysis = {
      isList: component.content.data.some(d => d.type === 'list'),
      isCard: component.styles.classes?.includes('card'),
      isSidebar: component.name.toLowerCase().includes('sidebar'),
      isModal: component.name.toLowerCase().includes('modal'),
      hasChildren: extractChildren(component.jsx).length > 1,
    };
    
    // Smart defaults
    if (analysis.isList && analysis.hasChildren) {
      return new StaggerStrategy();
    }
    
    if (analysis.isSidebar) {
      return new SlideInStrategy('left', 300);
    }
    
    if (analysis.isModal) {
      return new CompositeStrategy([
        new FadeInStrategy(),
        new ScaleStrategy(0.9, 1),
      ]);
    }
    
    if (analysis.isCard) {
      return new ScaleStrategy(0, 1);
    }
    
    // Default
    return new FadeInStrategy();
  }
}
```

## 4. Remotion Code Generation

### Complete Generation Pipeline

```typescript
class RemotionGenerator {
  private component: ParsedComponent;
  private strategy: AnimationStrategy;
  private options: GenerationOptions;
  
  generateComplete(): string {
    const imports = this.generateImports();
    const component = this.generateComponent();
    const exports = this.generateExports();
    
    return `${imports}\n\n${component}\n\n${exports}`;
  }
  
  private generateImports(): string {
    const remotionImports = this.getRequiredRemotionImports();
    const customImports = this.preserveCustomImports();
    
    return `
import React from 'react';
import {
  ${remotionImports.join(',\n  ')}
} from 'remotion';
${customImports}
    `.trim();
  }
  
  private generateComponent(): string {
    const { name, jsx, styles, content, props } = this.component;
    const animations = this.strategy.apply(this.component);
    
    return `
export default function Animated${name}(${this.generatePropsSignature(props)}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  ${this.generateAnimationVariables(animations)}
  
  ${this.generateStyles(styles, animations)}
  
  return (
    <AbsoluteFill style={containerStyle}>
      ${this.transformJSX(jsx, animations)}
    </AbsoluteFill>
  );
}
    `.trim();
  }
  
  private generateAnimationVariables(animations: Animation[]): string {
    return animations.map(anim => {
      if (anim.timing === 'spring') {
        return `
  const ${anim.name} = spring({
    frame,
    fps,
    from: ${JSON.stringify(anim.from)},
    to: ${JSON.stringify(anim.to)},
    durationInFrames: ${anim.duration},
  });`;
      } else if (anim.timing === 'interpolate') {
        return `
  const ${anim.name} = interpolate(
    frame,
    [${anim.range.join(', ')}],
    [${anim.values.join(', ')}],
    { extrapolateRight: 'clamp' }
  );`;
      }
      return '';
    }).join('\n');
  }
  
  private transformJSX(jsx: any, animations: Animation[]): string {
    // Deep clone and transform JSX
    const transformed = t.cloneDeep(jsx);
    
    // Apply animations to JSX elements
    traverse(transformed, {
      JSXElement(path) {
        const element = path.node;
        const elementId = getElementId(element);
        const elementAnimations = animations.filter(a => a.target === elementId);
        
        if (elementAnimations.length > 0) {
          // Add/modify style attribute
          const styleAttr = element.openingElement.attributes.find(
            attr => t.isJSXAttribute(attr) && attr.name.name === 'style'
          );
          
          const animatedStyles = generateAnimatedStyles(elementAnimations);
          
          if (styleAttr) {
            // Merge with existing styles
            mergeStyles(styleAttr, animatedStyles);
          } else {
            // Add new style attribute
            element.openingElement.attributes.push(
              t.jsxAttribute(
                t.jsxIdentifier('style'),
                t.jsxExpressionContainer(animatedStyles)
              )
            );
          }
        }
      },
    });
    
    return generate(transformed).code;
  }
}
```

## 5. Performance and Caching

```typescript
class ComponentCache {
  private cache: Map<string, CachedComponent> = new Map();
  private readonly TTL = 1000 * 60 * 60; // 1 hour
  
  async get(
    userId: string,
    componentName: string,
    repo: string
  ): Promise<ParsedComponent | null> {
    const key = `${userId}:${repo}:${componentName}`;
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.component;
    }
    
    return null;
  }
  
  set(
    userId: string,
    componentName: string,
    repo: string,
    component: ParsedComponent
  ): void {
    const key = `${userId}:${repo}:${componentName}`;
    this.cache.set(key, {
      component,
      timestamp: Date.now(),
    });
    
    // Also persist to database for longer-term cache
    this.persistToDatabase(key, component);
  }
  
  private async persistToDatabase(
    key: string,
    component: ParsedComponent
  ): Promise<void> {
    await db.insert(componentCache).values({
      id: crypto.randomUUID(),
      key,
      component: component, // JSONB
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    }).onConflictDoUpdate({
      target: componentCache.key,
      set: {
        component: component,
        createdAt: new Date(),
      },
    });
  }
}
```

## Next Steps

1. **Implement Phase 1**: GitHub connection and basic search
2. **Build AST parser**: Start with React, expand to Vue/Angular
3. **Create animation library**: Build reusable strategies
4. **Test with real repos**: Use popular open-source projects
5. **Add UI components**: Component picker, preview, editor
6. **Optimize performance**: Caching, parallel processing
7. **Add analytics**: Track usage, popular components