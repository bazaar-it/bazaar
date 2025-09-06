"use client";
import { useEffect, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ParticleEffect from "~/components/marketing/ParticleEffect";
import MarketingVideoPlayer from "~/components/MarketingVideoPlayer";
import MarketingComponentPlayer from "~/components/MarketingComponentPlayer";
import AspectRatioTransitionPlayer from "~/components/AspectRatioTransitionPlayer";
import AirbnbFinishedDemo from "~/components/AirbnbFinishedDemo";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  // Register ScrollToPlugin for auto-scroll
  import("gsap/ScrollToPlugin").then(({ ScrollToPlugin }) => {
    gsap.registerPlugin(ScrollToPlugin);
  });
}

export default function BazaarScrollHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const announcementRef = useRef<HTMLDivElement>(null);
  const marketingPlayerRef = useRef<HTMLDivElement>(null);
  const showcaseRef = useRef<HTMLDivElement>(null);
  const otherPlayersRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session, status } = useSession();
  const createProject = api.project.create.useMutation({
    onSuccess: (result) => router.push(`/projects/${result.projectId}/generate`),
  });
  const { data: projects } = api.project.list.useQuery(undefined, {
    enabled: status === "authenticated" && !!session?.user,
  });

  const handleGoToDesign = () => {
    if (status !== "authenticated" || !session?.user) {
      router.push("/login?redirect=/projects/quick-create");
      return;
    }
    if (projects && projects.length > 0) {
      router.push(`/projects/${projects[0].id}/generate`);
      return;
    }
    if (!createProject.isPending) {
      createProject.mutate({});
    }
  };

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    
    let autoScrollTriggered = false;
    let scrollTimeout: NodeJS.Timeout;
    
    const ctx = gsap.context(() => {
      // Set initial states
      gsap.set(showcaseRef.current, {
        opacity: 0,
        y: 50,
      });
      
      gsap.set(otherPlayersRef.current, {
        opacity: 0,
        y: 100,
      });

      // Create the main timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=300%",
          scrub: 1,
          pin: heroRef.current,
          pinSpacing: false,
          onUpdate: (self) => {
            // Auto-scroll when user scrolls a little
            if (!autoScrollTriggered && self.progress > 0.05 && self.progress < 0.95) {
              autoScrollTriggered = true;
              clearTimeout(scrollTimeout);
              
              // Determine target based on current progress
              let targetProgress = 1;
              if (self.progress < 0.33) {
                targetProgress = 0.33; // Go to expanded state
              } else if (self.progress < 0.66) {
                targetProgress = 0.66; // Go to showcase state
              } else {
                targetProgress = 1; // Go to end
              }
              
              // Smooth auto-scroll to target
              const scrollTarget = self.start + (self.end - self.start) * targetProgress;
              window.scrollTo({
                top: scrollTarget,
                behavior: 'smooth'
              });
              
              setTimeout(() => {
                autoScrollTriggered = false;
              }, 1500);
            }
          }
        }
      });

      // Phase 1: Fade out hero text elements smoothly
      tl.to([announcementRef.current, titleRef.current, subtitleRef.current, ctaRef.current], {
        opacity: 0,
        y: -50,
        duration: 0.3,
        stagger: 0.02,
      }, 0);

      // Phase 2: BOOM - Expand MarketingVideoPlayer dramatically
      tl.to(marketingPlayerRef.current, {
        scale: 3,
        y: -100,
        duration: 1,
        ease: "power2.inOut",
      }, 0.2)
      
      // Hold the expanded state
      .to(marketingPlayerRef.current, {
        scale: 3,
        duration: 0.5,
      }, 0.7)
      
      // Phase 3: Show "finished version" text
      .to(showcaseRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: "power2.out",
      }, 0.8)
      
      // Phase 4: Shrink MarketingVideoPlayer back and move up
      .to(marketingPlayerRef.current, {
        scale: 1,
        y: -300,
        duration: 0.6,
        ease: "power2.inOut",
      }, 1.2)
      
      // Phase 5: BOOM - Reveal the other two players
      .to(otherPlayersRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "back.out(1.2)",
      }, 1.5);

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative" style={{ minHeight: "400vh" }}>
      {/* Hero Section */}
      <div 
        ref={heroRef}
        className="relative h-screen overflow-hidden bg-white"
      >
        {/* Particle Effect */}
        <ParticleEffect />

        {/* Hero Content */}
        <div className="relative h-full flex flex-col items-center justify-center px-4 z-20 max-w-7xl mx-auto">
          {/* Announcement Banner */}
          <div ref={announcementRef} className="mb-8">
            <div className="inline-flex items-center gap-3 bg-gray-100 py-2 px-3 rounded-full">
              <span className="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                V2 is Live!
              </span>
              <span className="text-pink-600 font-medium text-sm">
                Watch the video
              </span>
            </div>
          </div>

          {/* Title */}
          <div ref={titleRef} className="text-center mb-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight text-gray-900">
              Screenshot to
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500">
                Demo Video
              </span>
              <span className="text-3xl md:text-4xl lg:text-5xl">in seconds</span>
            </h1>
          </div>

          {/* Subtitle */}
          <p ref={subtitleRef} className="text-lg md:text-xl text-gray-600 mb-6 text-center max-w-2xl">
            Transform your screenshots into stunning demo videos with AI-powered motion graphics
          </p>

          {/* CTA Button */}
          <div ref={ctaRef} className="mb-8">
            <div className="inline-block p-[2px] bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg">
              <button onClick={handleGoToDesign} className="bg-white px-6 md:px-8 py-3 md:py-4 rounded-lg text-base md:text-lg font-semibold hover:bg-gradient-to-r hover:from-pink-500 hover:to-orange-500 hover:text-white transition-colors">
                Start Creating Now
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-2 text-center">
              No credit card required
            </p>
          </div>

          {/* MarketingVideoPlayer - The main animation */}
          <div 
            ref={marketingPlayerRef}
            className="w-full max-w-3xl mx-auto"
            style={{
              transformOrigin: "center center",
              willChange: "transform",
            }}
          >
            <MarketingVideoPlayer />
          </div>
        </div>

        {/* Showcase Section - "Finished Version" text */}
        <div 
          ref={showcaseRef}
          className="absolute inset-0 flex items-center justify-center px-4 z-30 pointer-events-none"
        >
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
              Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500">Finished Video</span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-600">
              Professional motion graphics in seconds
            </p>
          </div>
        </div>
        
        {/* Other Players Section - Three showcase animations */}
        <div 
          ref={otherPlayersRef}
          className="absolute inset-0 flex items-center justify-center px-4 z-40 pointer-events-none"
        >
          <div className="max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <AirbnbFinishedDemo />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <MarketingComponentPlayer />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <AspectRatioTransitionPlayer />
              </div>
            </div>
            
            {/* CTA */}
            <div className="text-center mt-12">
              <div className="inline-block p-[2px] bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg">
                <button onClick={handleGoToDesign} className="bg-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gradient-to-r hover:from-pink-500 hover:to-orange-500 hover:text-white transition-colors pointer-events-auto">
                  Create Your Own Video Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for scroll */}
      <div className="h-screen" />
    </div>
  );
}