/**
 * Template Metadata System
 * Maps templates to user language and intent for intelligent matching
 */

export interface TemplateMetadata {
  id: string;
  name: string;
  
  // Matching fields
  keywords: string[];
  descriptions: string[];
  userPhrases: string[];
  categories: string[];
  styles: string[];
  useCases: string[];
  
  // Technical metadata
  animations: string[];
  elements: string[];
  colors: string[];
  duration: number;
  complexity: 'simple' | 'medium' | 'complex';
  
  // Scoring hints
  primaryUse: string;
  similarTo: string[];
}

export const templateMetadata: Record<string, TemplateMetadata> = {
  // Text Animation Templates
  'WordFlip': {
    id: 'WordFlip',
    name: 'WordFlip',
    keywords: ['word', 'flip', 'change', 'cycle', 'rotate', 'switch', 'text', 'typewriter', 'typing', 'animated text', 'dynamic'],
    descriptions: [
      'Text that cycles through different words',
      'Typewriter effect with changing words',
      'Animated text replacement'
    ],
    userPhrases: [
      'make text that changes',
      'cycling through words',
      'show different words one after another',
      'typewriter animation',
      'text that updates',
      'changing text animation',
      'we were born to',
      'rotating words'
    ],
    categories: ['text-animation', 'typography', 'transitions'],
    styles: ['modern', 'clean', 'professional', 'minimal'],
    useCases: ['headlines', 'taglines', 'feature lists', 'benefits', 'hero sections'],
    animations: ['typewriter', 'fade', 'text-replacement'],
    elements: ['text', 'cursor'],
    colors: ['monochrome', 'dark'],
    duration: 270,
    complexity: 'simple',
    primaryUse: 'Animated headlines with changing words',
    similarTo: ['TypingTemplate', 'MorphingText', 'CarouselText', 'FastText']
  },

  'TypingTemplate': {
    id: 'TypingTemplate',
    name: 'TypingTemplate',
    keywords: ['typing', 'typewriter', 'text', 'animation', 'write', 'appear', 'letter'],
    descriptions: [
      'Text appearing letter by letter',
      'Classic typewriter effect',
      'Animated text reveal'
    ],
    userPhrases: [
      'typing animation',
      'text appears letter by letter',
      'typewriter effect',
      'writing text',
      'text reveal',
      'animated typing'
    ],
    categories: ['text-animation', 'typography'],
    styles: ['classic', 'retro', 'professional'],
    useCases: ['intros', 'quotes', 'statements', 'reveals'],
    animations: ['typewriter', 'cursor-blink'],
    elements: ['text', 'cursor'],
    colors: ['monochrome'],
    duration: 180,
    complexity: 'simple',
    primaryUse: 'Classic typewriter text animation',
    similarTo: ['WordFlip', 'FastText', 'MorphingText']
  },

  'MorphingText': {
    id: 'MorphingText',
    name: 'MorphingText',
    keywords: ['morph', 'transform', 'text', 'change', 'animate', 'transition'],
    descriptions: [
      'Text smoothly morphing between words',
      'Fluid text transformation',
      'Smooth word transitions'
    ],
    userPhrases: [
      'morphing text',
      'text transformation',
      'smooth text change',
      'fluid text animation',
      'text morph effect'
    ],
    categories: ['text-animation', 'typography', 'effects'],
    styles: ['modern', 'smooth', 'elegant'],
    useCases: ['transitions', 'brand messages', 'product features'],
    animations: ['morph', 'fade', 'transform'],
    elements: ['text'],
    colors: ['gradient', 'monochrome'],
    duration: 180,
    complexity: 'medium',
    primaryUse: 'Smooth text morphing animation',
    similarTo: ['WordFlip', 'GradientText', 'CarouselText']
  },

  'CarouselText': {
    id: 'CarouselText',
    name: 'CarouselText',
    keywords: ['carousel', 'slide', 'text', 'rotate', 'cycle', 'slider'],
    descriptions: [
      'Text sliding in carousel fashion',
      'Rotating text carousel',
      'Sliding text animation'
    ],
    userPhrases: [
      'text carousel',
      'sliding text',
      'rotating messages',
      'text slider',
      'cycling text'
    ],
    categories: ['text-animation', 'typography', 'slider'],
    styles: ['dynamic', 'modern', 'interactive'],
    useCases: ['testimonials', 'features', 'quotes', 'reviews'],
    animations: ['slide', 'fade', 'carousel'],
    elements: ['text', 'container'],
    colors: ['varied'],
    duration: 240,
    complexity: 'medium',
    primaryUse: 'Text carousel for multiple messages',
    similarTo: ['WordFlip', 'MorphingText', 'FastText']
  },

  'FastText': {
    id: 'FastText',
    name: 'FastText',
    keywords: ['fast', 'quick', 'rapid', 'text', 'speed', 'flash'],
    descriptions: [
      'Rapidly appearing text',
      'Fast text animation',
      'Quick text reveal'
    ],
    userPhrases: [
      'fast text',
      'quick text animation',
      'rapid text',
      'text flash',
      'speedy text'
    ],
    categories: ['text-animation', 'typography', 'effects'],
    styles: ['energetic', 'dynamic', 'urgent'],
    useCases: ['alerts', 'announcements', 'highlights', 'urgency'],
    animations: ['flash', 'pop', 'quick-reveal'],
    elements: ['text'],
    colors: ['bright', 'contrast'],
    duration: 90,
    complexity: 'simple',
    primaryUse: 'Fast-paced text animation',
    similarTo: ['WordFlip', 'GlitchText', 'HighlightSweep']
  },

  'GradientText': {
    id: 'GradientText',
    name: 'GradientText',
    keywords: ['gradient', 'color', 'text', 'rainbow', 'colorful', 'animated color'],
    descriptions: [
      'Text with animated gradient colors',
      'Color-changing text effect',
      'Rainbow text animation'
    ],
    userPhrases: [
      'gradient text',
      'colorful text',
      'rainbow text',
      'color changing text',
      'animated gradient'
    ],
    categories: ['text-animation', 'typography', 'effects'],
    styles: ['vibrant', 'colorful', 'modern', 'playful'],
    useCases: ['branding', 'creative', 'attention-grabbing', 'artistic'],
    animations: ['gradient-shift', 'color-cycle'],
    elements: ['text'],
    colors: ['gradient', 'rainbow', 'multicolor'],
    duration: 180,
    complexity: 'simple',
    primaryUse: 'Animated gradient text effect',
    similarTo: ['DarkBGGradientText', 'GlitchText', 'HighlightSweep']
  },

  'GlitchText': {
    id: 'GlitchText',
    name: 'GlitchText',
    keywords: ['glitch', 'distort', 'error', 'tech', 'cyberpunk', 'digital'],
    descriptions: [
      'Glitchy text effect',
      'Digital distortion animation',
      'Cyberpunk text style'
    ],
    userPhrases: [
      'glitch effect',
      'distorted text',
      'tech glitch',
      'cyberpunk text',
      'digital error'
    ],
    categories: ['text-animation', 'effects', 'tech'],
    styles: ['tech', 'cyberpunk', 'edgy', 'digital'],
    useCases: ['tech products', 'gaming', 'cybersecurity', 'futuristic'],
    animations: ['glitch', 'distort', 'flicker'],
    elements: ['text', 'noise'],
    colors: ['neon', 'contrast', 'rgb'],
    duration: 150,
    complexity: 'medium',
    primaryUse: 'Glitch text effect for tech content',
    similarTo: ['FastText', 'HighlightSweep', 'Code']
  },

  // Background Templates
  'FloatingParticles': {
    id: 'FloatingParticles',
    name: 'FloatingParticles',
    keywords: ['particles', 'floating', 'dots', 'orbs', 'bubbles', 'background', 'animation', 'ambient', 'motion'],
    descriptions: [
      'Floating particle effects in the background',
      'Animated dots moving in circular patterns',
      'Ambient background animation with particles'
    ],
    userPhrases: [
      'add floating elements',
      'particles in the background',
      'animated background',
      'moving dots',
      'bubble animation',
      'ambient motion',
      'ai powered look',
      'tech background',
      'floating orbs'
    ],
    categories: ['background', 'effects', 'motion-graphics'],
    styles: ['modern', 'tech', 'futuristic', 'ai', 'elegant'],
    useCases: ['intro', 'background', 'hero', 'ai-products', 'tech-demos', 'presentations'],
    animations: ['float', 'orbit', 'fade', 'glow'],
    elements: ['particles', 'text', 'orbs'],
    colors: ['gradient', 'purple', 'pink', 'blue'],
    duration: 90,
    complexity: 'medium',
    primaryUse: 'Tech/AI product backgrounds with floating particles',
    similarTo: ['PulsingCircles', 'FloatingElements', 'ParticleExplosion', 'DotRipple']
  },

  'PulsingCircles': {
    id: 'PulsingCircles',
    name: 'PulsingCircles',
    keywords: ['pulse', 'circles', 'rhythm', 'beat', 'waves', 'ripple'],
    descriptions: [
      'Pulsing circular animations',
      'Rhythmic circle effects',
      'Breathing circle patterns'
    ],
    userPhrases: [
      'pulsing circles',
      'breathing animation',
      'rhythmic circles',
      'pulse effect',
      'circle waves'
    ],
    categories: ['background', 'effects', 'motion-graphics'],
    styles: ['rhythmic', 'hypnotic', 'calm', 'modern'],
    useCases: ['meditation', 'music', 'ambient', 'loading', 'transitions'],
    animations: ['pulse', 'scale', 'fade', 'breathe'],
    elements: ['circles', 'rings'],
    colors: ['gradient', 'soft'],
    duration: 180,
    complexity: 'simple',
    primaryUse: 'Rhythmic pulsing circle animation',
    similarTo: ['FloatingParticles', 'DotRipple', 'WaveAnimation']
  },

  'ParticleExplosion': {
    id: 'ParticleExplosion',
    name: 'ParticleExplosion',
    keywords: ['explosion', 'particles', 'burst', 'fireworks', 'scatter', 'explode'],
    descriptions: [
      'Explosive particle animation',
      'Particle burst effect',
      'Fireworks-like animation'
    ],
    userPhrases: [
      'particle explosion',
      'burst effect',
      'fireworks animation',
      'exploding particles',
      'scatter effect'
    ],
    categories: ['effects', 'motion-graphics', 'transitions'],
    styles: ['dramatic', 'energetic', 'celebratory'],
    useCases: ['celebrations', 'reveals', 'transitions', 'achievements'],
    animations: ['explode', 'scatter', 'fade'],
    elements: ['particles'],
    colors: ['bright', 'multicolor'],
    duration: 120,
    complexity: 'medium',
    primaryUse: 'Dramatic particle explosion effect',
    similarTo: ['FloatingParticles', 'DotRipple', 'FloatingElements']
  },

  'WaveAnimation': {
    id: 'WaveAnimation',
    name: 'WaveAnimation',
    keywords: ['wave', 'flow', 'undulate', 'ripple', 'ocean', 'fluid'],
    descriptions: [
      'Flowing wave animation',
      'Undulating wave patterns',
      'Fluid motion effect'
    ],
    userPhrases: [
      'wave animation',
      'flowing waves',
      'ocean effect',
      'fluid motion',
      'wave pattern'
    ],
    categories: ['background', 'effects', 'motion-graphics'],
    styles: ['fluid', 'organic', 'smooth', 'natural'],
    useCases: ['backgrounds', 'transitions', 'water-themes', 'relaxation'],
    animations: ['wave', 'undulate', 'flow'],
    elements: ['waves', 'curves'],
    colors: ['blue', 'gradient', 'aqua'],
    duration: 240,
    complexity: 'medium',
    primaryUse: 'Smooth wave animation effect',
    similarTo: ['DotRipple', 'PulsingCircles', 'FloatingElements']
  },

  'DotRipple': {
    id: 'DotRipple',
    name: 'DotRipple',
    keywords: ['ripple', 'dots', 'waves', 'spread', 'radiate', 'circles'],
    descriptions: [
      'Rippling dot pattern',
      'Radiating wave effect',
      'Spreading circle animation'
    ],
    userPhrases: [
      'ripple effect',
      'spreading dots',
      'wave ripple',
      'radiating circles',
      'dot waves'
    ],
    categories: ['effects', 'background', 'motion-graphics'],
    styles: ['subtle', 'elegant', 'smooth'],
    useCases: ['transitions', 'loading', 'ambient', 'water-effects'],
    animations: ['ripple', 'spread', 'fade'],
    elements: ['dots', 'circles'],
    colors: ['monochrome', 'soft'],
    duration: 180,
    complexity: 'simple',
    primaryUse: 'Ripple effect with dots',
    similarTo: ['PulsingCircles', 'WaveAnimation', 'FloatingParticles']
  },

  // UI/Interface Templates
  'MobileApp': {
    id: 'MobileApp',
    name: 'MobileApp',
    keywords: ['mobile', 'app', 'phone', 'iphone', 'android', 'screen', 'device', 'ui', 'interface', 'mockup'],
    descriptions: [
      'Mobile app interface in a phone frame',
      'iPhone mockup with animated UI',
      'App demonstration in device frame'
    ],
    userPhrases: [
      'show app on phone',
      'mobile app demo',
      'iphone mockup',
      'app interface',
      'phone screen animation',
      'mobile ui showcase',
      'app preview',
      'smartphone display'
    ],
    categories: ['mockup', 'mobile', 'ui-demo', 'product-showcase'],
    styles: ['realistic', 'modern', 'apple-style', 'clean'],
    useCases: ['app-demos', 'product-launches', 'features', 'onboarding', 'app-store'],
    animations: ['slide', 'fade', 'scale', 'screen-transition'],
    elements: ['phone-frame', 'screen', 'ui-elements', 'cards', 'buttons'],
    colors: ['ios-blue', 'white', 'gray'],
    duration: 90,
    complexity: 'complex',
    primaryUse: 'Mobile app demonstrations and showcases',
    similarTo: ['DualScreenApp', 'AppDownload']
  },

  'DualScreenApp': {
    id: 'DualScreenApp',
    name: 'DualScreenApp',
    keywords: ['dual', 'two', 'screens', 'compare', 'side-by-side', 'mobile', 'app'],
    descriptions: [
      'Two mobile screens side by side',
      'Comparison of app screens',
      'Dual device demonstration'
    ],
    userPhrases: [
      'two phones',
      'compare screens',
      'side by side apps',
      'dual screen demo',
      'before and after'
    ],
    categories: ['mockup', 'mobile', 'comparison', 'ui-demo'],
    styles: ['modern', 'comparative', 'clean'],
    useCases: ['comparisons', 'a-b-testing', 'features', 'chat-apps'],
    animations: ['slide', 'sync', 'transition'],
    elements: ['two-phones', 'screens', 'ui'],
    colors: ['varied'],
    duration: 180,
    complexity: 'complex',
    primaryUse: 'Dual screen app comparison',
    similarTo: ['MobileApp']
  },

  'PromptUI': {
    id: 'PromptUI',
    name: 'PromptUI',
    keywords: ['prompt', 'search', 'input', 'command', 'interface', 'ui', 'bar', 'field', 'ai', 'chat'],
    descriptions: [
      'Animated search or command interface',
      'AI prompt input with suggestions',
      'Search bar with quick actions'
    ],
    userPhrases: [
      'search bar',
      'ai interface',
      'command prompt ui',
      'input field animation',
      'chat interface',
      'suggestion box',
      'ai chat ui',
      'search interface'
    ],
    categories: ['ui-component', 'interface', 'ai-ui', 'search'],
    styles: ['modern', 'clean', 'minimal', 'tech'],
    useCases: ['ai-demos', 'search-features', 'command-interfaces', 'chatbots', 'assistants'],
    animations: ['type', 'fade', 'slide', 'pulse'],
    elements: ['input', 'buttons', 'suggestions', 'icons'],
    colors: ['neutral', 'blue', 'white'],
    duration: 180,
    complexity: 'medium',
    primaryUse: 'AI or search interface demonstrations',
    similarTo: ['AIDialogue', 'Placeholders', 'Keyboard']
  },

  'CursorClickScene': {
    id: 'CursorClickScene',
    name: 'CursorClickScene',
    keywords: ['cursor', 'click', 'mouse', 'pointer', 'interaction', 'button'],
    descriptions: [
      'Animated cursor clicking interaction',
      'Mouse pointer demonstration',
      'Interactive click animation'
    ],
    userPhrases: [
      'cursor animation',
      'mouse clicking',
      'show click interaction',
      'pointer animation',
      'button click demo'
    ],
    categories: ['ui-demo', 'interaction', 'tutorial'],
    styles: ['instructional', 'clear', 'demonstrative'],
    useCases: ['tutorials', 'onboarding', 'demos', 'how-to'],
    animations: ['move', 'click', 'ripple'],
    elements: ['cursor', 'button', 'ripple-effect'],
    colors: ['accent', 'neutral'],
    duration: 120,
    complexity: 'simple',
    primaryUse: 'Interactive cursor demonstration',
    similarTo: ['Keyboard', 'PromptUI']
  },

  // Data Visualization Templates
  'TeslaStockGraph': {
    id: 'TeslaStockGraph',
    name: 'TeslaStockGraph',
    keywords: ['stock', 'chart', 'line', 'graph', 'trading', 'finance', 'market', 'price'],
    descriptions: [
      'Animated stock price chart',
      'Line graph with smooth animation',
      'Financial market visualization'
    ],
    userPhrases: [
      'stock chart',
      'price graph',
      'market data',
      'trading chart',
      'line graph animation',
      'financial chart'
    ],
    categories: ['data-viz', 'finance', 'charts'],
    styles: ['professional', 'financial', 'precise'],
    useCases: ['trading', 'finance', 'market-analysis', 'reports'],
    animations: ['draw-line', 'fade', 'grow'],
    elements: ['line', 'grid', 'labels', 'axes'],
    colors: ['green', 'red', 'professional'],
    duration: 240,
    complexity: 'medium',
    primaryUse: 'Stock market data visualization',
    similarTo: ['AudioAnimation']
  },

  // Code/Tech Templates
  'Code': {
    id: 'Code',
    name: 'Code',
    keywords: ['code', 'programming', 'syntax', 'highlight', 'developer', 'terminal'],
    descriptions: [
      'Code syntax highlighting animation',
      'Programming code display',
      'Developer code showcase'
    ],
    userPhrases: [
      'show code',
      'code animation',
      'syntax highlighting',
      'programming demo',
      'developer content'
    ],
    categories: ['tech', 'developer', 'code'],
    styles: ['technical', 'monospace', 'dark-theme'],
    useCases: ['tutorials', 'documentation', 'dev-tools', 'education'],
    animations: ['type', 'highlight', 'fade'],
    elements: ['code-block', 'syntax', 'line-numbers'],
    colors: ['syntax-colors', 'dark-bg'],
    duration: 180,
    complexity: 'medium',
    primaryUse: 'Code display and syntax highlighting',
    similarTo: ['AICoding', 'Coding', 'KnowsCode']
  },

  'AICoding': {
    id: 'AICoding',
    name: 'AICoding',
    keywords: ['ai', 'coding', 'autocomplete', 'copilot', 'assistant', 'smart'],
    descriptions: [
      'AI-powered coding assistant',
      'Smart code completion',
      'AI code generation demo'
    ],
    userPhrases: [
      'ai coding',
      'code assistant',
      'smart autocomplete',
      'ai code generation',
      'copilot demo'
    ],
    categories: ['tech', 'ai', 'developer', 'code'],
    styles: ['futuristic', 'smart', 'modern'],
    useCases: ['ai-tools', 'dev-tools', 'product-demos', 'ide-features'],
    animations: ['type', 'suggest', 'complete'],
    elements: ['code', 'suggestions', 'cursor'],
    colors: ['purple', 'blue', 'dark'],
    duration: 240,
    complexity: 'complex',
    primaryUse: 'AI coding assistant demonstration',
    similarTo: ['Code', 'Coding', 'AIDialogue']
  },

  'Coding': {
    id: 'Coding',
    name: 'Coding',
    keywords: ['coding', 'ide', 'editor', 'development', 'programming'],
    descriptions: [
      'IDE interface animation',
      'Code editor demonstration',
      'Development environment showcase'
    ],
    userPhrases: [
      'ide demo',
      'code editor',
      'development environment',
      'coding interface',
      'programming workspace'
    ],
    categories: ['tech', 'developer', 'ide'],
    styles: ['professional', 'technical', 'productive'],
    useCases: ['ide-demos', 'dev-tools', 'tutorials', 'features'],
    animations: ['type', 'scroll', 'highlight'],
    elements: ['editor', 'sidebar', 'tabs', 'terminal'],
    colors: ['dark-theme', 'syntax-colors'],
    duration: 240,
    complexity: 'complex',
    primaryUse: 'IDE and code editor demonstrations',
    similarTo: ['Code', 'AICoding', 'KnowsCode']
  },

  // AI/Chat Templates
  'AIDialogue': {
    id: 'AIDialogue',
    name: 'AIDialogue',
    keywords: ['ai', 'dialogue', 'chat', 'conversation', 'assistant', 'bot'],
    descriptions: [
      'AI conversation interface',
      'Chat dialogue animation',
      'AI assistant interaction'
    ],
    userPhrases: [
      'ai chat',
      'conversation interface',
      'chatbot demo',
      'ai dialogue',
      'assistant conversation'
    ],
    categories: ['ai-ui', 'chat', 'interface'],
    styles: ['conversational', 'friendly', 'modern'],
    useCases: ['chatbots', 'ai-assistants', 'customer-service', 'demos'],
    animations: ['type', 'bubble', 'fade'],
    elements: ['chat-bubbles', 'avatar', 'input'],
    colors: ['blue', 'gray', 'white'],
    duration: 240,
    complexity: 'medium',
    primaryUse: 'AI chat interface demonstration',
    similarTo: ['PromptUI', 'AICoding', 'Placeholders']
  },

  // Transition Templates
  'FadeIn': {
    id: 'FadeIn',
    name: 'FadeIn',
    keywords: ['fade', 'appear', 'opacity', 'transition', 'reveal'],
    descriptions: [
      'Simple fade in transition',
      'Opacity animation',
      'Smooth appearance effect'
    ],
    userPhrases: [
      'fade in',
      'appear smoothly',
      'opacity transition',
      'gentle reveal',
      'soft appearance'
    ],
    categories: ['transitions', 'effects'],
    styles: ['smooth', 'subtle', 'elegant'],
    useCases: ['intros', 'reveals', 'transitions', 'overlays'],
    animations: ['fade', 'opacity'],
    elements: ['any'],
    colors: ['any'],
    duration: 60,
    complexity: 'simple',
    primaryUse: 'Simple fade in transition effect',
    similarTo: ['SlideIn', 'ScaleIn', 'WipeIn']
  },

  'SlideIn': {
    id: 'SlideIn',
    name: 'SlideIn',
    keywords: ['slide', 'move', 'enter', 'transition', 'swipe'],
    descriptions: [
      'Slide in from direction',
      'Movement transition',
      'Directional entrance'
    ],
    userPhrases: [
      'slide in',
      'move in from side',
      'swipe in',
      'enter from left',
      'slide transition'
    ],
    categories: ['transitions', 'effects'],
    styles: ['dynamic', 'directional', 'smooth'],
    useCases: ['transitions', 'reveals', 'navigation', 'carousel'],
    animations: ['slide', 'move'],
    elements: ['any'],
    colors: ['any'],
    duration: 60,
    complexity: 'simple',
    primaryUse: 'Sliding entrance transition',
    similarTo: ['FadeIn', 'ScaleIn', 'WipeIn']
  },

  'ScaleIn': {
    id: 'ScaleIn',
    name: 'ScaleIn',
    keywords: ['scale', 'zoom', 'grow', 'expand', 'size'],
    descriptions: [
      'Scale up entrance',
      'Zoom in effect',
      'Growing animation'
    ],
    userPhrases: [
      'scale in',
      'zoom in',
      'grow from center',
      'expand animation',
      'pop in'
    ],
    categories: ['transitions', 'effects'],
    styles: ['bouncy', 'dynamic', 'attention-grabbing'],
    useCases: ['emphasis', 'reveals', 'cta', 'highlights'],
    animations: ['scale', 'zoom'],
    elements: ['any'],
    colors: ['any'],
    duration: 60,
    complexity: 'simple',
    primaryUse: 'Scaling entrance effect',
    similarTo: ['FadeIn', 'SlideIn', 'WipeIn']
  },

  // Special Effects Templates
  'AudioAnimation': {
    id: 'AudioAnimation',
    name: 'AudioAnimation',
    keywords: ['audio', 'music', 'sound', 'wave', 'visualizer', 'player'],
    descriptions: [
      'Audio visualizer animation',
      'Music player interface',
      'Sound wave visualization'
    ],
    userPhrases: [
      'audio visualizer',
      'music animation',
      'sound waves',
      'music player',
      'audio interface'
    ],
    categories: ['music', 'visualization', 'interface'],
    styles: ['rhythmic', 'dynamic', 'musical'],
    useCases: ['music-apps', 'podcasts', 'audio-products', 'media-players'],
    animations: ['pulse', 'wave', 'rotate'],
    elements: ['waveform', 'player-controls', 'album-art'],
    colors: ['vibrant', 'gradient'],
    duration: 240,
    complexity: 'medium',
    primaryUse: 'Audio and music visualization',
    similarTo: ['WaveAnimation', 'PulsingCircles']
  },

  'Keyboard': {
    id: 'Keyboard',
    name: 'Keyboard',
    keywords: ['keyboard', 'typing', 'keys', 'input', 'type'],
    descriptions: [
      'Animated keyboard interaction',
      'Typing on keyboard animation',
      'Key press demonstration'
    ],
    userPhrases: [
      'keyboard animation',
      'typing on keyboard',
      'key press demo',
      'keyboard input',
      'show typing'
    ],
    categories: ['interaction', 'input', 'demo'],
    styles: ['realistic', 'instructional'],
    useCases: ['tutorials', 'typing-demos', 'shortcuts', 'education'],
    animations: ['press', 'highlight'],
    elements: ['keyboard', 'keys'],
    colors: ['neutral', 'accent'],
    duration: 180,
    complexity: 'medium',
    primaryUse: 'Keyboard interaction demonstration',
    similarTo: ['CursorClickScene', 'TypingTemplate']
  },

  // App-specific Templates
  'AppDownload': {
    id: 'AppDownload',
    name: 'AppDownload',
    keywords: ['download', 'app', 'install', 'progress', 'loading'],
    descriptions: [
      'App download animation',
      'Installation progress',
      'Download indicator'
    ],
    userPhrases: [
      'app download',
      'installation animation',
      'download progress',
      'installing app',
      'app store download'
    ],
    categories: ['mobile', 'progress', 'loading'],
    styles: ['informative', 'clean'],
    useCases: ['app-stores', 'downloads', 'installations'],
    animations: ['progress', 'fill', 'complete'],
    elements: ['progress-ring', 'icon', 'percentage'],
    colors: ['blue', 'green'],
    duration: 120,
    complexity: 'simple',
    primaryUse: 'App download progress animation',
    similarTo: ['MobileApp']
  },

  // Background Color Templates
  'BlueBG': {
    id: 'BlueBG',
    name: 'BlueBG',
    keywords: ['blue', 'background', 'gradient', 'sky', 'ocean'],
    descriptions: [
      'Blue gradient background',
      'Ocean-inspired background',
      'Sky blue backdrop'
    ],
    userPhrases: [
      'blue background',
      'ocean background',
      'sky gradient',
      'blue backdrop',
      'water background'
    ],
    categories: ['background', 'color'],
    styles: ['calm', 'professional', 'clean'],
    useCases: ['corporate', 'tech', 'presentations'],
    animations: ['gradient-shift'],
    elements: ['background'],
    colors: ['blue', 'gradient'],
    duration: 180,
    complexity: 'simple',
    primaryUse: 'Blue gradient background',
    similarTo: ['CoolSkyBG', 'BahamasBG', 'SunriseBG']
  },

  // Logo Templates
  'LogoTemplate': {
    id: 'LogoTemplate',
    name: 'LogoTemplate',
    keywords: ['logo', 'brand', 'identity', 'mark', 'branding'],
    descriptions: [
      'Animated logo reveal',
      'Brand identity animation',
      'Logo showcase'
    ],
    userPhrases: [
      'logo animation',
      'brand reveal',
      'logo intro',
      'company logo',
      'brand animation'
    ],
    categories: ['branding', 'logo', 'identity'],
    styles: ['professional', 'branded', 'polished'],
    useCases: ['intros', 'outros', 'branding', 'presentations'],
    animations: ['reveal', 'scale', 'rotate'],
    elements: ['logo', 'tagline'],
    colors: ['brand-colors'],
    duration: 90,
    complexity: 'simple',
    primaryUse: 'Logo reveal and branding',
    similarTo: ['HeroTemplate', 'PromptIntro']
  },

  // Hero Templates
  'HeroTemplate': {
    id: 'HeroTemplate',
    name: 'HeroTemplate',
    keywords: ['hero', 'header', 'banner', 'intro', 'landing'],
    descriptions: [
      'Hero section animation',
      'Landing page header',
      'Banner animation'
    ],
    userPhrases: [
      'hero section',
      'landing page header',
      'banner animation',
      'intro section',
      'main header'
    ],
    categories: ['hero', 'landing', 'intro'],
    styles: ['bold', 'impactful', 'modern'],
    useCases: ['websites', 'landing-pages', 'intros', 'presentations'],
    animations: ['fade', 'slide', 'scale'],
    elements: ['headline', 'subtext', 'cta', 'background'],
    colors: ['varied'],
    duration: 180,
    complexity: 'medium',
    primaryUse: 'Hero section and landing page headers',
    similarTo: ['LogoTemplate', 'PromptIntro']
  },
  
  'AirbnbDemo': {
    id: 'AirbnbDemo',
    name: 'AirbnbDemo',
    keywords: ['airbnb', 'demo', 'booking', 'travel', 'vacation', 'rental', 'property', 'stays', 'accommodation', 'listing'],
    descriptions: [
      'Airbnb-style property listing demo',
      'Vacation rental showcase',
      'Property booking interface'
    ],
    userPhrases: [
      'airbnb demo',
      'airbnb style',
      'property listing',
      'vacation rental',
      'booking interface',
      'travel app',
      'accommodation showcase',
      'rental property demo'
    ],
    categories: ['demo', 'mockup', 'product'],
    styles: ['modern', 'clean', 'minimal', 'professional'],
    useCases: ['product demos', 'app showcase', 'property listings', 'travel platforms'],
    animations: ['fade', 'slide', 'scale'],
    elements: ['cards', 'images', 'text', 'ratings', 'prices'],
    colors: ['coral', 'white', 'gray'],
    duration: 300,
    complexity: 'medium',
    primaryUse: 'Airbnb-style property listing and booking demo',
    similarTo: ['MobileApp', 'DualScreenApp']
  }
};

/**
 * Get template metadata by ID
 */
export function getTemplateMetadata(id: string): TemplateMetadata | undefined {
  return templateMetadata[id];
}

/**
 * Get all template IDs
 */
export function getAllTemplateIds(): string[] {
  return Object.keys(templateMetadata);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): TemplateMetadata[] {
  return Object.values(templateMetadata).filter(meta => 
    meta.categories.includes(category)
  );
}

/**
 * Get templates by style
 */
export function getTemplatesByStyle(style: string): TemplateMetadata[] {
  return Object.values(templateMetadata).filter(meta => 
    meta.styles.includes(style)
  );
}

/**
 * Get similar templates
 */
export function getSimilarTemplates(id: string): TemplateMetadata[] {
  const template = templateMetadata[id];
  if (!template) return [];
  
  return template.similarTo
    .map(similarId => templateMetadata[similarId])
    .filter(Boolean) as TemplateMetadata[];
}
