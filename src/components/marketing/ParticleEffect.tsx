// src/components/marketing/ParticleEffect.tsx
import React from 'react';

export default function ParticleEffect() {
  return (
    <div className="absolute top-0 left-0 right-0 h-96 pointer-events-none -z-10 overflow-hidden">
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes sparkleFloat1 {
            0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translate(-20px, -100px) rotate(180deg); opacity: 0; }
          }
          @keyframes sparkleFloat2 {
            0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
            15% { opacity: 1; }
            85% { opacity: 1; }
            100% { transform: translate(30px, -120px) rotate(-180deg); opacity: 0; }
          }
          @keyframes sparkleFloat3 {
            0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { transform: translate(-40px, -80px) rotate(270deg); opacity: 0; }
          }
          @keyframes sparkleTwinkle {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          .sparkle-float-1 { animation: sparkleFloat1 8s linear infinite; }
          .sparkle-float-2 { animation: sparkleFloat2 10s linear infinite; }
          .sparkle-float-3 { animation: sparkleFloat3 12s linear infinite; }
          .sparkle-twinkle { animation: sparkleTwinkle 2s ease-in-out infinite; }
          
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
      
      {/* Layer 1 - Small particles across full width */}
      <div className="absolute top-8 left-[2%] w-0.5 h-0.5 bg-pink-400 rounded-full sparkle-float-1 sparkle-twinkle" style={{animationDelay: '0s'}}></div>
      <div className="absolute top-16 left-[8%] w-0.5 h-0.5 bg-orange-400 rounded-full sparkle-float-2 sparkle-twinkle" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-24 left-[15%] w-1 h-1 bg-pink-500 rounded-full sparkle-float-3 sparkle-twinkle" style={{animationDelay: '2s'}}></div>
      <div className="absolute top-32 left-[22%] w-0.5 h-0.5 bg-orange-500 rounded-full sparkle-float-1 sparkle-twinkle" style={{animationDelay: '3s'}}></div>
      <div className="absolute top-40 left-[29%] w-1 h-1 bg-pink-300 rounded-full sparkle-float-2 sparkle-twinkle" style={{animationDelay: '4s'}}></div>
      <div className="absolute top-48 left-[36%] w-0.5 h-0.5 bg-orange-300 rounded-full sparkle-float-3 sparkle-twinkle" style={{animationDelay: '5s'}}></div>
      <div className="absolute top-56 left-[43%] w-1 h-1 bg-pink-400 rounded-full sparkle-float-1 sparkle-twinkle" style={{animationDelay: '6s'}}></div>
      <div className="absolute top-64 left-[50%] w-0.5 h-0.5 bg-orange-400 rounded-full sparkle-float-2 sparkle-twinkle" style={{animationDelay: '7s'}}></div>
      <div className="absolute top-72 left-[57%] w-1 h-1 bg-pink-500 rounded-full sparkle-float-3 sparkle-twinkle" style={{animationDelay: '8s'}}></div>
      <div className="absolute top-80 left-[64%] w-0.5 h-0.5 bg-orange-500 rounded-full sparkle-float-1 sparkle-twinkle" style={{animationDelay: '0.5s'}}></div>
      <div className="absolute top-88 left-[71%] w-1 h-1 bg-pink-300 rounded-full sparkle-float-2 sparkle-twinkle" style={{animationDelay: '1.5s'}}></div>
      <div className="absolute top-4 left-[78%] w-0.5 h-0.5 bg-orange-300 rounded-full sparkle-float-3 sparkle-twinkle" style={{animationDelay: '2.5s'}}></div>
      <div className="absolute top-12 left-[85%] w-1 h-1 bg-pink-400 rounded-full sparkle-float-1 sparkle-twinkle" style={{animationDelay: '3.5s'}}></div>
      <div className="absolute top-20 left-[92%] w-0.5 h-0.5 bg-orange-400 rounded-full sparkle-float-2 sparkle-twinkle" style={{animationDelay: '4.5s'}}></div>
      <div className="absolute top-28 left-[98%] w-1 h-1 bg-pink-500 rounded-full sparkle-float-3 sparkle-twinkle" style={{animationDelay: '5.5s'}}></div>
      
      {/* Layer 2 - Medium particles across full width */}
      <div className="absolute top-36 left-[5%] w-1 h-1 bg-orange-500 rounded-full sparkle-float-2 sparkle-twinkle" style={{animationDelay: '1.2s'}}></div>
      <div className="absolute top-44 left-[12%] w-1 h-1 bg-pink-300 rounded-full sparkle-float-3 sparkle-twinkle" style={{animationDelay: '2.2s'}}></div>
      <div className="absolute top-52 left-[19%] w-0.5 h-0.5 bg-orange-300 rounded-full sparkle-float-1 sparkle-twinkle" style={{animationDelay: '3.2s'}}></div>
      <div className="absolute top-60 left-[26%] w-1 h-1 bg-pink-400 rounded-full sparkle-float-2 sparkle-twinkle" style={{animationDelay: '4.2s'}}></div>
      <div className="absolute top-68 left-[33%] w-0.5 h-0.5 bg-orange-400 rounded-full sparkle-float-3 sparkle-twinkle" style={{animationDelay: '5.2s'}}></div>
      <div className="absolute top-76 left-[40%] w-1 h-1 bg-pink-500 rounded-full sparkle-float-1 sparkle-twinkle" style={{animationDelay: '6.2s'}}></div>
      <div className="absolute top-84 left-[47%] w-0.5 h-0.5 bg-orange-500 rounded-full sparkle-float-2 sparkle-twinkle" style={{animationDelay: '7.2s'}}></div>
      <div className="absolute top-8 left-[54%] w-1 h-1 bg-pink-300 rounded-full sparkle-float-3 sparkle-twinkle" style={{animationDelay: '0.8s'}}></div>
      <div className="absolute top-16 left-[61%] w-0.5 h-0.5 bg-orange-300 rounded-full sparkle-float-1 sparkle-twinkle" style={{animationDelay: '1.8s'}}></div>
      <div className="absolute top-24 left-[68%] w-1 h-1 bg-pink-400 rounded-full sparkle-float-2 sparkle-twinkle" style={{animationDelay: '2.8s'}}></div>
      <div className="absolute top-32 left-[75%] w-0.5 h-0.5 bg-orange-400 rounded-full sparkle-float-3 sparkle-twinkle" style={{animationDelay: '3.8s'}}></div>
      <div className="absolute top-40 left-[82%] w-1 h-1 bg-pink-500 rounded-full sparkle-float-1 sparkle-twinkle" style={{animationDelay: '4.8s'}}></div>
      <div className="absolute top-48 left-[89%] w-0.5 h-0.5 bg-orange-500 rounded-full sparkle-float-2 sparkle-twinkle" style={{animationDelay: '5.8s'}}></div>
      <div className="absolute top-56 left-[96%] w-1 h-1 bg-pink-300 rounded-full sparkle-float-3 sparkle-twinkle" style={{animationDelay: '6.8s'}}></div>
      
      {/* Layer 3 - Larger particles for depth */}
      <div className="absolute top-64 left-[3%] w-1.5 h-1.5 bg-orange-300 rounded-full sparkle-float-1 sparkle-twinkle" style={{animationDelay: '0.3s'}}></div>
      <div className="absolute top-72 left-[11%] w-1.5 h-1.5 bg-pink-400 rounded-full sparkle-float-2 sparkle-twinkle" style={{animationDelay: '1.3s'}}></div>
      <div className="absolute top-80 left-[18%] w-1 h-1 bg-orange-400 rounded-full sparkle-float-3 sparkle-twinkle" style={{animationDelay: '2.3s'}}></div>
      <div className="absolute top-88 left-[25%] w-1.5 h-1.5 bg-pink-500 rounded-full sparkle-float-1 sparkle-twinkle" style={{animationDelay: '3.3s'}}></div>
      <div className="absolute top-4 left-[32%] w-1 h-1 bg-orange-500 rounded-full sparkle-float-2 sparkle-twinkle" style={{animationDelay: '4.3s'}}></div>
      <div className="absolute top-12 left-[39%] w-1.5 h-1.5 bg-pink-300 rounded-full sparkle-float-3 sparkle-twinkle" style={{animationDelay: '5.3s'}}></div>
      <div className="absolute top-20 left-[46%] w-1 h-1 bg-orange-300 rounded-full sparkle-float-1 sparkle-twinkle" style={{animationDelay: '6.3s'}}></div>
      <div className="absolute top-28 left-[53%] w-1.5 h-1.5 bg-pink-400 rounded-full sparkle-float-2 sparkle-twinkle" style={{animationDelay: '7.3s'}}></div>
      <div className="absolute top-36 left-[60%] w-1 h-1 bg-orange-400 rounded-full sparkle-float-3 sparkle-twinkle" style={{animationDelay: '0.1s'}}></div>
      <div className="absolute top-44 left-[67%] w-1.5 h-1.5 bg-pink-500 rounded-full sparkle-float-1 sparkle-twinkle" style={{animationDelay: '1.1s'}}></div>
      <div className="absolute top-52 left-[74%] w-1 h-1 bg-orange-500 rounded-full sparkle-float-2 sparkle-twinkle" style={{animationDelay: '2.1s'}}></div>
      <div className="absolute top-60 left-[81%] w-1.5 h-1.5 bg-pink-300 rounded-full sparkle-float-3 sparkle-twinkle" style={{animationDelay: '3.1s'}}></div>
      <div className="absolute top-68 left-[88%] w-1 h-1 bg-orange-300 rounded-full sparkle-float-1 sparkle-twinkle" style={{animationDelay: '4.1s'}}></div>
      <div className="absolute top-76 left-[95%] w-1.5 h-1.5 bg-pink-400 rounded-full sparkle-float-2 sparkle-twinkle" style={{animationDelay: '5.1s'}}></div>
    </div>
  );
} 