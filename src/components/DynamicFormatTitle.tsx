"use client";
import React, { useEffect, useRef, useState } from 'react';

const DynamicFormatTitle: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      setCurrentFrame(prev => (prev + 1) % 360); // Same 12-second cycle as AspectRatioTransitionPlayer
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const interpolate = (frame: number, inputRange: [number, number], outputRange: [number, number], options?: { extrapolateLeft?: string; extrapolateRight?: string }) => {
    const [inputMin, inputMax] = inputRange;
    const [outputMin, outputMax] = outputRange;
    
    if (options?.extrapolateLeft === "clamp" && frame < inputMin) return outputMin;
    if (options?.extrapolateRight === "clamp" && frame > inputMax) return outputMax;
    
    const progress = (frame - inputMin) / (inputMax - inputMin);
    return outputMin + progress * (outputMax - outputMin);
  };

  const getFormatInfo = (frame: number) => {
    // Match the exact timing from AspectRatioTransitionPlayer
    if (frame >= 0 && frame < 90) {
      return { word: "Vertical", isTransitioning: frame >= 60 };
    } else if (frame >= 90 && frame < 180) {
      return { word: "Square", isTransitioning: frame >= 150 };
    } else if (frame >= 180 && frame < 270) {
      return { word: "Horizontal", isTransitioning: frame >= 240 };
    } else if (frame >= 270 && frame < 360) {
      return { word: "Square", isTransitioning: frame >= 315 };
    }
    return { word: "Vertical", isTransitioning: false };
  };

  const formatInfo = getFormatInfo(currentFrame);
  const currentWord = formatInfo.word;
  
  // Calculate typewriter effect
  const getTypewriterText = (wordStartFrame: number, wordEndFrame: number, frameInWord: number) => {
    const typeSpeed = 3; // Frames per character
    const deleteSpeed = 2; // Frames per character when deleting
    
    const wordDuration = wordEndFrame - wordStartFrame;
    
    // Type in first 30 frames, hold for middle frames, delete in last 20 frames
    const typeEndFrame = 30;
    const deleteStartFrame = wordDuration - 20;
    
    if (frameInWord < typeEndFrame) {
      // Typing phase
      const typedChars = Math.floor(frameInWord / typeSpeed);
      return currentWord.slice(0, Math.min(typedChars, currentWord.length));
    } else if (frameInWord >= deleteStartFrame) {
      // Deleting phase
      const deleteProgress = frameInWord - deleteStartFrame;
      const deletedChars = Math.floor(deleteProgress / deleteSpeed);
      return currentWord.slice(0, Math.max(0, currentWord.length - deletedChars));
    } else {
      // Hold phase - show full word
      return currentWord;
    }
  };

  // Determine current phase within the word's display period
  let wordStartFrame = 0;
  let wordEndFrame = 90;
  
  if (currentWord === "Square" && currentFrame >= 90 && currentFrame < 180) {
    wordStartFrame = 90;
    wordEndFrame = 180;
  } else if (currentWord === "Horizontal") {
    wordStartFrame = 180;
    wordEndFrame = 270;
  } else if (currentWord === "Square" && currentFrame >= 270) {
    wordStartFrame = 270;
    wordEndFrame = 360;
  } else if (currentWord === "Vertical") {
    wordStartFrame = 0;
    wordEndFrame = 90;
  }
  
  const wordDuration = wordEndFrame - wordStartFrame;
  const frameInWord = currentFrame - wordStartFrame;
  const displayText = getTypewriterText(wordStartFrame, wordEndFrame, frameInWord);
  const isTyping = frameInWord < 30;
  const isDeleting = frameInWord >= (wordDuration - 20);
  
  const showCursor = (isTyping || isDeleting) && currentFrame % 20 < 10; // Simplified cursor logic

  return (
    <div className="text-center mb-8">
      <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
        Create in{' '}
        <span className="inline-block min-w-[280px] text-left">
          {displayText}
          {showCursor && (
            <span className="text-gray-400">|</span>
          )}
        </span>
      </h2>
    </div>
  );
};

export default DynamicFormatTitle; 