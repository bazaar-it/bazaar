"use client";
import BazaarScrollHero from "~/components/marketing/BazaarScrollHero";
import TemplateScrollGrid from "~/components/TemplateScrollGrid";

export default function RevolutDemoPage() {
  return (
    <div className="bg-white min-h-screen">
      {/* Bazaar-style Revolut Effect */}
      <BazaarScrollHero />
      
      {/* Additional Content */}
      <div className="relative bg-white py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              50+ Templates to Start From
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose from our collection of professionally designed templates
            </p>
          </div>
          
          <TemplateScrollGrid />
          
          <div className="text-center mt-12">
            <div className="inline-block p-[2px] bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg">
              <button className="bg-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gradient-to-r hover:from-pink-500 hover:to-orange-500 hover:text-white transition-colors">
                Browse All Templates
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}