// Development-only authentication helper
// This should NEVER be used in production

import { useSession } from 'next-auth/react';
import { api } from './api';

interface AdminAuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  isLoading: boolean;
}

export function useAdminAuthDev(): AdminAuthState {
  // In development, if there's a special query param, bypass auth
  if (process.env.NODE_ENV === 'development') {
    const urlParams = new URLSearchParams(window.location.search);
    const devAuth = urlParams.get('dev-auth');
    
    if (devAuth === 'admin') {
      return {
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: '7425a5bd-758b-46fc-b68a-613d5673a6e0', // Your admin user ID
          name: 'Lysaker (Dev Mode)',
          email: 'markushogne@gmail.com',
          image: null,
        },
        isLoading: false,
      };
    }
  }
  
  // Otherwise fall back to normal auth flow
  const { data: session, status } = useSession();
  const { data: adminCheck, isLoading: isCheckingAdmin } = api.admin.checkAdminAccess.useQuery(
    undefined,
    { enabled: !!session?.user?.id, retry: false }
  );

  return {
    isAuthenticated: !!session?.user,
    isAdmin: adminCheck?.isAdmin ?? false,
    user: session?.user ? {
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
    } : null,
    isLoading: status === 'loading' || (!!session?.user?.id && isCheckingAdmin),
  };
}