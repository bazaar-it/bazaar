"use client";
import React, { useRef, useEffect, useState } from "react";
import { cn } from "~/lib/cn";

interface StickyScrollContent {
  title: string;
  description: string;
  content: React.ReactNode;
}

interface StickyScrollProps {
  content: StickyScrollContent[];
  contentClassName?: string;
}

export const StickyScroll: React.FC<StickyScrollProps> = ({
  content,
  contentClassName,
}) => {
  const [activeCard, setActiveCard] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
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
        rootMargin: "-50% 0px -50% 0px",
        threshold: 0,
      }
    );

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      cardRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []);

  return (
    <div className="w-full py-24 bg-white">
      <div
        className="bg-gray-100 flex justify-center relative space-x-12 rounded-md p-16"
        ref={ref}
      >
        <div className="relative flex items-start px-4 max-w-2xl">
          <div className="w-full">
            {content.map((item, index) => {
              const isActive = index === activeCard;
              return (
                <div
                  key={item.title + index}
                  className="my-32 first:mt-0 transition-all duration-500 ease-in-out"
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                >
                  <h2 className={cn(
                    "text-2xl md:text-3xl font-bold mb-4 transition-all duration-500",
                    isActive ? "text-gray-900" : "text-gray-400"
                  )}>
                    {item.title}
                  </h2>
                  <p className={cn(
                    "text-lg max-w-lg leading-relaxed transition-all duration-500",
                    isActive ? "text-gray-700" : "text-gray-400"
                  )}>
                    {item.description}
                  </p>
                </div>
              );
            })}
            <div className="h-64" />
          </div>
        </div>
        <div
          className={cn(
            "hidden lg:block h-80 w-96 rounded-lg bg-white sticky top-10 overflow-hidden shadow-2xl",
            contentClassName
          )}
        >
          {content[activeCard]?.content ?? null}
        </div>
      </div>
    </div>
  );
}; 