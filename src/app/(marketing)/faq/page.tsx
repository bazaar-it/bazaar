// src/app/(marketing)/faq/page.tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    category: "What is Bazaar?",
    questions: [
      {
        q: "What exactly is Bazaar?",
        a: "Bazaar is like Cursor for motion graphics - an AI-powered tool that makes creating animated software demos incredibly easy. Just describe what you want in plain language, and Bazaar generates professional motion graphics in seconds."
      },
      {
        q: "How is Bazaar different from traditional video editors?",
        a: "Traditional editors require manual keyframing, timeline management, and design skills. Bazaar uses AI to handle all of that automatically. Just type what you want - like 'show a dashboard with animated charts' - and it creates the entire animation for you."
      },
      {
        q: "Who is Bazaar built for?",
        a: "Developers, founders, marketers, and anyone who needs to create software demo videos quickly. If you can describe what you want to show, you can use Bazaar. No motion design experience needed."
      },
      {
        q: "Why is it called 'Cursor for motion graphics'?",
        a: "Just like Cursor revolutionized coding with AI, Bazaar revolutionizes motion graphics. You work with natural language instead of complex timelines and keyframes. The AI understands what you want and creates it instantly."
      }
    ]
  },
  {
    category: "Creating Software Demos",
    questions: [
      {
        q: "What kind of software demos can I create?",
        a: "Product launches, feature announcements, onboarding videos, UI walkthroughs, dashboard animations, mobile app demos, API visualizations, and any type of software showcase. Bazaar specializes in making software look amazing in motion."
      },
      {
        q: "How do I create a demo video?",
        a: "Just describe your software or upload a screenshot, then tell Bazaar what to animate. For example: 'Animate this dashboard with the numbers counting up and charts growing'. Bazaar handles all the motion design automatically."
      },
      {
        q: "Can I use my actual software screenshots?",
        a: "Yes! Upload screenshots of your actual software and Bazaar will animate them professionally. It can add highlights, transitions, zoom effects, and make your static UI come alive with motion."
      },
      {
        q: "How long does it take to create a demo?",
        a: "Most demos generate in 60-90 seconds. Compare that to hours or days with traditional video editing. You can iterate and refine just as quickly."
      },
      {
        q: "Can I edit the animations after generation?",
        a: "Yes! Just describe what you want to change in plain language. Say 'make the transition faster' or 'add a glow effect to the button' and Bazaar updates the animation instantly."
      }
    ]
  },
  {
    category: "AI & Motion Graphics",
    questions: [
      {
        q: "How does the AI understand what I want?",
        a: "Bazaar's AI is trained specifically on motion graphics and software demos. It understands terms like 'ease in', 'bounce', 'fade', but also simple descriptions like 'make it feel smooth' or 'add some energy'."
      },
      {
        q: "Do I need to know motion design terminology?",
        a: "No! Describe animations in your own words. Instead of 'add ease-in-out bezier curves', just say 'make it smooth'. The AI translates your intent into professional motion graphics."
      },
      {
        q: "Can the AI match my brand style?",
        a: "Yes! Tell Bazaar about your brand colors, style preferences, or even reference other videos. It will generate animations that match your brand's look and feel."
      },
      {
        q: "What if the AI doesn't get it right the first time?",
        a: "Just refine with natural language. Say 'make it more professional', 'slow it down', or 'add more emphasis to the CTA button'. Each iteration takes seconds, not hours."
      }
    ]
  },
  {
    category: "Technical Details",
    questions: [
      {
        q: "What formats can I export?",
        a: "Export as MP4, WebM, or GIF. Videos can be rendered in multiple aspect ratios: 16:9 for YouTube, 9:16 for TikTok/Reels, 1:1 for Instagram posts."
      },
      {
        q: "What resolution are the videos?",
        a: "Up to 1080p on free tier, 4K on pro plans. All videos are optimized for web delivery with perfect quality-to-size ratios."
      },
      {
        q: "Can I use custom fonts and colors?",
        a: "Yes! Bazaar supports custom fonts, brand colors, and even custom component styles. Upload your brand guidelines and Bazaar will follow them."
      },
      {
        q: "Is there an API for automation?",
        a: "Coming soon! We're building an API so you can generate demo videos programmatically, perfect for creating personalized demos at scale."
      }
    ]
  },
  {
    category: "Pricing & Usage",
    questions: [
      {
        q: "Is Bazaar free to try?",
        a: "Yes! Start creating immediately with no credit card required. Free tier includes 10 video exports per day."
      },
      {
        q: "What's the difference between free and pro?",
        a: "Free: 10 exports/day, 1080p resolution, Bazaar watermark. Pro: 100 exports/day, 4K resolution, no watermark, priority rendering, custom branding."
      },
      {
        q: "Can I use Bazaar videos commercially?",
        a: "Yes! You own all rights to videos you create, even on the free tier. Use them for marketing, sales, documentation, or any commercial purpose."
      },
      {
        q: "Do you offer team plans?",
        a: "Yes! Team plans include shared workspaces, brand templates, collaborative editing, and centralized billing. Perfect for marketing teams and agencies."
      }
    ]
  }
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newOpen = new Set(openItems);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenItems(newOpen);
  };

  // Generate structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.flatMap(section =>
      section.questions.map(item => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.a
        }
      }))
    )
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="w-full h-16 md:h-20 border-b shadow-sm flex items-center px-4 md:px-12 justify-between bg-white z-10">
          <a href="/" className="flex items-end gap-2">
            <div className="flex items-baseline gap-2 font-inter">
              <span className="text-2xl md:text-3xl font-semibold text-black">Bazaar</span>
              <span className="text-sm md:text-base font-medium bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent">V2</span>
            </div>
          </a>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600">
              Learn how Bazaar makes motion graphics as easy as writing text
            </p>
          </div>

          {/* FAQ Sections */}
          {faqs.map((section) => (
            <div key={section.category} className="mb-12">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900">
                {section.category}
              </h2>
              <div className="space-y-4">
                {section.questions.map((item, index) => {
                  const itemId = `${section.category}-${index}`;
                  const isOpen = openItems.has(itemId);
                  
                  return (
                    <div
                      key={itemId}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
                    >
                      <button
                        onClick={() => toggleItem(itemId)}
                        className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        aria-expanded={isOpen}
                      >
                        <span className="font-medium text-gray-900 pr-4">
                          {item.q}
                        </span>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-500 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                          <p className="text-gray-700 leading-relaxed">
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* CTA Section */}
          <div className="mt-16 text-center py-12 bg-gradient-to-r from-pink-50 to-orange-50 rounded-2xl">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Create Motion Graphics with AI?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Join developers who are creating stunning software demos in seconds
            </p>
            <a
              href="/"
              className="inline-block bg-gradient-to-r from-pink-500 to-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow"
            >
              Start Creating for Free
            </a>
          </div>
        </main>
      </div>
    </>
  );
}