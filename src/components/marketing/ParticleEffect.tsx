// src/components/marketing/ParticleEffect.tsx
import React, { useEffect, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  color: string;
  speed: number;
  angle: number;
  opacity: number;
  element: HTMLDivElement | null;
}

export default function ParticleEffect() {
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>();
  const buttonTargetRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  useEffect(() => {
    // Disable particles on mobile devices
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) {
      console.log('Particles disabled on mobile for performance');
      return;
    }

    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Get the actual document height to cover the full landing page
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    
    // Set container height to match document
    container.style.height = `${documentHeight}px`;
    
    // Create particles across full page
    const particleCount = 250; // Even more particles for rich visual density
    const particles: Particle[] = [];
    
    const colors = [
      'rgb(236, 72, 153)', // pink-500
      'rgb(249, 115, 22)', // orange-500
      'rgb(251, 146, 60)', // orange-400
      'rgb(244, 114, 182)', // pink-400
      'rgb(252, 165, 165)', // red-300
      'rgb(253, 186, 116)', // orange-300
    ];

    for (let i = 0; i < particleCount; i++) {
      const size = Math.random() * 6 + 2; // 2-8px
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * documentHeight; // Spread across full document height
      
      const particle: Particle = {
        id: i,
        x,
        y,
        baseX: x,
        baseY: y,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 0.5 + 0.2,
        angle: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.6 + 0.2,
        element: null
      };

      // Create DOM element
      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.width = `${size}px`;
      element.style.height = `${size}px`;
      element.style.backgroundColor = particle.color;
      element.style.borderRadius = '50%';
      element.style.pointerEvents = 'none';
      element.style.opacity = particle.opacity.toString();
      element.style.transition = 'transform 0.1s ease-out';
      element.style.willChange = 'transform';
      
      container.appendChild(element);
      particle.element = element;
      particles.push(particle);
    }

    particlesRef.current = particles;

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY + window.scrollY // Add scroll position to get page coordinates
      };
    };

    // Animation loop
    let lastTime = 0;
    const animate = (currentTime: number) => {
      if (currentTime - lastTime < 16) { // ~60fps
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTime = currentTime;

      particles.forEach(particle => {
        if (!particle.element) return;

        // Base floating movement (more stable)
        particle.angle += particle.speed * 0.01; // Slower for stability
        const baseOffsetX = Math.sin(particle.angle) * 15; // Reduced amplitude
        const baseOffsetY = Math.cos(particle.angle) * 12;

        let targetX = mouseRef.current.x;
        let targetY = mouseRef.current.y;
        let isButtonMode = false;

        // Check if button is being hovered
        if (buttonTargetRef.current.active) {
          targetX = buttonTargetRef.current.x;
          targetY = buttonTargetRef.current.y;
          isButtonMode = true;
          
          // Debug: log first particle's targeting (only occasionally to avoid spam)
          if (particle.id === 0 && Math.random() < 0.01) {
            console.log('Particle targeting button at:', { targetX, targetY, particleBase: { x: particle.baseX, y: particle.baseY } });
          }
        }

        // Calculate distance to target (mouse or button)
        const dx = targetX - particle.baseX;
        const dy = targetY - particle.baseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        let attractionX = 0;
        let attractionY = 0;

        if (isButtonMode) {
          // DRAMATIC button mode - particles swarm to button from across the screen
          const maxButtonDistance = 600; // Much larger radius for button mode
          if (distance < maxButtonDistance && distance > 0) {
            const force = (maxButtonDistance - distance) / maxButtonDistance;
            const strength = force * 2.5; // Super strong attraction
            
            attractionX = (dx / distance) * strength * 150; // Very dramatic pull
            attractionY = (dy / distance) * strength * 150;
          }
        } else {
          // Normal mouse mode - more stable and gentle
          const maxDistance = 180; // Slightly smaller radius for stability
          if (distance < maxDistance && distance > 0) {
            const force = (maxDistance - distance) / maxDistance;
            const strength = force * 0.4; // More controlled strength
            
            attractionX = (dx / distance) * strength * 50; // More stable movement
            attractionY = (dy / distance) * strength * 50;
          }
        }

        // Combine movements with easing for stability
        const finalX = particle.baseX + baseOffsetX + (attractionX * 0.8); // Damping factor
        const finalY = particle.baseY + baseOffsetY + (attractionY * 0.8);

        // Update particle position
        particle.x = finalX;
        particle.y = finalY;

        // Apply transform
        particle.element.style.transform = `translate(${finalX}px, ${finalY}px)`;
        
        // Dynamic opacity
        const maxOpacityDistance = isButtonMode ? 600 : 180;
        if (distance < maxOpacityDistance) {
          const force = (maxOpacityDistance - distance) / maxOpacityDistance;
          const proximityOpacity = 0.3 + (force * 0.7);
          particle.element.style.opacity = Math.min(proximityOpacity, 1).toString();
        } else {
          particle.element.style.opacity = particle.opacity.toString();
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    // Button hover detection - more comprehensive approach
    const handleButtonHover = () => {
      // Look for all elements that might contain our buttons
      const allElements = document.querySelectorAll('button, [role="button"], .NewProjectButton, [class*="NewProject"]');
      
      console.log(`Found ${allElements.length} potential button elements`); // Debug
      
      allElements.forEach((element, index) => {
        const buttonText = element.textContent?.toLowerCase() || '';
        console.log(`Element ${index}: "${buttonText.slice(0, 30)}..."`); // Debug
        
        if (buttonText.includes('start creating now') || buttonText.includes('try for free')) {
          console.log('Found target button:', buttonText); // Debug
          
          element.addEventListener('mouseenter', (e) => {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            buttonTargetRef.current = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2 + scrollTop,
              active: true
            };
            console.log('Button hover - rect:', rect, 'scroll:', scrollTop, 'final:', buttonTargetRef.current);
          });
          
          element.addEventListener('mouseleave', () => {
            buttonTargetRef.current.active = false;
            console.log('Button hover ended');
          });
        }
      });
    };

    // Set up button hover detection with multiple attempts
    setTimeout(handleButtonHover, 100);
    setTimeout(handleButtonHover, 500);
    setTimeout(handleButtonHover, 1000);

    // Add mouse listener
    document.addEventListener('mousemove', handleMouseMove);

    // Handle window resize to disable on mobile
    const handleResize = () => {
      const nowMobile = window.innerWidth < 768;
      if (nowMobile && animationRef.current) {
        // Clean up particles if switching to mobile
        cancelAnimationFrame(animationRef.current);
        particles.forEach(particle => {
          if (particle.element && particle.element.parentNode) {
            particle.element.parentNode.removeChild(particle.element);
          }
        });
      }
    };
    
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      
      // Remove particle elements
      particles.forEach(particle => {
        if (particle.element && particle.element.parentNode) {
          particle.element.parentNode.removeChild(particle.element);
        }
      });
    };
  }, []);

  return (
    <>
      <div 
        ref={containerRef}
        className="absolute top-0 left-0 w-full pointer-events-none -z-10 overflow-hidden"
      />
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes movingGradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .moving-gradient-text {
            background: linear-gradient(-45deg, #ec4899, #f97316, #ec4899, #f97316);
            background-size: 400% 400%;
            animation: movingGradient 12s ease-in-out infinite;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
        `
      }} />
    </>
  );
} 