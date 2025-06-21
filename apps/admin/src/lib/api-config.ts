// API configuration for cross-domain requests

export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include' as RequestCredentials, // Important for cookie sharing
};

// Helper for API calls to main app
export async function fetchFromMainApp(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
    ...options,
    headers: {
      ...API_CONFIG.headers,
      ...options?.headers,
    },
    credentials: API_CONFIG.credentials,
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}