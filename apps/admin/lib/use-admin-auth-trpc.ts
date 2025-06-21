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

export function useAdminAuthTRPC(): AdminAuthState {
  const { data: session, status } = useSession();
  
  // DEV ONLY: Check for dev bypass
  const isDev = process.env.NODE_ENV === 'development';
  const isDevAdmin = isDev && process.env.NEXT_PUBLIC_DEV_ADMIN === 'true';
  
  if (isDevAdmin) {
    return {
      isAuthenticated: true,
      isAdmin: true,
      user: {
        id: '7425a5bd-758b-46fc-b68a-613d5673a6e0',
        name: 'Lysaker (Dev Mode)',
        email: 'markushogne@gmail.com',
        image: null,
      },
      isLoading: false,
    };
  }
  
  // Check admin access via tRPC
  const { data: adminCheck, isLoading: isCheckingAdmin } = api.admin.checkAdminAccess.useQuery(
    undefined,
    {
      enabled: !!session?.user?.id,
      retry: false,
    }
  );

  const isLoading = status === 'loading' || (!!session?.user?.id && isCheckingAdmin);

  return {
    isAuthenticated: !!session?.user,
    isAdmin: adminCheck?.isAdmin ?? false,
    user: session?.user ? {
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
    } : null,
    isLoading,
  };
}