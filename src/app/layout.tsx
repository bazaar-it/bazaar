// src/app/layout.tsx
import "~/index.css";
import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "~/components/theme-provider";
import { SessionProvider } from "next-auth/react";
import { GlobalDependencyProvider } from "~/components/GlobalDependencyProvider";
import { Toaster } from "sonner";
import { Analytics } from '@vercel/analytics/react';
import { AnalyticsProvider } from '../client/components/AnalyticsProvider';
import { ErrorBoundary } from '../client/components/ErrorBoundary';
import { Footer } from "~/components/ui/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bazaar-Vid | AI Video Generation Platform",
  description: "Create stunning videos with AI-powered scene generation. Transform your ideas into professional videos in minutes.",
  keywords: "AI video generation, video creation, automated video, scene generation, video editing",
  authors: [{ name: "Bazaar-Vid Team" }],
  openGraph: {
    title: "Bazaar | AI Video Generation Platform",
    description: "Create stunning videos with AI-powered scene generation",
    url: "https://bazaar.it",
    siteName: "Bazaar-Vid",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bazaar | AI Video Generation Platform",
    description: "Create stunning videos with AI-powered scene generation",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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
                      <Footer />
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