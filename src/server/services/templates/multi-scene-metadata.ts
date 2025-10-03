import type { VideoFormat } from "~/lib/types/video/remotion-constants";

export interface BrandPersonality {
  corporate: number;
  minimalist: number;
  playful: number;
  technical: number;
  bold: number;
  modern: number;
}

export type SceneBeatType =
  | 'logo_reveal'
  | 'tagline'
  | 'hook'
  | 'problem_setup'
  | 'problem_impact'
  | 'solution_intro'
  | 'solution_feature'
  | 'proof'
  | 'benefit'
  | 'cta';

export type IndustryCategory =
  | 'saas'
  | 'mobile_app'
  | 'fintech'
  | 'ecommerce'
  | 'b2b_service'
  | 'agency'
  | 'startup'
  | 'enterprise'
  | 'marketplace'
  | 'product'
  | 'nonprofit'
  | 'generic';

export interface MultiSceneTemplateScene {
  id: string;
  name: string;
  order: number;
  duration: number;
  beatType: SceneBeatType;
  templateId: string;
  requires: {
    colors?: string[];
    text?: string[];
    images?: string[];
    metrics?: string[];
  };
  description: string;
  editPromptHints: string[];
}

export interface MultiSceneTemplateMetadata {
  id: string;
  name: string;
  description: string;
  sceneCount: number;
  totalDuration: number;
  scenes: MultiSceneTemplateScene[];
  supportedFormats: VideoFormat[];
  targetPersonality: BrandPersonality;
  primaryIndustry: IndustryCategory[];
  industryKeywords: string[];
  contentRequirements: {
    requiresLogo?: boolean;
    requiresSocialProof?: boolean;
    requiresScreenshots?: boolean;
    requiresProblem?: boolean;
    minFeatureCount?: number;
  };
  visualStyle: {
    animationIntensity: 'minimal' | 'moderate' | 'high';
    colorUsage: 'monochrome' | 'duotone' | 'full-palette';
    textDensity: 'minimal' | 'moderate' | 'heavy';
    motionStyle: 'smooth' | 'energetic' | 'dramatic';
  };
  exampleBrands?: string[];
  adminOnly: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateSelectionScore {
  template: MultiSceneTemplateMetadata;
  score: number;
  breakdown: {
    personalityMatch: number;
    industryMatch: number;
    contentAvailability: number;
    keywordMatch: number;
  };
  reasoning: string;
}

const PRODUCT_LAUNCH_TEMPLATE: MultiSceneTemplateMetadata = {
  id: "product-launch-24s",
  name: "Product Launch",
  description:
    "Announce a new product or feature with a classic problem-solution narrative culminating in a clear CTA.",
  sceneCount: 8,
  totalDuration: 720,
  scenes: [
    {
      id: "scene-1-logo-reveal",
      name: "Logo Reveal",
      order: 0,
      duration: 90,
      beatType: 'logo_reveal',
      templateId: 'LogoTemplate',
      requires: {
        colors: ['primary', 'gradient'],
        images: ['logo'],
      },
      description: "Introduce the brand with a confident logo animation and gradient backdrop.",
      editPromptHints: [
        "Center the logo with the strongest brand gradient",
        "Keep animation smooth and professional",
        "Ensure contrast between logo and background",
      ],
    },
    {
      id: "scene-2-tagline",
      name: "Tagline",
      order: 1,
      duration: 90,
      beatType: 'tagline',
      templateId: 'GradientText',
      requires: {
        colors: ['primary', 'secondary'],
        text: ['headline'],
      },
      description: "Deliver the primary value proposition or tagline with bold typography.",
      editPromptHints: [
        "Use the main value proposition (5-8 words) and foreshadow the pain we address next",
        "Apply brand primary/secondary colors to gradient for continuity with the logo reveal",
        "Keep supporting copy minimal—one line that tees up the upcoming problem scene",
      ],
    },
    {
      id: "scene-3-problem-setup",
      name: "Problem Setup",
      order: 2,
      duration: 90,
      beatType: 'problem_setup',
      templateId: 'DarkBGGradientText',
      requires: {
        text: ['headline', 'subtext'],
      },
      description: "Introduce the pain point the audience experiences today.",
      editPromptHints: [
        "Use the extracted problem statement with an empathetic tone that contrasts the earlier promise",
        "Contrast background to highlight tension and foreshadow relief",
        "Limit to one strong sentence plus supportive detail that sets up the impact scene",
      ],
    },
    {
      id: "scene-4-problem-impact",
      name: "Problem Impact",
      order: 3,
      duration: 90,
      beatType: 'problem_impact',
      templateId: 'GlitchText',
      requires: {
        text: ['headline'],
      },
      description: "Show the consequences of the problem to heighten urgency.",
      editPromptHints: [
        "Quantify the pain if possible (time, money, frustration) and end with the consequence the solution will resolve",
        "Keep copy punchy and high-contrast to maintain rising tension",
        "Use glitch effect sparingly to emphasize disruption without overwhelming viewers",
      ],
    },
    {
      id: "scene-5-solution-intro",
      name: "Solution Intro",
      order: 4,
      duration: 90,
      beatType: 'solution_intro',
      templateId: 'HeroTemplate',
      requires: {
        text: ['headline'],
        colors: ['primary'],
        images: ['logo'],
      },
      description: "Introduce the product as the answer with confident hero treatment.",
      editPromptHints: [
        "Transition to brighter palette to signal relief from the previous tension scene",
        "State product name and positioning while explicitly answering the problem raised",
        "Include logo or app visuals so the viewer connects the promise back to the brand",
      ],
    },
    {
      id: "scene-6-key-feature",
      name: "Key Feature",
      order: 5,
      duration: 90,
      beatType: 'solution_feature',
      templateId: 'AppJiggle',
      requires: {
        text: ['headline', 'subtext'],
        images: ['screenshot'],
      },
      description: "Highlight the hero feature or differentiator with product visuals.",
      editPromptHints: [
        "Use strongest differentiator or feature",
        "Pair with screenshot or UI element",
        "Mention tangible benefit",
      ],
    },
    {
      id: "scene-7-social-proof",
      name: "Social Proof",
      order: 6,
      duration: 90,
      beatType: 'proof',
      templateId: 'GrowthGraph',
      requires: {
        text: ['headline', 'subtext'],
        metrics: ['value'],
      },
      description: "Build credibility with metrics, testimonials, or customer logos.",
      editPromptHints: [
        "Use extracted stats (users, rating, ROI)",
        "Keep numbers large and legible",
        "Optional: include testimonial quote",
      ],
    },
    {
      id: "scene-8-cta",
      name: "Call to Action",
      order: 7,
      duration: 90,
      beatType: 'cta',
      templateId: 'PromptIntro',
      requires: {
        text: ['cta'],
        colors: ['primary'],
      },
      description: "End with a clear call to action and supporting visual cues.",
      editPromptHints: [
        "Use primary CTA label (e.g. Get Started)",
        "Make CTA button high contrast",
        "Reinforce brand promise in subtext",
      ],
    },
  ],
  supportedFormats: ['landscape'],
  targetPersonality: {
    corporate: 0.6,
    minimalist: 0.7,
    playful: 0.3,
    technical: 0.5,
    bold: 0.6,
    modern: 0.8,
  },
  primaryIndustry: ['saas', 'startup', 'product'],
  industryKeywords: [
    'launch',
    'new',
    'product',
    'feature',
    'release',
    'software',
    'app',
    'platform',
    'solution',
  ],
  contentRequirements: {
    requiresLogo: true,
    requiresSocialProof: false,
    requiresScreenshots: false,
    requiresProblem: false,
    minFeatureCount: 1,
  },
  visualStyle: {
    animationIntensity: 'moderate',
    colorUsage: 'full-palette',
    textDensity: 'moderate',
    motionStyle: 'smooth',
  },
  exampleBrands: ['Stripe', 'Notion', 'Linear', 'Vercel', 'Figma'],
  adminOnly: false,
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

const FINTECH_TRUST_TEMPLATE: MultiSceneTemplateMetadata = {
  id: "fintech-trust-story-24s",
  name: "Fintech Trust Builder",
  description: "Establish confidence for a fintech or finance SaaS brand with a metrics-forward story arc.",
  sceneCount: 8,
  totalDuration: 720,
  scenes: [
    {
      id: "fintech-logo-reveal",
      name: "Brand Signal",
      order: 0,
      duration: 90,
      beatType: 'logo_reveal',
      templateId: 'LogoTemplate',
      requires: {
        colors: ['primary', 'secondary'],
        images: ['logo'],
      },
      description: "Open with a polished logo reveal to set a trustworthy tone.",
      editPromptHints: [
        "Keep palette sophisticated—think deep blues, neutrals, metallic accent",
        "Use the extracted SVG or PNG logo",
        "Avoid playful motion; emphasize stability",
      ],
    },
    {
      id: "fintech-tagline",
      name: "Value Promise",
      order: 1,
      duration: 90,
      beatType: 'tagline',
      templateId: 'GradientText',
      requires: {
        colors: ['primary', 'accent'],
        text: ['headline'],
      },
      description: "Communicate the core value proposition with confident typography.",
      editPromptHints: [
        "Use the extracted headline or value prop (max 8 words) and hint at the friction solved next",
        "Blend primary + accent colors for gradient sweep that echoes the trust signal",
        "Keep subtext under 12 words, outcome-focused, and set up the upcoming problem scene",
      ],
    },
    {
      id: "fintech-problem",
      name: "Problem Pressure",
      order: 2,
      duration: 90,
      beatType: 'problem_setup',
      templateId: 'DarkBGGradientText',
      requires: {
        text: ['headline', 'subtext'],
      },
      description: "Highlight the pain point teams feel before adopting the platform.",
      editPromptHints: [
        "Lean into urgency keywords extracted from copy (e.g. manual, risky, slow) that respond to the promise",
        "Pair headline + stat if available, otherwise craft a concise scenario that executives recognize",
        "Maintain dark background to heighten tension and prepare for the relief in the next scene",
      ],
    },
    {
      id: "fintech-solution-intro",
      name: "Solution Overview",
      order: 3,
      duration: 90,
      beatType: 'solution_intro',
      templateId: 'HeroTemplate',
      requires: {
        text: ['headline'],
        colors: ['primary'],
        images: ['logo'],
      },
      description: "Introduce the product as the confident answer to the problem.",
      editPromptHints: [
        "State product name and short benefit (e.g. Automate compliance in minutes) that directly resolves the problem",
        "Use lighter background to signal shift from problem into solution",
        "Include subtle UI visual if available to make the promise tangible",
      ],
    },
    {
      id: "fintech-feature",
      name: "Signature Feature",
      order: 4,
      duration: 90,
      beatType: 'solution_feature',
      templateId: 'FintechUI',
      requires: {
        text: ['headline', 'subtext'],
        images: ['screenshot'],
      },
      description: "Spotlight the workflow or dashboard that proves sophistication.",
      editPromptHints: [
        "Describe the feature with metric or automation language and connect back to the stated benefit",
        "Use extracted dashboard screenshot or recreate key chart; if absent, describe the most critical UI element",
        "Keep labels concise and data-driven so the ensuing metrics scene flows naturally",
      ],
    },
    {
      id: "fintech-proof",
      name: "Metrics Proof",
      order: 5,
      duration: 90,
      beatType: 'proof',
      templateId: 'GrowthGraph',
      requires: {
        metrics: ['growth', 'revenue', 'savings'],
      },
      description: "Quantify the impact with growth metrics or saved hours.",
      editPromptHints: [
        "Use percentages / time savings pulled from site; if unavailable, summarize strongest qualitative proof",
        "Keep axes labels simple and high-contrast so data reads instantly",
        "Anchor copy around ROI or compliance wins to reinforce trust before testimonials",
      ],
    },
    {
      id: "fintech-benefit",
      name: "Client Confidence",
      order: 6,
      duration: 90,
      beatType: 'benefit',
      templateId: 'CarouselText',
      requires: {
        text: ['testimonial', 'logo'],
      },
      description: "Share social proof: testimonials, security badges, or customer logos.",
      editPromptHints: [
        "Cycle through strongest testimonial lines or client logos; if neither exist, reference relevant trust badges or partnerships",
        "Mention industries served (banks, startups, enterprise) to broaden resonance",
        "Reinforce trust (SOC2, ISO) if available, preparing viewers for the final CTA",
      ],
    },
    {
      id: "fintech-cta",
      name: "CTA",
      order: 7,
      duration: 90,
      beatType: 'cta',
      templateId: 'PromptIntro',
      requires: {
        text: ['cta'],
        colors: ['primary'],
      },
      description: "Close with a decisive CTA and reassurance message.",
      editPromptHints: [
        "Use strongest CTA label (e.g. Schedule a demo) and remind viewers of the ROI proof shared",
        "Pair with trust microcopy like \"Compliance-ready in weeks\" to reduce friction",
        "Include contact or pricing hints if present so next steps are obvious",
      ],
    },
  ],
  supportedFormats: ['landscape'],
  targetPersonality: {
    corporate: 0.85,
    minimalist: 0.7,
    playful: 0.2,
    technical: 0.75,
    bold: 0.55,
    modern: 0.8,
  },
  primaryIndustry: ['fintech', 'saas', 'enterprise'],
  industryKeywords: ['fintech', 'finance', 'payments', 'ledger', 'compliance', 'cards', 'expense', 'accounts', 'banking'],
  contentRequirements: {
    requiresLogo: true,
    requiresScreenshots: true,
    requiresSocialProof: true,
    requiresProblem: true,
    minFeatureCount: 1,
  },
  visualStyle: {
    animationIntensity: 'moderate',
    colorUsage: 'duotone',
    textDensity: 'moderate',
    motionStyle: 'smooth',
  },
  exampleBrands: ['Ramp', 'Brex', 'Mercury', 'Plaid'],
  adminOnly: false,
  isActive: true,
  createdAt: new Date('2024-01-02T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
};

const MOBILE_APP_TEMPLATE: MultiSceneTemplateMetadata = {
  id: "mobile-app-tour-24s",
  name: "Mobile App Tour",
  description: "Guide viewers through a consumer or prosumer mobile app experience with an upbeat rhythm.",
  sceneCount: 8,
  totalDuration: 720,
  scenes: [
    {
      id: "mobile-logo",
      name: "App Icon",
      order: 0,
      duration: 90,
      beatType: 'logo_reveal',
      templateId: 'LogoTemplate',
      requires: {
        images: ['logo'],
        colors: ['primary', 'accent'],
      },
      description: "Reveal the app icon with energetic motion to hook mobile-first users.",
      editPromptHints: [
        "Use rounded masking to mimic app icon",
        "Allow playful burst but keep brand palette",
        "Optional: include platform badges (iOS/Android)",
      ],
    },
    {
      id: "mobile-hook",
      name: "Instant Hook",
      order: 1,
      duration: 90,
      beatType: 'hook',
      templateId: 'WordFlip',
      requires: {
        text: ['headline'],
      },
      description: "Cycle through the top outcomes the app promises.",
      editPromptHints: [
        "Use short verbs from marketing site (e.g. Track • Share • Grow) that foreshadow the features",
        "Keep copy punchy (1-3 words per flip) and finish on the word that sets up the pain point",
        "Sync colors with icon for continuity so the transition feels intentional",
      ],
    },
    {
      id: "mobile-problem",
      name: "Pain Point",
      order: 2,
      duration: 90,
      beatType: 'problem_setup',
      templateId: 'GlitchText',
      requires: {
        text: ['headline'],
      },
      description: "Show the friction users feel without the app.",
      editPromptHints: [
        "Use emotional words captured from site (e.g. juggling tasks, missed updates) that respond to the final hook word",
        "Allow light kinetic typographic effects but keep text legible for quick comprehension",
        "Contrast with hook by using darker palette to heighten tension before the bright solution",
      ],
    },
    {
      id: "mobile-solution",
      name: "Experience Preview",
      order: 3,
      duration: 90,
      beatType: 'solution_intro',
      templateId: 'MobileApp',
      requires: {
        images: ['screenshot'],
        colors: ['primary'],
      },
      description: "Introduce the app UI in device frame with core promise.",
      editPromptHints: [
        "Use hero screenshot or compose from extracted imagery that visibly solves the frustration just shown",
        "State the core message like \"Plan your day effortlessly\" and name the app",
        "Balance white space—avoid overcrowding so focus stays on the UI",
      ],
    },
    {
      id: "mobile-feature",
      name: "Feature Carousel",
      order: 4,
      duration: 90,
      beatType: 'solution_feature',
      templateId: 'DualScreenApp',
      requires: {
        images: ['screenshot'],
        text: ['headline', 'subtext'],
      },
      description: "Highlight two differentiating workflows side-by-side.",
      editPromptHints: [
        "Use feature titles from site sections and order them to mirror the hook verbs",
        "Call out interactive elements or gestures to show how the user experiences the benefit",
        "Mention platform-specific features if relevant, reinforcing availability ahead of proof",
      ],
    },
    {
      id: "mobile-benefit",
      name: "Lifestyle Benefit",
      order: 5,
      duration: 90,
      beatType: 'benefit',
      templateId: 'HighlightSweep',
      requires: {
        text: ['headline', 'subtext'],
      },
      description: "Translate app capabilities into lifestyle or productivity gains.",
      editPromptHints: [
        "Reference differentiators input if user provided, phrasing benefits as outcomes of the features",
        "Keep copy optimistic and user-centric to maintain energy",
        "Leverage bright accent colors for optimistic tone that leads smoothly into social proof",
      ],
    },
    {
      id: "mobile-proof",
      name: "Social Proof",
      order: 6,
      duration: 90,
      beatType: 'proof',
      templateId: 'CarouselText',
      requires: {
        text: ['testimonial'],
      },
      description: "Surface app store ratings, press quotes, or community testimonials.",
      editPromptHints: [
        "Use rating numbers or quotes (\"4.8 on App Store\"); if missing, highlight community size or press mentions",
        "Mention total users/downloads if available to reinforce credibility",
        "Cycle through up to three snippets to keep pacing lively",
      ],
    },
    {
      id: "mobile-cta",
      name: "Download CTA",
      order: 7,
      duration: 90,
      beatType: 'cta',
      templateId: 'AppDownload',
      requires: {
        text: ['cta'],
        images: ['logo'],
      },
      description: "End with download buttons and urgency to install.",
      editPromptHints: [
        "Show store badges if extracted; otherwise generate polished placeholders and acknowledge availability",
        "Include CTA such as \"Download now\" or \"Get the app\" and restate the key benefit",
        "Mention platform availability (iOS, Android) so next steps are explicit",
      ],
    },
  ],
  supportedFormats: ['landscape', 'portrait'],
  targetPersonality: {
    corporate: 0.35,
    minimalist: 0.45,
    playful: 0.7,
    technical: 0.4,
    bold: 0.65,
    modern: 0.85,
  },
  primaryIndustry: ['mobile_app', 'startup', 'product'],
  industryKeywords: ['app', 'mobile', 'ios', 'android', 'productivity', 'social', 'consumer', 'habits', 'wellness'],
  contentRequirements: {
    requiresLogo: true,
    requiresScreenshots: true,
    requiresSocialProof: false,
    requiresProblem: true,
    minFeatureCount: 2,
  },
  visualStyle: {
    animationIntensity: 'energetic',
    colorUsage: 'full-palette',
    textDensity: 'minimal',
    motionStyle: 'energetic',
  },
  exampleBrands: ['Headspace', 'Notion Mobile', 'Calm', 'Duolingo'],
  adminOnly: false,
  isActive: true,
  createdAt: new Date('2024-01-03T00:00:00Z'),
  updatedAt: new Date('2024-01-03T00:00:00Z'),
};

const AGENCY_SHOWCASE_TEMPLATE: MultiSceneTemplateMetadata = {
  id: "agency-showcase-24s",
  name: "Creative Agency Showcase",
  description: "Bold motion graphics sequence tailored for agencies and studios to highlight capabilities and portfolio wins.",
  sceneCount: 8,
  totalDuration: 720,
  scenes: [
    {
      id: "agency-logo",
      name: "Signature Reveal",
      order: 0,
      duration: 90,
      beatType: 'logo_reveal',
      templateId: 'LogoTemplate',
      requires: {
        images: ['logo'],
        colors: ['primary'],
      },
      description: "Start with a confident logo or wordmark reveal.",
      editPromptHints: [
        "Use bold motion strokes to hint at creativity",
        "Allow metallic or neon accent if present in palette",
        "Keep background gradient dynamic",
      ],
    },
    {
      id: "agency-tagline",
      name: "Mantra",
      order: 1,
      duration: 90,
      beatType: 'tagline',
      templateId: 'MorphingText',
      requires: {
        text: ['headline'],
      },
      description: "Communicate the agency mantra or positioning statement.",
      editPromptHints: [
        "Use 2–3 power words from site (e.g. Strategy • Story • Motion)",
        "Leverage gradient or duotone informed by brand",
        "Keep copy minimal and stylish",
      ],
    },
    {
      id: "agency-hook",
      name: "Signature Moves",
      order: 2,
      duration: 90,
      beatType: 'hook',
      templateId: 'GradientText',
      requires: {
        text: ['headline', 'subtext'],
      },
      description: "Highlight differentiators (motion, strategy, storytelling).",
      editPromptHints: [
        "Pull differentiators list or differentiators input and connect them to the mantra words",
        "Use layered typography with glowing accents that transition smoothly into the hero reel",
        "Keep subtext witty but professional to maintain credibility",
      ],
    },
    {
      id: "agency-solution",
      name: "Hero Reel",
      order: 3,
      duration: 90,
      beatType: 'solution_intro',
      templateId: 'FloatingElements',
      requires: {
        images: ['portfolio'],
      },
      description: "Showcase emblematic visuals or reels from recent work.",
      editPromptHints: [
        "Use extracted imagery or abstract shapes to represent case studies; if assets are missing, craft tasteful abstract compositions",
        "Mention industries served (tech, fintech, consumer) to set up the services menu",
        "Keep camera moves smooth and cinematic so the reel feels premium",
      ],
    },
    {
      id: "agency-services",
      name: "Services Menu",
      order: 4,
      duration: 90,
      beatType: 'solution_feature',
      templateId: 'HighlightSweep',
      requires: {
        text: ['headline', 'subtext'],
      },
      description: "List core service pillars with animated highlights.",
      editPromptHints: [
        "Group services into 3 concise pillars that deliver on the signature moves",
        "Use accent bar to emphasize the service currently being described",
        "Mirror brand voice (e.g. award-winning, data-backed) and tee up the proof scene",
      ],
    },
    {
      id: "agency-proof",
      name: "Client Proof",
      order: 5,
      duration: 90,
      beatType: 'proof',
      templateId: 'CarouselText',
      requires: {
        text: ['testimonial'],
        images: ['logo'],
      },
      description: "Show client testimonials or marquee logos.",
      editPromptHints: [
        "Rotate through marquee clients (e.g. Webflow, Shopify); if logos missing, highlight categories (e-commerce, fintech, SaaS)",
        "Quote standout testimonial lines tied to the services just listed",
        "Use contrast between slides for energy but keep typography legible",
      ],
    },
    {
      id: "agency-benefit",
      name: "Impact",
      order: 6,
      duration: 90,
      beatType: 'benefit',
      templateId: 'GrowthGraph',
      requires: {
        metrics: ['growth', 'engagement'],
      },
      description: "Illustrate result metrics or before/after transformations.",
      editPromptHints: [
        "Convert case study stats into motion graph; if numbers missing, translate qualitative wins into bold statements",
        "Emphasize outcomes (conversion lift, launch time) that reinforce the testimonials",
        "Use bold accent for data points aligned with brand palette",
      ],
    },
    {
      id: "agency-cta",
      name: "Collaborate CTA",
      order: 7,
      duration: 90,
      beatType: 'cta',
      templateId: 'PromptIntro',
      requires: {
        text: ['cta'],
      },
      description: "Invite viewers to book, chat, or review portfolio.",
      editPromptHints: [
        "Use CTA like Book a discovery call and reference the results just highlighted",
        "Reference creative partnership language that mirrors the mantra",
        "Optional: include availability or response time to remove friction",
      ],
    },
  ],
  supportedFormats: ['landscape'],
  targetPersonality: {
    corporate: 0.3,
    minimalist: 0.4,
    playful: 0.65,
    technical: 0.35,
    bold: 0.85,
    modern: 0.9,
  },
  primaryIndustry: ['agency', 'startup', 'product'],
  industryKeywords: ['agency', 'creative', 'motion', 'branding', 'studio', 'storytelling', 'design', 'campaign'],
  contentRequirements: {
    requiresLogo: true,
    requiresScreenshots: false,
    requiresSocialProof: true,
    requiresProblem: false,
    minFeatureCount: 0,
  },
  visualStyle: {
    animationIntensity: 'high',
    colorUsage: 'full-palette',
    textDensity: 'moderate',
    motionStyle: 'energetic',
  },
  exampleBrands: ['Instrument', 'Buck', 'Ordinary Folk', 'Suno Studio'],
  adminOnly: false,
  isActive: true,
  createdAt: new Date('2024-01-04T00:00:00Z'),
  updatedAt: new Date('2024-01-04T00:00:00Z'),
};

const B2B_PROOF_TEMPLATE: MultiSceneTemplateMetadata = {
  id: "b2b-proof-stack-24s",
  name: "B2B Proof Stack",
  description: "Structured for enterprise SaaS teams that need to demonstrate ROI, security, and clear workflow improvements.",
  sceneCount: 8,
  totalDuration: 720,
  scenes: [
    {
      id: "b2b-logo",
      name: "Enterprise Mark",
      order: 0,
      duration: 90,
      beatType: 'logo_reveal',
      templateId: 'LogoTemplate',
      requires: {
        images: ['logo'],
        colors: ['primary'],
      },
      description: "Open with sturdy logo treatment to signal reliability.",
      editPromptHints: [
        "Use minimal animation and subtle gradients",
        "Integrate security badges if available",
        "Keep copy limited to company name",
      ],
    },
    {
      id: "b2b-problem",
      name: "Operational Drag",
      order: 1,
      duration: 90,
      beatType: 'problem_setup',
      templateId: 'DarkBGGradientText',
      requires: {
        text: ['headline', 'subtext'],
      },
      description: "Frame the operational friction without the platform.",
      editPromptHints: [
        "Use industry-specific pain (manual reporting, silos) and name the roles affected to set up stakeholder stakes",
        "Pair with a stat if site highlights impact; otherwise craft a concise scenario that feels concrete",
        "Keep tone serious and empathetic so the escalation feels natural",
      ],
    },
    {
      id: "b2b-impact",
      name: "Stakeholder Stakes",
      order: 2,
      duration: 90,
      beatType: 'problem_impact',
      templateId: 'GlitchText',
      requires: {
        text: ['headline'],
      },
      description: "Escalate the cost of inaction with urgent typography.",
      editPromptHints: [
        "Highlight risk/compliance/regulatory angles and end with a threat the platform reveal will solve",
        "Keep copy under 10 words so urgency hits quickly",
        "Use glitch bursts sparingly to maintain enterprise polish",
      ],
    },
    {
      id: "b2b-solution",
      name: "Platform Reveal",
      order: 3,
      duration: 90,
      beatType: 'solution_intro',
      templateId: 'HeroTemplate',
      requires: {
        text: ['headline'],
        colors: ['primary'],
        images: ['logo'],
      },
      description: "Show the platform as the trusted, integrated hub.",
      editPromptHints: [
        "State the brand and concise promise while directly answering the stakeholder threat",
        "Mention integration or automation keywords to prime the workflow highlight",
        "Use gradient shift to brighter tones to mark the solution phase",
      ],
    },
    {
      id: "b2b-workflow",
      name: "Workflow Highlight",
      order: 4,
      duration: 90,
      beatType: 'solution_feature',
      templateId: 'DualScreenApp',
      requires: {
        images: ['screenshot'],
        text: ['headline', 'subtext'],
      },
      description: "Demonstrate how the platform unifies teams or data flows.",
      editPromptHints: [
        "Use extracted screenshots for before/after or dashboard; if absent, describe the UI focus point clearly",
        "Mention time savings or automation steps that lead into the metrics scene",
        "Keep copy decisive (e.g. Approvals in hours not weeks) to set up quantified proof",
      ],
    },
    {
      id: "b2b-proof",
      name: "Proof Metrics",
      order: 5,
      duration: 90,
      beatType: 'proof',
      templateId: 'AnimatedHistogram',
      requires: {
        metrics: ['time_saved', 'cost_reduction'],
      },
      description: "Visualize quantifiable improvements (time saved, revenue lift).",
      editPromptHints: [
        "Use two to three key metrics from brand data; if missing, summarize strongest qualitative proof",
        "Label axes clearly (Before vs After) so executives grasp impact instantly",
        "Keep narration text confident and numeric to reinforce trust before executive outcomes",
      ],
    },
    {
      id: "b2b-benefit",
      name: "Executive Outcomes",
      order: 6,
      duration: 90,
      beatType: 'benefit',
      templateId: 'HighlightSweep',
      requires: {
        text: ['headline', 'subtext'],
      },
      description: "Summarize the executive-level wins and strategic impact.",
      editPromptHints: [
        "Tie benefits to KPIs (visibility, compliance, customer trust) and explicitly connect to the metrics scene",
        "Reference differentiators input if supplied to show unique operating model",
        "Keep copy crisp—one sentence + supporting phrase that tees up the CTA",
      ],
    },
    {
      id: "b2b-cta",
      name: "Trusted CTA",
      order: 7,
      duration: 90,
      beatType: 'cta',
      templateId: 'GradientText',
      requires: {
        text: ['cta'],
        colors: ['primary'],
      },
      description: "Close with a secure CTA (book demo, talk to sales).",
      editPromptHints: [
        "Use CTA from site; include support/SLAs if mentioned and remind viewers of risk mitigation",
        "Background should feel enterprise (dark + accent) to close confidently",
        "Mention compliance or security badges if relevant to reduce friction",
      ],
    },
  ],
  supportedFormats: ['landscape'],
  targetPersonality: {
    corporate: 0.9,
    minimalist: 0.65,
    playful: 0.1,
    technical: 0.8,
    bold: 0.5,
    modern: 0.7,
  },
  primaryIndustry: ['saas', 'enterprise', 'b2b_service'],
  industryKeywords: ['workflow', 'automation', 'platform', 'compliance', 'security', 'operations', 'team'],
  contentRequirements: {
    requiresLogo: true,
    requiresScreenshots: true,
    requiresSocialProof: false,
    requiresProblem: true,
    minFeatureCount: 1,
  },
  visualStyle: {
    animationIntensity: 'moderate',
    colorUsage: 'duotone',
    textDensity: 'moderate',
    motionStyle: 'smooth',
  },
  exampleBrands: ['Workday', 'Rippling', 'ServiceNow', 'Datadog'],
  adminOnly: false,
  isActive: true,
  createdAt: new Date('2024-01-05T00:00:00Z'),
  updatedAt: new Date('2024-01-05T00:00:00Z'),
};

const PRODUCT_EXPLAINER_TEMPLATE: MultiSceneTemplateMetadata = {
  id: "product-explainer-24s",
  name: "Product Explainer",
  description: "Balanced narrative for startups launching a new product experience with equal focus on story and features.",
  sceneCount: 8,
  totalDuration: 720,
  scenes: [
    {
      id: "explainer-logo",
      name: "Brand Entry",
      order: 0,
      duration: 90,
      beatType: 'logo_reveal',
      templateId: 'LogoTemplate',
      requires: {
        images: ['logo'],
      },
      description: "Introduce the brand with simple yet confident animation.",
      editPromptHints: [
        "Use primary palette; keep reveal under 2s",
        "Include subtitle with product descriptor if available",
        "Avoid heavy effects to keep approachable",
      ],
    },
    {
      id: "explainer-tagline",
      name: "Promise",
      order: 1,
      duration: 90,
      beatType: 'tagline',
      templateId: 'GradientText',
      requires: {
        text: ['headline'],
      },
      description: "State the core mission or promise.",
      editPromptHints: [
        "Use tagline extracted from hero copy and signal the audience type addressed next",
        "Pair with short supporting phrase that hints at the pain you’ll surface",
        "Keep gradient aligned with brand colors for continuity",
      ],
    },
    {
      id: "explainer-hook",
      name: "Audience Hook",
      order: 2,
      duration: 90,
      beatType: 'hook',
      templateId: 'MorphingText',
      requires: {
        text: ['headline'],
      },
      description: "Speak directly to the target audience with aspirational language.",
      editPromptHints: [
        "Use audience descriptors (Builders, Operators, Designers) that match the promise and foreshadow the challenge scene",
        "Keep morphing between 3 words max so the audience message lands clearly",
        "Match tone to brand voice (serious vs playful) to maintain continuity",
      ],
    },
    {
      id: "explainer-problem",
      name: "Challenge",
      order: 3,
      duration: 90,
      beatType: 'problem_setup',
      templateId: 'DarkBGGradientText',
      requires: {
        text: ['headline', 'subtext'],
      },
      description: "Surface the core pain or barrier faced today.",
      editPromptHints: [
        "Use problem statement input if provided and reference the audience just called out",
        "Support with metric or observation from site so the pain feels real",
        "Fade copy in sequentially to build tension leading into the solution",
      ],
    },
    {
      id: "explainer-solution",
      name: "How It Works",
      order: 4,
      duration: 90,
      beatType: 'solution_intro',
      templateId: 'HeroTemplate',
      requires: {
        text: ['headline'],
        colors: ['primary'],
      },
      description: "Show the product as the turning point.",
      editPromptHints: [
        "Summarize in one sentence, action-oriented, explicitly contrasting with the pain scene",
        "Switch to brighter color palette to make the relief obvious",
        "Include product name prominently so the viewer ties solution to brand",
      ],
    },
    {
      id: "explainer-feature",
      name: "Feature Highlights",
      order: 5,
      duration: 90,
      beatType: 'solution_feature',
      templateId: 'DualScreenApp',
      requires: {
        text: ['headline', 'subtext'],
        images: ['screenshot'],
      },
      description: "Highlight two killer features with UI context.",
      editPromptHints: [
        "Pull feature titles from site sections and map them to the audience needs introduced earlier",
        "Use bullet-style copy under 20 words so each feature is digestible",
        "Ensure screenshot or recreation matches features described; if unavailable, describe the UI focus point",
      ],
    },
    {
      id: "explainer-benefit",
      name: "Benefits",
      order: 6,
      duration: 90,
      beatType: 'benefit',
      templateId: 'HighlightSweep',
      requires: {
        text: ['headline', 'subtext'],
      },
      description: "Translate features into tangible outcomes (time saved, happier teams).",
      editPromptHints: [
        "Use differentiators input for specificity, phrasing benefits as the outcome of the features",
        "Highlight 3 bullet benefits max to avoid overwhelming viewers",
        "Keep tone encouraging and human to prepare for the CTA",
      ],
    },
    {
      id: "explainer-cta",
      name: "Call To Action",
      order: 7,
      duration: 90,
      beatType: 'cta',
      templateId: 'PromptIntro',
      requires: {
        text: ['cta'],
      },
      description: "Close with the next best step (start trial, explore template).",
      editPromptHints: [
        "Use CTA from site, keep phrasing inviting, and restate the key win",
        "Optionally mention time to value or onboarding steps to reduce friction",
        "Add supportive microcopy (No credit card required) or equivalent reassurance",
      ],
    },
  ],
  supportedFormats: ['landscape'],
  targetPersonality: {
    corporate: 0.55,
    minimalist: 0.6,
    playful: 0.4,
    technical: 0.5,
    bold: 0.55,
    modern: 0.75,
  },
  primaryIndustry: ['saas', 'startup', 'product'],
  industryKeywords: ['product', 'launch', 'demo', 'showcase', 'explainer', 'workflow', 'builder'],
  contentRequirements: {
    requiresLogo: true,
    requiresScreenshots: true,
    requiresSocialProof: false,
    requiresProblem: true,
    minFeatureCount: 1,
  },
  visualStyle: {
    animationIntensity: 'moderate',
    colorUsage: 'full-palette',
    textDensity: 'moderate',
    motionStyle: 'smooth',
  },
  exampleBrands: ['Linear', 'Superhuman', 'Height', 'Arc'],
  adminOnly: false,
  isActive: true,
  createdAt: new Date('2024-01-06T00:00:00Z'),
  updatedAt: new Date('2024-01-06T00:00:00Z'),
};

const REVOLUT_GLOBAL_JOURNEY_TEMPLATE: MultiSceneTemplateMetadata = {
  id: "global-finance-journey-39s",
  name: "Global Finance Journey",
  description:
    "High-energy fintech story arc inspired by Revolut: fast intro, brand reveal, capability tour, trust, and decisive CTA.",
  sceneCount: 13,
  totalDuration: 1170,
  scenes: [
    {
      id: "global-intro",
      name: "Introducing",
      order: 0,
      duration: 90,
      beatType: 'hook',
      templateId: 'FastText',
      requires: {
        text: ['headline'],
      },
      description: "Snap the viewer in with a kinetic intro word (e.g. Introducing).",
      editPromptHints: [
        "Animate the word ‘Introducing’ (or similar) sliding in quickly to set the tempo",
        "Use bold fintech palette gradients to signal energy",
        "Keep copy ultra short (1–2 words) and prepare for the brand reveal",
      ],
    },
    {
      id: "global-brand-reveal",
      name: "Brand Reveal",
      order: 1,
      duration: 90,
      beatType: 'logo_reveal',
      templateId: 'LogoTemplate',
      requires: {
        images: ['logo'],
        colors: ['primary', 'secondary'],
      },
      description: "Reveal the logo with a sliding icon → wordmark motion.",
      editPromptHints: [
        "Animate the primary logo icon sliding left to reveal the brand name",
        "Keep animation crisp and precise to match a finance brand",
        "Follow with a subtle glow that transitions into the next text scene",
      ],
    },
    {
      id: "global-value-hook",
      name: "Value Hook",
      order: 2,
      duration: 90,
      beatType: 'tagline',
      templateId: 'MorphingText',
      requires: {
        text: ['headline'],
      },
      description: "Deliver a staggered text animation (e.g. a new way to do money).",
      editPromptHints: [
        "Use staggered or cascading text to say ‘a new way to do money’ or brand-specific equivalent",
        "Blend colors from the logo reveal so the story feels continuous",
        "End with wording that sets up the digital bank promise",
      ],
    },
    {
      id: "global-digital-bank",
      name: "Digital Bank Promise",
      order: 3,
      duration: 90,
      beatType: 'solution_intro',
      templateId: 'MobileApp',
      requires: {
        images: ['screenshot'],
        text: ['headline', 'subtext'],
      },
      description: "Show the app UI with a hero statement (Your digital bank, in your pocket).",
      editPromptHints: [
        "Recreate a hero phone UI using extracted screenshots or describe the core layout",
        "Use headline ‘Your digital bank, in your pocket’ or brand equivalent",
        "Include subtext like ‘Bank. Spend. Save.’ with gentle motion",
      ],
    },
    {
      id: "global-spending",
      name: "Effortless Spending",
      order: 4,
      duration: 90,
      beatType: 'solution_feature',
      templateId: 'AppJiggle',
      requires: {
        images: ['card', 'screenshot'],
        text: ['headline'],
      },
      description: "Highlight card spending with currency/payment iconography.",
      editPromptHints: [
        "Animate a branded card fanning out with payment icons (currencies, retailers, Apple Pay)",
        "Use headline ‘Spend anywhere, in seconds’ or brand-specific copy",
        "Keep motion smooth and premium to mirror Revolut styling",
      ],
    },
    {
      id: "global-send-money",
      name: "Global Transfers",
      order: 5,
      duration: 90,
      beatType: 'solution_feature',
      templateId: 'FloatingElements',
      requires: {
        text: ['headline'],
      },
      description: "Show instant transfers worldwide with globe motion.",
      editPromptHints: [
        "Use headline ‘Instant transfers, worldwide’ or equivalent",
        "Animate globe or orbiting dots connecting regions",
        "Tie colors to brand gradients so it blends with prior scenes",
      ],
    },
    {
      id: "global-income",
      name: "Manage Income",
      order: 6,
      duration: 90,
      beatType: 'benefit',
      templateId: 'AnimatedHistogram',
      requires: {
        text: ['headline'],
        metrics: ['balance'],
      },
      description: "Visualize salary deposits and balance growth.",
      editPromptHints: [
        "Use text ‘Salary in. Sorted out.’ or brand-specific phrasing",
        "Animate bars or balance numbers rising smoothly",
        "Reference paydays or auto-categorization if the brand data includes it",
      ],
    },
    {
      id: "global-rewards",
      name: "Rewards & Benefits",
      order: 7,
      duration: 90,
      beatType: 'benefit',
      templateId: 'CarouselText',
      requires: {
        text: ['headline', 'subtext'],
      },
      description: "Show rewards points climbing as transactions appear.",
      editPromptHints: [
        "Use headline ‘Earn [BrandPoints] as you spend’ and mention key perks",
        "Animate UI panel with transactions adding to a points counter",
        "If real point name unavailable, keep wording generic but exciting",
      ],
    },
    {
      id: "global-grow",
      name: "Grow Your Money",
      order: 8,
      duration: 90,
      beatType: 'solution_feature',
      templateId: 'GrowthGraph',
      requires: {
        metrics: ['savings', 'investments'],
      },
      description: "Highlight savings & investing features with rising graphs.",
      editPromptHints: [
        "Show savings graph climbing, then morph into an investing chart trending upward",
        "Mention products like Vaults, Stocks, Crypto if available in brand data",
        "Use brand accent colors to differentiate savings vs investments",
      ],
    },
    {
      id: "global-security",
      name: "Security First",
      order: 9,
      duration: 90,
      beatType: 'benefit',
      templateId: 'PromptIntro',
      requires: {
        text: ['headline'],
      },
      description: "Reassure with a security beat (lock overlay on UI).",
      editPromptHints: [
        "Use headline ‘Safe. Secure. Always.’ or equivalent",
        "Freeze UI frame and overlay a 3D lock or shield",
        "Mention security features (biometrics, instant freeze) if present",
      ],
    },
    {
      id: "global-plans",
      name: "Plan Selection",
      order: 10,
      duration: 90,
      beatType: 'solution_feature',
      templateId: 'DualScreenApp',
      requires: {
        text: ['headline', 'subtext'],
        images: ['screenshot'],
      },
      description: "Show plan tiers in a sliding carousel (Standard, Premium, etc.).",
      editPromptHints: [
        "Use headline ‘Plans for every lifestyle’ or brand-specific copy",
        "Animate plan cards (e.g. Standard, Premium, Metal, Ultra) with benefit callouts",
        "If exact plan names unavailable, highlight tiers generically (Starter, Growth, Pro)",
      ],
    },
    {
      id: "global-social-proof",
      name: "Social Proof",
      order: 11,
      duration: 90,
      beatType: 'proof',
      templateId: 'DotRipple',
      requires: {
        metrics: ['users'],
      },
      description: "Show global adoption with map dots and counters.",
      editPromptHints: [
        "Use headline ‘Join millions rethinking money’ or similar",
        "Animate world map filling with dots where the brand operates",
        "Add counter like ‘60,000,000+ users’ using actual metric if extracted",
      ],
    },
    {
      id: "global-cta",
      name: "Download CTA",
      order: 12,
      duration: 90,
      beatType: 'cta',
      templateId: 'AppDownload',
      requires: {
        text: ['cta'],
        images: ['logo'],
      },
      description: "Close with app download animation and CTA.",
      editPromptHints: [
        "Animate download progress or phone appearing with install prompt",
        "Use CTA like ‘Download now’ or brand-equivalent call to action",
        "Mention availability on iOS/Android and reinforce final benefit",
      ],
    },
  ],
  supportedFormats: ['landscape'],
  targetPersonality: {
    corporate: 0.65,
    minimalist: 0.6,
    playful: 0.45,
    technical: 0.7,
    bold: 0.7,
    modern: 0.9,
  },
  primaryIndustry: ['fintech', 'saas', 'startup'],
  industryKeywords: ['fintech', 'digital bank', 'global payments', 'cards', 'currency exchange', 'money transfer', 'rewards'],
  contentRequirements: {
    requiresLogo: true,
    requiresScreenshots: true,
    requiresSocialProof: true,
    requiresProblem: true,
    minFeatureCount: 2,
  },
  visualStyle: {
    animationIntensity: 'high',
    colorUsage: 'full-palette',
    textDensity: 'moderate',
    motionStyle: 'energetic',
  },
  exampleBrands: ['Revolut', 'Wise', 'Monzo', 'N26'],
  adminOnly: false,
  isActive: true,
  createdAt: new Date('2024-01-07T00:00:00Z'),
  updatedAt: new Date('2024-01-07T00:00:00Z'),
};

export const MULTI_SCENE_TEMPLATES: MultiSceneTemplateMetadata[] = [
  PRODUCT_LAUNCH_TEMPLATE,
  FINTECH_TRUST_TEMPLATE,
  MOBILE_APP_TEMPLATE,
  AGENCY_SHOWCASE_TEMPLATE,
  B2B_PROOF_TEMPLATE,
  PRODUCT_EXPLAINER_TEMPLATE,
  REVOLUT_GLOBAL_JOURNEY_TEMPLATE,
];

export function calculateTemplateScore(
  template: MultiSceneTemplateMetadata,
  brandPersonality: BrandPersonality,
  brandData: {
    hasLogo: boolean;
    hasSocialProof: boolean;
    hasScreenshots: boolean;
    featureCount: number;
    detectedKeywords: string[];
  }
): TemplateSelectionScore {
  const personalityDiffs = (Object.keys(brandPersonality) as Array<keyof BrandPersonality>).map(
    (k) => Math.abs(brandPersonality[k] - template.targetPersonality[k])
  );
  const avgPersonalityDiff =
    personalityDiffs.reduce((sum, diff) => sum + diff, 0) / personalityDiffs.length;
  const personalityMatch = 1 - avgPersonalityDiff;

  const keywordMatches = template.industryKeywords.filter((keyword) =>
    brandData.detectedKeywords.some((brandKeyword) =>
      brandKeyword.toLowerCase().includes(keyword.toLowerCase())
    )
  );
  const keywordMatch = Math.min(keywordMatches.length / 3, 1);

  let contentScore = 1;
  if (template.contentRequirements.requiresLogo && !brandData.hasLogo) {
    contentScore -= 0.3;
  }
  if (template.contentRequirements.requiresSocialProof && !brandData.hasSocialProof) {
    contentScore -= 0.2;
  }
  if (template.contentRequirements.requiresScreenshots && !brandData.hasScreenshots) {
    contentScore -= 0.2;
  }
  if (
    template.contentRequirements.minFeatureCount &&
    brandData.featureCount < template.contentRequirements.minFeatureCount
  ) {
    contentScore -= 0.3;
  }
  contentScore = Math.max(contentScore, 0);

  const weights = {
    personality: 0.6,
    industry: 0.25,
    content: 0.15,
  } as const;

  const finalScore =
    personalityMatch * weights.personality +
    keywordMatch * weights.industry +
    contentScore * weights.content;

  const reasoning = generateReasoning(
    template,
    personalityMatch,
    keywordMatch,
    contentScore,
    brandData
  );

  return {
    template,
    score: finalScore,
    breakdown: {
      personalityMatch,
      industryMatch: keywordMatch,
      contentAvailability: contentScore,
      keywordMatch,
    },
    reasoning,
  };
}

function generateReasoning(
  template: MultiSceneTemplateMetadata,
  personalityMatch: number,
  keywordMatch: number,
  contentScore: number,
  brandData: {
    hasLogo: boolean;
    hasSocialProof: boolean;
    hasScreenshots: boolean;
    featureCount: number;
    detectedKeywords: string[];
  }
): string {
  const reasons: string[] = [];

  if (personalityMatch > 0.8) {
    reasons.push(`Strong personality match (${(personalityMatch * 100).toFixed(0)}%)`);
  } else if (personalityMatch < 0.6) {
    reasons.push(`Personality mismatch (${(personalityMatch * 100).toFixed(0)}%)`);
  }

  if (keywordMatch > 0.6) {
    reasons.push('Industry keywords align well');
  }

  if (contentScore < 1) {
    if (template.contentRequirements.requiresLogo && !brandData.hasLogo) {
      reasons.push('Logo missing for this template');
    }
    if (template.contentRequirements.requiresSocialProof && !brandData.hasSocialProof) {
      reasons.push('No social proof available');
    }
    if (template.contentRequirements.requiresScreenshots && !brandData.hasScreenshots) {
      reasons.push('Screenshots not available');
    }
    if (
      template.contentRequirements.minFeatureCount &&
      brandData.featureCount < template.contentRequirements.minFeatureCount
    ) {
      reasons.push('Not enough features provided');
    }
  }

  if (reasons.length === 0) {
    reasons.push('Good all-around match');
  }

  return reasons.join('. ');
}

export function selectBestTemplate(
  templates: MultiSceneTemplateMetadata[],
  brandPersonality: BrandPersonality,
  brandData: {
    hasLogo: boolean;
    hasSocialProof: boolean;
    hasScreenshots: boolean;
    featureCount: number;
    detectedKeywords: string[];
  }
): TemplateSelectionScore {
  const scored = templates
    .filter((template) => template.isActive)
    .map((template) => calculateTemplateScore(template, brandPersonality, brandData))
    .sort((a, b) => b.score - a.score);

  if (!scored[0]) {
    throw new Error('No multi-scene templates available for selection');
  }

  return scored[0];
}
