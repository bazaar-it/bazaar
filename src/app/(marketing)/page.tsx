// src/app/(marketing)/page.tsx
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { headers } from "next/headers";
import Homepage from "~/app/(marketing)/home/page";

export default async function HomePage() {
  const session = await auth();
  const headersList = await headers();
  const referer = headersList.get('referer');
  
  // If user is authenticated
  if (session?.user) {
    // Check if user is coming from internal navigation (like logo click from projects-side or marketing-siders)
    
    const isInternalNavigation = referer && (
      referer.includes('/') ||
      referer.includes('/projects') ||
      referer.includes('/admin') ||
      referer.includes('/settings') ||
      referer.includes('/our-story') ||
      referer.includes('/terms') ||
      referer.includes('/privacy')
    );
    
    // If it is internal navigation, let the user stay on homepage
    if (isInternalNavigation) {
      return <Homepage />;
    }
    
    // If it is not internal navigation, redirect to latest project or new project
    redirect('/projects/quick-create');
  }
  // If not authenticated, show marketing-side
  return <Homepage />;
}