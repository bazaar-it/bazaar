import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Runway vs Bazaar - AI Motion Graphics Generator Comparison',
  description: 'Bazaar.it is an AI motion graphics generator that offers a powerful alternative to Runway. Compare features, pricing, and capabilities for AI video generation.',
  keywords: 'Bazaar, Runway, AI motion graphics, AI video generator, text to video, motion graphics generator, Runway alternative, AI animation',
  
  openGraph: {
    title: 'Runway vs Bazaar - AI Motion Graphics Comparison',
    description: 'Bazaar.it is an AI motion graphics generator alternative to Runway. Open source, better pricing, no watermarks.',
    url: 'https://bazaar.it/compare/runway-vs-bazaar',
    siteName: 'Bazaar',
    type: 'website',
    images: [
      {
        url: 'https://bazaar.it/og-runway-comparison.png',
        width: 1200,
        height: 630,
        alt: 'Bazaar vs Runway comparison'
      }
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'Runway vs Bazaar - AI Motion Graphics',
    description: 'Bazaar.it: Open-source AI motion graphics generator. Better pricing than Runway.',
    images: ['https://bazaar.it/og-runway-comparison.png'],
  },
  
  alternates: {
    canonical: 'https://bazaar.it/compare/runway-vs-bazaar',
  },
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};