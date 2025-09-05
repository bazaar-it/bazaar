// src/app/(marketing)/ai-motion-graphics-software-demo/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Motion Graphics Software for Software Demos | Bazaar",
  description: "The #1 AI motion graphics software for creating software demos. Generate professional animated demos in 60 seconds. Like Cursor for motion graphics - describe it, we animate it.",
  keywords: [
    "AI motion graphics software demo",
    "AI motion graphics software",
    "software demo creator",
    "AI demo animation",
    "motion graphics for software",
    "AI animated demos",
    "software showcase tool"
  ],
  openGraph: {
    title: "AI Motion Graphics Software for Software Demos",
    description: "Create stunning software demos with AI-powered motion graphics. No design skills needed.",
  }
};

export default function AIMotionGraphicsPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Bazaar - AI Motion Graphics Software",
    "applicationCategory": "Motion Graphics Software",
    "description": "AI-powered motion graphics software specifically designed for creating software demos",
    "operatingSystem": "Web-based",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "1847"
    }
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
            </div>
          </a>
        </header>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-6">
              AI Motion Graphics Software for<br/>
              <span className="bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent">
                Software Demos
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Create professional animated software demos in 60 seconds with AI. 
              No After Effects, no timeline editing, no design skills needed. 
              Just describe what you want to showcase.
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="/"
                className="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow"
              >
                Try Free - No Credit Card
              </a>
              <a
                href="#how-it-works"
                className="border-2 border-gray-300 px-8 py-3 rounded-lg font-semibold hover:border-gray-400 transition-colors"
              >
                See How It Works
              </a>
            </div>
          </div>

          {/* Key Benefits */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2">60 Second Demos</h3>
              <p className="text-gray-600">
                What takes hours in After Effects takes seconds with Bazaar's AI motion graphics
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold mb-2">No Design Skills</h3>
              <p className="text-gray-600">
                Just describe your software demo in plain English. AI handles all the motion design
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold mb-2">Production Ready</h3>
              <p className="text-gray-600">
                Export in MP4, WebM, or GIF. Perfect quality for websites, social media, and sales
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="bg-gray-50 py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-12">
              How AI Motion Graphics Works
            </h2>
            <div className="space-y-8">
              <div className="flex gap-6 items-start">
                <div className="text-2xl font-bold text-pink-500">1</div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Upload Your Software Screenshot</h3>
                  <p className="text-gray-600">
                    Take a screenshot of your software, dashboard, or app. Bazaar's AI analyzes your UI to understand what to animate.
                  </p>
                </div>
              </div>
              <div className="flex gap-6 items-start">
                <div className="text-2xl font-bold text-pink-500">2</div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Describe The Animation You Want</h3>
                  <p className="text-gray-600">
                    Tell the AI what to showcase: "Animate the dashboard metrics counting up" or "Show the user flow with smooth transitions"
                  </p>
                </div>
              </div>
              <div className="flex gap-6 items-start">
                <div className="text-2xl font-bold text-pink-500">3</div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">AI Generates Motion Graphics</h3>
                  <p className="text-gray-600">
                    In 60 seconds, get a professional animated demo with perfect timing, easing, and effects. Export and share anywhere.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-12">
              AI Motion Graphics vs Traditional Tools
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-4 px-4"></th>
                    <th className="text-center py-4 px-4 font-semibold">Bazaar AI</th>
                    <th className="text-center py-4 px-4 text-gray-500">After Effects</th>
                    <th className="text-center py-4 px-4 text-gray-500">Premiere Pro</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4">Time to create demo</td>
                    <td className="text-center py-4 px-4 text-green-600 font-semibold">60 seconds</td>
                    <td className="text-center py-4 px-4 text-gray-500">4-8 hours</td>
                    <td className="text-center py-4 px-4 text-gray-500">2-4 hours</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4">Learning curve</td>
                    <td className="text-center py-4 px-4 text-green-600 font-semibold">None</td>
                    <td className="text-center py-4 px-4 text-gray-500">6+ months</td>
                    <td className="text-center py-4 px-4 text-gray-500">3+ months</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4">Cost</td>
                    <td className="text-center py-4 px-4 text-green-600 font-semibold">Free start</td>
                    <td className="text-center py-4 px-4 text-gray-500">$23/month</td>
                    <td className="text-center py-4 px-4 text-gray-500">$23/month</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4">Motion design skills needed</td>
                    <td className="text-center py-4 px-4 text-green-600 font-semibold">No</td>
                    <td className="text-center py-4 px-4 text-gray-500">Yes</td>
                    <td className="text-center py-4 px-4 text-gray-500">Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-12">
              Perfect For Every Software Demo Need
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Product Launches</h3>
                <p className="text-gray-600">
                  Create stunning reveal videos for new features and products. AI motion graphics make your software look premium.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Sales Demos</h3>
                <p className="text-gray-600">
                  Generate personalized demo videos for prospects in minutes. Show exactly what they need to see.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Social Media</h3>
                <p className="text-gray-600">
                  Create eye-catching software demos for LinkedIn, Twitter, and TikTok. Export in any aspect ratio.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Documentation</h3>
                <p className="text-gray-600">
                  Replace boring screenshots with animated demos in your docs. Make tutorials engaging and clear.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-6">
              Start Creating AI Motion Graphics Today
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Join thousands of developers and founders using AI to create stunning software demos
            </p>
            <a
              href="/"
              className="inline-block bg-gradient-to-r from-pink-500 to-orange-500 text-white px-12 py-4 rounded-lg text-lg font-semibold hover:shadow-lg transition-shadow"
            >
              Create Your First Demo Free
            </a>
            <p className="text-gray-500 mt-4">No credit card required • 10 free exports daily</p>
          </div>
        </section>
      </div>
    </>
  );
}