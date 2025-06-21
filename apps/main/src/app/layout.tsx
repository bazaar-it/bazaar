// src/app/layout.tsx
import "~/index.css";
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
import type { Metadata } from "next";

// Generate structured data for the website
function getStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": siteConfig.name,
    "description": "AI-powered motion graphics generator that transforms your ideas into professional videos in minutes.",
    "url": siteConfig.url,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${siteConfig.url}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };
}

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | AI Motion Graphics Generator`,
    template: `%s | ${siteConfig.name}`,
  },
  description: "Create stunning motion graphics with AI. Transform your ideas into professional videos in minutes with Bazaar's AI-powered video generation platform.",
  keywords: [
    "AI video generator",
    "motion graphics",
    "AI animation",
    "video creation",
    "automated video",
    "text to video",
    "AI video maker",
    "motion design",
    "explainer video",
    "AI video editor"
  ],
  authors: [
    { 
      name: "Bazaar Team",
      url: siteConfig.url 
    }
  ],
  creator: "Bazaar",
  openGraph: {
    title: `${siteConfig.name} | AI Motion Graphics Generator`,
    description: "Create stunning motion graphics with AI. Transform your ideas into professional videos in minutes.",
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: `${siteConfig.url}/og-image.png`,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | AI Motion Graphics Generator`,
    description: "Create stunning motion graphics with AI. No design skills needed.",
    creator: "@bazaar",
    images: [`${siteConfig.url}/og-image.png`],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        
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