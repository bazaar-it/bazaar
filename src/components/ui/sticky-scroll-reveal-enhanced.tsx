"use client";
import React, { useRef, useEffect, useState } from "react";
import { cn } from "~/lib/cn";
import { motion, AnimatePresence } from "framer-motion";

interface StickyScrollContent {
  title: string;
  description: string;
  content: React.ReactNode;
}

interface StickyScrollProps {
  content: StickyScrollContent[];
  contentClassName?: string;
}

export const StickyScrollEnhanced: React.FC<StickyScrollProps> = ({
  content,
  contentClassName,
}) => {
  const [activeCard, setActiveCard] = useState(0);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const scrollTop = window.scrollY - container.offsetTop;
      const scrollHeight = container.scrollHeight - window.innerHeight;
      const scrollProgress = Math.max(0, Math.min(1, scrollTop / scrollHeight));
      setProgress(scrollProgress);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = cardRefs.current.findIndex(
              (ref) => ref === entry.target
            );
            if (index !== -1) {
              setActiveCard(index);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: "-40% 0px -40% 0px",
        threshold: 0,
      }
    );

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      cardRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="w-full py-8 md:py-16 lg:py-24 bg-white" ref={containerRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:space-x-16">
          {/* Left side - Text content */}
          <div className="w-full lg:w-1/2 relative">
            {/* Mobile progress indicator */}
            <div className="lg:hidden fixed top-16 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex space-x-2">
                  {content.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        cardRefs.current[index]?.scrollIntoView({ 
                          behavior: 'smooth', 
                          block: 'center' 
                        });
                      }}
                      className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        index === activeCard
                          ? "w-8 bg-blue-600"
                          : "w-2 bg-gray-300"
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500">{activeCard + 1} / {content.length}</span>
              </div>
            </div>

            <div className="space-y-24 md:space-y-32 lg:space-y-48 mt-20 lg:mt-0">
              {content.map((item, index) => {
                const isActive = index === activeCard;
                const distance = Math.abs(activeCard - index);
                
                return (
                  <motion.div
                    key={item.title + index}
                    ref={(el) => {
                      cardRefs.current[index] = el;
                    }}
                    className="relative"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ 
                      opacity: 1 - (distance * 0.3),
                      y: 0,
                      scale: isActive ? 1 : 0.95,
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.h2 
                      className={cn(
                        "text-2xl md:text-3xl lg:text-4xl font-bold mb-4 transition-all duration-500",
                        isActive ? "text-gray-900" : "text-gray-400"
                      )}
                      animate={{
                        x: isActive ? 0 : -20,
                      }}
                    >
                      {item.title}
                    </motion.h2>
                    <motion.p 
                      className={cn(
                        "text-base md:text-lg lg:text-xl max-w-lg leading-relaxed transition-all duration-500",
                        isActive ? "text-gray-700" : "text-gray-400"
                      )}
                      animate={{
                        x: isActive ? 0 : -20,
                      }}
                    >
                      {item.description}
                    </motion.p>

                    {/* Mobile preview - shows inline */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          className="lg:hidden mt-8"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.4 }}
                        >
                          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-900 to-gray-800">
                            {item.content}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
              <div className="h-40" />
            </div>
          </div>

          {/* Right side - Sticky preview (Desktop only) */}
          <div className="hidden lg:block lg:w-1/2 relative">
            <div className="sticky top-24">
              <div
                className={cn(
                  "relative h-[600px] w-full rounded-2xl overflow-hidden shadow-2xl",
                  "bg-gradient-to-br from-gray-900 to-gray-800",
                  contentClassName
                )}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCard}
                    initial={{ opacity: 0, scale: 0.95, rotateY: -10 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    exit={{ opacity: 0, scale: 0.95, rotateY: 10 }}
                    transition={{ 
                      duration: 0.6, 
                      ease: [0.32, 0.72, 0, 1],
                    }}
                    className="absolute inset-0"
                  >
                    {content[activeCard]?.content}
                  </motion.div>
                </AnimatePresence>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                  <motion.div 
                    className="h-full bg-blue-600"
                    animate={{ width: `${(activeCard + 1) / content.length * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Desktop navigation dots */}
              <div className="flex justify-center mt-6 space-x-2">
                {content.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      cardRefs.current[index]?.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                      });
                    }}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      index === activeCard
                        ? "w-8 bg-blue-600"
                        : "w-2 bg-gray-300 hover:bg-gray-400"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};