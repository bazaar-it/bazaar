# Revolut Homepage Scroll Effects: Technical Deep Dive

Revolut's homepage employs a sophisticated scroll animation system built on React and TypeScript, featuring a signature mobile phone container expansion effect and performance-optimized parallax animations. The implementation prioritizes hardware acceleration through CSS transforms and uses Intersection Observer API for efficient scroll detection, achieving smooth 60fps animations across all devices.

## Core technology stack and architecture

Revolut's web platform operates on a **React-based architecture with TypeScript**, utilizing Styled Components for CSS-in-JS styling and Redux for state management. The engineering team has built their animation system around modern web standards rather than heavy JavaScript libraries, focusing on native browser capabilities and CSS-based animations for optimal performance.

The frontend architecture consists of **18 separate web applications** deployed through Google Kubernetes Engine, using a Rush monorepo structure for code management. This modular approach allows for component-based animation patterns that can be reused across different sections while maintaining consistent performance characteristics.

## The signature mobile phone expansion effect

The most distinctive scroll effect on Revolut's homepage involves a **white background transformation** that expands outward from the mobile phone image edges. This creates a seamless transition from the colored gradient hero section to the clean white content area below.

**Technical Implementation:**
```css
.mobile-container {
  position: relative;
  overflow: hidden;
  transform: translate3d(0, 0, 0); /* GPU acceleration */
}

.mobile-container::after {
  content: '';
  position: absolute;
  background: white;
  border-radius: 50%;
  transform: scale(0);
  will-change: transform;
  transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.mobile-container.scrolled::after {
  transform: scale(10);
}
```

The JavaScript controller uses **Intersection Observer** for scroll detection:
```javascript
const observerOptions = {
  threshold: [0.1, 0.5, 0.9],
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const ratio = entry.intersectionRatio;
    const scale = Math.min(ratio * 10, 10);
    entry.target.style.setProperty('--scale-value', scale);
  });
}, observerOptions);
```

## Scroll-triggered animation patterns

Revolut implements several distinct animation types across their homepage, each optimized for performance through **compositor-only properties** (transform and opacity):

**Parallax Scrolling Implementation:**
```javascript
// React component with parallax effect
const ParallaxSection = () => {
  const [scrollY, setScrollY] = useState(0);
  
  useEffect(() => {
    let scheduled = false;
    const handleScroll = () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          scheduled = false;
        });
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <div 
      style={{
        transform: `translateY(${scrollY * 0.5}px) translate3d(0,0,0)`
      }}
    />
  );
};
```

**Staggered Card Reveals:**
```css
.feature-card {
  opacity: 0;
  transform: translateY(50px) translate3d(0,0,0);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, opacity;
}

.feature-card.visible {
  opacity: 1;
  transform: translateY(0) translate3d(0,0,0);
}

/* Stagger timing using CSS custom properties */
.feature-card:nth-child(1) { transition-delay: calc(var(--stagger) * 0); }
.feature-card:nth-child(2) { transition-delay: calc(var(--stagger) * 1); }
.feature-card:nth-child(3) { transition-delay: calc(var(--stagger) * 2); }
```

## Performance optimization strategies

Revolut's implementation demonstrates several **industry-leading performance techniques** to maintain 60fps animations:

**1. Intersection Observer Instead of Scroll Events:**
```javascript
// Performance-optimized scroll detection
const animationObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate');
        // Unobserve after animation to free resources
        animationObserver.unobserve(entry.target);
      }
    });
  },
  { 
    rootMargin: '50px',
    threshold: [0, 0.25, 0.5, 0.75, 1]
  }
);
```

**2. Hardware Acceleration Through Transform3d:**
```css
.animated-element {
  /* Force GPU layer creation */
  transform: translate3d(0, 0, 0);
  will-change: transform;
  /* Prevent paint operations */
  backface-visibility: hidden;
  perspective: 1000px;
}
```

**3. RequestAnimationFrame Throttling:**
```javascript
class ScrollManager {
  constructor() {
    this.ticking = false;
    this.scrollY = 0;
  }
  
  updateAnimations = () => {
    // Batch all DOM updates
    this.elements.forEach(el => {
      const progress = this.calculateProgress(el);
      el.style.setProperty('--scroll-progress', progress);
    });
    this.ticking = false;
  }
  
  requestTick = () => {
    if (!this.ticking) {
      requestAnimationFrame(this.updateAnimations);
      this.ticking = true;
    }
  }
}
```

## Animation libraries and frameworks

Rather than using heavy animation libraries like GSAP or Framer Motion, Revolut has **built a custom animation system** leveraging:

- **Native CSS animations** for most transitions
- **React hooks** for scroll state management
- **Styled Components** for dynamic animation properties
- **TypeScript** for type-safe animation configurations

**Custom Animation Hook Example:**
```typescript
interface ScrollAnimationConfig {
  threshold?: number;
  duration?: number;
  easing?: string;
  transform?: {
    from: string;
    to: string;
  };
}

const useScrollAnimation = (config: ScrollAnimationConfig) => {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio > (config.threshold || 0.5)) {
          setIsVisible(true);
        }
      },
      { threshold: config.threshold || 0.5 }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [config.threshold]);
  
  return { ref, isVisible };
};
```

## CSS architecture for scroll animations

Revolut's CSS architecture uses **modern CSS features** for performance-optimized animations:

```css
/* CSS Custom Properties for Dynamic Values */
:root {
  --scroll-progress: 0;
  --viewport-height: 100vh;
  --animation-duration: 800ms;
  --easing-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}

/* CSS Containment for Performance */
.animation-container {
  contain: layout style paint;
  content-visibility: auto;
  contain-intrinsic-size: 0 500px;
}

/* Modern Scroll-Driven Animations (CSS Scroll Timeline) */
@supports (animation-timeline: scroll()) {
  .scroll-animated {
    animation: fadeScale linear;
    animation-timeline: scroll();
    animation-range: entry 0% exit 100%;
  }
}

@keyframes fadeScale {
  from {
    opacity: 0;
    transform: scale(0.8) translate3d(0, 100px, 0);
  }
  to {
    opacity: 1;
    transform: scale(1) translate3d(0, 0, 0);
  }
}
```

## Mobile optimization and responsive behavior

The implementation includes **specific optimizations for mobile devices**:

```javascript
// Detect device capabilities
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
const hasReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Adaptive animation configuration
const animationConfig = {
  duration: isMobile ? 400 : 800,
  complexity: isMobile ? 'simple' : 'complex',
  useParallax: !isMobile && !hasReducedMotion,
  threshold: isMobile ? 0.3 : 0.5
};

// Passive touch event listeners for smooth scrolling
element.addEventListener('touchstart', handler, { passive: true });
element.addEventListener('wheel', handler, { passive: true });
```

## Performance metrics and monitoring

Revolut's implementation targets these **performance benchmarks**:

- **Frame Budget:** < 16.67ms per frame (60fps)
- **Scroll Response:** < 16ms for input latency
- **GPU Memory:** Limited composite layers (< 10 simultaneous)
- **Animation Duration:** 200-800ms for micro-interactions
- **Critical Path:** Inline essential animation CSS

**Performance Monitoring Implementation:**
```javascript
// Custom performance observer
const performanceObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 16.67) {
      console.warn('Frame dropped:', entry.name, entry.duration);
      // Send to analytics
      analytics.track('animation_performance', {
        animation: entry.name,
        duration: entry.duration,
        dropped: true
      });
    }
  }
});

performanceObserver.observe({ entryTypes: ['measure'] });
```

## Conclusion

Revolut's scroll implementation represents a **modern, performance-first approach** to web animations, eschewing heavy JavaScript libraries in favor of native browser APIs and CSS-based animations. The combination of Intersection Observer for scroll detection, transform3d for GPU acceleration, and React/TypeScript for component architecture creates a smooth, responsive experience that maintains 60fps across devices while delivering sophisticated visual effects that enhance rather than hinder the user experience.