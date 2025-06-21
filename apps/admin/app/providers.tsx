"use client";

import { SessionProvider } from "next-auth/react";
import { TRPCProvider } from "../lib/trpc-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCProvider>
        {children}
      </TRPCProvider>
    </SessionProvider>
  );
}