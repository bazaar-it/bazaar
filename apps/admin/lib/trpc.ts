import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '@bazaar/types';

export const api = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: process.env.NEXT_PUBLIC_API_URL 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/trpc`
        : 'http://localhost:3000/api/trpc',
      headers() {
        return {
          // Forward cookies for authentication
          cookie: typeof window !== 'undefined' ? document.cookie : '',
        };
      },
      fetch(url: string, options?: RequestInit) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        });
      },
      transformer: superjson,
    }),
  ],
});