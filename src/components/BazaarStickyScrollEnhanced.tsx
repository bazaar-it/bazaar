"use client";
import React from "react";
import { StickyScrollEnhanced } from "~/components/ui/sticky-scroll-reveal-enhanced";
import { motion } from "framer-motion";
import { Play, Sparkles, Download, Smartphone, Monitor, Square } from "lucide-react";

const content = [
  {
    title: "Start with templates",
    description:
      "Choose from 50+ ready-to-use templates that you can easily customise to match your brand.",
    content: (
      <div className="h-full w-full relative bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center overflow-hidden">
        {/* Animated template cards */}
        <div className="relative w-full h-full p-8">
          <motion.div
            className="absolute top-8 left-8 w-40 h-56 bg-white/20 backdrop-blur-md rounded-xl p-4 shadow-xl"
            animate={{
              y: [0, -10, 0],
              rotate: [-2, 2, -2],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="h-full flex flex-col">
              <div className="w-full h-24 bg-white/30 rounded-lg mb-2" />
              <div className="flex-1 space-y-2">
                <div className="h-2 bg-white/40 rounded" />
                <div className="h-2 bg-white/40 rounded w-3/4" />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="absolute top-12 right-12 w-40 h-56 bg-white/20 backdrop-blur-md rounded-xl p-4 shadow-xl"
            animate={{
              y: [0, 10, 0],
              rotate: [2, -2, 2],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          >
            <div className="h-full flex flex-col">
              <div className="w-full h-24 bg-white/30 rounded-lg mb-2" />
              <div className="flex-1 space-y-2">
                <div className="h-2 bg-white/40 rounded" />
                <div className="h-2 bg-white/40 rounded w-3/4" />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="absolute bottom-12 left-1/2 transform -translate-x-1/2 w-40 h-56 bg-white/30 backdrop-blur-md rounded-xl p-4 shadow-xl"
            animate={{
              y: [0, -5, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          >
            <div className="h-full flex flex-col">
              <div className="w-full h-24 bg-white/40 rounded-lg mb-2 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-2 bg-white/50 rounded" />
                <div className="h-2 bg-white/50 rounded w-3/4" />
              </div>
            </div>
          </motion.div>

          <div className="absolute bottom-8 right-8 text-white text-xl font-semibold">
            50+ Templates
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Perfect for any platform",
    description:
      "Create in vertical, portrait or square - Perfect for social, product pages, and pitch decks.",
    content: (
      <div className="h-full w-full relative bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center overflow-hidden">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Animated device mockups */}
          <motion.div
            className="absolute flex items-center justify-center"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Phone - Vertical */}
            <motion.div
              className="relative mx-4"
              animate={{
                y: [0, -20, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="w-32 h-64 bg-black rounded-3xl p-2 shadow-2xl">
                <div className="w-full h-full bg-white/20 rounded-2xl flex items-center justify-center">
                  <Smartphone className="w-8 h-8 text-white/60" />
                </div>
              </div>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm font-medium">
                9:16
              </div>
            </motion.div>

            {/* Desktop - Landscape */}
            <motion.div
              className="relative mx-4"
              animate={{
                y: [0, 20, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
            >
              <div className="w-64 h-36 bg-black rounded-lg p-2 shadow-2xl">
                <div className="w-full h-full bg-white/20 rounded flex items-center justify-center">
                  <Monitor className="w-8 h-8 text-white/60" />
                </div>
              </div>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm font-medium">
                16:9
              </div>
            </motion.div>

            {/* Square */}
            <motion.div
              className="relative mx-4"
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2,
              }}
            >
              <div className="w-40 h-40 bg-black rounded-xl p-2 shadow-2xl">
                <div className="w-full h-full bg-white/20 rounded-lg flex items-center justify-center">
                  <Square className="w-8 h-8 text-white/60" />
                </div>
              </div>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm font-medium">
                1:1
              </div>
            </motion.div>
          </motion.div>

          <div className="absolute bottom-8 left-8 right-8 text-center text-white text-xl font-semibold">
            Any Format, Any Platform
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Download as MP4",
    description:
      "Export your video in MP4, GIF, or WebP and always in full HD — ready to publish anywhere.",
    content: (
      <div className="h-full w-full relative bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center overflow-hidden">
        <div className="relative w-full h-full p-8">
          {/* Export animation */}
          <div className="flex flex-col items-center justify-center h-full">
            <motion.div
              className="relative"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="w-48 h-32 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-2xl">
                <Play className="w-12 h-12 text-white" />
              </div>
              
              {/* Progress bar */}
              <motion.div
                className="absolute -bottom-6 left-0 right-0 h-2 bg-white/20 rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div
                  className="h-full bg-white"
                  animate={{
                    width: ["0%", "100%"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </motion.div>
            </motion.div>

            {/* File formats */}
            <div className="mt-16 flex space-x-8">
              {["MP4", "GIF", "WebP"].map((format, index) => (
                <motion.div
                  key={format}
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.2 }}
                >
                  <motion.div
                    className="w-16 h-20 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center mb-2"
                    animate={{
                      y: [0, -5, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.3,
                    }}
                  >
                    <Download className="w-6 h-6 text-white" />
                  </motion.div>
                  <span className="text-white text-sm font-medium">{format}</span>
                </motion.div>
              ))}
            </div>

            <div className="absolute bottom-8 left-8 right-8 text-center text-white text-xl font-semibold">
              Full HD Export • Ready to Publish
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

export function BazaarStickyScrollEnhanced() {
  return (
    <div className="w-full">
      <StickyScrollEnhanced content={content} />
    </div>
  );
}