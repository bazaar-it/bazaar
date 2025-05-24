// src/app/layout.tsx
import "~/index.css";
import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "~/components/theme-provider";
import { SessionProvider } from "next-auth/react";
import { GlobalDependencyProvider } from "~/components/GlobalDependencyProvider";
import { Toaster } from "sonner";

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
                {children}
              </GlobalDependencyProvider>
            </SessionProvider>
          </TRPCReactProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}