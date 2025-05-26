/**
 * Visual Quality Test Suite for Sprint 29
 * 
 * This component tests various prompt types to measure visual improvement
 * after implementing Tailwind CSS + BazAnimations integration.
 * 
 * Test Cases:
 * 1. Simple text scenes
 * 2. Background + text combinations  
 * 3. Multi-element layouts
 * 4. Animation-heavy scenes
 * 5. Color and gradient usage
 */

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export const VisualQualityTestSuite: React.FC = () => {
  const frame = useCurrentFrame();
  const { fadeInUp, scaleIn, pulseGlow, colorPalettes, glassMorphism } = (window as any).BazAnimations;
  
  // Test 1: Simple Text Scene with Tailwind
  const titleAnimation = fadeInUp(frame, 0, 30);
  const subtitleAnimation = fadeInUp(frame, 15, 30);
  
  // Test 2: Multi-element Layout
  const cardAnimation = scaleIn(frame, 20, 25);
  const buttonAnimation = scaleIn(frame, 40, 20);
  
  // Test 3: Color Palette Usage
  const { ocean } = colorPalettes;
  
  // Test 4: Animation Staggering
  const staggerDelay = 10;
  const element1 = fadeInUp(frame, 0, 20);
  const element2 = fadeInUp(frame, staggerDelay, 20);
  const element3 = fadeInUp(frame, staggerDelay * 2, 20);
  
  return (
    <AbsoluteFill className="bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500">
      {/* Test 1: Hero Section with Modern Typography */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-4xl px-8">
          <h1 
            className="text-7xl font-black text-white drop-shadow-2xl tracking-tight"
            style={titleAnimation}
          >
            Visual Quality Test
          </h1>
          <p 
            className="text-2xl text-white/90 font-light leading-relaxed"
            style={subtitleAnimation}
          >
            Testing Tailwind CSS + BazAnimations Integration
          </p>
        </div>
      </div>
      
      {/* Test 2: Floating Cards Layout */}
      <div className="absolute bottom-20 left-20 right-20 flex justify-between">
        <div 
          className="bg-white/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/30"
          style={{...cardAnimation, ...glassMorphism}}
        >
          <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl mb-4"></div>
          <h3 className="text-white font-semibold text-lg">Feature One</h3>
          <p className="text-white/80 text-sm">Modern glassmorphism design</p>
        </div>
        
        <div 
          className="bg-white/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/30"
          style={{...cardAnimation, ...glassMorphism}}
        >
          <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl mb-4"></div>
          <h3 className="text-white font-semibold text-lg">Feature Two</h3>
          <p className="text-white/80 text-sm">Smooth animations</p>
        </div>
        
        <div 
          className="bg-white/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/30"
          style={{...cardAnimation, ...glassMorphism}}
        >
          <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl mb-4"></div>
          <h3 className="text-white font-semibold text-lg">Feature Three</h3>
          <p className="text-white/80 text-sm">Professional quality</p>
        </div>
      </div>
      
      {/* Test 3: Call-to-Action Button */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <button 
          className="px-12 py-4 bg-white text-purple-600 rounded-full font-bold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 border-2 border-white/50"
          style={buttonAnimation}
        >
          Get Started Today
        </button>
      </div>
      
      {/* Test 4: Animated Background Elements */}
      <div className="absolute top-10 left-10">
        <div 
          className="w-4 h-4 bg-white/30 rounded-full"
          style={element1}
        ></div>
      </div>
      <div className="absolute top-20 right-20">
        <div 
          className="w-6 h-6 bg-yellow-300/40 rounded-full"
          style={element2}
        ></div>
      </div>
      <div className="absolute top-32 left-1/3">
        <div 
          className="w-3 h-3 bg-pink-300/50 rounded-full"
          style={element3}
        ></div>
      </div>
    </AbsoluteFill>
  );
};

export default VisualQualityTestSuite; 