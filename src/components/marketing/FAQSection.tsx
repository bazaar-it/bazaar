"use client";

import { useState } from "react";

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface FAQSectionProps {
  faqs: FAQ[];
}

export default function FAQSection({ faqs }: FAQSectionProps) {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <section className="w-full py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 flex items-center justify-center gap-3">
          <span className="text-2xl">📚</span> FAQs
        </h2>
        
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div 
              key={faq.id} 
              className="border border-gray-200 rounded-lg overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => toggleFaq(faq.id)}
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
              >
                <span className="font-medium text-lg">{faq.question}</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={`transition-transform duration-200 ${expandedFaq === faq.id ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div 
                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                  expandedFaq === faq.id ? 'max-h-none py-4' : 'max-h-0 py-0'
                }`}
              >
                <div className="text-gray-600 space-y-4">
                  {faq.answer.split('\n\n').map((paragraph, index) => {
                    // Split by single line breaks to handle bullet points
                    const lines = paragraph.split('\n');
                    return (
                      <div key={index} className="space-y-2">
                        {lines.map((line, lineIndex) => {
                          // Handle bold text and links
                          const parts = line.split(/(\*\*.*?\*\*|https?:\/\/[^\s]+)/);
                          return (
                            <p key={lineIndex} className="leading-relaxed">
                              {parts.map((part, partIndex) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return (
                                    <strong key={partIndex} className="font-semibold text-gray-900">
                                      {part.slice(2, -2)}
                                    </strong>
                                  );
                                } else if (part.startsWith('http')) {
                                  return (
                                    <a 
                                      key={partIndex} 
                                      href={part} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline"
                                    >
                                      here
                                    </a>
                                  );
                                }
                                return part;
                              })}
                            </p>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}