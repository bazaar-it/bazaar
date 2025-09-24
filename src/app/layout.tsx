// src/app/layout.tsx
import "~/index.css";
import "~/remotion/fonts.css"; // Load fonts globally for template previews
import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "~/components/theme-provider";
import { SessionProvider } from "next-auth/react";
import { GlobalDependencyProvider } from "~/components/GlobalDependencyProvider";
import { Toaster } from "sonner";
import { Analytics } from '@vercel/analytics/react';
import { AnalyticsProvider } from '~/components/AnalyticsProvider';
import { ErrorBoundary } from '~/components/ErrorBoundary';
import Script from 'next/script';
import { siteConfig } from '~/config/site';
import { AttributionCapture } from "~/components/attribution/AttributionCapture";
import { AttributionIngestor } from "~/components/attribution/AttributionIngestor";
import type { Metadata } from "next";

// Generate structured data for the website
function getStructuredData() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Bazaar - AI Motion Graphics Software for Software Demos",
      "description": "AI motion graphics for software demos. Just describe what you want - prompt your way to the perfect demo video. Upload images, Figma boards, YouTube links and more.",
      "url": siteConfig.url,
      "applicationCategory": "MultimediaApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "2847",
        "bestRating": "5",
        "worstRating": "1"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${siteConfig.url}/search?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Bazaar AI Video API",
      "applicationCategory": "DeveloperApplication",
      "operatingSystem": "API",
      "description": "API for generating motion graphics programmatically. Create professional software demos through natural language prompts.",
      "url": `${siteConfig.url}/api`,
      "featureList": [
        "Text-to-video generation",
        "Motion graphics creation",
        "Chatbot integration",
        "Real-time rendering",
        "Multiple export formats",
        "AI-powered scene generation"
      ],
      "screenshot": `${siteConfig.url}/screenshot.png`
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is the best AI motion graphics software for software demos?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Bazaar is the leading AI motion graphics software specifically designed for software demos. It works like Cursor for motion graphics - just describe what you want to showcase and it creates professional animations instantly. No After Effects or design skills needed."
          }
        },
        {
          "@type": "Question",
          "name": "How does AI motion graphics work for software demos?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Bazaar uses AI to transform your software screenshots and descriptions into animated demos. Upload a screenshot, describe the animations you want (like 'highlight the dashboard metrics' or 'show the user flow'), and the AI creates professional motion graphics in seconds."
          }
        },
        {
          "@type": "Question",
          "name": "Why use AI motion graphics instead of traditional video editing?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "AI motion graphics with Bazaar is 100x faster than After Effects or Premiere Pro. Create software demos in 60 seconds instead of hours. No keyframing, no timeline editing, no motion design experience needed. Perfect for developers and founders who need professional demos quickly."
          }
        }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": siteConfig.url
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "AI Motion Graphics Software",
          "item": `${siteConfig.url}/ai-motion-graphics-software-demo`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "FAQ",
          "item": `${siteConfig.url}/faq`
        }
      ]
    }
  ];
}

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `Bazaar – AI Video Generator for Software Demos`,
    template: `%s | Bazaar`,
  },
  description: "Create demo videos for your software in seconds using AI. Turn your app features into viral content with customizable templates.",
  keywords: [
    "AI motion graphics software",
    "AI software demo creator",
    "motion graphics for software demos",
    "AI animated demo maker",
    "software demo animation tool",
    "AI motion design software",
    "automated software demo videos",
    "AI product demo generator",
    "motion graphics AI tool",
    "software showcase animator",
    "AI demo video maker",
    "Cursor for motion graphics",
    "AI-powered demo creation",
    "instant software demos",
    "text to demo video",
    "AI motion graphics generator",
    "software demo motion design",
    "AI video for SaaS demos",
    "automated motion graphics",
    "AI demo animation software"
  ],
  authors: [
    { 
      name: "Bazaar Team",
      url: siteConfig.url 
    }
  ],
  creator: "Bazaar",
  openGraph: {
    title: `Bazaar – AI Video Generator for Software Demos`,
    description: "Create demo videos for your software in seconds using AI. Turn your app features into viral content with customizable templates.",
    url: "https://bazaar.it/",
    siteName: siteConfig.name,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Bazaar.it%20-%20Turn%20screenshots%20into%20animated%20demo%20videos.png",
        width: 1200,
        height: 630,
        alt: "Bazaar – AI Video Generator for Software Demos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Bazaar – AI Video Generator for Software Demos`,
    description: "Create demo videos for your software in seconds using AI. Turn your app features into viral content with customizable templates.",
    creator: "@bazaar",
    images: ["https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Bazaar.it%20-%20Turn%20screenshots%20into%20animated%20demo%20videos.png"],
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
  alternates: {
    canonical: siteConfig.url,
  },
  verification: {
    // Add your Google Search Console verification code here
    // google: 'your-google-verification-code',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Generate structured data
  const structuredData = getStructuredData();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Structured Data */}
        {structuredData.map((data, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
          />
        ))}
        
        {/* Google Analytics */}
        {process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <TRPCReactProvider>
            <SessionProvider>
              <AttributionCapture />
              <AttributionIngestor />
              <GlobalDependencyProvider>
                <AnalyticsProvider>
                  <ErrorBoundary>
                    <div className="flex flex-col min-h-screen">
                      <main className="flex-1">
                        {children}
                      </main>
                    </div>
                  </ErrorBoundary>
                </AnalyticsProvider>
              </GlobalDependencyProvider>
            </SessionProvider>
          </TRPCReactProvider>
        </ThemeProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
