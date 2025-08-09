/**
 * Base Animation Strategy
 * Abstract class for all animation strategies
 */

import type { ParsedComponent } from '../../github/component-parser.service';

export interface Animation {
  name: string;
  type: 'spring' | 'interpolate' | 'sequence';
  property?: string;
  variable?: string;
  from?: any;
  to?: any;
  inputRange?: number[];
  outputRange?: any[];
  duration?: number;
  delay?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
  extrapolateLeft?: string;
  extrapolateRight?: string;
}

export abstract class AnimationStrategy {
  abstract name: string;
  
  /**
   * Generate animations for a component
   */
  abstract generate(component: ParsedComponent): Animation[];
  
  /**
   * Get timing configuration
   */
  abstract getTiming(): {
    duration: number;
    fps: number;
  };
  
  /**
   * Helper to create spring animation
   */
  protected createSpring(
    name: string,
    property: string,
    from: any,
    to: any,
    duration: number = 30
  ): Animation {
    return {
      name,
      type: 'spring',
      property,
      variable: name,
      from,
      to,
      duration,
      damping: 100,
      stiffness: 100,
      mass: 1,
    };
  }
  
  /**
   * Helper to create interpolation
   */
  protected createInterpolation(
    name: string,
    property: string,
    inputRange: number[],
    outputRange: any[],
    extrapolate: string = 'clamp'
  ): Animation {
    return {
      name,
      type: 'interpolate',
      property,
      variable: name,
      inputRange,
      outputRange,
      extrapolateLeft: extrapolate,
      extrapolateRight: extrapolate,
    };
  }
  
  /**
   * Helper to create sequence
   */
  protected createSequence(
    name: string,
    from: number,
    to: number
  ): Animation {
    return {
      name,
      type: 'sequence',
      from,
      to,
    };
  }
  
  /**
   * Detect component type for intelligent animation
   */
  protected detectComponentType(component: ParsedComponent): string {
    const name = component.name.toLowerCase();
    
    if (name.includes('sidebar')) return 'sidebar';
    if (name.includes('navbar') || name.includes('header')) return 'navbar';
    if (name.includes('modal') || name.includes('dialog')) return 'modal';
    if (name.includes('card')) return 'card';
    if (name.includes('button')) return 'button';
    if (name.includes('menu')) return 'menu';
    if (name.includes('dropdown')) return 'dropdown';
    if (name.includes('toast') || name.includes('notification')) return 'toast';
    if (name.includes('tab')) return 'tabs';
    if (name.includes('accordion')) return 'accordion';
    
    // Check content for hints
    if (component.content.links.length > 3) return 'navigation';
    if (component.content.images.length > 0) return 'gallery';
    if (component.content.data.some(d => d.type === 'list')) return 'list';
    
    return 'generic';
  }
  
  /**
   * Check if component has children to stagger
   */
  protected hasStaggerableChildren(component: ParsedComponent): boolean {
    return (
      component.content.data.some(d => d.type === 'list') ||
      component.content.text.length > 3 ||
      component.content.links.length > 2
    );
  }
}