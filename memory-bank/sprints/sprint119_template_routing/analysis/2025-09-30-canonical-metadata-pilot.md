# Ticket: Canonical Metadata Pilot for Top 5 DB Templates (Sprint 119)

## Goal
Establish the canonical metadata pipeline by onboarding a small, high-usage slice of database templates. The pilot covers five production templates and proves out:
- How rich metadata will be authored for DB templates.
- How the canonical definition generates brain/server projections.
- How template matchers and website selector will consume the new data without regressions.

## Selected Templates (prod)
| Name                | Template ID                             | Category   | Supported Formats | Usage Count |
|---------------------|------------------------------------------|------------|-------------------|-------------|
| Google AI Search    | 4cf2f12b-f0ce-4666-b0a2-09a9a9525488     | animation  | landscape         | 11          |
| Build a' word slide | 1aa932e9-981b-44f3-b8e5-fa403c98a65f     | text       | landscape         | 10          |
| Revolut App         | bec6cc24-b737-4440-9441-f05b77b84fc9     | animation  | landscape         | 10          |
| Airbnb Demo         | 6282bf4f-c46c-4bc4-8138-790c8b898f56     | animation  | landscape         | 8           |
| Generating          | 54c159d6-7f53-4a10-b5f5-3c6f13d60c3c     | text       | landscape         | 8           |
| Home screen notifications | 1ca6d5d1-71b4-4e9a-a842-3426432d042f | animation | landscape | 8 |
| Rainbow stroke text effect | 59719468-662c-485b-9279-c94626d014d9 | text | landscape | 8 |
| Shooting Star        | 1a318e05-4a26-4da3-92f5-7890e699b3de     | text       | landscape         | 8           |
| Welcome to Bazaar    | 7174c9ea-4240-479a-a0f9-36e65f64681a     | text       | landscape         | 8           |
| Blue Gradient Text (DB) | fb80e68b-a7e9-44ea-9eea-fa57893ef075  | text       | landscape         | 7           |
| Corporate Credit Card | f83feab4-9ef2-425d-8c63-ed0d38c150b0   | animation  | landscape         | 7           |
| Gradient Globe       | 430a7d2b-cda2-4507-b0c0-e6d9ea8fbf04     | background | landscape         | 7           |
| Pill Shaped Bar Chart | 895a221e-d4cd-4567-a757-9f1d7ac9a8c4    | animation  | landscape         | 5           |
| Text Sparkles        | f6444a90-fbcf-4c97-9b6c-fb43c506de6e     | text       | landscape         | 5           |
| Airbnb Demo (Portrait) | 9cbfb640-545a-4880-8c3a-62887e5249cf   | animation  | portrait          | 4           |
| TBPN intro           | ff873eb3-3423-4da3-94e1-1973591a2dfb     | animation  | portrait          | 4           |
| Text animation (DB)  | 00404900-c51c-401a-a36e-ae3234deb4d4     | text       | landscape/portrait/square | 4 |
| Vibe-Coded finance app | 7305f6c3-a0af-4125-a511-a14afe955bf3   | animation  | landscape         | 4           |
| Hello Circles        | 31bcdb78-9dfa-49ac-af34-1de889fc2e08     | animation  | portrait          | 3           |
| Log-in               | 2e6be68a-d83a-4ddb-a1ff-0be7ce9a9347     | animation  | landscape         | 3           |
| Shazam animation     | 4bba2499-ee30-4e0f-af7f-75572fcc1ee8     | animation  | landscape         | 3           |
| Testimonials         | c6f94642-c762-40ef-88e0-434ba0294f80     | animation  | landscape         | 3           |
| UI Data Visualisation | 20880f1b-f72f-442b-a416-c368e9b640ff    | animation  | landscape         | 3           |
| 50+ Integrations     | 2ebb8f74-3a48-4bf1-afd6-9e3a1ed6d35f     | animation  | landscape         | 2           |
| Bar Chart (card)     | 9ccb415b-0396-4a57-b649-169a90b5d83f     | animation  | landscape         | 2           |
| Line Chart           | c2bac307-3ae3-44f5-ba5f-6109ac8abe24     | animation  | landscape         | 2           |
| Make something Lovable| 5003e635-fc3e-4e60-b259-2c85354804fa    | animation  | landscape         | 2           |
| Pricing Card (portrait)| ee38aedd-0343-4727-8941-a40ca63b6819   | animation  | portrait/square   | 2           |
| Pricing Card (landscape)| 77f40aac-001b-49b7-8104-209a2300d184  | animation  | landscape         | 2           |
| Profile / Message screens | 0256d007-70e7-4104-9c16-0dd8bd70a6b1 | animation | landscape         | 2           |
| Toggle                   | a54cb1aa-8663-4825-a08e-ebc14558fa8c  | animation  | landscape/portrait/square | 2 |
| Banking App              | 1bc2d1b0-f8dc-415d-bd39-528f44fb5ce2  | animation  | portrait/square   | 2           |
| Blur                     | 4fefddd4-f509-423a-953c-fc066d25d009  | animation  | landscape/portrait/square | 2 |
| Gradient globe (portrait)| 3a164c8d-cad8-481c-ad1f-f8aac11c8c5c  | animation  | portrait          | 2           |
| I want to break free     | c9952351-3c87-4942-9edb-fee7effc5a5b  | animation  | landscape         | 2           |
| Log in (portrait)        | 96f88e7e-cc41-457c-82dc-c152cf0f90bd  | animation  | portrait          | 1           |
| Message notification     | ed3ff0bf-6e54-4d98-b2c4-b923797071bc  | animation  | landscape         | 1           |
| Scale down text effect   | d907e3e5-1c99-4f70-8454-9573156cea08  | animation  | landscape         | 1           |
| Screenshot intro         | 009b717a-dd89-4757-8321-bf06b391c7ad  | animation  | landscape         | 1           |
| Text & UI Animation      | 7acf1a10-e0c1-485c-bf15-d8a32ab9bf82  | animation  | landscape         | 1           |
| Text Shimmer (portrait)  | d7b894d9-0043-4e72-a62a-69434776ffe4  | animation  | portrait          | 1           |
| Word Replace             | 157c4c8a-9961-4a04-90a6-a3107bb5787d  | text       | landscape         | 1           |
| Yellow Bar Chart         | 7720e8bb-47e1-423f-b085-99ed3ccc2543  | animation  | portrait/square   | 2           |
| Animated UI              | c999b0df-b6e4-4bb4-8387-7a88475fcb2f  | animation  | portrait          | 1           |
| Credit Card Expenses     | 24b90c46-49a5-4bc6-a045-3ecb94ff2e47  | animation  | portrait          | 1           |
| Customer Testimonials (portrait)| a0ac9af6-cfde-4111-a185-d4a911d3ff65 | animation | portrait/square | 1 |
| Google AI Search Box (portrait)| 3d6036f4-2f1f-4e43-99ef-371d6f456c3e | animation | portrait/square | 1 |
| Growth Graph (portrait) | 22816869-0648-4306-99aa-af79b9c7ba4d | animation | portrait/square | 1 |
| Homescreen notifications (portrait) | ea9d3b6f-f681-4224-92c1-ace15afb989f | animation | portrait/square | 1 |
| Message (portrait) | b901a314-b5fb-46f7-98c7-9a50b26e5e37 | animation | portrait | 1 |
| Pill Chart (portrait) | 2e7cf71c-0d4d-47f1-8255-23d439b24269 | animation | portrait/square | 1 |
| Sign in with Apple    | e87a6f79-96f8-495a-8f04-e2fa25290e2a | animation | landscape | 1 |
| Sign in with GitHub   | 17eb7881-2558-4b94-bd13-ae1e4a84dda5 | animation | landscape | 1 |
| Sign in with Google   | 2dc3771d-c753-440c-a36c-de810b3ed730 | animation | landscape | 1 |
| Sparkles (portrait)   | 7da38cf9-8422-4b26-956a-ff4dc85f26e4 | effects   | portrait/square | 1 |
| Text box animation    | 272d19ee-4ac2-4b31-9736-62d64f07b1e8 | animation | portrait | 1 |
| Work Replace (square)| c9975624-898f-45bf-9e7a-3ac9b3d909fa | text      | square   | 1 |

## Metadata Authoring Plan
For each pilot template we will author full canonical metadata (`BrainTemplateMetadata`) with the following fields:
- `id`, `name`, `duration`, `supportedFormats` (frames + formats from DB).
- Matching surface:
  - `keywords`: single words/short tokens users might mention.
  - `descriptions`: natural language summaries.
  - `userPhrases`: verbatim phrases pulled from real prompts or expected requests.
  - `categories`: logical groupings (text-animation, ui-demo, background, ai, fintech etc.).
  - `styles`: visual tone (modern, playful, elegant, energetic).
  - `useCases`: business contexts (dashboard intro, fintech product, SaaS hero, status/loading).
- Technical descriptors:
  - `animations`: key animation patterns (slide, fade, particle, chart draw, shimmer).
  - `elements`: important UI primitives (search bar, phone mock, headline text, stats).
  - `colors`: palette hints (gradient, purple, teal, multicolor).
  - `complexity`: `simple` | `medium` | `complex`.
- Relationship hints:
  - `primaryUse`: crisp one-line purpose.
  - `similarTo`: other template IDs (canonical IDs, not DB UUIDs) that deliver comparable visuals.

### Example (Google AI Search)
```ts
{
  id: 'google-ai-search',
  source: { type: 'db', dbId: '4cf2f12b-f0ce-4666-b0a2-09a9a9525488' },
  name: 'Google AI Search',
  duration: 180,
  supportedFormats: ['landscape'],
  keywords: ['google', 'search', 'ai', 'results', 'interface', 'query', 'cards'],
  descriptions: [
    'Animated Google-style AI search results with responsive cards',
    'Dynamic search interface showing query suggestions and answer cards'
  ],
  userPhrases: [
    'google ai search demo',
    'search results animation',
    'show ai search interface',
    'google-style ui',
    'search bar with cards'
  ],
  categories: ['ui-demo', 'ai-ui', 'animation'],
  styles: ['modern', 'tech', 'clean'],
  useCases: ['product demo', 'feature highlight', 'ai assistant'],
  animations: ['slide', 'fade', 'scale'],
  elements: ['search bar', 'cards', 'icons'],
  colors: ['light', 'google palette'],
  complexity: 'complex',
  primaryUse: 'Animated AI search results interface',
  similarTo: ['PromptUI', 'AppJiggle']
}
```
(Actual duration to be pulled from TSX export; use DB `duration` field for initial preload.)

### Example (Build a' word slide)
```ts
{
  id: 'build-a-word-slide',
  source: { type: 'db', dbId: '1aa932e9-981b-44f3-b8e5-fa403c98a65f' },
  name: "Build a' word slide",
  duration: 150,
  supportedFormats: ['landscape'],
  keywords: ['word', 'slide', 'headline', 'text', 'animated', 'carousel', 'features'],
  descriptions: [
    'Energetic headline animation that slides words across the screen',
    'Rapid-fire text carousel for showcasing product features or benefits'
  ],
  userPhrases: [
    'sliding headline animation',
    'text that rotates through features',
    'word carousel',
    'animated text slider',
    'fast feature list'
  ],
  categories: ['text-animation', 'typography', 'transitions'],
  styles: ['bold', 'modern', 'energetic'],
  useCases: ['product highlights', 'feature lists', 'marketing hero'],
  animations: ['slide', 'loop', 'stagger'],
  elements: ['headline text', 'subtext'],
  colors: ['high-contrast', 'brand accent'],
  complexity: 'medium',
  primaryUse: 'Sliding headline text that cycles through key selling points',
  similarTo: ['WordFlip', 'CarouselText']
}
```

### Example (Revolut App)
```ts
{
  id: 'revolut-app',
  source: { type: 'db', dbId: 'bec6cc24-b737-4440-9441-f05b77b84fc9' },
  name: 'Revolut App',
  duration: 180,
  supportedFormats: ['landscape'],
  keywords: ['revolut', 'fintech', 'app', 'mobile dashboard', 'cards', 'finance ui'],
  descriptions: [
    'Fintech mobile app showcase with animated cards and balance widgets',
    'Polished banking UI demo highlighting transactions and analytics'
  ],
  userPhrases: [
    'fintech app demo',
    'show a banking dashboard',
    'mobile wallet animation',
    'financial app walkthrough',
    'card balance animation'
  ],
  categories: ['ui-demo', 'fintech', 'animation'],
  styles: ['modern', 'clean', 'professional'],
  useCases: ['product demo', 'investment platform intro', 'mobile banking teaser'],
  animations: ['slide', 'scale', 'card stack'],
  elements: ['phone mock', 'cards', 'charts', 'balance summary'],
  colors: ['brand gradient', 'purple', 'teal'],
  complexity: 'complex',
  primaryUse: 'Fintech mobile experience with animated account cards and analytics',
  similarTo: ['MobileApp', 'FintechUI', 'AppJiggle']
}
```

### Example (Airbnb Demo)
```ts
{
  id: 'airbnb-demo',
  source: { type: 'db', dbId: '6282bf4f-c46c-4bc4-8138-790c8b898f56' },
  name: 'Airbnb Demo',
  duration: 180,
  supportedFormats: ['landscape'],
  keywords: ['airbnb', 'listing', 'travel', 'cards', 'hero section', 'accommodation'],
  descriptions: [
    'Travel marketplace UI with hero imagery and animated property cards',
    'Lifestyle product showcase blending photography and booking details'
  ],
  userPhrases: [
    'airbnb style hero',
    'travel marketplace animation',
    'property listing cards',
    'vacation rental ui',
    'booking site demo'
  ],
  categories: ['ui-demo', 'marketing', 'animation'],
  styles: ['friendly', 'lifestyle', 'clean'],
  useCases: ['travel landing page', 'marketplace intro', 'hero section'],
  animations: ['fade', 'parallax', 'card slide'],
  elements: ['hero image', 'property cards', 'ratings', 'cta button'],
  colors: ['soft gradient', 'warm'],
  complexity: 'medium',
  primaryUse: 'Travel marketplace hero with animated property cards',
  similarTo: ['HeroTemplate', 'PromptIntro']
}
```

### Example (Generating)
```ts
{
  id: 'generating-loader',
  source: { type: 'db', dbId: '54c159d6-7f53-4a10-b5f5-3c6f13d60c3c' },
  name: 'Generating',
  duration: 150,
  supportedFormats: ['landscape'],
  keywords: ['loading', 'generating', 'status', 'shimmer', 'ai'],
  descriptions: [
    'Minimal loading indicator with shimmer text and subtle motion',
    'Animated generating state for AI workflows or async actions'
  ],
  userPhrases: [
    'generating animation',
    'ai loading state',
    'shimmer loading text',
    'show generating status',
    'progress indicator text'
  ],
  categories: ['status', 'text-animation', 'effects'],
  styles: ['minimal', 'clean', 'tech'],
  useCases: ['loading state', 'async workflow', 'ai generation UI'],
  animations: ['shimmer', 'fade', 'pulse'],
  elements: ['text'],
  colors: ['neutral', 'gradient'],
  complexity: 'simple',
  primaryUse: 'Generating/loading indicator with animated shimmer text',
  similarTo: ['DotDotDot', 'PromptIntro']
}
```

### Example (Home screen notifications)
```ts
{
  id: 'home-screen-notifications',
  source: { type: 'db', dbId: '1ca6d5d1-71b4-4e9a-a842-3426432d042f' },
  name: 'Home screen notifications',
  duration: 120,
  supportedFormats: ['landscape'],
  keywords: ['mobile', 'notifications', 'alerts', 'app', 'phone', 'push'],
  descriptions: [
    'Animated mobile lock screen with layered notification cards',
    'App-style notification feed showing multiple alerts sliding in'
  ],
  userPhrases: [
    'mobile notification animation',
    'phone lock screen alerts',
    'show app notifications',
    'push notification stack',
    'iOS style alerts'
  ],
  categories: ['ui-demo', 'mobile', 'animation'],
  styles: ['modern', 'clean', 'product'],
  useCases: ['mobile app demo', 'product announcement', 'onboarding flow'],
  animations: ['slide', 'stack', 'fade'],
  elements: ['phone mock', 'notification cards', 'icons'],
  colors: ['light', 'accent highlight'],
  complexity: 'medium',
  primaryUse: 'Mobile notification feed with animated stacked alerts',
  similarTo: ['AppJiggle', 'MobileApp']
}
```

### Example (Rainbow stroke text effect)
```ts
{
  id: 'rainbow-stroke-text-effect',
  source: { type: 'db', dbId: '59719468-662c-485b-9279-c94626d014d9' },
  name: 'Rainbow stroke text effect',
  duration: 40,
  supportedFormats: ['landscape'],
  keywords: ['rainbow', 'outline', 'text', 'stroke', 'gradient', 'neon'],
  descriptions: [
    'Bold headline with animated rainbow stroke outline',
    'Gradient text effect that pulses vibrant outlines around letters'
  ],
  userPhrases: [
    'rainbow text animation',
    'gradient stroke headline',
    'neon outline text',
    'colorful text effect',
    'vibrant typography'
  ],
  categories: ['text-animation', 'effects', 'typography'],
  styles: ['bold', 'vibrant', 'playful'],
  useCases: ['marketing hero', 'video intro', 'event promo'],
  animations: ['stroke animation', 'pulse', 'glow'],
  elements: ['headline text'],
  colors: ['multicolor', 'gradient'],
  complexity: 'simple',
  primaryUse: 'Animated headline with rainbow gradient stroke outline',
  similarTo: ['GradientText', 'HighlightSweep']
}
```

### Example (Shooting Star)
```ts
{
  id: 'shooting-star',
  source: { type: 'db', dbId: '1a318e05-4a26-4da3-92f5-7890e699b3de' },
  name: 'Shooting Star',
  duration: 30,
  supportedFormats: ['landscape'],
  keywords: ['shooting star', 'sparkle', 'text', 'intro', 'night sky'],
  descriptions: [
    'Quick text intro with a shooting star streak and sparkle trail',
    'Celestial title card where a star animates across the headline'
  ],
  userPhrases: [
    'shooting star animation',
    'sparkle intro text',
    'night sky title',
    'quick celestial intro',
    'star streak effect'
  ],
  categories: ['text-animation', 'intro', 'effects'],
  styles: ['elegant', 'magical', 'minimal'],
  useCases: ['title cards', 'event intro', 'animated signature'],
  animations: ['particle trail', 'glow', 'fade'],
  elements: ['headline text', 'particle trail'],
  colors: ['dark', 'gold'],
  complexity: 'simple',
  primaryUse: 'Text intro with animated shooting star and sparkle trail',
  similarTo: ['PromptIntro', 'HighlightSweep']
}
```

### Example (Welcome to Bazaar)
```ts
{
  id: 'welcome-to-bazaar',
  source: { type: 'db', dbId: '7174c9ea-4240-479a-a0f9-36e65f64681a' },
  name: 'Welcome to Bazaar',
  duration: 120,
  supportedFormats: ['landscape'],
  keywords: ['welcome', 'bazaar', 'intro', 'text', 'brand'],
  descriptions: [
    'Brand welcome animation introducing Bazaar with bold headlines',
    'Intro scene highlighting Bazaar name with animated accents'
  ],
  userPhrases: [
    'welcome to bazaar animation',
    'brand intro scene',
    'company welcome title',
    'bazaar hero text',
    'introductory animation'
  ],
  categories: ['text-animation', 'brand', 'intro'],
  styles: ['bold', 'confident', 'modern'],
  useCases: ['company intro', 'product onboarding', 'hero section'],
  animations: ['fade', 'scale', 'accent lines'],
  elements: ['headline text', 'subheadline', 'accent shapes'],
  colors: ['brand palette', 'purple'],
  complexity: 'medium',
  primaryUse: 'Bold welcome animation for Bazaar brand intro',
  similarTo: ['PromptIntro', 'FastText']
}
```

### Example (Blue Gradient Text – DB)
```ts
{
  id: 'blue-gradient-text-db',
  source: { type: 'db', dbId: 'fb80e68b-a7e9-44ea-9eea-fa57893ef075' },
  name: 'Blue Gradient Text',
  duration: 90,
  supportedFormats: ['landscape'],
  keywords: ['blue gradient', 'text', 'shimmer', 'headline', 'cool tone'],
  descriptions: [
    'Gradient headline text with soft blue shimmer animation',
    'Cool-toned text effect with animated gradient sweeping across letters'
  ],
  userPhrases: [
    'blue gradient text animation',
    'shimmer headline',
    'cool tone text effect',
    'gradient typography',
    'animated blue text'
  ],
  categories: ['text-animation', 'typography'],
  styles: ['smooth', 'professional', 'cool'],
  useCases: ['product intro', 'tech marketing', 'feature highlight'],
  animations: ['gradient sweep', 'shimmer'],
  elements: ['headline text'],
  colors: ['blue gradient'],
  complexity: 'simple',
  primaryUse: 'Blue gradient shimmer effect for headline text',
  similarTo: ['GradientText', 'FadeIn']
}
```

### Example (Corporate Credit Card)
```ts
{
  id: 'corporate-credit-card',
  source: { type: 'db', dbId: 'f83feab4-9ef2-425d-8c63-ed0d38c150b0' },
  name: 'Corporate Credit Card',
  duration: 189,
  supportedFormats: ['landscape'],
  keywords: ['credit card', 'finance', 'corporate', 'spend management', 'card animation'],
  descriptions: [
    'Premium credit card hero with animated card flips and expense highlights',
    'Corporate spend management scene showcasing card perks and analytics'
  ],
  userPhrases: [
    'corporate card animation',
    'show a finance card hero',
    'expense management demo',
    'animated credit card',
    'fintech card interface'
  ],
  categories: ['ui-demo', 'fintech', 'animation'],
  styles: ['premium', 'sleek', 'professional'],
  useCases: ['finance hero', 'card product launch', 'B2B fintech marketing'],
  animations: ['card flip', 'parallax', 'glow'],
  elements: ['credit card', 'metrics', 'cta'],
  colors: ['dark', 'gold accent'],
  complexity: 'complex',
  primaryUse: 'Premium corporate credit card hero with animated analytics',
  similarTo: ['FintechUI', 'Revolut App']
}
```

### Example (Gradient Globe)
```ts
{
  id: 'gradient-globe',
  source: { type: 'db', dbId: '430a7d2b-cda2-4507-b0c0-e6d9ea8fbf04' },
  name: 'Gradient Globe',
  duration: 180,
  supportedFormats: ['landscape'],
  keywords: ['globe', 'gradient', 'background', 'world', 'orbit'],
  descriptions: [
    'Abstract gradient globe background with rotating rings',
    'Ambient world sphere animation for technology intros'
  ],
  userPhrases: [
    'gradient globe background',
    'tech sphere animation',
    'global background',
    'orbiting rings animation',
    'ambient gradient globe'
  ],
  categories: ['background', 'effects', 'motion-graphics'],
  styles: ['futuristic', 'ambient', 'sleek'],
  useCases: ['tech intro', 'global product hero', 'background loop'],
  animations: ['rotation', 'orbital motion', 'glow'],
  elements: ['sphere', 'rings', 'particles'],
  colors: ['gradient', 'blue-purple'],
  complexity: 'medium',
  primaryUse: 'Ambient gradient globe background with rotating rings',
  similarTo: ['FloatingParticles', 'PulsingCircles']
}
```

### Example (Pill Shaped Bar Chart)
```ts
{
  id: 'pill-shaped-bar-chart',
  source: { type: 'db', dbId: '895a221e-d4cd-4567-a757-9f1d7ac9a8c4' },
  name: 'Pill Shaped Bar Chart',
  duration: 150,
  supportedFormats: ['landscape'],
  keywords: ['bar chart', 'data viz', 'metrics', 'analytics', 'pill'],
  descriptions: [
    'Rounded pill bar chart animation highlighting metrics with smooth transitions',
    'Modern analytics visualization with animated pill-shaped bars'
  ],
  userPhrases: [
    'pill bar chart animation',
    'rounded analytics chart',
    'modern data viz',
    'animated metrics bars',
    'dashboard bar chart'
  ],
  categories: ['data-viz', 'analytics', 'animation'],
  styles: ['modern', 'clean', 'professional'],
  useCases: ['analytics section', 'metrics highlight', 'finance dashboard'],
  animations: ['grow', 'stagger', 'pulse'],
  elements: ['bars', 'labels', 'grid'],
  colors: ['brand accent', 'gradient'],
  complexity: 'medium',
  primaryUse: 'Rounded bar chart animation for highlighting key metrics',
  similarTo: ['GrowthGraph', 'TeslaStockGraph']
}
```

### Example (Text Sparkles)
```ts
{
  id: 'text-sparkles',
  source: { type: 'db', dbId: 'f6444a90-fbcf-4c97-9b6c-fb43c506de6e' },
  name: 'Text Sparkles',
  duration: 108,
  supportedFormats: ['landscape'],
  keywords: ['sparkle', 'text', 'glitter', 'shimmer', 'magic'],
  descriptions: [
    'Headline text with animated sparkles dancing across the letters',
    'Magical text effect where glittering particles trail around words'
  ],
  userPhrases: [
    'sparkle text animation',
    'glitter headline',
    'magical text effect',
    'shimmering typography',
    'sparkling intro text'
  ],
  categories: ['text-animation', 'effects'],
  styles: ['magical', 'playful', 'elegant'],
  useCases: ['event promo', 'holiday greeting', 'celebration intro'],
  animations: ['particle sparkle', 'trail', 'fade'],
  elements: ['headline text', 'sparkle particles'],
  colors: ['gold', 'white'],
  complexity: 'medium',
  primaryUse: 'Sparkling text animation with glittering particle trails',
  similarTo: ['Shooting Star', 'HighlightSweep']
}
```

### Example (Airbnb Demo – Portrait)
```ts
{
  id: 'airbnb-demo-portrait',
  source: { type: 'db', dbId: '9cbfb640-545a-4880-8c3a-62887e5249cf' },
  name: 'Airbnb Demo (Portrait)',
  duration: 330,
  supportedFormats: ['portrait'],
  keywords: ['airbnb', 'mobile hero', 'travel', 'vertical', 'listings'],
  descriptions: [
    'Vertical travel marketplace demo showing swipeable listings and hero imagery',
    'Portrait Airbnb-style experience with animated cards and booking highlights'
  ],
  userPhrases: [
    'airbnb mobile demo',
    'vertical travel animation',
    'portrait listings animation',
    'vacation rental mobile ui',
    'travel app intro'
  ],
  categories: ['ui-demo', 'marketing', 'animation'],
  styles: ['friendly', 'lifestyle', 'mobile-first'],
  useCases: ['vertical social video', 'mobile hero section', 'travel app showcase'],
  animations: ['slide', 'stack', 'parallax'],
  elements: ['hero image', 'property cards', 'cta button'],
  colors: ['warm gradient', 'white'],
  complexity: 'complex',
  primaryUse: 'Portrait travel marketplace demo with animated property cards',
  similarTo: ['Airbnb Demo', 'MobileApp']
}
```

### Example (TBPN intro)
```ts
{
  id: 'tbpn-intro',
  source: { type: 'db', dbId: 'ff873eb3-3423-4da3-94e1-1973591a2dfb' },
  name: 'TBPN intro',
  duration: 90,
  supportedFormats: ['portrait'],
  keywords: ['tbpn', 'intro', 'brand reveal', 'portrait', 'motion graphics'],
  descriptions: [
    'Portrait intro sequence for TBPN with animated typography and overlays',
    'Vertical brand reveal blending bold text, image panels, and motion accents'
  ],
  userPhrases: [
    'tbpn intro animation',
    'portrait brand reveal',
    'vertical intro sequence',
    'tbpn motion graphics',
    'vertical hero intro'
  ],
  categories: ['intro', 'brand', 'animation'],
  styles: ['bold', 'energetic', 'portrait-first'],
  useCases: ['social intro', 'brand opener', 'campaign launch'],
  animations: ['slide', 'opacity reveals', 'layered transitions'],
  elements: ['headline text', 'image panels', 'accent shapes'],
  colors: ['brand palette', 'high contrast'],
  complexity: 'medium',
  primaryUse: 'Portrait brand intro sequence for TBPN with layered motion',
  similarTo: ['PromptIntro', 'airbnb-demo-portrait']
}
```

### Example (Text animation – DB)
```ts
{
  id: 'text-animation-db',
  source: { type: 'db', dbId: '00404900-c51c-401a-a36e-ae3234deb4d4' },
  name: 'Text animation',
  duration: 30,
  supportedFormats: ['landscape', 'portrait', 'square'],
  keywords: ['text animation', 'headline', 'kinetic text', 'responsive', 'grid'],
  descriptions: [
    'Responsive text animation that adapts to multiple aspect ratios',
    'Kinetic typography with quick staggered transitions across layouts'
  ],
  userPhrases: [
    'responsive text animation',
    'simple kinetic typography',
    'quick text intro',
    'multi-format text animation',
    'fast headline animation'
  ],
  categories: ['text-animation', 'typography'],
  styles: ['clean', 'minimal', 'versatile'],
  useCases: ['multi-platform intro', 'product highlight', 'quick promo'],
  animations: ['stagger', 'scale', 'fade'],
  elements: ['headline text', 'subheadline'],
  colors: ['neutral', 'brand accent'],
  complexity: 'simple',
  primaryUse: 'Responsive kinetic text animation for multiple aspect ratios',
  similarTo: ['FastText', 'SlidingText']
}
```

### Example (Vibe-Coded finance app)
```ts
{
  id: 'vibe-coded-finance-app',
  source: { type: 'db', dbId: '7305f6c3-a0af-4125-a511-a14afe955bf3' },
  name: 'Vibe-Coded finance app',
  duration: 210,
  supportedFormats: ['landscape'],
  keywords: ['finance app', 'dashboard', 'neon', 'vibe', 'metrics'],
  descriptions: [
    'Stylized finance dashboard with neon aesthetic and animated metrics',
    'Vibe-coded fintech interface showcasing cards, balances, and charts'
  ],
  userPhrases: [
    'vibe coded finance animation',
    'neon fintech dashboard',
    'stylized finance ui',
    'animated finance metrics',
    'vibe-coded app demo'
  ],
  categories: ['ui-demo', 'fintech', 'animation'],
  styles: ['neon', 'futuristic', 'high-energy'],
  useCases: ['fintech marketing', 'product teaser', 'feature walkthrough'],
  animations: ['glow', 'slide', 'card transitions'],
  elements: ['cards', 'charts', 'balance widgets'],
  colors: ['neon gradient', 'purple', 'cyan'],
  complexity: 'complex',
  primaryUse: 'Stylized finance dashboard animation with neon vibe-coded aesthetic',
  similarTo: ['revolut-app', 'FintechUI']
}
```

### Example (Hello Circles)
```ts
{
  id: 'hello-circles',
  source: { type: 'db', dbId: '31bcdb78-9dfa-49ac-af34-1de889fc2e08' },
  name: 'Hello Circles',
  duration: 90,
  supportedFormats: ['portrait'],
  keywords: ['circles', 'ambient', 'background', 'hello', 'gradient'],
  descriptions: [
    'Portrait ambient scene with layered circles orbiting a central greeting',
    'Animated Hello title surrounded by softly moving gradient circles'
  ],
  userPhrases: [
    'circle animation',
    'ambient hello intro',
    'portrait circles background',
    'soft gradient circles',
    'minimal welcome scene'
  ],
  categories: ['intro', 'background', 'animation'],
  styles: ['soft', 'ambient', 'minimal'],
  useCases: ['welcome screen', 'portrait intro', 'vertical background'],
  animations: ['orbit', 'scale', 'fade'],
  elements: ['circles', 'headline text'],
  colors: ['pastel gradient'],
  complexity: 'simple',
  primaryUse: 'Portrait ambient hello scene with layered circle animations',
  similarTo: ['Gradient Globe', 'PulsingCircles']
}
```

### Example (Log-in)
```ts
{
  id: 'log-in-db',
  source: { type: 'db', dbId: '2e6be68a-d83a-4ddb-a1ff-0be7ce9a9347' },
  name: 'Log-in',
  duration: 75,
  supportedFormats: ['landscape'],
  keywords: ['login', 'form', 'ui', 'signin', 'credentials'],
  descriptions: [
    'Login form animation with floating input fields and CTA button',
    'Modern authentication UI showcasing email/password entry and submit'
  ],
  userPhrases: [
    'login form animation',
    'sign-in ui demo',
    'authentication screen',
    'animated login inputs',
    'login cta animation'
  ],
  categories: ['ui-demo', 'authentication', 'animation'],
  styles: ['clean', 'product', 'modern'],
  useCases: ['auth flow demo', 'product onboarding', 'SaaS intro'],
  animations: ['slide', 'focus highlight', 'button pulse'],
  elements: ['input fields', 'button', 'helper text'],
  colors: ['neutral', 'accent'],
  complexity: 'medium',
  primaryUse: 'Authentication UI demo with animated login form',
  similarTo: ['PromptUI', 'AppDownload']
}
```

### Example (Shazam animation)
```ts
{
  id: 'shazam-animation',
  source: { type: 'db', dbId: '4bba2499-ee30-4e0f-af7f-75572fcc1ee8' },
  name: 'Shazam animation',
  duration: 300,
  supportedFormats: ['landscape'],
  keywords: ['shazam', 'listening', 'sound detection', 'device', 'audio pulse'],
  descriptions: [
    'Music discovery hero with device animation, listening text, and pulsing rings',
    'Shazam-style listening UI where a phone scales in and audio waves respond'
  ],
  userPhrases: [
    'shazam style animation',
    'listening screen demo',
    'music detection hero',
    'audio pulse animation',
    'sound recognition ui'
  ],
  categories: ['ui-demo', 'music', 'animation'],
  styles: ['energetic', 'tech', 'immersive'],
  useCases: ['music app hero', 'listening state', 'product launch'],
  animations: ['device entrance', 'pulse rings', 'text reveal'],
  elements: ['phone mock', 'logo', 'listening text', 'pulse circles'],
  colors: ['dark', 'blue accent'],
  complexity: 'complex',
  primaryUse: 'Music listening hero with animated phone and pulsing sound waves',
  similarTo: ['PromptIntro', 'Gradient Globe']
}
```

### Example (Testimonials)
```ts
{
  id: 'testimonials-db',
  source: { type: 'db', dbId: 'c6f94642-c762-40ef-88e0-434ba0294f80' },
  name: 'Testimonials',
  duration: 210,
  supportedFormats: ['landscape'],
  keywords: ['testimonials', 'carousel', 'avatars', 'quotes', 'social proof'],
  descriptions: [
    'Scrolling testimonial carousel with avatars, names, and roles',
    'Animated social proof cards that fade between customer quotes'
  ],
  userPhrases: [
    'testimonial animation',
    'quote carousel',
    'customer feedback slider',
    'avatar testimonial ui',
    'social proof animation'
  ],
  categories: ['ui-demo', 'marketing', 'animation'],
  styles: ['clean', 'professional', 'trust-building'],
  useCases: ['website testimonial section', 'case study intro', 'marketing deck'],
  animations: ['fade', 'slide', 'stagger'],
  elements: ['quote text', 'avatar', 'name', 'role'],
  colors: ['neutral', 'accent highlight'],
  complexity: 'medium',
  primaryUse: 'Animated testimonial carousel with avatars and customer quotes',
  similarTo: ['CarouselText', 'PromptIntro']
}
```

### Example (UI Data Visualisation)
```ts
{
  id: 'ui-data-visualisation',
  source: { type: 'db', dbId: '20880f1b-f72f-442b-a416-c368e9b640ff' },
  name: 'UI Data Visualisation',
  duration: 40,
  supportedFormats: ['landscape'],
  keywords: ['data visualisation', 'ui dashboard', 'metrics card', 'analytics'],
  descriptions: [
    'Compact analytics card animation with revenue metrics, charts, and profile',
    'Dashboard element showing animated revenue, conversion, and avatar tiles'
  ],
  userPhrases: [
    'analytics card animation',
    'data visualization ui',
    'stats card intro',
    'revenue dashboard animation',
    'compact data viz'
  ],
  categories: ['data-viz', 'ui-demo', 'animation'],
  styles: ['modern', 'clean', 'product'],
  useCases: ['dashboard intro', 'analytics highlight', 'product tour'],
  animations: ['slide up', 'scale', 'counter'],
  elements: ['profile', 'metrics card', 'mini chart'],
  colors: ['neutral', 'brand accent'],
  complexity: 'simple',
  primaryUse: 'Analytics card animation highlighting key metrics in a dashboard UI',
  similarTo: ['GrowthGraph', 'pill-shaped-bar-chart']
}
```

### Example (50+ Integrations)
```ts
{
  id: 'fifty-plus-integrations',
  source: { type: 'db', dbId: '2ebb8f74-3a48-4bf1-afd6-9e3a1ed6d35f' },
  name: '50+ Integrations',
  duration: 120,
  supportedFormats: ['landscape'],
  keywords: ['integrations', 'icons', 'partners', 'tooling', 'grid'],
  descriptions: [
    'Integration hero featuring rotating grid of tool icons around a central card',
    'Animated integration showcase with dozens of brand icons orbiting the headline'
  ],
  userPhrases: [
    'integrations animation',
    'show partner logos',
    'integration grid hero',
    'tool ecosystem animation',
    'logo orbit scene'
  ],
  categories: ['ui-demo', 'marketing', 'animation'],
  styles: ['vibrant', 'tech', 'trust-building'],
  useCases: ['integrations page hero', 'platform ecosystem slide', 'SaaS overview'],
  animations: ['icon orbit', 'scale', 'fade'],
  elements: ['integration icons', 'headline', 'subtext'],
  colors: ['multicolor', 'gradient'],
  complexity: 'medium',
  primaryUse: 'Integration showcase with animated ecosystem of partner icons',
  similarTo: ['PulsingCircles', 'gradient-globe']
}
```

### Example (Bar Chart – card)
```ts
{
  id: 'bar-chart-db',
  source: { type: 'db', dbId: '9ccb415b-0396-4a57-b649-169a90b5d83f' },
  name: 'Bar Chart',
  duration: 120,
  supportedFormats: ['landscape'],
  keywords: ['bar chart', 'analytics card', 'growth', 'metrics', 'dashboard'],
  descriptions: [
    'Analytics card with animated bar heights, key metric, and mini chart annotations',
    'Dashboard bar chart tile that animates value growth inside a card layout'
  ],
  userPhrases: [
    'bar chart card',
    'dashboard bar animation',
    'metric card animation',
    'growth analytics tile',
    'bar chart visualization'
  ],
  categories: ['data-viz', 'ui-demo', 'animation'],
  styles: ['modern', 'clean', 'professional'],
  useCases: ['product analytics section', 'KPI dashboard', 'investor report'],
  animations: ['bar grow', 'number counter', 'fade in'],
  elements: ['bars', 'labels', 'primary metric', 'icon'],
  colors: ['brand accent', 'neutral'],
  complexity: 'medium',
  primaryUse: 'Analytics card with animated bar chart and KPI number',
  similarTo: ['pill-shaped-bar-chart', 'GrowthGraph']
}
```

### Example (Line Chart)
```ts
{
  id: 'line-chart-db',
  source: { type: 'db', dbId: 'c2bac307-3ae3-44f5-ba5f-6109ac8abe24' },
  name: 'Line Chart',
  duration: 120,
  supportedFormats: ['landscape'],
  keywords: ['line chart', 'analytics card', 'growth trend', 'metrics'],
  descriptions: [
    'Dashboard analytics card with animated line growth and percentage counters',
    'KPI tile showing a glowing line chart, gradient background, and numeric animations'
  ],
  userPhrases: [
    'line chart animation',
    'dashboard growth card',
    'analytics line graph',
    'trend line visualization',
    'kpi line chart'
  ],
  categories: ['data-viz', 'ui-demo', 'animation'],
  styles: ['modern', 'clean', 'professional'],
  useCases: ['analytics dashboard', 'investor update', 'product KPI section'],
  animations: ['line draw', 'number counter', 'card entrance'],
  elements: ['line graph', 'percentage badge', 'supporting stats'],
  colors: ['brand gradient', 'neon accent'],
  complexity: 'medium',
  primaryUse: 'Analytics card showcasing animated line growth and KPIs',
  similarTo: ['Bar Chart', 'pill-shaped-bar-chart']
}
```

### Example (Make something Lovable)
```ts
{
  id: 'make-something-lovable',
  source: { type: 'db', dbId: '5003e635-fc3e-4e60-b259-2c85354804fa' },
  name: 'Make something Lovable',
  duration: 210,
  supportedFormats: ['landscape', 'portrait', 'square'],
  keywords: ['search bar', 'typewriter', 'prompt', 'ai assistant', 'lovable'],
  descriptions: [
    'Adaptive search bar hero with typewriter prompt cycling through ideas',
    'AI assistant intro where the prompt field animates responsive copy across formats'
  ],
  userPhrases: [
    'typewriter hero animation',
    'ai search prompt',
    'multi-format intro',
    'lovable app hero',
    'prompt cycling animation'
  ],
  categories: ['ui-demo', 'intro', 'animation'],
  styles: ['friendly', 'playful', 'responsive'],
  useCases: ['website hero', 'AI product intro', 'launch teaser'],
  animations: ['typewriter', 'glow', 'responsive scaling'],
  elements: ['search bar', 'prompt text', 'icons'],
  colors: ['pastel gradient', 'blue'],
  complexity: 'medium',
  primaryUse: 'Responsive AI search prompt hero with typewriter cycling text',
  similarTo: ['PromptIntro', 'Text Sparkles']
}
```

### Example (Pricing Card – Portrait/Square)
```ts
{
  id: 'pricing-card-portrait',
  source: { type: 'db', dbId: 'ee38aedd-0343-4727-8941-a40ca63b6819' },
  name: 'Pricing Card (Portrait)',
  duration: 120,
  supportedFormats: ['portrait', 'square'],
  keywords: ['pricing card', 'plan selection', 'gradient', 'cta'],
  descriptions: [
    'Vertical pricing plan card with shimmering gradient background and plan highlights',
    'Portrait subscription card showcasing price, features, and CTA with smooth entrance'
  ],
  userPhrases: [
    'pricing card animation',
    'subscription plan portrait',
    'vertical pricing intro',
    'plan comparison card',
    'pricing hero portrait'
  ],
  categories: ['ui-demo', 'marketing', 'animation'],
  styles: ['premium', 'vibrant', 'gradient'],
  useCases: ['pricing page hero', 'plan highlight', 'mobile subscription intro'],
  animations: ['card entrance', 'gradient shift', 'feature fade'],
  elements: ['price tag', 'feature list', 'CTA button'],
  colors: ['purple-blue gradient', 'white text'],
  complexity: 'medium',
  primaryUse: 'Portrait pricing card with animated gradient and feature list',
  similarTo: ['Pricing Card (landscape)', 'Corporate Credit Card']
}
```

### Example (Pricing Card – Landscape)
```ts
{
  id: 'pricing-card-landscape',
  source: { type: 'db', dbId: '77f40aac-001b-49b7-8104-209a2300d184' },
  name: 'Pricing Card (Landscape)',
  duration: 120,
  supportedFormats: ['landscape'],
  keywords: ['pricing card', 'cta', 'subscription', 'gradient'],
  descriptions: [
    'Landscape pricing section with gradient background and animated plan details',
    'Wide pricing card highlighting plan value, features, and call-to-action'
  ],
  userPhrases: [
    'pricing section animation',
    'landscape pricing card',
    'plan highlight hero',
    'pricing table intro',
    'subscription CTA card'
  ],
  categories: ['ui-demo', 'marketing', 'animation'],
  styles: ['premium', 'polished', 'gradient'],
  useCases: ['website pricing page', 'presentation slide', 'feature launch'],
  animations: ['card entrance', 'gradient drift', 'text fade'],
  elements: ['plan badge', 'pricing info', 'CTA button'],
  colors: ['purple-blue gradient', 'white text'],
  complexity: 'medium',
  primaryUse: 'Landscape pricing hero card with animated gradient and CTA',
  similarTo: ['pricing-card-portrait', 'Corporate Credit Card']
}
```

### Example (Profile / Message screens)
```ts
{
  id: 'profile-message-screens',
  source: { type: 'db', dbId: '0256d007-70e7-4104-9c16-0dd8bd70a6b1' },
  name: 'Profile / Message screens',
  duration: 210,
  supportedFormats: ['landscape'],
  keywords: ['profile', 'messaging', 'mobile ui', 'dual phone', 'chat'],
  descriptions: [
    'Dual phone mockup animation showing profile and messaging screens with ambient gradients',
    'Side-by-side mobile UI demo with drifting gradient blobs and animated phone frames'
  ],
  userPhrases: [
    'profile screen animation',
    'messaging app demo',
    'dual phone presentation',
    'chat app showcase',
    'mobile ui hero'
  ],
  categories: ['ui-demo', 'mobile', 'animation'],
  styles: ['ambient', 'soft', 'product'],
  useCases: ['mobile app landing page', 'product tour', 'portfolio showcase'],
  animations: ['phone entrance', 'gradient drift', 'content fade'],
  elements: ['phone frame', 'profile card', 'messages'],
  colors: ['soft gradients', 'violet', 'cyan'],
  complexity: 'complex',
  primaryUse: 'Dual mobile screen showcase for profile and messaging UI',
  similarTo: ['Home screen notifications', 'MobileApp']
}
```

### Example (Toggle)
```ts
{
  id: 'toggle-db',
  source: { type: 'db', dbId: 'a54cb1aa-8663-4825-a08e-ebc14558fa8c' },
  name: 'Toggle',
  duration: 90,
  supportedFormats: ['landscape', 'portrait', 'square'],
  keywords: ['toggle', 'switch', 'ui control', 'on/off', 'state'],
  descriptions: [
    'Animated toggle switch transitioning smoothly between inactive and active states',
    'UI control demo showing a pill toggle with spring physics and accent color highlights'
  ],
  userPhrases: [
    'toggle animation',
    'switch ui demo',
    'on off toggle',
    'animated pill toggle',
    'state change control'
  ],
  categories: ['ui-demo', 'component', 'animation'],
  styles: ['minimal', 'product', 'modern'],
  useCases: ['design system snippet', 'settings screen animation', 'component library'],
  animations: ['switch slide', 'color transition', 'spring'],
  elements: ['toggle track', 'thumb', 'status label'],
  colors: ['neutral background', 'orange accent'],
  complexity: 'simple',
  primaryUse: 'Toggle control demonstrating smooth state transition for design systems',
  similarTo: ['PromptIntro', 'Log-in']
}
```

### Example (Banking App)
```ts
{
  id: 'banking-app-db',
  source: { type: 'db', dbId: '1bc2d1b0-f8dc-415d-bd39-528f44fb5ce2' },
  name: 'Banking App',
  duration: 180,
  supportedFormats: ['portrait', 'square'],
  keywords: ['banking', 'finance', 'mobile app', 'transactions', 'analytics'],
  descriptions: [
    'Portrait fintech dashboard highlighting balances, card activity, and recent transactions',
    'Mobile banking UI with animated money card, category spend, and transaction list'
  ],
  userPhrases: [
    'banking app animation',
    'finance dashboard mobile',
    'spending summary ui',
    'transactions card animation',
    'mobile finance demo'
  ],
  categories: ['ui-demo', 'fintech', 'animation'],
  styles: ['modern', 'professional', 'mobile-first'],
  useCases: ['fintech marketing', 'product walkthrough', 'investor deck'],
  animations: ['card scale', 'counter', 'list fade'],
  elements: ['balance card', 'spending summary', 'transactions'],
  colors: ['brand gradient', 'white', 'accent teal'],
  complexity: 'complex',
  primaryUse: 'Portrait fintech demo showcasing account overview and analytics cards',
  similarTo: ['revolut-app', 'Corporate Credit Card']
}
```

### Example (Blur)
```ts
{
  id: 'blur-db',
  source: { type: 'db', dbId: '4fefddd4-f509-423a-953c-fc066d25d009' },
  name: 'Blur',
  duration: 30,
  supportedFormats: ['landscape', 'portrait', 'square'],
  keywords: ['blur text', 'focus', 'reveal', 'transition', 'intro'],
  descriptions: [
    'Text intro that defocuses from heavy blur to sharp clarity',
    'Simple blur-to-focus animation for revealing a headline or product name'
  ],
  userPhrases: [
    'blur to focus text',
    'defocus intro animation',
    'text reveal blur',
    'focus transition',
    'blurred headline animation'
  ],
  categories: ['text-animation', 'effects'],
  styles: ['minimal', 'elegant', 'clean'],
  useCases: ['title reveal', 'scene transition', 'hero intro'],
  animations: ['blur reduction', 'opacity fade'],
  elements: ['headline text'],
  colors: ['black text', 'white background'],
  complexity: 'simple',
  primaryUse: 'Blurred headline that sharpens into focus for dramatic reveals',
  similarTo: ['Text Shimmer', 'Word Replace']
}
```

### Example (Gradient globe – Portrait)
```ts
{
  id: 'gradient-globe-portrait',
  source: { type: 'db', dbId: '3a164c8d-cad8-481c-ad1f-f8aac11c8c5c' },
  name: 'Gradient globe (Portrait)',
  duration: 180,
  supportedFormats: ['portrait'],
  keywords: ['gradient globe', 'ambient', 'portrait background', 'orbit'],
  descriptions: [
    'Portrait ambient gradient globe with slow rotational motion and glowing rings',
    'Vertical background featuring a shifting gradient sphere for tech or AI intros'
  ],
  userPhrases: [
    'portrait gradient globe',
    'vertical ambient background',
    'glowing sphere animation',
    'portrait orbiting rings',
    'ambient portrait intro'
  ],
  categories: ['background', 'effects', 'animation'],
  styles: ['futuristic', 'calm', 'tech'],
  useCases: ['portrait hero', 'mobile intro background', 'vertical video loop'],
  animations: ['rotation', 'gradient drift', 'glow'],
  elements: ['sphere', 'halo', 'gradient bands'],
  colors: ['blue-purple gradient'],
  complexity: 'medium',
  primaryUse: 'Portrait gradient globe background with ambient rotation',
  similarTo: ['gradient-globe', 'Hello Circles']
}
```

### Example (I want to break free)
```ts
{
  id: 'i-want-to-break-free',
  source: { type: 'db', dbId: 'c9952351-3c87-4942-9edb-fee7effc5a5b' },
  name: 'I want to break free',
  duration: 90,
  supportedFormats: ['landscape'],
  keywords: ['rainbow text', 'gradient stroke', 'lyric', 'type highlight'],
  descriptions: [
    'Bold lyric-inspired headline with looping rainbow gradient strokes across characters',
    'Animated text effect where hue shifts travel over large display typography'
  ],
  userPhrases: [
    'rainbow lyric animation',
    'gradient text stroke',
    'bold headline color cycle',
    'music lyric intro',
    'colorful text reveal'
  ],
  categories: ['text-animation', 'effects'],
  styles: ['bold', 'vibrant', 'musical'],
  useCases: ['lyric video intro', 'event title card', 'music promo'],
  animations: ['gradient sweep', 'hue cycle'],
  elements: ['headline text'],
  colors: ['rainbow spectrum'],
  complexity: 'simple',
  primaryUse: 'Lyric-inspired headline with continuous rainbow gradient strokes',
  similarTo: ['rainbow-stroke-text-effect', 'Text Sparkles']
}
```

### Example (Log in – Portrait)
```ts
{
  id: 'log-in-portrait',
  source: { type: 'db', dbId: '96f88e7e-cc41-457c-82dc-c152cf0f90bd' },
  name: 'Log in (Portrait)',
  duration: 95,
  supportedFormats: ['portrait'],
  keywords: ['login', 'modal', 'auth', 'email password', 'glassmorphism'],
  descriptions: [
    'Glassmorphism login modal with animated gradient background, typed inputs, and avatar stack',
    'Portrait authentication hero highlighting email/password typing plus social sign-in buttons'
  ],
  userPhrases: [
    'auth modal animation',
    'portrait login screen',
    'glassmorphism sign in',
    'animated login form',
    'social login hero'
  ],
  categories: ['ui-demo', 'authentication', 'animation'],
  styles: ['glassmorphism', 'premium', 'gradient'],
  useCases: ['auth onboarding', 'SaaS login demo', 'marketing hero'],
  animations: ['modal scale', 'gradient drift', 'typed text', 'avatar pop'],
  elements: ['login modal', 'email input', 'password input', 'CTA buttons', 'avatars'],
  colors: ['blue gradient', 'dark overlay'],
  complexity: 'complex',
  primaryUse: 'Portrait login hero showcasing typed credentials and social sign-in',
  similarTo: ['log-in-db', 'PromptIntro']
}
```

### Example (Message notification)
```ts
{
  id: 'message-notification-db',
  source: { type: 'db', dbId: 'ed3ff0bf-6e54-4d98-b2c4-b923797071bc' },
  name: 'Message notification',
  duration: 90,
  supportedFormats: ['landscape'],
  keywords: ['message', 'notification', 'toast', 'product', 'messaging'],
  descriptions: [
    'Floating message notification card with icon, sender info, and animated preview text',
    'Product toast animation that slides in a rich notification with avatars and timestamp'
  ],
  userPhrases: [
    'message notification animation',
    'product toast demo',
    'chat notification ui',
    'in-app message card',
    'notification toast animation'
  ],
  categories: ['ui-demo', 'product', 'animation'],
  styles: ['clean', 'professional', 'trust-building'],
  useCases: ['messaging platform hero', 'notification showcase', 'product tour'],
  animations: ['slide', 'fade', 'icon pulse'],
  elements: ['icon', 'headline', 'sender info', 'timestamp', 'preview text'],
  colors: ['light card', 'brand accent'],
  complexity: 'medium',
  primaryUse: 'Notification toast animation for chat or messaging products',
  similarTo: ['home-screen-notifications', 'profile-message-screens']
}
```

### Example (Scale down text effect)
```ts
{
  id: 'scale-down-text-effect',
  source: { type: 'db', dbId: 'd907e3e5-1c99-4f70-8454-9573156cea08' },
  name: 'Scale down text effect',
  duration: 140,
  supportedFormats: ['landscape'],
  keywords: ['text effect', 'gradient text', 'scale down', 'title', 'hero'],
  descriptions: [
    'Bold gradient headline that zooms in then scales down into a compact lockup',
    'Hero text effect where oversized typography glows and settles into the corner'
  ],
  userPhrases: [
    'scale down text animation',
    'gradient headline effect',
    'text zoom hero',
    'bold typography intro',
    'glowing title animation'
  ],
  categories: ['text-animation', 'effects'],
  styles: ['bold', 'energetic', 'modern'],
  useCases: ['marketing hero', 'title reveal', 'brand intro'],
  animations: ['scale', 'position shift', 'gradient sweep'],
  elements: ['headline text', 'gradient overlay'],
  colors: ['neon gradient', 'dark background'],
  complexity: 'medium',
  primaryUse: 'Glowing gradient headline that scales down into a corner title lockup',
  similarTo: ['i-want-to-break-free', 'rainbow-stroke-text-effect']
}
```

### Example (Screenshot intro)
```ts
{
  id: 'screenshot-intro',
  source: { type: 'db', dbId: '009b717a-dd89-4757-8321-bf06b391c7ad' },
  name: 'Screenshot intro',
  duration: 120,
  supportedFormats: ['landscape'],
  keywords: ['screenshot', 'typewriter', 'product demo', 'hero'],
  descriptions: [
    'Hero headline with typewriter words and animated screenshot card rising into view',
    'Product intro that cycles through benefits while a screenshot panel scales into place'
  ],
  userPhrases: [
    'screenshot hero animation',
    'typewriter headline demo',
    'product screenshot intro',
    'app screenshot highlight',
    'hero with screenshot card'
  ],
  categories: ['ui-demo', 'marketing', 'animation'],
  styles: ['friendly', 'product', 'energetic'],
  useCases: ['marketing hero', 'product landing page', 'feature teaser'],
  animations: ['typewriter', 'card rise', 'mouse pointer'],
  elements: ['headline', 'accent words', 'screenshot card', 'cursor'],
  colors: ['brand blue', 'white'],
  complexity: 'complex',
  primaryUse: 'Product hero with typewriter messaging and animated screenshot card',
  similarTo: ['make-something-lovable', 'text-ui-animation']
}
```

### Example (Text & UI Animation)
```ts
{
  id: 'text-ui-animation-db',
  source: { type: 'db', dbId: '7acf1a10-e0c1-485c-bf15-d8a32ab9bf82' },
  name: 'Text & UI Animation',
  duration: 220,
  supportedFormats: ['landscape'],
  keywords: ['text animation', 'ui transformation', 'typing', 'cursor', 'demo'],
  descriptions: [
    'Hybrid hero that blends kinetic copy, rotating backgrounds, and a sliding UI mockup',
    'Animated narrative moving from bold headlines to UI screenshot with mouse interaction'
  ],
  userPhrases: [
    'text and ui animation',
    'kinetic hero with ui',
    'ui transformation animation',
    'animated product narrative',
    'mouse interaction demo'
  ],
  categories: ['ui-demo', 'text-animation', 'animation'],
  styles: ['energetic', 'tech', 'high impact'],
  useCases: ['product video hero', 'launch presentation', 'demo narrative'],
  animations: ['text typing', 'background zoom', 'ui slide', 'cursor click'],
  elements: ['headline text', 'ui mockup', 'cursor'],
  colors: ['deep blue gradient', 'white accents'],
  complexity: 'complex',
  primaryUse: 'Story-driven hero combining animated copy and transforming UI mockups',
  similarTo: ['make-something-lovable', 'screenshot-intro']
}
```

### Example (Text Shimmer – Portrait)
```ts
{
  id: 'text-shimmer-portrait',
  source: { type: 'db', dbId: 'd7b894d9-0043-4e72-a62a-69434776ffe4' },
  name: 'Text Shimmer (Portrait)',
  duration: 90,
  supportedFormats: ['portrait'],
  keywords: ['text shimmer', 'loading text', 'status', 'portrait'],
  descriptions: [
    'Portrait loading indicator with shimmering “Generating...” headline',
    'Minimal status card where a shimmer sweep animates across uppercase text'
  ],
  userPhrases: [
    'text shimmer animation',
    'generating loading portrait',
    'shimmer headline status',
    'ai generating indicator',
    'portrait shimmer text'
  ],
  categories: ['status', 'text-animation', 'effects'],
  styles: ['minimal', 'tech', 'clean'],
  useCases: ['loading screen', 'status indicator', 'ai workflow'],
  animations: ['shimmer sweep', 'opacity fade'],
  elements: ['headline text'],
  colors: ['neutral background', 'light shimmer'],
  complexity: 'simple',
  primaryUse: 'Portrait shimmer loading indicator for AI or async tasks',
  similarTo: ['generating-loader', 'blur-db']
}
```

### Example (Word Replace)
```ts
{
  id: 'word-replace-db',
  source: { type: 'db', dbId: '157c4c8a-9961-4a04-90a6-a3107bb5787d' },
  name: 'Word Replace',
  duration: 270,
  supportedFormats: ['landscape'],
  keywords: ['typewriter', 'word replace', 'headline', 'copywriting', 'hero'],
  descriptions: [
    'Long-form typewriter headline that cycles through verbs for “We were born to …”',
    'Hero text effect with looping typewriter animation and blinking cursor emphasis'
  ],
  userPhrases: [
    'typewriter headline loop',
    'word replace animation',
    'hero copy typewriter',
    'text that cycles through verbs',
    'we were born to copy'
  ],
  categories: ['text-animation', 'intro'],
  styles: ['bold', 'storytelling', 'minimal'],
  useCases: ['website hero', 'pitch deck intro', 'mission statement'],
  animations: ['typewriter', 'cursor blink', 'loop'],
  elements: ['headline text', 'cursor'],
  colors: ['monochrome'],
  complexity: 'simple',
  primaryUse: 'Storytelling hero copy that swaps verbs via typewriter animation',
  similarTo: ['text-animation-db', 'FastText']
}
```

### Example (Yellow Bar Chart)
```ts
{
  id: 'yellow-bar-chart-db',
  source: { type: 'db', dbId: '7720e8bb-47e1-423f-b085-99ed3ccc2543' },
  name: 'Yellow Bar Chart',
  duration: 65,
  supportedFormats: ['portrait', 'square'],
  keywords: ['bar chart', 'analytics', 'yellow', 'metrics', 'card'],
  descriptions: [
    'Portrait analytics card with rounded yellow bars that spring into place',
    'Mobile KPI tile featuring animated bar growth, percentage counter, and category labels'
  ],
  userPhrases: [
    'yellow bar chart animation',
    'portrait metrics card',
    'rounded bar analytics',
    'mobile kpi visualization',
    'growth card animation'
  ],
  categories: ['data-viz', 'ui-demo', 'animation'],
  styles: ['bright', 'playful', 'product'],
  useCases: ['mobile analytics hero', 'dashboard snippet', 'feature highlight'],
  animations: ['spring scale', 'counter'],
  elements: ['bars', 'percent badge', 'comparison labels'],
  colors: ['yellow', 'neutral background'],
  complexity: 'medium',
  primaryUse: 'Portrait analytics card with animated yellow bars and metrics',
  similarTo: ['bar-chart-db', 'pill-shaped-bar-chart']
}
```

### Example (Animated UI – Portrait)
```ts
{
  id: 'animated-ui-portrait',
  source: { type: 'db', dbId: 'c999b0df-b6e4-4bb4-8387-7a88475fcb2f' },
  name: 'Animated UI',
  duration: 60,
  supportedFormats: ['portrait'],
  keywords: ['ui animation', 'dashboard card', 'metrics', 'mobile'],
  descriptions: [
    'Portrait UI card assembly showing profile, revenue stats, and mini charts animating together',
    'Mobile analytics panel with profile avatar scaling and cards sliding into position'
  ],
  userPhrases: [
    'animated ui card',
    'portrait dashboard animation',
    'mobile analytics ui',
    'profile card animation',
    'ui compositing hero'
  ],
  categories: ['ui-demo', 'animation'],
  styles: ['modern', 'product', 'compressed'],
  useCases: ['mobile hero', 'product showcase', 'feature highlight'],
  animations: ['scale', 'slide', 'counter'],
  elements: ['profile avatar', 'revenue card', 'mini chart'],
  colors: ['neutral card', 'brand accent'],
  complexity: 'medium',
  primaryUse: 'Portrait UI hero assembling analytics cards and profile badges',
  similarTo: ['ui-data-visualisation', 'banking-app-db']
}
```

### Example (Credit Card Expenses)
```ts
{
  id: 'credit-card-expenses',
  source: { type: 'db', dbId: '24b90c46-49a5-4bc6-a045-3ecb94ff2e47' },
  name: 'Credit Card Expenses',
  duration: 189,
  supportedFormats: ['portrait'],
  keywords: ['credit card', 'expenses', 'feature list', 'fintech', 'vertical'],
  descriptions: [
    'Portrait feature card highlighting eight expense categories with animated icons',
    'Fintech explainer card that slides through credit card benefits and spend insights'
  ],
  userPhrases: [
    'credit card feature list',
    'expenses animation',
    'portrait fintech feature card',
    'benefits slide animation',
    'credit card explainer'
  ],
  categories: ['ui-demo', 'fintech', 'animation'],
  styles: ['premium', 'clean', 'vertical'],
  useCases: ['fintech feature stack', 'product onboarding', 'marketing reels'],
  animations: ['card entrance', 'icon pop', 'list stagger'],
  elements: ['credit card art', 'feature list', 'category icons'],
  colors: ['purple gradient', 'white card'],
  complexity: 'complex',
  primaryUse: 'Portrait feature card rolling through credit card expense categories',
  similarTo: ['corporate-credit-card', 'banking-app-db']
}
```

### Example (Customer Testimonials – Portrait)
```ts
{
  id: 'customer-testimonials-portrait',
  source: { type: 'db', dbId: 'a0ac9af6-cfde-4111-a185-d4a911d3ff65' },
  name: 'Customer Testimonials (Portrait)',
  duration: 178,
  supportedFormats: ['portrait', 'square'],
  keywords: ['testimonials', 'carousel', 'avatars', 'social proof', 'portrait'],
  descriptions: [
    'Vertical testimonial carousel cycling through quotes, names, roles, and avatars',
    'Portrait social proof card with animated transitions between customer success stories'
  ],
  userPhrases: [
    'portrait testimonials animation',
    'vertical quote carousel',
    'customer success portrait',
    'mobile testimonial slider',
    'social proof card portrait'
  ],
  categories: ['ui-demo', 'marketing', 'animation'],
  styles: ['clean', 'trust-building', 'portrait-first'],
  useCases: ['mobile marketing hero', 'social proof slide', 'case study reel'],
  animations: ['fade', 'slide', 'avatar pop'],
  elements: ['quote text', 'avatar', 'name', 'role'],
  colors: ['neutral card', 'accent gradient'],
  complexity: 'medium',
  primaryUse: 'Portrait testimonial carousel highlighting customer quotes and avatars',
  similarTo: ['testimonials-db', 'text-ui-animation-db']
}
```

### Example (Google AI Search Box – Portrait)
```ts
{
  id: 'google-ai-search-box-portrait',
  source: { type: 'db', dbId: '3d6036f4-2f1f-4e43-99ef-371d6f456c3e' },
  name: 'Google AI Search Box (Portrait)',
  duration: 180,
  supportedFormats: ['portrait', 'square'],
  keywords: ['google', 'search box', 'ai', 'results', 'portrait'],
  descriptions: [
    'Google-style AI search box hero adapted for portrait with responsive cards and query suggestions',
    'Vertical search interface showing typed query, animated suggestions, and answer cards'
  ],
  userPhrases: [
    'portrait google search animation',
    'ai search box portrait',
    'vertical search ui demo',
    'google ai answer cards',
    'search prompt animation'
  ],
  categories: ['ui-demo', 'ai-ui', 'animation'],
  styles: ['modern', 'tech', 'clean'],
  useCases: ['mobile hero', 'AI assistant intro', 'presentation demo'],
  animations: ['search bar scale', 'card entrance', 'icon fade'],
  elements: ['search bar', 'logo', 'answer cards', 'chip buttons'],
  colors: ['light ui', 'google palette'],
  complexity: 'complex',
  primaryUse: 'Portrait Google-style AI search interface with animated query results',
  similarTo: ['google-ai-search', 'text-ui-animation-db']
}
```

### Example (Growth Graph – Portrait)
```ts
{
  id: 'growth-graph-portrait',
  source: { type: 'db', dbId: '22816869-0648-4306-99aa-af79b9c7ba4d' },
  name: 'Growth Graph (Portrait)',
  duration: 180,
  supportedFormats: ['portrait', 'square'],
  keywords: ['growth graph', 'analytics', 'line chart', 'metrics', 'portrait'],
  descriptions: [
    'Vertical analytics card showcasing animated line growth, percentage badge, and supporting metrics',
    'Portrait KPI tile with responsive line chart, trend indicators, and metric cards'
  ],
  userPhrases: [
    'growth graph portrait',
    'mobile analytics line chart',
    'kpi trend animation',
    'portrait analytics card',
    'line chart mobile'
  ],
  categories: ['data-viz', 'ui-demo', 'animation'],
  styles: ['modern', 'professional', 'mobile-first'],
  useCases: ['mobile dashboard', 'vertical marketing hero', 'analytics highlight'],
  animations: ['line draw', 'number counter', 'card entrance'],
  elements: ['line chart', 'metric cards', 'emphasis badge'],
  colors: ['brand gradient', 'white'],
  complexity: 'medium',
  primaryUse: 'Portrait growth analytics card with animated line chart and KPI counters',
  similarTo: ['line-chart-db', 'yellow-bar-chart-db']
}
```

### Example (Homescreen notifications – Portrait)
```ts
{
  id: 'homescreen-notifications-portrait',
  source: { type: 'db', dbId: 'ea9d3b6f-f681-4224-92c1-ace15afb989f' },
  name: 'Homescreen notifications (Portrait)',
  duration: 120,
  supportedFormats: ['portrait', 'square'],
  keywords: ['notification', 'homescreen', 'mobile lock screen', 'toast', 'portrait'],
  descriptions: [
    'Portrait stack of app notifications with icon pulses, content fade-ins, and layered cards',
    'Mobile lock-screen style notification list animating multiple alerts with detail text'
  ],
  userPhrases: [
    'portrait notification stack',
    'mobile homescreen alerts',
    'lock screen notification animation',
    'multiple push notifications',
    'notification toast portrait'
  ],
  categories: ['ui-demo', 'mobile', 'animation'],
  styles: ['clean', 'product', 'trust-building'],
  useCases: ['mobile product hero', 'notification showcase', 'marketing reels'],
  animations: ['slide', 'fade', 'icon pulse'],
  elements: ['notification cards', 'icons', 'timestamp', 'preview text'],
  colors: ['white cards', 'accent icon colors'],
  complexity: 'medium',
  primaryUse: 'Portrait notification stack demonstrating multiple app alerts',
  similarTo: ['message-notification-db', 'home-screen-notifications']
}
```

### Example (Message – Portrait)
```ts
{
  id: 'message-portrait',
  source: { type: 'db', dbId: 'b901a314-b5fb-46f7-98c7-9a50b26e5e37' },
  name: 'Message (Portrait)',
  duration: 90,
  supportedFormats: ['portrait'],
  keywords: ['message', 'notification', 'toast', 'portrait', 'chat'],
  descriptions: [
    'Portrait floating message notification card with icon, title, and preview text animation',
    'Vertical toast component that fades in, slides, and highlights unread status'
  ],
  userPhrases: [
    'message toast portrait',
    'mobile notification card',
    'portrait message notification',
    'chat toast animation',
    'unread message card'
  ],
  categories: ['ui-demo', 'mobile', 'animation'],
  styles: ['clean', 'product', 'trust-building'],
  useCases: ['mobile product demo', 'messaging UX showcase', 'notification hero'],
  animations: ['slide', 'fade', 'icon pop'],
  elements: ['notification card', 'app icon', 'headline', 'timestamp'],
  colors: ['white card', 'brand accent'],
  complexity: 'simple',
  primaryUse: 'Portrait message notification card for mobile UX demos',
  similarTo: ['message-notification-db', 'home-screen-notifications']
}
```

### Example (Pill Chart – Portrait)
```ts
{
  id: 'pill-chart-portrait',
  source: { type: 'db', dbId: '2e7cf71c-0d4d-47f1-8255-23d439b24269' },
  name: 'Pill Chart (Portrait)',
  duration: 155,
  supportedFormats: ['portrait', 'square'],
  keywords: ['pill chart', 'analytics', 'histogram', 'portrait', 'metrics'],
  descriptions: [
    'Portrait histogram-like chart with rounded pill bars animating upward, label highlights, and glow effects',
    'Vertical analytics tile showcasing pill-shaped bars for different segments with animated highlights'
  ],
  userPhrases: [
    'pill chart portrait',
    'vertical histogram animation',
    'pillar chart ui',
    'rounded bar pill chart',
    'mobile histogram card'
  ],
  categories: ['data-viz', 'ui-demo', 'animation'],
  styles: ["modern", 'clean', 'mobile-first'],
  useCases: ['mobile analytics hero', 'feature slide', 'dashboard snippet'],
  animations: ['pill grow', 'highlight pulse', 'glow'],
  elements: ['pill bars', 'labels', 'highlight badges'],
  colors: ['brand yellow', 'dark background'],
  complexity: 'medium',
  primaryUse: 'Portrait histogram card with animated pill bars and highlighted values',
  similarTo: ['yellow-bar-chart-db', 'bar-chart-db']
}
```

### Example (Sign in with Apple)
```ts
{
  id: 'sign-in-apple-db',
  source: { type: 'db', dbId: 'e87a6f79-96f8-495a-8f04-e2fa25290e2a' },
  name: 'Sign in with Apple',
  duration: 90,
  supportedFormats: ['landscape'],
  keywords: ['sign in', 'apple', 'login button', 'cta', 'social auth'],
  descriptions: [
    'Black glassmorphism sign-in button with Apple icon, hover pulse, and gradient spotlight',
    'Social login hero that animates call-to-action button, shadow, and supporting text'
  ],
  userPhrases: [
    'apple sign in animation',
    'social login hero',
    'sign in with apple button',
    'glassmorphism login button',
    'auth cta animation'
  ],
  categories: ['ui-demo', 'authentication', 'animation'],
  styles: ['minimal', 'premium', 'glassmorphism'],
  useCases: ['auth hero', 'pricing upsell', 'login introduction'],
  animations: ['fade', 'scale', 'hover pulse'],
  elements: ['social button', 'hover shadow', 'cta label'],
  colors: ['black', 'white'],
  complexity: 'simple',
  primaryUse: 'Apple-branded login call-to-action with hover/pulse animation',
  similarTo: ['sign-in-google-db', 'log-in-portrait']
}
```

### Example (Sign in with GitHub)
```ts
{
  id: 'sign-in-github-db',
  source: { type: 'db', dbId: '17eb7881-2558-4b94-bd13-ae1e4a84dda5' },
  name: 'Sign in with GitHub',
  duration: 180,
  supportedFormats: ['landscape'],
  keywords: ['sign in', 'github', 'developer login', 'knockout text'],
  descriptions: [
    'GitHub-branded login hero with diagonal gradient spotlight, micro-interactions, and CTA',
    'Developer sign-in button featuring GitHub icon pulse, shadow, and supporting copy'
  ],
  userPhrases: [
    'github sign in animation',
    'developer login button',
    'github social login',
    'login hero with github icon',
    'github auth cta'
  ],
  categories: ['ui-demo', 'authentication', 'animation'],
  styles: ['developer', 'bold', 'gradient'],
  useCases: ['developer landing hero', 'auth onboarding', 'growth slide'],
  animations: ['scale', 'shadow pulse', 'icon hover'],
  elements: ['github icon', 'cta copy', 'supporting text'],
  colors: ['black', 'white', 'gradient glow'],
  complexity: 'simple',
  primaryUse: 'GitHub social login hero with animated button and developer messaging',
  similarTo: ['sign-in-google-db', 'make-something-lovable']
}
```

### Example (Sign in with Google)
```ts
{
  id: 'sign-in-google-db',
  source: { type: 'db', dbId: '2dc3771d-c753-440c-a36c-de810b3ed730' },
  name: 'Sign in with Google',
  duration: 90,
  supportedFormats: ['landscape'],
  keywords: ['sign in', 'google', 'social login', 'cta'],
  descriptions: [
    'Google-branded sign-in button with hover state, icon pulse, and shadow animation',
    'Social auth component illustrating Google button interactions and call-to-action copy'
  ],
  userPhrases: [
    'google sign in animation',
    'social login button',
    'google auth cta',
    'login hero google',
    'sign in with google button'
  ],
  categories: ['ui-demo', 'authentication', 'animation'],
  styles: ['clean', 'product', 'trust-building'],
  useCases: ['auth onboarding', 'marketing hero', 'product launch'],
  animations: ['scale', 'shadow', 'icon pulse'],
  elements: ['google icon', 'button label', 'supporting copy'],
  colors: ['white button', 'google multicolor'],
  complexity: 'simple',
  primaryUse: 'Google social login button animation for auth flows',
  similarTo: ['sign-in-apple-db', 'sign-in-github-db']
}
```

### Example (Sparkles – Portrait)
```ts
{
  id: 'sparkles-portrait',
  source: { type: 'db', dbId: '7da38cf9-8422-4b26-956a-ff4dc85f26e4' },
  name: 'Sparkles (Portrait)',
  duration: 120,
  supportedFormats: ['portrait', 'square'],
  keywords: ['sparkles', 'text highlight', 'magic', 'portrait'],
  descriptions: [
    'Portrait sparkle text effect with particle bursts dancing around the headline',
    'Vertical hero card where sparkles pulse around lettering for a celebratory feel'
  ],
  userPhrases: [
    'sparkle text portrait',
    'celebration text animation',
    'magical sparkles portrait',
    'sparkle highlight effect',
    'portrait glitter text'
  ],
  categories: ['text-animation', 'effects'],
  styles: ['magical', 'celebratory', 'elegant'],
  useCases: ['celebration screens', 'holiday message', 'event hero'],
  animations: ['sparkle particles', 'glow', 'fade'],
  elements: ['headline text', 'sparkle icons'],
  colors: ['gold', 'white'],
  complexity: 'medium',
  primaryUse: 'Portrait text hero with animated sparkles and celebratory glow',
  similarTo: ['text-sparkles', 'text-shimmer-portrait']
}
```

### Example (Text box animation – Portrait)
```ts
{
  id: 'text-box-animation-portrait',
  source: { type: 'db', dbId: '272d19ee-4ac2-4b31-9736-62d64f07b1e8' },
  name: 'Text box animation',
  duration: 180,
  supportedFormats: ['portrait'],
  keywords: ['typewriter', 'text box', 'prompt', 'responsive layout', 'portrait'],
  descriptions: [
    'Portrait prompt box animation with responsive height, typewriter text, and cursor',
    'Vertical design system snippet demonstrating adaptive text box typing and layout shifts'
  ],
  userPhrases: [
    'portrait text box typing',
    'prompt animation portrait',
    'responsive text area',
    'typing box hero',
    'chat prompt animation'
  ],
  categories: ['ui-demo', 'text-animation', 'animation'],
  styles: ['minimal', 'product', 'responsive'],
  useCases: ['prompt demo', 'chat product hero', 'design system docs'],
  animations: ['typewriter', 'cursor blink', 'layout expand'],
  elements: ['text area', 'cursor', 'background'],
  colors: ['neutral', 'brand accent'],
  complexity: 'complex',
  primaryUse: 'Responsive text box hero with typewriter prompt and adaptive layout',
  similarTo: ['text-animation-db', 'screenshot-intro']
}
```

### Example (Work Replace – Square)
```ts
{
  id: 'work-replace-square',
  source: { type: 'db', dbId: 'c9975624-898f-45bf-9e7a-3ac9b3d909fa' },
  name: 'Work Replace',
  duration: 270,
  supportedFormats: ['square'],
  keywords: ['typewriter', 'square', 'replace text', 'hero copy'],
  descriptions: [
    'Square typewriter headline that cycles through verbs for “We were born to …”',
    'Centered square card with looping word replace animation and bold typography'
  ],
  userPhrases: [
    'square typewriter animation',
    'word replace square',
    'hero copy square',
    'looping word replace',
    'square text animation'
  ],
  categories: ['text-animation', 'intro'],
  styles: ['bold', 'storytelling', 'square'],
  useCases: ['social clip', 'square hero card', 'mission statement'],
  animations: ['typewriter', 'cursor blink', 'loop'],
  elements: ['headline text', 'cursor'],
  colors: ['monochrome'],
  complexity: 'simple',
  primaryUse: 'Square typewriter hero that cycles verbs in “We were born to…”',
  similarTo: ['word-replace-db', 'text-animation-db']
}
```

We will mirror this detail level for the other four pilot templates.

## Canonical Metadata Structure
- Create `src/templates/metadata/canonical.ts` exporting a typed array of `TemplateMetadataBase` entries where `source` captures `dbId` vs registry component.
- Add `src/templates/metadata/index.ts` that exposes:
  - `getCanonicalMetadata()` – returns full list with discriminated unions.
  - `getBrainMetadata()` – projects to the existing structure used by `TemplateMatchingService` (all fields).
  - `getServerMetadata()` – minimal slice `{ id, name, duration, categories, supportedFormats, styles, primaryUse }` safe for server selector.
  - `getMetadataById(id)` – resolves across DB + registry templates.
- Include runtime guards that error if a template lacks both `duration` and a way to infer it (protects migrations).

## Integration Steps for Pilot
1. **Author metadata** for the five templates using the schema above.
2. **Update matcher** (`TemplateMatchingService`): replace direct import of `templateMetadata` with `getBrainMetadata()` from the unified module.
3. **Update website selector** to import the server view and stop using `TEMPLATE_METADATA`.
4. **Validate**
   - Unit tests ensuring each pilot template returns from `getBrainMetadata()` and exposes `source.dbId`.
   - Add test coverage verifying website selector still finds these templates via the new metadata.
5. **Telemetry** (pilot scope)
   - Log when canonical metadata resolves a DB template vs legacy fallback to confirm lookups work in prod before expanding coverage.

## Rollout / Next Tickets
- After pilot success, create a follow-up ticket to script metadata generation for remaining DB templates (possibly by sampling prompts + manual authoring).
- Consider backfilling `supportedFormats`, `styles`, and `similarTo` using heuristics (e.g., clustering on prompt text) once base metadata exists.
- Plan instrumentation to capture real user phrases for enrichment.

## Definition of Done
- Canonical metadata includes all five DB templates with detailed descriptors.
- Brain and website selectors consume the unified exports without regression.
- Tests guard canonical metadata presence and projections.
- Telemetry verifies pilot templates are routed via the new metadata in staging/prod.
