// src/app/layout.tsx
import "~/styles/globals.css";
import { TRPCReactProvider } from "~/trpc/react";  // ← add this import

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* 👇 give every page tRPC + React-Query context */}
        <TRPCReactProvider>
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  );
}