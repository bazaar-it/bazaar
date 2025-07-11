"use client";
import React from "react";
import { StickyScroll } from "~/components/ui/sticky-scroll-reveal";

const content = [
  {
    title: "Start with templates",
    description:
      "Choose from 50+ ready-to-use templates that you can easily customise to match your brand.",
    content: (
      <div className="h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-semibold">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <div>100+ Templates</div>
        </div>
      </div>
    ),
  },
  {
    title: "Perfect for any platform",
    description:
      "Create in vertical, portrait or square - Perfect for social, product pages, and pitch decks.",
    content: (
      <div className="h-full w-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-4xl mb-4">📱💻⬜</div>
          <div className="text-lg font-semibold">Any Format</div>
        </div>
      </div>
    ),
  },
  {
    title: "Download as MP4",
    description:
      "Export your video in MP4, GIF, or WebP and always in full HD — ready to publish anywhere.",
    content: (
      <div className="h-full w-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-xl font-semibold">
        <div className="text-center">
          <div className="text-4xl mb-4">🎬</div>
          <div>Full HD Export</div>
        </div>
      </div>
    ),
  },
];

export function BazaarStickyScroll() {
  return (
    <div className="w-full">
      <StickyScroll content={content} />
    </div>
  );
} 