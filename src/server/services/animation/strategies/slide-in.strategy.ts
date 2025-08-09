/**
 * Slide In Animation Strategy
 * Slides component in from a direction
 */

import { AnimationStrategy, Animation } from './base.strategy';
import type { ParsedComponent } from '../../github/component-parser.service';

export type SlideDirection = 'left' | 'right' | 'top' | 'bottom';

export class SlideInStrategy extends AnimationStrategy {
  name = 'slide-in';
  
  constructor(
    private direction: SlideDirection = 'left',
    private distance: number = 300
  ) {
    super();
  }
  
  generate(component: ParsedComponent): Animation[] {
    const animations: Animation[] = [];
    const componentType = this.detectComponentType(component);
    
    // Adjust distance based on component type
    const actualDistance = this.getDistanceForComponent(componentType);
    
    // Main slide animation
    const axis = ['left', 'right'].includes(this.direction) ? 'X' : 'Y';
    const startValue = this.getStartValue(actualDistance);
    
    animations.push(
      this.createSpring(
        'slidePosition',
        'transform',
        `translate${axis}(${startValue}px)`,
        `translate${axis}(0px)`,
        30
      )
    );
    
    // Add fade in for smoother effect
    animations.push(
      this.createInterpolation(
        'slideOpacity',
        'opacity',
        [0, 15],
        [0, 1]
      )
    );
    
    // If component has staggerable children, add stagger
    if (this.hasStaggerableChildren(component)) {
      animations.push(
        this.createInterpolation(
          'childStagger',
          'childOpacity',
          [10, 40],
          [0, 1]
        )
      );
    }
    
    return animations;
  }
  
  getTiming() {
    return {
      duration: 60,
      fps: 30,
    };
  }
  
  private getDistanceForComponent(type: string): number {
    const distances: Record<string, number> = {
      sidebar: 300,
      navbar: 100,
      modal: 0, // Modals usually fade/scale instead
      card: 50,
      button: 20,
      menu: 150,
      dropdown: 80,
      toast: 200,
      generic: this.distance,
    };
    
    return distances[type] || this.distance;
  }
  
  private getStartValue(distance: number): number {
    switch (this.direction) {
      case 'left':
      case 'top':
        return -distance;
      case 'right':
      case 'bottom':
        return distance;
      default:
        return -distance;
    }
  }
}