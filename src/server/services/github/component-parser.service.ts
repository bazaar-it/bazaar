/**
 * Component Parser Service
 * Parses React, Vue, and Angular components using AST
 */

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import generate from '@babel/generator';

export interface ParsedComponent {
  name: string;
  type: 'function' | 'class' | 'arrow' | 'vue' | 'angular' | 'unknown';
  framework: 'react' | 'vue' | 'angular' | 'svelte' | 'unknown';
  props: Record<string, any>;
  state: Record<string, any>;
  jsx: any;
  styles: {
    inline?: Record<string, any>;
    classes?: string[];
    tailwind?: string[];
    cssModules?: Record<string, string>;
    styledComponents?: string[];
  };
  content: {
    text: string[];
    images: Array<{ src: string; alt?: string }>;
    icons: Array<{ name: string; props?: any }>;
    links: Array<{ href: string; text: string }>;
    data: Array<{ type: string; source: string }>;
  };
  imports: Array<{ source: string; specifiers: any[] }>;
  hooks: string[];
  animations: string[];
  interactions: string[];
}

export class ComponentParser {
  private code: string;
  private ast: any;
  private errors: any[] = [];
  
  constructor(code: string) {
    this.code = code;
    this.parseCode();
  }
  
  /**
   * Parse code with error recovery
   */
  private parseCode() {
    try {
      // Try TypeScript + JSX
      this.ast = parse(this.code, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'dynamicImport',
          'optionalChaining',
          'nullishCoalescingOperator',
        ],
        errorRecovery: true,
      });
    } catch (error) {
      // Fallback to plain JSX
      try {
        this.ast = parse(this.code, {
          sourceType: 'module',
          plugins: ['jsx'],
          errorRecovery: true,
        });
      } catch (fallbackError) {
        this.errors.push(fallbackError);
        // Create minimal AST for regex fallback
        this.ast = null;
      }
    }
  }
  
  /**
   * Extract component information
   */
  extract(): ParsedComponent {
    const component: ParsedComponent = {
      name: '',
      type: 'unknown',
      framework: 'unknown',
      props: {},
      state: {},
      jsx: null,
      styles: {},
      content: {
        text: [],
        images: [],
        icons: [],
        links: [],
        data: [],
      },
      imports: [],
      hooks: [],
      animations: [],
      interactions: [],
    };
    
    if (!this.ast) {
      return this.extractWithRegex();
    }
    
    // Detect framework from imports
    component.framework = this.detectFramework();
    
    // Extract component based on framework
    if (component.framework === 'react') {
      this.extractReactComponent(component);
    } else if (component.framework === 'vue') {
      this.extractVueComponent(component);
    } else {
      this.extractGenericComponent(component);
    }
    
    // Extract additional information
    this.extractStyles(component);
    this.extractContent(component);
    this.extractInteractions(component);
    
    return component;
  }
  
  /**
   * Detect framework from imports
   */
  private detectFramework(): 'react' | 'vue' | 'angular' | 'svelte' | 'unknown' {
    let framework: any = 'unknown';
    
    traverse(this.ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        if (source === 'react' || source.startsWith('@react')) {
          framework = 'react';
        } else if (source === 'vue' || source.startsWith('@vue')) {
          framework = 'vue';
        } else if (source.startsWith('@angular')) {
          framework = 'angular';
        } else if (source === 'svelte') {
          framework = 'svelte';
        }
      },
    });
    
    return framework;
  }
  
  /**
   * Extract React component
   */
  private extractReactComponent(component: ParsedComponent) {
    traverse(this.ast, {
      // Function components
      FunctionDeclaration(path) {
        const name = path.node.id?.name;
        if (name && isComponentName(name)) {
          component.type = 'function';
          component.name = name;
          component.props = extractProps(path.node.params[0]);
          component.jsx = findJSX(path.node.body);
          
          // Extract hooks
          path.traverse({
            CallExpression(innerPath) {
              const callee = innerPath.node.callee;
              if (t.isIdentifier(callee) && callee.name.startsWith('use')) {
                component.hooks.push(callee.name);
              }
            },
          });
        }
      },
      
      // Arrow function components
      VariableDeclarator(path) {
        const name = (path.node.id as any)?.name;
        if (name && isComponentName(name)) {
          const init = path.node.init;
          if (t.isArrowFunctionExpression(init) || t.isFunctionExpression(init)) {
            component.type = 'arrow';
            component.name = name;
            component.props = extractProps(init.params[0]);
            component.jsx = findJSX(init.body);
          }
        }
      },
      
      // Class components
      ClassDeclaration(path) {
        const superClass = path.node.superClass;
        if (superClass) {
          const name = path.node.id?.name;
          if (name) {
            component.type = 'class';
            component.name = name;
            
            // Extract state from constructor
            path.traverse({
              ClassProperty(innerPath) {
                if ((innerPath.node.key as any).name === 'state') {
                  component.state = extractObjectExpression(innerPath.node.value);
                }
              },
            });
            
            // Find render method
            const renderMethod = path.node.body.body.find(
              (member: any) => 
                t.isClassMethod(member) && 
                (member.key as any).name === 'render'
            );
            
            if (renderMethod) {
              component.jsx = findJSX((renderMethod as any).body);
            }
          }
        }
      },
    });
  }
  
  /**
   * Extract Vue component (simplified)
   */
  private extractVueComponent(component: ParsedComponent) {
    // Vue SFC would need different parsing
    // For now, handle Vue.js component objects
    traverse(this.ast, {
      ExportDefaultDeclaration(path) {
        if (t.isObjectExpression(path.node.declaration)) {
          const obj = path.node.declaration;
          obj.properties.forEach((prop: any) => {
            if (prop.key.name === 'name') {
              component.name = prop.value.value;
            } else if (prop.key.name === 'props') {
              component.props = extractObjectExpression(prop.value);
            } else if (prop.key.name === 'data') {
              // Extract data function
              if (t.isFunctionExpression(prop.value)) {
                const returnStatement = prop.value.body.body.find(
                  (s: any) => t.isReturnStatement(s)
                );
                if (returnStatement) {
                  component.state = extractObjectExpression(returnStatement.argument);
                }
              }
            } else if (prop.key.name === 'template') {
              component.jsx = prop.value.value; // Template string
            }
          });
        }
      },
    });
  }
  
  /**
   * Extract generic component
   */
  private extractGenericComponent(component: ParsedComponent) {
    // Fallback extraction for unknown frameworks
    this.extractReactComponent(component);
  }
  
  /**
   * Extract styles from component
   */
  private extractStyles(component: ParsedComponent) {
    if (!component.jsx) return;
    
    traverse(this.ast, {
      JSXAttribute(path) {
        const name = (path.node.name as any).name;
        
        // Inline styles
        if (name === 'style') {
          const value = path.node.value;
          if (t.isJSXExpressionContainer(value)) {
            const expr = value.expression;
            if (t.isObjectExpression(expr)) {
              component.styles.inline = extractObjectExpression(expr);
            }
          }
        }
        
        // Class names
        if (name === 'className' || name === 'class') {
          const value = path.node.value;
          if (t.isStringLiteral(value)) {
            const classes = value.value.split(' ');
            component.styles.classes = classes;
            
            // Detect Tailwind classes
            const tailwindClasses = classes.filter(cls => 
              isTailwindClass(cls)
            );
            if (tailwindClasses.length > 0) {
              component.styles.tailwind = tailwindClasses;
            }
          }
        }
      },
      
      // Styled components
      TaggedTemplateExpression(path) {
        const tag = path.node.tag;
        if (t.isMemberExpression(tag)) {
          const obj = tag.object;
          if (t.isIdentifier(obj) && obj.name === 'styled') {
            const styledComponent = generate(path.node).code;
            if (!component.styles.styledComponents) {
              component.styles.styledComponents = [];
            }
            component.styles.styledComponents.push(styledComponent);
          }
        }
      },
    });
  }
  
  /**
   * Extract content from component
   */
  private extractContent(component: ParsedComponent) {
    if (!component.jsx) return;
    
    traverseJSX(component.jsx, {
      text: (text: string) => {
        if (text.trim()) {
          component.content.text.push(text.trim());
        }
      },
      
      element: (element: any) => {
        const name = element.openingElement?.name?.name;
        
        // Images
        if (name === 'img' || name === 'Image') {
          const src = getAttributeValue(element, 'src');
          const alt = getAttributeValue(element, 'alt');
          if (src) {
            component.content.images.push({ src, alt });
          }
        }
        
        // Links
        if (name === 'a' || name === 'Link') {
          const href = getAttributeValue(element, 'href') || 
                       getAttributeValue(element, 'to');
          const text = extractTextFromJSX(element);
          if (href) {
            component.content.links.push({ href, text });
          }
        }
        
        // Icons (common patterns)
        if (isIconComponent(name)) {
          component.content.icons.push({
            name,
            props: extractJSXAttributes(element),
          });
        }
      },
      
      expression: (expr: any) => {
        // Map expressions (lists)
        if (t.isCallExpression(expr)) {
          const callee = expr.callee;
          if (t.isMemberExpression(callee)) {
            const prop = callee.property;
            if (t.isIdentifier(prop) && prop.name === 'map') {
              const source = generate(callee.object).code;
              component.content.data.push({
                type: 'list',
                source,
              });
            }
          }
        }
      },
    });
  }
  
  /**
   * Extract interactions from component
   */
  private extractInteractions(component: ParsedComponent) {
    if (!component.jsx) return;
    
    traverse(this.ast, {
      JSXAttribute(path) {
        const name = (path.node.name as any).name;
        
        // Event handlers
        if (name.startsWith('on')) {
          const eventType = name.substring(2).toLowerCase();
          if (!component.interactions.includes(eventType)) {
            component.interactions.push(eventType);
          }
        }
      },
    });
    
    // Detect animations
    traverse(this.ast, {
      CallExpression(path) {
        const callee = path.node.callee;
        
        // Framer Motion
        if (t.isIdentifier(callee) && callee.name === 'motion') {
          component.animations.push('framer-motion');
        }
        
        // React Spring
        if (t.isIdentifier(callee) && 
            (callee.name === 'useSpring' || callee.name === 'animated')) {
          component.animations.push('react-spring');
        }
      },
    });
  }
  
  /**
   * Fallback extraction using regex
   */
  private extractWithRegex(): ParsedComponent {
    const component: ParsedComponent = {
      name: '',
      type: 'unknown',
      framework: 'unknown',
      props: {},
      state: {},
      jsx: null,
      styles: {},
      content: {
        text: [],
        images: [],
        icons: [],
        links: [],
        data: [],
      },
      imports: [],
      hooks: [],
      animations: [],
      interactions: [],
    };
    
    // Extract component name
    const nameMatch = this.code.match(
      /(?:export\s+)?(?:default\s+)?(?:function|const|class)\s+(\w+)/
    );
    if (nameMatch) {
      component.name = nameMatch[1];
    }
    
    // Extract text content
    const textMatches = this.code.matchAll(/>([^<>]+)</g);
    for (const match of textMatches) {
      if (match[1].trim()) {
        component.content.text.push(match[1].trim());
      }
    }
    
    // Extract class names
    const classMatches = this.code.matchAll(/className="([^"]+)"/g);
    for (const match of classMatches) {
      const classes = match[1].split(' ');
      component.styles.classes = [...(component.styles.classes || []), ...classes];
    }
    
    return component;
  }
}

// Helper functions
function isComponentName(name: string): boolean {
  return /^[A-Z]/.test(name);
}

function extractProps(param: any): Record<string, any> {
  if (!param) return {};
  
  if (t.isObjectPattern(param)) {
    const props: Record<string, any> = {};
    param.properties.forEach((prop: any) => {
      if (t.isObjectProperty(prop)) {
        const key = (prop.key as any).name;
        props[key] = prop.value ? 'any' : 'required';
      }
    });
    return props;
  }
  
  return {};
}

function findJSX(node: any): any {
  if (!node) return null;
  
  if (t.isJSXElement(node) || t.isJSXFragment(node)) {
    return node;
  }
  
  if (t.isBlockStatement(node)) {
    for (const statement of node.body) {
      if (t.isReturnStatement(statement)) {
        return findJSX(statement.argument);
      }
    }
  }
  
  if (t.isReturnStatement(node)) {
    return findJSX(node.argument);
  }
  
  if (t.isConditionalExpression(node)) {
    return findJSX(node.consequent) || findJSX(node.alternate);
  }
  
  if (t.isParenthesizedExpression(node)) {
    return findJSX(node.expression);
  }
  
  return null;
}

function extractObjectExpression(node: any): Record<string, any> {
  if (!t.isObjectExpression(node)) return {};
  
  const obj: Record<string, any> = {};
  node.properties.forEach((prop: any) => {
    if (t.isObjectProperty(prop)) {
      const key = (prop.key as any).name || (prop.key as any).value;
      const value = prop.value;
      
      if (t.isStringLiteral(value)) {
        obj[key] = value.value;
      } else if (t.isNumericLiteral(value)) {
        obj[key] = value.value;
      } else if (t.isBooleanLiteral(value)) {
        obj[key] = value.value;
      } else if (t.isObjectExpression(value)) {
        obj[key] = extractObjectExpression(value);
      } else {
        obj[key] = generate(value).code;
      }
    }
  });
  
  return obj;
}

function isTailwindClass(className: string): boolean {
  // Common Tailwind patterns
  const patterns = [
    /^[mp][tlbrxy]?-\d+$/,
    /^w-\d+$/,
    /^h-\d+$/,
    /^text-/,
    /^bg-/,
    /^border-/,
    /^flex/,
    /^grid/,
    /^rounded/,
    /^shadow/,
  ];
  
  return patterns.some(pattern => pattern.test(className));
}

function isIconComponent(name: string): boolean {
  if (!name) return false;
  
  // Common icon component patterns
  return (
    name.endsWith('Icon') ||
    name.startsWith('Icon') ||
    name.includes('Icon') ||
    ['FaIcon', 'MdIcon', 'IoIcon', 'AiIcon', 'BiIcon'].includes(name)
  );
}

function getAttributeValue(element: any, attrName: string): string | undefined {
  const attr = element.openingElement?.attributes?.find(
    (a: any) => a.name?.name === attrName
  );
  
  if (!attr) return undefined;
  
  if (t.isStringLiteral(attr.value)) {
    return attr.value.value;
  }
  
  if (t.isJSXExpressionContainer(attr.value)) {
    return generate(attr.value.expression).code;
  }
  
  return undefined;
}

function extractTextFromJSX(element: any): string {
  const texts: string[] = [];
  
  traverseJSX(element, {
    text: (text: string) => texts.push(text),
  });
  
  return texts.join(' ');
}

function extractJSXAttributes(element: any): Record<string, any> {
  const attrs: Record<string, any> = {};
  
  element.openingElement?.attributes?.forEach((attr: any) => {
    if (t.isJSXAttribute(attr)) {
      const name = attr.name.name;
      const value = attr.value;
      
      if (t.isStringLiteral(value)) {
        attrs[name] = value.value;
      } else if (t.isJSXExpressionContainer(value)) {
        attrs[name] = generate(value.expression).code;
      } else {
        attrs[name] = true;
      }
    }
  });
  
  return attrs;
}

function traverseJSX(
  node: any,
  handlers: {
    text?: (text: string) => void;
    element?: (element: any) => void;
    expression?: (expr: any) => void;
  }
) {
  if (!node) return;
  
  if (t.isJSXText(node)) {
    handlers.text?.(node.value);
  } else if (t.isJSXElement(node)) {
    handlers.element?.(node);
    node.children?.forEach((child: any) => traverseJSX(child, handlers));
  } else if (t.isJSXFragment(node)) {
    node.children?.forEach((child: any) => traverseJSX(child, handlers));
  } else if (t.isJSXExpressionContainer(node)) {
    handlers.expression?.(node.expression);
  }
}