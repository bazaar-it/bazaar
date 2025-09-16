"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, lazy, useEffect, forwardRef, useImperativeHandle } from "react";
import { LogOutIcon, ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

// Lazy load the login modal
const LoginModal = lazy(() => import("~/app/(marketing)/login/page"));

// Function to generate a consistent color based on the user's name
function stringToColor(string: string) {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).slice(-2);
  }
  return color;
}

// Avatar component that displays the first letter of the user's name
function UserAvatar({ name }: { name: string }) {
  const firstLetter = name.charAt(0).toUpperCase();
  const color = stringToColor(name);
  
  return (
    <div 
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold cursor-pointer hover:ring-2 hover:ring-gray-200/60 transition-all shadow-sm"
      style={{ backgroundColor: color }}
    >
      {firstLetter}
    </div>
  );
}

interface MarketingHeaderProps {
  redirectTo?: string;
  showLiveButton?: boolean;
}

export interface MarketingHeaderRef {
  openLoginModal: () => void;
}

const MarketingHeader = forwardRef<MarketingHeaderRef, MarketingHeaderProps>(
  ({ redirectTo = '/', showLiveButton = false }, ref) => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [showLogin, setShowLogin] = useState(false);
    const [isLiveStreaming, setIsLiveStreaming] = useState(false);

    // Check if live streaming (you can update this with real API check later)
    useEffect(() => {
      // For now, we'll check if it's between certain hours or use a feature flag
      // You can replace this with an actual API call to check streaming status
      const checkLiveStatus = () => {
        // Example: Check if current day is weekday and between 2-5 PM PST
        const now = new Date();
        const day = now.getDay();
        const hour = now.getHours();
        
        // Enable live button manually for now - set to true when streaming
        setIsLiveStreaming(false); // Set to true when you're live
      };

      checkLiveStatus();
      const interval = setInterval(checkLiveStatus, 60000); // Check every minute
      
      return () => clearInterval(interval);
    }, []);

    // Expose openLoginModal method to parent components
    useImperativeHandle(ref, () => ({
      openLoginModal: () => setShowLogin(true)
    }));

    // Handle user logout
    const handleLogout = async () => {
      await signOut({ redirect: true, callbackUrl: '/' });
    };

    const handleShowLogin = () => {
      setShowLogin(true);
    };

    return (
      <>
        <header className="w-full h-16 md:h-20 border-b shadow-sm flex items-center px-4 md:px-12 justify-between bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-4 md:gap-5 font-inter">
              <span onClick={() => router.push('/')} className="text-2xl md:text-3xl font-semibold text-black cursor-pointer">Bazaar</span>
              <span className="text-sm md:text-base font-medium bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent">V3</span>
              {(isLiveStreaming || showLiveButton) && (
                <a
                  href="https://x.com/bazaar_ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-red-600 bg-red-50 border border-red-200 shadow-sm hover:bg-red-100/70 transition-colors"
                >
                  <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-[0.7rem] md:text-sm">The boys are live</span>
                </a>
              )}
            </div>
          </div>
          
          {/* Live Streaming Button (centered fallback when not showing header pill) */}
          {isLiveStreaming && !showLiveButton && (
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <a
                href="https://x.com/bazaar_ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-red-500 text-white rounded-full font-semibold text-xs md:text-sm hover:bg-red-600 transition-all duration-200 shadow-lg animate-pulse"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                <span className="hidden md:inline">The boys are live</span>
                <span className="inline md:hidden">LIVE</span>
              </a>
            </div>
          )}
          
          <div className="flex gap-2 md:gap-4 items-center">
            {status === "authenticated" ? (
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                      <UserAvatar name={session.user?.name ?? session.user?.email ?? 'U'} />
                      <span className="text-xs md:text-base truncate max-w-[150px] md:max-w-none">
                        {session.user?.name ?? session.user?.email}
                      </span>
                      <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-[15px] shadow-sm border-gray-100 overflow-hidden">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{session.user?.name}</p>
                      {session.user?.email && (
                        <p className="text-xs text-muted-foreground mt-0.5">{session.user.email}</p>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="text-red-600 cursor-pointer"
                    >
                      <LogOutIcon className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <>
                <button className="cursor-pointer text-sm md:text-base px-2 md:px-4 py-1 md:py-2 rounded hover:bg-gray-100 transition" onClick={handleShowLogin}>Login</button>
                <button className="cursor-pointer text-sm md:text-base px-3 md:px-4 py-1 md:py-2 font-semibold rounded bg-black text-white hover:bg-gray-900 transition" onClick={handleShowLogin}>Sign Up</button>
              </>
            )}
          </div>
        </header>

        {/* Login Modal Overlay */}
        {showLogin && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-auto max-w-sm relative">
              <button 
                className="absolute top-3 right-3 z-10 text-gray-500 hover:text-black w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors" 
                onClick={() => setShowLogin(false)}
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <LoginModal redirectTo={redirectTo} />
            </div>
          </div>
        )}
      </>
    );
  }
);

MarketingHeader.displayName = 'MarketingHeader';

export default MarketingHeader;
