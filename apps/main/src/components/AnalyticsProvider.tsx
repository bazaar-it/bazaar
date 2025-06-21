'use client';

import { useEffect } from 'react';
import { initializeAnalytics } from '~/lib/utils/analytics';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  useEffect(() => {
    // Initialize analytics when the app starts
    initializeAnalytics();
  }, []);

  return <>{children}</>;
} 