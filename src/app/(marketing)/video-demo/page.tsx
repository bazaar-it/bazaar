"use client";
import React, { useState } from "react";
import PortraitVideoPlayer from "~/components/PortraitVideoPlayer";
import { KineticTypographyComposition } from "~/components/compositions/KineticTypographyComposition";
import { BazaarV3KineticComposition } from "~/components/compositions/BazaarV3KineticComposition";
import { IsaiahKineticComposition } from "~/components/compositions/IsaiahKineticComposition";
import { IsaiahKineticV2Composition } from "~/components/compositions/IsaiahKineticV2Composition";
import { BazaarKineticComposition } from "~/components/compositions/BazaarKineticComposition";
import { IntroKineticComposition } from "~/components/compositions/IntroKineticComposition";
import iPhoneKineticScene from "~/components/scenes/iPhoneKineticScene";
import TeslaMotorbikeKineticScene from "~/components/scenes/TeslaMotorbikeKineticScene";
import TeslaOptimusKineticScene from "~/components/scenes/TeslaOptimusKineticScene";
import NeuralinkKineticScene from "~/components/scenes/NeuralinkKineticScene";
import SpaceXMarsKineticScene from "~/components/scenes/SpaceXMarsKineticScene";
import BazaarNeuralStreamKineticScene from "~/components/scenes/BazaarNeuralStreamKineticScene";
import { AirbnbComposition } from "~/components/AirbnbVideoPlayerProper";
import { LogoTransitionComposition } from "~/components/compositions/LogoTransitionComposition";

export default function VideoDemo() {
  const [activeVideo, setActiveVideo] = useState<'kinetic' | 'bazaar' | 'isaiah' | 'isaiahv2' | 'bazaarkinetic' | 'intro' | 'iphone' | 'tesla' | 'optimus' | 'neuralink' | 'spacex' | 'bazaarneural' | 'airbnb' | 'logotransition'>('intro');

  const videoConfigs = {
    kinetic: {
      composition: KineticTypographyComposition,
      durationInFrames: 300, // 10 seconds at 30fps
      inputProps: { 
        script: ["CREATE", "AMAZING", "VIDEOS", "WITH", "REMOTION"],
        theme: 'dark' as const
      },
      title: "Kinetic Typography",
      description: "Fast-paced text animation in Apple's 'Don't Blink' style"
    },
    bazaar: {
      composition: BazaarV3KineticComposition,
      durationInFrames: 540, // 18 seconds at 30fps (includes pauses)
      inputProps: { 
        theme: 'dark' as const
      },
      title: "Bazaar V3 Demo",
      description: "Professional kinetic typography showcasing Bazaar's capabilities"
    },
    isaiah: {
      composition: IsaiahKineticComposition,
      durationInFrames: 1200, // 40 seconds at 30fps (with RSVP and Phrase Display modes)
      inputProps: { 
        theme: 'dark' as const
      },
      title: "Isaiah & Corinthians",
      description: "Advanced kinetic typography with RSVP and Phrase Display modes, varied animations"
    },
    isaiahv2: {
      composition: IsaiahKineticV2Composition,
      durationInFrames: 1800, // 60 seconds at 30fps (3 stylistic modes)
      inputProps: { 
        theme: 'dark' as const
      },
      title: "Isaiah V2 (3D Enhanced)",
      description: "Enhanced kinetic typography with RSVP, 2D Phrase Composition, and 3D Spatial Typography modes"
    },
    bazaarkinetic: {
      composition: BazaarKineticComposition,
      durationInFrames: 1200, // 40 seconds at 30fps
      inputProps: { 
        theme: 'dark' as const
      },
      title: "Bazaar Kinetic Typography",
      description: "Mobile-optimized kinetic typography for Bazaar"
    },
    intro: {
      composition: IntroKineticComposition,
      durationInFrames: 900, // 30 seconds at 30fps
      inputProps: { 
        theme: 'dark' as const
      },
      title: "Introducing Kinetic Typography",
      description: "New composition showcasing kinetic typography with your script"
    },
    iphone: {
      composition: iPhoneKineticScene,
      durationInFrames: 1200, // 40 seconds at 30fps
      inputProps: {},
      title: "iPhone 72 Kinetic Typography",
      description: "Futuristic iPhone presentation with Apple-style kinetic typography"
    },
    tesla: {
      composition: TeslaMotorbikeKineticScene,
      durationInFrames: 485, // ~16 seconds at 30fps
      inputProps: {},
      title: "Tesla Motorbike",
      description: "Tesla Motorbike reveal with animated gradient background and kinetic typography"
    },
    optimus: {
      composition: TeslaOptimusKineticScene,
      durationInFrames: 1020, // ~34 seconds at 30fps
      inputProps: {},
      title: "Tesla Optimus",
      description: "Tesla Optimus robot reveal with high-contrast hero words and varied animation effects"
    },
    neuralink: {
      composition: NeuralinkKineticScene,
      durationInFrames: 950, // ~32 seconds at 30fps
      inputProps: {},
      title: "Neuralink 2030",
      description: "Brain-computer interface future with context-based cool tech gradients and warm hero highlights"
    },
    spacex: {
      composition: SpaceXMarsKineticScene,
      durationInFrames: 780, // ~26 seconds at 30fps
      inputProps: {},
      title: "SpaceX Mars Travel",
      description: "Mars travel experience with warm space gradients and intelligent phrase chunking at natural speech boundaries"
    },
    bazaarneural: {
      composition: BazaarNeuralStreamKineticScene,
      durationInFrames: 1080, // ~36 seconds at 30fps
      inputProps: {},
      title: "Bazaar Neural Stream",
      description: "Brain-to-creation technology with word integrity protection and intelligent phrase chunking"
    },
    airbnb: {
      composition: AirbnbComposition,
      durationInFrames: 600, // 20 seconds at 30fps
      inputProps: {},
      title: "Airbnb Mobile App",
      description: "Mobile app interface simulation"
    },
    logotransition: {
      composition: LogoTransitionComposition,
      durationInFrames: 765, // 25.5 seconds at 30fps (4s celebration + 1.5s Levio intro + 4.5s text + 5s upload UI + 3s processing + 5s text input + 4s chat)
      inputProps: { 
        theme: 'light' as const
      },
      title: "Logo Transition",
      description: "Complete Levio demo: Product Hunt celebration, direct to Levio intro, upload, processing, AI prompt, and chat"
    }
  };

  const currentConfig = videoConfigs[activeVideo];

  // Error handling - fallback to 'intro' if config not found
  if (!currentConfig) {
    console.error('Video config not found for:', activeVideo);
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h2>
          <p className="text-gray-600 mb-4">Video configuration not found for: {activeVideo}</p>
          <button 
            onClick={() => setActiveVideo('intro')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Reset to Intro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Portrait Video Player Demo
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Reusable component for displaying React/Remotion videos with timeline controls
          </p>
        </div>

        {/* Video Selector */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl p-2 shadow-lg">
            <button
              onClick={() => setActiveVideo('intro')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeVideo === 'intro'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Intro Kinetic Typography
            </button>
            <button
              onClick={() => setActiveVideo('iphone')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeVideo === 'iphone'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              iPhone 72
            </button>
            <button
              onClick={() => setActiveVideo('tesla')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeVideo === 'tesla'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Tesla Motorbike
            </button>
            <button
              onClick={() => setActiveVideo('optimus')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeVideo === 'optimus'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Tesla Optimus
            </button>
            <button
              onClick={() => setActiveVideo('neuralink')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeVideo === 'neuralink'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Neuralink 2030
            </button>
            <button
              onClick={() => setActiveVideo('spacex')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeVideo === 'spacex'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              SpaceX Mars
            </button>
            <button
              onClick={() => setActiveVideo('bazaarneural')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeVideo === 'bazaarneural'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Bazaar Neural
            </button>
            <button
              onClick={() => setActiveVideo('isaiahv2')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeVideo === 'isaiahv2'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Isaiah V2 (3D Enhanced)
            </button>
            <button
              onClick={() => setActiveVideo('isaiah')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeVideo === 'isaiah'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Isaiah & Corinthians
            </button>
            <button
              onClick={() => setActiveVideo('bazaar')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeVideo === 'bazaar'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Bazaar V3 Demo
            </button>
            <button
              onClick={() => setActiveVideo('bazaarkinetic')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeVideo === 'bazaarkinetic'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Bazaar Kinetic
            </button>
            <button
              onClick={() => setActiveVideo('kinetic')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeVideo === 'kinetic'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Kinetic Typography
            </button>
            <button
              onClick={() => setActiveVideo('airbnb')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeVideo === 'airbnb'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Airbnb Mobile App
            </button>
            <button
              onClick={() => setActiveVideo('logotransition')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeVideo === 'logotransition'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Logo Transition
            </button>
          </div>
        </div>

        {/* Video Display */}
        <div className="flex flex-col lg:flex-row items-start justify-center gap-12">
          {/* Video Player */}
          <div 
            className="mx-auto lg:mx-0"
            style={{
              width: '420px',
              height: '700px',
              backgroundColor: 'white',
              borderRadius: '20px',
              padding: '15px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <h3 style={{ textAlign: 'center', marginBottom: '15px', color: '#333' }}>
              {currentConfig.title}
            </h3>
            <div style={{ 
              flex: 1,
              backgroundColor: '#000',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <PortraitVideoPlayer
                composition={currentConfig.composition}
                durationInFrames={currentConfig.durationInFrames}
                inputProps={currentConfig.inputProps}
                controls={true}
                autoPlay={false}
                loop={false}
              />
            </div>
          </div>

          {/* Video Info */}
          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {currentConfig.title}
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              {currentConfig.description}
            </p>

            {/* Configuration Details */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configuration
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-mono">{currentConfig.durationInFrames / 30}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">FPS:</span>
                  <span className="font-mono">30</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Resolution:</span>
                  <span className="font-mono">390×693px (9:16)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Frames:</span>
                  <span className="font-mono">{currentConfig.durationInFrames}</span>
                </div>
              </div>
            </div>

            {/* Usage Example */}
            <div className="bg-gray-900 rounded-xl p-6 mt-6 overflow-x-auto">
              <h3 className="text-lg font-semibold text-white mb-4">Usage</h3>
              <pre className="text-sm text-gray-300">
{`<PortraitVideoPlayer
  composition={${currentConfig.composition.name}}
  durationInFrames={${currentConfig.durationInFrames}}
  inputProps={${JSON.stringify(currentConfig.inputProps, null, 2)}}
  controls={true}
  autoPlay={false}
  loop={false}
/>`}
              </pre>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Component Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.79 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.79 4 8 4s8-1.79 8-4M4 7c0-2.21 3.79-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Reusable</h3>
              <p className="text-gray-600">Use with any Remotion composition. Pass different components and configurations.</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurable</h3>
              <p className="text-gray-600">Customize dimensions, FPS, duration, controls, and pass props to compositions.</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16l13-8L7 4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Timeline Controls</h3>
              <p className="text-gray-600">Built-in play/pause, scrubbing, fullscreen, and keyboard controls.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 