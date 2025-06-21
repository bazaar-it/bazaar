import { useState, useEffect } from 'react';

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  isAdmin: boolean;
}

interface AdminSession {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: AdminUser | null;
  isLoading: boolean;
}

export function useAdminAuth(): AdminSession {
  const [session, setSession] = useState<AdminSession>({
    isAuthenticated: false,
    isAdmin: false,
    user: null,
    isLoading: true
  });

  useEffect(() => {
    async function validateSession() {
      try {
        const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'http://localhost:3000';
        const response = await fetch(`${mainAppUrl}/api/admin/validate-session`, {
          credentials: 'include',
          mode: 'cors'
        });

        if (response.ok) {
          const data = await response.json();
          setSession({
            isAuthenticated: data.isAuthenticated,
            isAdmin: data.isAdmin,
            user: data.user,
            isLoading: false
          });
        } else {
          setSession({
            isAuthenticated: false,
            isAdmin: false,
            user: null,
            isLoading: false
          });
        }
      } catch (error) {
        console.error('Session validation failed:', error);
        setSession({
          isAuthenticated: false,
          isAdmin: false,
          user: null,
          isLoading: false
        });
      }
    }

    validateSession();
  }, []);

  return session;
}