/**
 * GitHub Component Analyzer Tool
 * Finds and analyzes components from connected GitHub repos
 * Provides context to the existing code generation system
 */

import type { ParsedComponent } from '~/server/services/github/component-parser.service';
import { GitHubComponentSearchService } from '~/server/services/github/component-search.service';
import { ComponentParser } from '~/server/services/github/component-parser.service';

export interface GitHubComponentContext {
  componentName: string;
  repository: string;
  filePath: string;
  structure: string;
  styles: string;
  content: string;
  framework: string;
  rawCode: string; // ADD THE ACTUAL COMPONENT CODE
}

export class GitHubComponentAnalyzerTool {
  name = 'github-component-analyzer';
  
  /**
   * Extract component reference from user prompt
   * Returns an object with both component name and optional file path
   */
  extractComponentReference(prompt: string): { name: string; path?: string } | null {
    // First, check for explicit file paths - extract both name and full path
    const filePathMatch = prompt.match(/((?:src\/.*?\/)?(\w+(?:[-_]?\w+)*))\.tsx/i);
    if (filePathMatch && filePathMatch[2]) {
      const fullPath = filePathMatch[1] + '.tsx';
      console.log(`Extracted component from file path: name=${filePathMatch[2]}, path=${fullPath}`);
      return { 
        name: filePathMatch[2].toLowerCase(),
        path: fullPath
      };
    }
    
    // Look for patterns like "my sidebar", "the navbar", "our header", etc.
    // But skip common words like "repo", "repository", "project", "app"
    const skipWords = ['repo', 'repository', 'project', 'app', 'scene', 'video', 'animation', 'new'];
    const patterns = [
      /animate\s+(?:my|the|our)?\s*(\w+(?:[-_]?\w+)*)/i,
      /(?:my|the|our)\s+(\w+(?:[-_]?\w+)*)\s+(?:component|from)/i,
      /(?:make|create|build)\s+(?:my|the|our)?\s*(\w+(?:[-_]?\w+)*)\s+(?:animation|video)/i,
    ];
    
    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match && match[1]) {
        const component = match[1].toLowerCase();
        if (!skipWords.includes(component)) {
          console.log(`Extracted component from pattern: ${component}`);
          return { name: component };
        }
      }
    }
    
    console.log('No component reference found in prompt');
    return null;
  }
  
  /**
   * Analyze component from GitHub and return context
   */
  async analyze(
    userId: string,
    componentRef: { name: string; path?: string; framework?: string },
    accessToken: string
  ): Promise<GitHubComponentContext | null> {
    try {
      // Get user's selected repositories
      const repositories = await GitHubComponentSearchService.getUserRepositories(userId);
      
      if (repositories.length === 0) {
        console.log('[GitHub] No repositories selected - user must select repos first');
        return null;
      }
      
      // Search for the component in selected repos only
      const searchService = new GitHubComponentSearchService(accessToken, userId);
      
      // Try multiple strategies to find the component
      let component;
      let fetchError: string | null = null;
      
      // Strategy 1: Direct fetch with exact path
      if (componentRef.path && repositories.length > 0) {
        console.log(`[GitHub] Strategy 1: Fetching exact file: ${componentRef.path}`);
        
        // Try each selected repository
        for (const repo of repositories) {
          try {
            component = await searchService.fetchFileDirectly(repo, componentRef.path);
            console.log(`[GitHub] ✅ Found in repository: ${repo}`);
            break; // Success, stop trying other repos
          } catch (error: any) {
            fetchError = error.message;
            console.log(`[GitHub] Not in ${repo}: ${error.message}`);
          }
        }
      }
      
      // Strategy 2: Search by component name
      if (!component) {
        console.log(`[GitHub] Strategy 2: Searching by name '${componentRef.name}'`);
        
        const results = await searchService.searchComponent(componentRef.name, {
          repositories,
          maxResults: 5, // Get more results for better matching
          useCache: true,
        });
        
        if (results.length > 0) {
          // If we have a path, try to find exact match
          if (componentRef.path) {
            const exactMatch = results.find(r => 
              r.path === componentRef.path || 
              r.path.endsWith(componentRef.path)
            );
            if (exactMatch) {
              component = exactMatch;
              console.log(`[GitHub] ✅ Found exact path match via search`);
            }
          }
          
          // Otherwise take the best scoring result
          if (!component) {
            component = results[0];
            console.log(`[GitHub] ✅ Using best match: ${component.path}`);
          }
        }
      }
      
      // Strategy 3: Fuzzy search with variations
      if (!component && componentRef.name) {
        console.log(`[GitHub] Strategy 3: Trying name variations`);
        
        // Try different naming conventions
        const nameVariations = [
          componentRef.name,
          componentRef.name.charAt(0).toUpperCase() + componentRef.name.slice(1), // Capitalize
          componentRef.name.replace(/-/g, ''), // Remove dashes
          componentRef.name.replace(/_/g, ''), // Remove underscores
        ];
        
        for (const variation of nameVariations) {
          if (variation === componentRef.name) continue; // Skip original
          
          const results = await searchService.searchComponent(variation, {
            repositories,
            maxResults: 1,
            useCache: false, // Don't cache fuzzy searches
          });
          
          if (results.length > 0) {
            component = results[0];
            console.log(`[GitHub] ✅ Found with variation '${variation}': ${component.path}`);
            break;
          }
        }
      }
      
      // If still no component found, provide helpful error message
      if (!component) {
        const errorMsg = fetchError 
          ? `Could not fetch component: ${fetchError}`
          : `Component '${componentRef.name}' not found in selected repositories`;
        
        console.log(`[GitHub] ❌ ${errorMsg}`);
        console.log(`[GitHub] Searched in repositories:`, repositories);
        
        // Return null but the system will continue with generic generation
        return null;
      }
      
      // Parse the component
      const parser = new ComponentParser(component.content);
      const parsed = parser.extract();
      
      // Build context for code generation (pass raw code too)
      return this.buildContext(parsed, component, component.content);
    } catch (error) {
      console.error('Error analyzing GitHub component:', error);
      return null;
    }
  }
  
  /**
   * Build context string for the code generation prompt
   */
  private buildContext(
    parsed: ParsedComponent,
    raw: any,
    rawCode: string
  ): GitHubComponentContext {
    // Extract the most important styling information
    const styles = this.extractStyles(parsed);
    
    // Extract content structure
    const structure = this.extractStructure(parsed);
    
    // Extract actual content
    const content = this.extractContent(parsed);
    
    return {
      componentName: parsed.name,
      repository: raw.repository,
      filePath: raw.path,
      structure,
      styles,
      content,
      framework: parsed.framework,
      rawCode, // Include the actual component code
    };
  }
  
  /**
   * Extract styling information
   */
  private extractStyles(component: ParsedComponent): string {
    const styleInfo: string[] = [];
    
    if (component.styles.inline) {
      styleInfo.push(`Inline styles: ${JSON.stringify(component.styles.inline, null, 2)}`);
    }
    
    if (component.styles.tailwind && component.styles.tailwind.length > 0) {
      styleInfo.push(`Tailwind classes: ${component.styles.tailwind.join(' ')}`);
    }
    
    if (component.styles.classes && component.styles.classes.length > 0) {
      styleInfo.push(`CSS classes: ${component.styles.classes.join(' ')}`);
    }
    
    if (component.styles.styledComponents) {
      styleInfo.push(`Uses styled-components`);
    }
    
    // Infer layout from class names
    const layoutHints = this.inferLayout(component.styles);
    if (layoutHints) {
      styleInfo.push(`Layout: ${layoutHints}`);
    }
    
    // Infer colors
    const colors = this.inferColors(component.styles);
    if (colors) {
      styleInfo.push(`Colors: ${colors}`);
    }
    
    return styleInfo.join('\n');
  }
  
  /**
   * Extract structure information
   */
  private extractStructure(component: ParsedComponent): string {
    const structure: string[] = [];
    
    structure.push(`Component type: ${component.type}`);
    structure.push(`Framework: ${component.framework}`);
    
    if (component.props && Object.keys(component.props).length > 0) {
      structure.push(`Props: ${Object.keys(component.props).join(', ')}`);
    }
    
    if (component.hooks.length > 0) {
      structure.push(`React hooks used: ${component.hooks.join(', ')}`);
    }
    
    if (component.content.data.length > 0) {
      structure.push(`Has dynamic data (${component.content.data.length} data sources)`);
    }
    
    if (component.interactions.length > 0) {
      structure.push(`Interactions: ${component.interactions.join(', ')}`);
    }
    
    return structure.join('\n');
  }
  
  /**
   * Extract content information
   */
  private extractContent(component: ParsedComponent): string {
    const content: string[] = [];
    
    if (component.content.text.length > 0) {
      content.push(`Text content: ${component.content.text.slice(0, 5).join(', ')}`);
    }
    
    if (component.content.links.length > 0) {
      const links = component.content.links.slice(0, 5).map(l => `${l.text} (${l.href})`);
      content.push(`Links: ${links.join(', ')}`);
    }
    
    if (component.content.images.length > 0) {
      content.push(`Images: ${component.content.images.length} images`);
    }
    
    if (component.content.icons.length > 0) {
      const icons = component.content.icons.slice(0, 5).map(i => i.name);
      content.push(`Icons: ${icons.join(', ')}`);
    }
    
    return content.join('\n');
  }
  
  /**
   * Infer layout from styles
   */
  private inferLayout(styles: any): string | null {
    const hints: string[] = [];
    
    const allClasses = [
      ...(styles.classes || []),
      ...(styles.tailwind || []),
    ].join(' ');
    
    // Check for flex/grid
    if (allClasses.includes('flex')) hints.push('flexbox');
    if (allClasses.includes('grid')) hints.push('grid');
    
    // Check for positioning
    if (allClasses.includes('absolute')) hints.push('absolute positioning');
    if (allClasses.includes('fixed')) hints.push('fixed positioning');
    if (allClasses.includes('sticky')) hints.push('sticky positioning');
    
    // Check for specific patterns
    if (allClasses.includes('sidebar')) hints.push('sidebar layout');
    if (allClasses.includes('navbar')) hints.push('navbar layout');
    if (allClasses.includes('modal')) hints.push('modal/overlay');
    
    // Width patterns
    if (allClasses.match(/w-\d+|w-full|w-screen/)) {
      const widthMatch = allClasses.match(/w-(\d+|full|screen)/);
      if (widthMatch) hints.push(`width: ${widthMatch[1]}`);
    }
    
    return hints.length > 0 ? hints.join(', ') : null;
  }
  
  /**
   * Infer colors from styles
   */
  private inferColors(styles: any): string | null {
    const colors: Set<string> = new Set();
    
    // Check Tailwind classes for colors
    const allClasses = [
      ...(styles.classes || []),
      ...(styles.tailwind || []),
    ].join(' ');
    
    // Common color patterns in Tailwind
    const colorPattern = /(?:bg|text|border)-(\w+)(?:-(\d+))?/g;
    let match;
    while ((match = colorPattern.exec(allClasses)) !== null) {
      if (match[1]) {
        colors.add(match[1]);
      }
    }
    
    // Check inline styles
    if (styles.inline) {
      if (styles.inline.backgroundColor) colors.add(`bg: ${styles.inline.backgroundColor}`);
      if (styles.inline.color) colors.add(`text: ${styles.inline.color}`);
      if (styles.inline.borderColor) colors.add(`border: ${styles.inline.borderColor}`);
    }
    
    return colors.size > 0 ? Array.from(colors).join(', ') : null;
  }
  
  /**
   * Parse Vue Single File Component
   */
  private parseVueComponent(code: string): {
    template: string;
    script: string;
    style: string;
    name: string;
  } {
    const templateMatch = code.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
    const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    
    // Extract component name from script
    let componentName = 'VueComponent';
    if (scriptMatch) {
      const nameMatch = scriptMatch[1].match(/name:\s*['"]([^'"]+)['"]/i);
      if (nameMatch) componentName = nameMatch[1];
    }
    
    return {
      template: templateMatch ? templateMatch[1].trim() : '',
      script: scriptMatch ? scriptMatch[1].trim() : '',
      style: styleMatch ? styleMatch[1].trim() : '',
      name: componentName,
    };
  }
  
  /**
   * Create enhanced prompt with GitHub context
   */
  createEnhancedPrompt(
    originalPrompt: string,
    context: GitHubComponentContext
  ): string {
    // Truncate code if too long to avoid token limits
    const maxCodeLength = 8000;
    const truncatedCode = context.rawCode.length > maxCodeLength 
      ? context.rawCode.substring(0, maxCodeLength) + '\n... (truncated)'
      : context.rawCode;
    
    // Check if it's a Vue component
    const isVue = context.filePath.endsWith('.vue');
    
    if (isVue) {
      const vueComponent = this.parseVueComponent(context.rawCode);
      return this.createVueEnhancedPrompt(originalPrompt, context, vueComponent);
    }
    
    return `
User wants to: ${originalPrompt}

CRITICAL: The user is referring to their ACTUAL ${context.componentName} component from their GitHub repository.
You MUST recreate this EXACT component, not a generic sidebar!

HERE IS THE ACTUAL COMPONENT CODE TO RECREATE:
\`\`\`tsx
${truncatedCode}
\`\`\`

Component Location:
- Repository: ${context.repository}
- File: ${context.filePath}
- Framework: ${context.framework}

STRICT REMOTION RULES TO AVOID LAYOUT BUGS:
1. NEVER wrap individual items in a list/grid with Sequence components - they will stack on top of each other!
2. For nav items or lists, keep them in normal document flow (position: relative or static)
3. Use Sequence ONLY for timing control, not for layout
4. If you need staggered animations for list items, use ONE Sequence for the whole list, then animate items with delays based on index
5. Place hooks (useCurrentFrame, useVideoConfig) INSIDE the component function, never at module level

CORRECT PATTERN for animating lists:
\`\`\`tsx
// ✅ CORRECT - Items stay in normal flow
<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
  {items.map((item, index) => (
    <div key={item.id} style={{
      opacity: interpolate(frame - (10 + index * 3), [0, 10], [0, 1]),
      transform: \`translateY(\${interpolate(frame - (10 + index * 3), [0, 10], [20, 0])}px)\`
    }}>
      {item.content}
    </div>
  ))}
</div>
\`\`\`

WRONG PATTERN:
\`\`\`tsx
// ❌ WRONG - Sequences will stack items on top of each other!
{items.map((item, index) => (
  <Sequence from={10 + index * 3}>
    <div>{item.content}</div>
  </Sequence>
))}
\`\`\`

INSTRUCTIONS:
1. RECREATE the EXACT component structure from the code above
2. PRESERVE all the actual class names, styles, and layout from the code
3. USE the actual content (text, icons, elements) from the component code
4. DO NOT make up generic content - use what's in the actual code
5. Animate it appropriately (sidebar slides in, buttons have hover effects, etc.)
6. Keep the exact visual appearance but add motion
7. Ensure nav items stay properly spaced and don't stack

The animation should bring THIS SPECIFIC component to life, not create a generic version.
`;
  }
  
  /**
   * Create Vue-specific enhanced prompt
   */
  private createVueEnhancedPrompt(
    originalPrompt: string,
    context: GitHubComponentContext,
    vueComponent: { template: string; script: string; style: string; name: string }
  ): string {
    return `
User wants to: ${originalPrompt}

CRITICAL: The user is referring to their ACTUAL Vue.js ${vueComponent.name} component from their GitHub repository.
You MUST recreate this EXACT Vue component as a Remotion animation, not a generic component!

HERE IS THE ACTUAL VUE COMPONENT TO RECREATE:

**Template:**
\`\`\`html
${vueComponent.template}
\`\`\`

**Script:**
\`\`\`javascript
${vueComponent.script}
\`\`\`

**Styles:**
\`\`\`css
${vueComponent.style}
\`\`\`

Component Location:
- Repository: ${context.repository}
- File: ${context.filePath}
- Framework: Vue.js
- Component Name: ${vueComponent.name}

CONVERSION INSTRUCTIONS:
1. Convert the Vue template to React JSX syntax
2. Convert Vue directives:
   - v-if → conditional rendering with &&
   - v-for → map()
   - v-model → value + onChange
   - v-show → style={{ display: condition ? 'block' : 'none' }}
   - @click → onClick
   - :prop → prop={}
3. Convert Vue data() to React state (if needed)
4. Convert Vue methods to regular functions
5. Apply the styles from the <style> section
6. Preserve the exact layout and visual design

REMOTION ANIMATION RULES:
1. Add smooth entrance animations (fade, slide, scale)
2. Animate list items with staggered delays
3. Add hover effects for interactive elements
4. Use interpolate() for smooth transitions
5. Keep animations subtle and professional
6. Preserve the Vue component's exact structure and content

IMPORTANT: This is a Vue to Remotion conversion. The final output should be a Remotion component that looks exactly like the Vue component but with added animations.
`;
  }
}