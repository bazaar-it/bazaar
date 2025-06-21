"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState } from "react";
import superjson from "superjson";
import type { AppRouter } from "@bazaar/types";

export const api = createTRPCReact<AppRouter>();

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    api.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: process.env.NEXT_PUBLIC_MAIN_APP_URL 
            ? `${process.env.NEXT_PUBLIC_MAIN_APP_URL}/api/trpc`
            : 'http://localhost:3000/api/trpc',
          headers() {
            const headers: Record<string, string> = {};
            if (typeof window !== 'undefined') {
              // Get all cookies from current domain
              const cookies = document.cookie;
              if (cookies) {
                headers['cookie'] = cookies;
              }
              
              // Also send Authorization header if we have a session token
              const sessionToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('next-auth.session-token='))
                ?.split('=')[1];
              
              if (sessionToken) {
                headers['authorization'] = `Bearer ${sessionToken}`;
              }
            }
            return headers;
          },
          fetch(url: string, options?: RequestInit) {
            return fetch(url, {
              ...options,
              credentials: 'include',
            });
          },
        }),
      ],
    })
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </api.Provider>
  );
}