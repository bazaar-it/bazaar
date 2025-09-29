"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import MarketingHeader from "~/components/marketing/MarketingHeader";
import { PurchaseModal } from "~/components/purchase/PurchaseModal";

type SectionConfig = {
  id: string;
  title: string;
  content?: string; // HTML allowed
  showButton?: boolean;
  buttonText?: string;
  showSecondaryButton?: boolean;
  secondaryButtonText?: string;
  primaryHref?: string;
  secondaryHref?: string;
  bullets?: string[];
  steps?: string[];
  showSeparator?: boolean;
  videoUrl?: string;
};

const sections: SectionConfig[] = [
  {
    id: "hero",
    title: "Big Launch?\nMake it Impossible to Ignore.",
    content:
      "Bazaar provides Animation-as-a-Service so you can stay focused on your product while we create the launch video.",
    showButton: true,
    buttonText: "Get My Launch Video",
    primaryHref: "https://form.typeform.com/to/LitrqsGd",
  },
  {
    id: "scroll-stopping",
    title: "Scroll-Stopping Content",
    content:
      "We craft videos your audience can’t scroll past.<br/>Our motion graphics cut through the noise and make your product unforgettable.",
    showSeparator: true,
    showButton: true,
    buttonText: "See our work",
    videoUrl: "https://www.youtube.com/embed/zZgUWZfQjxM?si=XCYgf3uJFV-wXwZ7&rel=0&modestbranding=1&playsinline=1",
  },
  {
    id: "instantly-understandable",
    title: "Instantly Understandable",
    content:
      "Let us translate your complex technology into a clear, simple story so customers instantly understand its value.",
    showSeparator: true,

  },
  {
    id: "how-it-works",
    title: "How It Works",
    steps: [
      "Complete the form - Tell us about the product and provide visuals",
      "Approve your storyboard — We plan the flow so your key features shine.",
      "Get your launch video — Scripted, styled and animated to match your brand — ready to post.",
    ],
    showSeparator: true,
    showButton: true,
    buttonText: "Complete form",
    primaryHref: "https://form.typeform.com/to/LitrqsGd",
    showSecondaryButton: true,
    secondaryButtonText: "Buy now",
    secondaryHref: "https://buy.stripe.com/28E4gz4YM6htez0gwecZa05",
  },
  {
    id: "no-screen-recordings",
    title: "Because Screen Recordings Don’t Go Viral",
    content:
      "Forget Looms.<br/>Forget talking heads.<br/>Your product deserves a premium video.",
    showSeparator: true,
    showButton: true,
    buttonText: "Get started Now",
    showSecondaryButton: true,
    secondaryButtonText: "Book a call",
    primaryHref: "https://form.typeform.com/to/LitrqsGd",
    secondaryHref: "https://calendar.app.google/BovQpJQKnstSSNHF7",
  },
];

function Section({
  id,
  title,
  content,
  isActive,
  showButton,
  buttonText,
  showSecondaryButton,
  secondaryButtonText,
  primaryHref,
  secondaryHref,
  bullets,
  steps,
  showSeparator,
  videoUrl,
  onOpenVideo,
}: SectionConfig & { isActive: boolean; onOpenVideo?: (url: string) => void }) {
  return (
    <section id={id} className="relative min-h-screen md:h-screen w-full snap-start flex flex-col justify-center p-6 md:p-16 lg:p-24">
      {showSeparator && (
        <div className="absolute top-6 left-8 md:left-16 text-gray-300 select-none">⸻</div>
      )}
      <motion.h2
        className={`whitespace-pre-line text-4xl md:text-6xl lg:text-[5rem] xl:text-[6rem] font-bold leading-[1.1] tracking-tight ${
          (id === 'hero' || id === 'no-screen-recordings') ? 'md:max-w-none max-w-5xl' : 'max-w-5xl'
        } text-black`}
        initial={{ opacity: 0, y: 50 }}
        animate={isActive ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        {title}
      </motion.h2>
      {content && (
        <motion.div
          className={`text-base md:text-xl lg:text-2xl mt-4 md:mt-6 text-gray-600 ${id === 'no-screen-recordings' ? 'max-w-3xl md:max-w-4xl' : 'max-w-2xl'}`}
          initial={{ opacity: 0, y: 50 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
      {bullets && bullets.length > 0 && (
        <motion.ul
          className="mt-6 space-y-3 text-base md:text-xl text-gray-700 max-w-3xl list-disc pl-5"
          initial={{ opacity: 0, y: 30 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </motion.ul>
      )}
      {steps && steps.length > 0 && (
        <motion.ol
          className="mt-6 space-y-4 text-base md:text-xl text-gray-700 max-w-3xl list-decimal pl-5"
          initial={{ opacity: 0, y: 30 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </motion.ol>
      )}
      {(showButton || showSecondaryButton) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row gap-4"
        >
          {showButton && (
            videoUrl && onOpenVideo ? (
              <button
                className="cursor-pointer bg-gradient-to-r from-[#ec4899] to-[#f97316] text-white px-6 py-3 rounded-lg text-base font-semibold w-full sm:w-auto"
                onClick={() => onOpenVideo(videoUrl!)}
              >
                {buttonText}
              </button>
            ) : primaryHref ? (
              <a
                href={primaryHref}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer bg-gradient-to-r from-[#ec4899] to-[#f97316] text-white px-6 py-3 rounded-lg text-base font-semibold w-full sm:w-auto text-center"
              >
                {buttonText}
              </a>
            ) : null
          )}
          {showSecondaryButton && secondaryHref && (
            <a
              href={secondaryHref}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer border border-black text-black px-6 py-3 rounded-lg text-base font-semibold hover:bg-black hover:text-white transition-colors w-full sm:w-auto text-center"
            >
              {secondaryButtonText}
            </a>
          )}
        </motion.div>
      )}
    </section>
  );
}

export default function AnimationAsAServicePage() {
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: containerRef });
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const h = window.innerHeight;
      setActive(Math.floor(scrollTop / h));
    };
    const el = containerRef.current;
    el?.addEventListener("scroll", onScroll);
    return () => el?.removeEventListener("scroll", onScroll);
  }, []);

  // Listen for footer "Pricing" event to open purchase modal
  useEffect(() => {
    const handler = () => setShowTopUp(true);
    window.addEventListener('open-pricing-modal' as any, handler);
    return () => window.removeEventListener('open-pricing-modal' as any, handler);
  }, []);

  const handleNavClick = (index: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: index * window.innerHeight, behavior: "smooth" });
  };

  return (
    <div className="h-screen overflow-hidden bg-white relative">
      <MarketingHeader redirectTo="/animation-as-a-service" />
      <motion.div className="hidden sm:block fixed top-0 left-0 right-0 h-0.5 bg-black origin-left z-30" style={{ scaleX }} />
      {/* Right-side section dots */}
      <nav className="hidden sm:flex fixed top-0 right-0 h-screen flex-col justify-center z-30 p-3 md:p-4">
        {sections.map((_, i) => (
          <button
            key={_.id}
            aria-label={`Go to section ${i + 1}`}
            className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full my-1.5 transition-all ${
              i === active ? "bg-black scale-125" : "bg-gray-400"
            }`}
            onClick={() => handleNavClick(i)}
          />
        ))}
      </nav>
      <div ref={containerRef} className="h-full overflow-y-auto snap-y snap-mandatory">
        {sections.map((s, i) => (
          <Section key={s.id} {...s} isActive={i === active} onOpenVideo={(url) => setVideoUrl(url)} />
        ))}
      </div>
      {videoUrl && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-2 sm:p-4" onClick={() => setVideoUrl(null)}>
          <div className="relative w-full max-w-4xl aspect-video bg-black" onClick={(e) => e.stopPropagation()}>
            <button
              aria-label="Close video"
              className="absolute -top-3 -right-3 bg-white text-black rounded-full w-8 h-8 flex items-center justify-center shadow"
              onClick={() => setVideoUrl(null)}
            >
              ×
            </button>
            <iframe
              width="100%"
              height="100%"
              src={videoUrl}
              title="Showreel"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full rounded"
            />
          </div>
        </div>
      )}

      {/* Pricing / Top-Up Modal triggered from footer */}
      <PurchaseModal isOpen={showTopUp} onClose={() => setShowTopUp(false)} />
    </div>
  );
}


