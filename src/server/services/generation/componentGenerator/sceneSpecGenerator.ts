// src/lib/services/componentGenerator/sceneSpecGenerator.ts
import { type SceneSpec, type ComponentSpec } from "~/lib/types/video/storyboard";
import { 
  isFlowbiteAtomic, 
  isFlowbiteLayout, 
  generateAtomicImport, 
  generateLayoutImport,
  getLayoutFallbackComponent,
  propString,
  classes 
} from "./adapters/flowbite";

/**
 * SceneSpec to React/Remotion Component Generator
 * Converts structured SceneSpec JSON to executable React code
 */
export class SceneSpecGenerator {
  
  /**
   * Generate React/Remotion component code from SceneSpec
   */
  generateComponent(sceneSpec: SceneSpec): string {
    const componentName = this.generateComponentName(sceneSpec);
    const componentBody = this.generateComponentBody(sceneSpec);
    
    // Use window.Remotion pattern as per ESM component loading lessons
    return `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

export default function ${componentName}() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
${componentBody}
}`;
  }
  
  /**
   * Generate import statements
   */
  private generateImports(sceneSpec: SceneSpec): string {
    // For the window.Remotion pattern, we don't generate any imports
    // All dependencies are accessed via window globals
    // This follows the ESM component loading lessons pattern
    return '';
  }
  
  /**
   * Generate component name from scene spec
   */
  private generateComponentName(sceneSpec: SceneSpec): string {
    if (sceneSpec.name) {
      // Convert to PascalCase and remove special characters
      return sceneSpec.name
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
    }
    
    return 'GeneratedScene';
  }
  
  /**
   * Generate component body with layout and animations
   */
  private generateComponentBody(sceneSpec: SceneSpec): string {
    const animations = this.generateAnimations(sceneSpec);
    const styles = this.generateStyles(sceneSpec);
    const typewriterTexts = this.generateTypewriterTexts(sceneSpec);
    const components = this.generateComponents(sceneSpec);
    
    return `  // Animation calculations
${animations}

  // Style definitions
${styles}

  // Typewriter text calculations
${typewriterTexts}

  return (
    <AbsoluteFill${this.generateAbsoluteFillProps(sceneSpec)}>
${components}
    </AbsoluteFill>
  );`;
  }
  
  /**
   * Generate animation calculations
   */
  private generateAnimations(sceneSpec: SceneSpec): string {
    const animations: string[] = [];
    
    sceneSpec.motion.forEach((motion, index) => {
      const varName = `animation${index + 1}`;
      const startFrame = motion.frames?.start || (motion.delay || 0) * 30;
      const endFrame = motion.frames?.end || ((motion.delay || 0) + (motion.duration || 1)) * 30;
      
      switch (motion.fn) {
        // === ENTRANCE ANIMATIONS ===
        case 'fadeIn':
          animations.push(`  const ${varName} = {
    opacity: interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })
  };`);
          break;
          
        case 'fadeInUp':
          animations.push(`  const ${varName} = {
    transform: \`translateY(\${interpolate(frame, [${startFrame}, ${endFrame}], [50, 0], { extrapolateRight: 'clamp' })}px)\`,
    opacity: interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })
  };`);
          break;
          
        case 'fadeInDown':
          animations.push(`  const ${varName} = {
    transform: \`translateY(\${interpolate(frame, [${startFrame}, ${endFrame}], [-50, 0], { extrapolateRight: 'clamp' })}px)\`,
    opacity: interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })
  };`);
          break;
          
        case 'fadeInLeft':
          animations.push(`  const ${varName} = {
    transform: \`translateX(\${interpolate(frame, [${startFrame}, ${endFrame}], [-100, 0], { extrapolateRight: 'clamp' })}px)\`,
    opacity: interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })
  };`);
          break;
          
        case 'fadeInRight':
          animations.push(`  const ${varName} = {
    transform: \`translateX(\${interpolate(frame, [${startFrame}, ${endFrame}], [100, 0], { extrapolateRight: 'clamp' })}px)\`,
    opacity: interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })
  };`);
          break;
          
        case 'slideInLeft':
          animations.push(`  const ${varName} = {
    transform: \`translateX(\${interpolate(frame, [${startFrame}, ${endFrame}], [-100, 0], { extrapolateRight: 'clamp' })}px)\`,
    opacity: interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })
  };`);
          break;
          
        case 'slideInRight':
          animations.push(`  const ${varName} = {
    transform: \`translateX(\${interpolate(frame, [${startFrame}, ${endFrame}], [100, 0], { extrapolateRight: 'clamp' })}px)\`,
    opacity: interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })
  };`);
          break;
          
        case 'slideInUp':
          animations.push(`  const ${varName} = {
    transform: \`translateY(\${interpolate(frame, [${startFrame}, ${endFrame}], [100, 0], { extrapolateRight: 'clamp' })}px)\`,
    opacity: interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })
  };`);
          break;
          
        case 'slideInDown':
          animations.push(`  const ${varName} = {
    transform: \`translateY(\${interpolate(frame, [${startFrame}, ${endFrame}], [-100, 0], { extrapolateRight: 'clamp' })}px)\`,
    opacity: interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })
  };`);
          break;
          
        case 'scaleIn':
          animations.push(`  const ${varName} = {
    transform: \`scale(\${interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })})\`,
    opacity: interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })
  };`);
          break;
          
        case 'scaleInX':
          animations.push(`  const ${varName} = {
    transform: \`scaleX(\${interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })})\`,
    opacity: interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })
  };`);
          break;
          
        case 'scaleInY':
          animations.push(`  const ${varName} = {
    transform: \`scaleY(\${interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })})\`,
    opacity: interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })
  };`);
          break;
          
        case 'bounceIn':
          animations.push(`  const ${varName} = {
    transform: \`scale(\${spring({ frame: frame - ${startFrame}, fps: 30, config: { damping: 8, stiffness: 100 } })})\`,
    opacity: interpolate(frame, [${startFrame}, ${Math.min(startFrame + 10, endFrame)}], [0, 1], { extrapolateRight: 'clamp' })
  };`);
          break;
          
        // === CONTINUOUS ANIMATIONS ===
        case 'pulse':
          animations.push(`  const ${varName} = {
    transform: \`scale(\${1 + 0.1 * Math.sin((frame - ${startFrame}) * 0.2)})\`
  };`);
          break;
          
        case 'bounce':
          animations.push(`  const ${varName} = {
    transform: \`translateY(\${-Math.abs(Math.sin((frame - ${startFrame}) * 0.3)) * 10}px)\`
  };`);
          break;
          
        case 'shake':
          animations.push(`  const ${varName} = {
    transform: \`translateX(\${Math.sin((frame - ${startFrame}) * 0.5) * 5}px)\`
  };`);
          break;
          
        case 'wobble':
          animations.push(`  const ${varName} = {
    transform: \`rotate(\${Math.sin((frame - ${startFrame}) * 0.3) * 5}deg)\`
  };`);
          break;
          
        case 'float':
          animations.push(`  const ${varName} = {
    transform: \`translateY(\${Math.sin((frame - ${startFrame}) * 0.1) * 10}px)\`
  };`);
          break;
          
        case 'rotate':
          animations.push(`  const ${varName} = {
    transform: \`rotate(\${interpolate(frame, [${startFrame}, ${endFrame}], [0, 360], { extrapolateRight: 'clamp' })}deg)\`
  };`);
          break;
          
        // === SPECIAL EFFECTS ===
        case 'typewriter':
          // Use CSS to clip text character by character
          const textLength = motion.params?.textLength || 20; // Default text length
          animations.push(`  const ${varName} = {
    width: \`\${interpolate(frame, [${startFrame}, ${endFrame}], [0, ${textLength}], { extrapolateRight: 'clamp' })}ch\`,
    overflow: 'hidden',
    whiteSpace: 'nowrap'
  };`);
          break;
          
        case 'glow':
          animations.push(`  const ${varName} = {
    boxShadow: \`0 0 \${interpolate(frame, [${startFrame}, ${endFrame}], [0, 20], { extrapolateRight: 'clamp' })}px rgba(59, 130, 246, 0.5)\`
  };`);
          break;
          
        case 'blur':
          animations.push(`  const ${varName} = {
    filter: \`blur(\${interpolate(frame, [${startFrame}, ${endFrame}], [10, 0], { extrapolateRight: 'clamp' })}px)\`
  };`);
          break;
          
        // === INTERACTION ANIMATIONS ===
        case 'click':
          // Mouse cursor click with scale and position feedback
          animations.push(`  const ${varName} = {
    transform: \`scale(\${interpolate(frame, [${startFrame}, ${startFrame + 3}], [1, 0.9], { extrapolateRight: 'clamp' })}) scale(\${interpolate(frame, [${startFrame + 3}, ${endFrame}], [0.9, 1], { extrapolateRight: 'clamp' })})\`,
    opacity: interpolate(frame, [${startFrame}, ${endFrame}], [0.8, 1], { extrapolateRight: 'clamp' })
  };`);
          break;
          
        case 'zoomIn':
          // Camera zoom effect - should be applied to AbsoluteFill or wrapper
          animations.push(`  const ${varName} = {
    transform: \`scale(\${interpolate(frame, [${startFrame}, ${endFrame}], [1, 3], { extrapolateRight: 'clamp' })})\`
  };`);
          break;
          
        // === CUSTOM ANIMATIONS ===
        case 'custom':
          // Handle custom animations based on params.type
          const customType = motion.params?.type || 'fadeIn';
          
          if (customType === 'expandWidth') {
            animations.push(`  const ${varName} = {
    width: \`\${interpolate(frame, [${startFrame}, ${endFrame}], [0, 100], { extrapolateRight: 'clamp' })}%\`,
    opacity: interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })
  };`);
          } else if (customType === 'slideInTopLeft') {
            animations.push(`  const ${varName} = {
    transform: \`translate(\${interpolate(frame, [${startFrame}, ${endFrame}], [-100, 0], { extrapolateRight: 'clamp' })}px, \${interpolate(frame, [${startFrame}, ${endFrame}], [-100, 0], { extrapolateRight: 'clamp' })}px)\`,
    opacity: interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })
  };`);
          } else {
            // Fallback for unknown custom types
            animations.push(`  const ${varName} = {
    opacity: interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })
  };`);
          }
          break;
          
        default:
          // Fallback for any unhandled animation types
          animations.push(`  const ${varName} = {
    opacity: interpolate(frame, [${startFrame}, ${endFrame}], [0, 1], { extrapolateRight: 'clamp' })
  };`);
      }
    });
    
    // Generate merged animations for components with multiple motions
    const componentMotions = new Map<string, number[]>();
    sceneSpec.motion.forEach((motion, index) => {
      if (!componentMotions.has(motion.target)) {
        componentMotions.set(motion.target, []);
      }
      componentMotions.get(motion.target)!.push(index + 1);
    });
    
    // Create merged animation objects for components with multiple animations
    componentMotions.forEach((animationIndices, componentId) => {
      if (animationIndices.length > 1) {
        // Sanitize component ID to create valid JavaScript identifier
        const safeId = componentId.replace(/[^a-zA-Z0-9_]/g, '_');
        const mergedAnimationName = `mergedAnimation_${safeId}`;
        animations.push(`  const ${mergedAnimationName} = {
    ...${animationIndices.map(i => `animation${i}`).join(', ...')}
  };`);
      }
    });
    
    return animations.join('\n\n');
  }
  
  /**
   * Generate style definitions
   */
  private generateStyles(sceneSpec: SceneSpec): string {
    const styles: string[] = [];
    
    if (sceneSpec.style.background) {
      const bg = sceneSpec.style.background;
      switch (bg.type) {
        case 'solid':
          styles.push(`  const backgroundStyle = { backgroundColor: '${bg.value}' };`);
          break;
        case 'gradient':
          styles.push(`  const backgroundStyle = { background: '${bg.value}' };`);
          break;
        case 'image':
          styles.push(`  const backgroundStyle = { 
    backgroundImage: 'url(${bg.value})', 
    backgroundSize: 'cover', 
    backgroundPosition: 'center' 
  };`);
          break;
      }
    }
    
    return styles.join('\n');
  }
  
  /**
   * Generate AbsoluteFill props
   */
  private generateAbsoluteFillProps(sceneSpec: SceneSpec): string {
    const props: string[] = [];
    
    // Add style classes
    if (sceneSpec.style.classes && sceneSpec.style.classes.length > 0) {
      props.push(`className="${sceneSpec.style.classes.join(' ')}"`);
    }
    
    // Check for camera zoom animations
    const cameraZoomMotions = sceneSpec.motion.filter(motion => 
      motion.fn === 'zoomIn' && 
      (motion.target === 'camera' || motion.target === 'scene' || motion.target === 'mouse-cursor')
    );
    
    // Build style prop
    const styleParts: string[] = [];
    
    // Add background style
    if (sceneSpec.style.background) {
      styleParts.push('...backgroundStyle');
    }
    
    // Add camera zoom animations
    if (cameraZoomMotions.length > 0) {
      cameraZoomMotions.forEach(motion => {
        const animationIndex = sceneSpec.motion.indexOf(motion) + 1;
        styleParts.push(`...animation${animationIndex}`);
      });
    }
    
    if (styleParts.length > 0) {
      props.push(`style={{ ${styleParts.join(', ')} }}`);
    } else if (sceneSpec.style.background) {
      props.push('style={backgroundStyle}');
    }
    
    return props.length > 0 ? ` ${props.join(' ')}` : '';
  }
  
  /**
   * Generate component JSX
   */
  private generateComponents(sceneSpec: SceneSpec): string {
    const components: string[] = [];
    
    // Generate JSX for each component in the spec
    sceneSpec.components.forEach((component, index) => {
      const jsx = this.generateComponentJSX(component, index, sceneSpec);
      if (jsx) {
        components.push(`      ${jsx}`);
      }
    });
    
    // Add any orphaned text content that doesn't have a specific component target
    sceneSpec.text.forEach((textItem, index) => {
      const hasTargetComponent = sceneSpec.components.some(comp => 
        comp.id === textItem.slot || 
        comp.name?.toLowerCase() === textItem.slot ||
        (textItem.slot === 'headline' && comp.id?.includes('text'))
      );
      
      if (!hasTargetComponent && textItem.slot === 'headline') {
        // Check if this text has typewriter animation
        const typewriterMotion = sceneSpec.motion.find(motion => 
          motion.fn === 'typewriter' && motion.target === textItem.slot
        );
        
        // Create a dedicated text element for headline
        const textStyle = {
          position: 'absolute',
          left: '50%',
          top: '30%',
          transform: 'translateX(-50%)', // Proper centering
          fontSize: sceneSpec.style.typography?.fontSize || '80px',
          fontFamily: sceneSpec.style.typography?.fontFamily || 'Inter',
          color: 'white',
          textAlign: 'center',
          zIndex: 10,
        };
        
        if (typewriterMotion) {
          // Use typewriter variable
          const varName = `typewriterText_${textItem.slot || index}`;
          components.push(`      <div style={${JSON.stringify(textStyle)}}>{${varName}_current}</div>`);
        } else {
          // Use static text
          components.push(`      <div style={${JSON.stringify(textStyle)}}>${this.escapeText(textItem.content)}</div>`);
        }
      }
    });
    
    return components.join('\n');
  }
  
  /**
   * Generate JSX for a single component
   */
  private generateComponentJSX(component: ComponentSpec, index: number, sceneSpec: SceneSpec): string {
    // Generate layout styles
    const layoutStyle = this.generateLayoutStyle(component);
    const customStyle = component.props?.style || {};
    
    // Find animations for this component
    const motions = sceneSpec.motion.filter(m => m.target === component.id);
    
    // Generate props without style first
    const baseProps = this.generateComponentPropsWithoutStyle(component, sceneSpec);
    const content = this.generateComponentContent(component, sceneSpec);
    
    // Build style prop with animations
    let styleProps = '';
    if (Object.keys(layoutStyle).length > 0 || Object.keys(customStyle).length > 0 || motions.length > 0) {
      const styleParts: string[] = [];
      
      // Add layout styles
      if (Object.keys(layoutStyle).length > 0) {
        styleParts.push(JSON.stringify(layoutStyle).slice(1, -1)); // Remove { }
      }
      
      // Add custom styles
      if (Object.keys(customStyle).length > 0) {
        styleParts.push(JSON.stringify(customStyle).slice(1, -1)); // Remove { }
      }
      
      // Merge animations for this component instead of spreading them separately
      if (motions.length > 0) {
        const animationIndices = motions.map(motion => sceneSpec.motion.indexOf(motion) + 1);
        if (animationIndices.length === 1) {
          // Single animation - use spread
          styleParts.push(`...animation${animationIndices[0]}`);
        } else {
          // Multiple animations - merge them into a single object
          // Sanitize component ID to create valid JavaScript identifier
          const safeId = (component.id || 'component').replace(/[^a-zA-Z0-9_]/g, '_');
          const mergedAnimationName = `mergedAnimation_${safeId}`;
          styleParts.push(`...${mergedAnimationName}`);
        }
      }
      
      styleProps = ` style={{ ${styleParts.join(', ')} }}`;
    }
    
    // Handle different component libraries using semantic HTML with Flowbite classes
    if (component.lib === 'flowbite' && isFlowbiteAtomic(component.name)) {
      // Map Flowbite components to semantic HTML with appropriate classes
      const htmlTag = this.mapFlowbiteToHTML(component.name);
      const flowbiteClasses = this.getFlowbiteClasses(component.name);
      const enhancedProps = this.addFlowbiteClasses(baseProps, flowbiteClasses);
      return `<${htmlTag}${enhancedProps}${styleProps}>${content}</${htmlTag}>`;
    } else if (component.lib === 'flowbite-layout' && isFlowbiteLayout(component.name)) {
      // Use semantic HTML for layout components with appropriate Flowbite classes
      const actualComponent = getLayoutFallbackComponent(component.name);
      const htmlTag = this.mapFlowbiteToHTML(actualComponent);
      const flowbiteClasses = this.getFlowbiteClasses(actualComponent);
      const enhancedProps = this.addFlowbiteClasses(baseProps, flowbiteClasses);
      return `<${htmlTag}${enhancedProps}${styleProps}>${content}</${htmlTag}>`;
    } else if (component.lib === 'html') {
      return `<${component.name}${baseProps}${styleProps}>${content}</${component.name}>`;
    } else {
      // Custom or unknown components - render as div
      return `<div${baseProps}${styleProps}>${content}</div>`;
    }
  }
  
  /**
   * Generate component props without style (helper method)
   */
  private generateComponentPropsWithoutStyle(component: ComponentSpec, sceneSpec: SceneSpec): string {
    const props: string[] = [];
    
    // Add component-specific props (excluding style)
    if (component.props) {
      Object.entries(component.props).forEach(([key, value]) => {
        if (key === 'style') return; // Skip style - handled separately
        
        // Handle Flowbite-specific props that need special treatment
        if (component.lib === 'flowbite' || component.lib === 'flowbite-layout') {
          // Skip Flowbite-specific props that don't translate to HTML attributes
          const flowbiteOnlyProps = [
            'label', 'icon', 'iconPosition', 'loading', 'rounded', 'border',
            'metrics', 'title', 'headline', 'subtext', 'primaryCta', 'secondaryCta',
            'sidebarItems', 'navbarTitle', 'columns', 'data', 'rows'
          ];
          
          if (flowbiteOnlyProps.includes(key)) {
            // These props are handled in content generation or styling, not as HTML attributes
            return;
          }
        }
        
        // Add valid HTML attributes
        if (typeof value === 'string') {
          props.push(`${key}="${this.escapeText(value)}"`);
        } else if (typeof value === 'boolean') {
          props.push(value ? key : '');
        } else {
          // For complex objects, convert to data attributes
          props.push(`data-${key}={${JSON.stringify(value)}}`);
        }
      });
    }

    // Add CSS classes
    if (component.classes && component.classes.length > 0) {
      props.push(`className="${component.classes.join(' ')}"`);
    }

    // Add ID for targeting
    if (component.id) {
      props.push(`id="${component.id}"`);
    }
    
    const propsString = props.filter(Boolean).join(' ');
    return propsString ? ` ${propsString}` : '';
  }
  
  /**
   * Escape user text to prevent JSX injection
   */
  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\${/g, '\\${')
      .replace(/"/g, '\\"');
  }
  
  /**
   * Generate component content (text, children)
   */
  private generateComponentContent(component: ComponentSpec, sceneSpec: SceneSpec): string {
    // Void elements (input, img, br, hr, etc.) never have content
    const voidElements = ['input', 'img', 'br', 'hr', 'area', 'base', 'col', 'embed', 'link', 'meta', 'source', 'track', 'wbr'];
    
    // For Flowbite components, check if they're self-closing
    if (component.lib === 'flowbite' && isFlowbiteAtomic(component.name)) {
      const selfClosingFlowbite = ['TextInput', 'FileInput', 'SearchInput', 'NumberInput', 'PhoneInput', 'Checkbox', 'Radio', 'Toggle', 'Range', 'Progress', 'Spinner'];
      if (selfClosingFlowbite.includes(component.name)) {
        return ''; // Self-closing Flowbite components
      }
    }
    
    // Handle Flowbite component content based on props
    if (component.lib === 'flowbite' || component.lib === 'flowbite-layout') {
      // Button content from label prop
      if (component.name === 'Button' && component.props?.label) {
        return this.escapeText(component.props.label);
      }
      
      // Table content from columns and data/rows props
      if (component.name === 'Table' || component.name === 'CrudLayoutDefault') {
        return this.generateTableContent(component);
      }
      
      // Sidebar content from sidebarItems prop
      if (component.name === 'Sidebar' || component.name === 'ApplicationShellWithSidebarAndNavbar') {
        return this.generateSidebarContent(component);
      }
      
      // Card/Dashboard content from title and metrics
      if (component.name === 'Card' || component.name === 'CrudLayoutDefault') {
        return this.generateCardContent(component);
      }
    }
    
    // Look for text content with slot matching (improved mapping)
    const textContent = sceneSpec.text.find(text => 
      text.slot === component.id || // Exact ID match
      text.slot === component.name?.toLowerCase() || // Component name match
      (text.slot === 'headline' && component.id?.includes('text')) // Headline fallback
    );
    
    if (textContent) {
      // Check if this text has typewriter animation
      const typewriterMotion = sceneSpec.motion.find(motion => 
        motion.fn === 'typewriter' && 
        (motion.target === textContent.slot || motion.target === component.id)
      );
      
      if (typewriterMotion) {
        // Use typewriter variable instead of static text
        const varName = `typewriterText_${textContent.slot || 'text'}`;
        return `{${varName}_current}`;
      } else {
        // Use static text
        return this.escapeText(textContent.content);
      }
    }
    
    // Special handling for specific component types
    if (component.name === 'Button') {
      // Use label prop if available, otherwise default button text
      return component.props?.label ? this.escapeText(component.props.label) : 'Click Me';
    }
    
    // For custom components like MouseCursor, return empty (they're visual only)
    if (component.lib === 'custom') {
      return '';
    }
    
    // Default: no content for most components
    return '';
  }

  /**
   * Generate table content from columns and data props
   */
  private generateTableContent(component: ComponentSpec): string {
    const columns = component.props?.columns;
    const data = component.props?.data || component.props?.rows;
    
    if (!columns || !Array.isArray(columns)) {
      return 'Table Content';
    }
    
    let content = '<thead><tr>';
    columns.forEach(col => {
      content += `<th>${this.escapeText(String(col))}</th>`;
    });
    content += '</tr></thead>';
    
    if (data && Array.isArray(data)) {
      content += '<tbody>';
      data.forEach(row => {
        if (Array.isArray(row)) {
          content += '<tr>';
          row.forEach(cell => {
            content += `<td>${this.escapeText(String(cell))}</td>`;
          });
          content += '</tr>';
        }
      });
      content += '</tbody>';
    }
    
    return content;
  }
  
  /**
   * Generate sidebar content from sidebarItems prop
   */
  private generateSidebarContent(component: ComponentSpec): string {
    const items = component.props?.sidebarItems;
    const title = component.props?.navbarTitle || component.props?.title;
    
    let content = '';
    
    if (title) {
      content += `<h2 class="mb-4 text-lg font-semibold">${this.escapeText(title)}</h2>`;
    }
    
    if (items && Array.isArray(items)) {
      content += '<ul class="space-y-2">';
      items.forEach(item => {
        content += `<li><a href="#" class="block p-2 rounded hover:bg-gray-100">${this.escapeText(String(item))}</a></li>`;
      });
      content += '</ul>';
    } else {
      content += '<p>Navigation Menu</p>';
    }
    
    return content;
  }
  
  /**
   * Generate card content from title and metrics props
   */
  private generateCardContent(component: ComponentSpec): string {
    const title = component.props?.title;
    const metrics = component.props?.metrics;
    
    let content = '';
    
    if (title) {
      content += `<h3 class="text-lg font-semibold mb-4">${this.escapeText(title)}</h3>`;
    }
    
    if (metrics && Array.isArray(metrics)) {
      content += '<div class="grid grid-cols-2 gap-4">';
      metrics.forEach(metric => {
        if (typeof metric === 'object' && metric.label && metric.value) {
          content += `<div class="text-center">`;
          content += `<div class="text-2xl font-bold">${this.escapeText(String(metric.value))}</div>`;
          content += `<div class="text-sm text-gray-600">${this.escapeText(String(metric.label))}</div>`;
          content += `</div>`;
        }
      });
      content += '</div>';
    } else {
      content += '<p>Dashboard Content</p>';
    }
    
    return content;
  }

  /**
   * Generate layout positioning styles
   */
  private generateLayoutStyle(component: ComponentSpec): Record<string, any> {
    const styles: Record<string, any> = {};
    
    if (component.layout) {
      const layout = component.layout;
      if (layout.x !== undefined) styles.left = `${layout.x * 100}%`;
      if (layout.y !== undefined) styles.top = `${layout.y * 100}%`;
      if (layout.width !== undefined) styles.width = `${layout.width * 100}%`;
      if (layout.height !== undefined) styles.height = `${layout.height * 100}%`;
      if (layout.zIndex !== undefined) styles.zIndex = layout.zIndex;
      
      // Add absolute positioning for layout
      if (layout.x !== undefined || layout.y !== undefined) {
        styles.position = 'absolute';
      }
    }
    
    return styles;
  }

  /**
   * Map Flowbite component names to HTML tags (fallback only)
   */
  private mapFlowbiteToHTML(componentName: string): string {
    const mapping: Record<string, string> = {
      'TextInput': 'input',
      'Textarea': 'textarea',
      'Button': 'button',
      'Select': 'select',
      'Checkbox': 'input',
      'Radio': 'input',
      'Toggle': 'input',
      'Card': 'div',
      'Modal': 'div',
      'Alert': 'div',
      'Badge': 'span',
      'Avatar': 'div',
      'Spinner': 'div',
      'Progress': 'div',
      'Tooltip': 'div',
      'Dropdown': 'div',
      'Navbar': 'nav',
      'Sidebar': 'aside',
      'Footer': 'footer',
      'Breadcrumb': 'nav',
      'Pagination': 'nav',
      'Table': 'table',
      'Tabs': 'div',
      'Timeline': 'div',
      'Carousel': 'div',
    };
    
    return mapping[componentName] || 'div';
  }

  /**
   * Get Flowbite CSS classes for a component
   */
  private getFlowbiteClasses(componentName: string): string {
    const classMap: Record<string, string> = {
      'Button': 'text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800',
      'TextInput': 'bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500',
      'Card': 'max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700',
      'Table': 'w-full text-sm text-left text-gray-500 dark:text-gray-400',
      'Sidebar': 'h-screen px-3 py-4 overflow-y-auto bg-gray-50 dark:bg-gray-800',
      'Navbar': 'bg-white border-gray-200 dark:bg-gray-900',
      'Modal': 'fixed top-0 left-0 right-0 z-50 hidden w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full',
      'Alert': 'flex items-center p-4 mb-4 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400',
      'Badge': 'bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300',
      'Spinner': 'inline w-4 h-4 mr-3 text-white animate-spin',
      'Progress': 'w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700',
      'Dropdown': 'z-10 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700',
      'Drawer': 'fixed top-0 left-0 z-40 h-screen p-4 overflow-y-auto transition-transform -translate-x-full bg-white w-80 dark:bg-gray-800',
      'Footer': 'bg-white rounded-lg shadow dark:bg-gray-900 m-4',
      'Jumbotron': 'py-8 px-4 mx-auto max-w-screen-xl text-center lg:py-16',
      'Pagination': 'flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6',
    };
    
    return classMap[componentName] || '';
  }
  
  /**
   * Add Flowbite classes to existing props
   */
  private addFlowbiteClasses(baseProps: string, flowbiteClasses: string): string {
    if (!flowbiteClasses) return baseProps;
    
    // Extract existing className if present
    const classNameMatch = baseProps.match(/className="([^"]*)"/);
    const existingClasses = classNameMatch ? classNameMatch[1] : '';
    
    // Combine classes
    const combinedClasses = `${flowbiteClasses} ${existingClasses}`.trim();
    
    if (classNameMatch) {
      // Replace existing className
      return baseProps.replace(/className="[^"]*"/, `className="${combinedClasses}"`);
    } else {
      // Add className
      return `${baseProps} className="${combinedClasses}"`;
    }
  }

  /**
   * Generate typewriter text calculations for letter-by-letter reveals
   */
  private generateTypewriterTexts(sceneSpec: SceneSpec): string {
    const typewriterTexts: string[] = [];
    
    // Find text items that have typewriter animations
    sceneSpec.text.forEach((textItem, index) => {
      // Check if this text has a typewriter animation
      const typewriterMotion = sceneSpec.motion.find(motion => 
        motion.fn === 'typewriter' && 
        (motion.target === textItem.slot || motion.target === `text-${index}`)
      );
      
      if (typewriterMotion) {
        const startFrame = typewriterMotion.frames?.start || (typewriterMotion.delay || 0) * 30;
        const endFrame = typewriterMotion.frames?.end || ((typewriterMotion.delay || 0) + (typewriterMotion.duration || 1)) * 30;
        const textContent = textItem.content;
        const varName = `typewriterText_${textItem.slot || index}`;
        
        typewriterTexts.push(`  const ${varName} = "${this.escapeText(textContent)}";
  const ${varName}_chars = Math.round(interpolate(frame, [${startFrame}, ${endFrame}], [0, ${textContent.length}], { extrapolateRight: 'clamp' }));
  const ${varName}_current = ${varName}.slice(0, ${varName}_chars);`);
      }
    });
    
    return typewriterTexts.join('\n\n');
  }
}

// Export singleton instance
export const sceneSpecGenerator = new SceneSpecGenerator();