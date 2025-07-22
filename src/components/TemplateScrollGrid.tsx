"use client";
import React, { useEffect, useRef, useState } from 'react';

const TemplateScrollGrid: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      setCurrentFrame(prev => prev + 1); // Remove modulo to prevent jumps
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Real template images
  const templateImages = [
    {
      id: 1,
      url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Template%20images/Promptbox.jpg",
      title: "Prompt Input Box"
    },
    {
      id: 2,
      url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Template%20images/app.jpg",
      title: "App Interface"
    },
    {
      id: 3,
      url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Template%20images/audio.jpg",
      title: "Audio Waveform"
    },
    {
      id: 4,
      url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Template%20images/barchart.jpg",
      title: "Bar Chart"
    },
    {
      id: 5,
      url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Template%20images/codeanimation.jpg",
      title: "Code Animation"
    },
    {
      id: 6,
      url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Template%20images/generating.jpg",
      title: "Generating Animation"
    },
    {
      id: 7,
      url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Template%20images/newbutton.jpg",
      title: "Button Component"
    },
    {
      id: 8,
      url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Template%20images/promptboxpurple.jpg",
      title: "Purple Prompt Box"
    },
    {
      id: 9,
      url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Template%20images/signinwithapple.jpg",
      title: "Sign in with Apple"
    },
    {
      id: 10,
      url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Template%20images/stockgraph.jpg",
      title: "Stock Graph"
    }
  ];

  // Generate template images for each column - 9 images per column
  const generateTemplateImages = (columnIndex: number) => {
    return Array.from({ length: 9 }, (_, i) => {
      const templateIndex = (columnIndex * 3 + i) % templateImages.length;
      const template = templateImages[templateIndex];
      if (!template) {
        throw new Error(`Template not found at index ${templateIndex}`);
      }
      return {
        ...template,
        id: `${template.id}-${columnIndex}-${i}` // Unique ID for each instance
      };
    });
  };

  const ScrollingColumn: React.FC<{ columnIndex: number; delay?: number }> = ({ 
    columnIndex, 
    delay = 0 
  }) => {
    const templates = generateTemplateImages(columnIndex);
    
    // Calculate exact spacing: 200px image + 16px gap (gap-4)
    const itemHeight = 216; // 200px + 16px
    const totalHeight = templates.length * itemHeight; // Height of one complete set
    
    // Calculate scroll position with different speeds per column
    const scrollSpeed = 0.3 + (columnIndex * 0.15); // Slower, more varied speeds
    const rawScrollPosition = (currentFrame + delay) * scrollSpeed;
    
    // Use modulo on the total height to create seamless loop
    const scrollPosition = rawScrollPosition % totalHeight;
    
    return (
      <div className="relative h-[500px] overflow-hidden rounded-xl bg-gray-50">
        {/* Fade overlay at top */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
        
        {/* Fade overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
        
        {/* Scrolling content - removed CSS transition for smooth animation */}
        <div 
          className="flex flex-col gap-4 p-4"
          style={{
            transform: `translateY(-${scrollPosition}px)`
          }}
        >
          {/* Render templates twice for seamless loop */}
          {[...templates, ...templates].map((template, index) => (
            <div
              key={`${template.id}-${index}`}
              className="flex-shrink-0 group cursor-pointer"
            >
              <div className="relative overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <img
                  src={template.url}
                  alt={template.title}
                  className="w-full h-[200px] object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Overlay with template info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute bottom-3 left-3 text-white">
                    <p className="text-sm font-medium">{template.title}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-3 gap-6">
        <ScrollingColumn columnIndex={0} delay={0} />
        <ScrollingColumn columnIndex={1} delay={100} />
        <ScrollingColumn columnIndex={2} delay={200} />
      </div>
    </div>
  );
};

export default TemplateScrollGrid; 