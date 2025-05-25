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
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TRPCReactProvider>
            <SessionProvider>
              <GlobalDependencyProvider>
                <AnalyticsProvider>
                  <ErrorBoundary>
                    {children}
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