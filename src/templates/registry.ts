// Import templates that have been updated to the new format
import KnowsCode, { templateConfig as knowsCodeConfig } from './KnowsCode';
import { type VideoFormat } from '../app/projects/new/FormatSelector';
import { templateFormatAnalysis } from './analyze-templates';
import PromptIntro, { templateConfig as promptIntroConfig } from './PromptIntro';
import FintechUI, { templateConfig as fintechConfig } from './FintechUI';
import GrowthGraph, { templateConfig as growthConfig } from './GrowthGraph';
import AppleSignIn, { templateConfig as appleSignInConfig } from './AppleSignIn';
import GitHubSignIn, { templateConfig as githubSignInConfig } from './GitHubSignIn';
import GoogleSignIn, { templateConfig as googleSignInConfig } from './GoogleSignIn';
import Coding, { templateConfig as codingConfig } from './Coding';
import GradientText, { templateConfig as gradientTextConfig } from './GradientText';
import DualScreenApp, { templateConfig as dualScreenAppConfig } from './DualScreenApp';
import AudioAnimation, { templateConfig as audioAnimationConfig } from './AudioAnimation';
import PromptUI, { templateConfig as promptUIConfig } from './PromptUI';
import DotDotDot, { templateConfig as dotDotDotConfig } from './DotDotDot';
import Placeholders, { templateConfig as placeholdersConfig } from './Placeholders';
import WordFlip, { templateConfig as wordFlipConfig } from './WordFlip';
import MorphingText, { templateConfig as morphingTextConfig } from './MorphingText';
import HighlightSweep, { templateConfig as highlightSweepConfig } from './HighlightSweep';
import CarouselText, { templateConfig as carouselTextConfig } from './CarouselText';
import DrawOn, { templateConfig as drawOnConfig } from './DrawOn';
import WipeIn, { templateConfig as wipeInConfig } from './WipeIn';
import ScaleIn, { templateConfig as scaleInConfig } from './ScaleIn';
import SlideIn, { templateConfig as slideInConfig } from './SlideIn';
import FadeIn, { templateConfig as fadeInConfig } from './FadeIn';
import TeslaStockGraph, { templateConfig as teslaStockGraphConfig } from './TeslaStockGraph';
import CursorClickScene, { templateConfig as cursorClickSceneConfig } from './CursorClickScene';
import MobileApp, { templateConfig as mobileAppConfig } from './MobileApp';
import AppDownload, { templateConfig as appDownloadConfig } from './AppDownload';
import AppJiggle, { templateConfig as appJiggleConfig } from './AppJiggle';
import Keyboard, { templateConfig as keyboardConfig } from './Keyboard';
import DarkBGGradientText, { templateConfig as darkBGGradientTextConfig } from './DarkBGGradientText';
import Today1Percent, { templateConfig as today1PercentConfig } from './Today1Percent';
import FlareBG, { templateConfig as flareBGConfig } from './FlareBG';
import PinkBG, { templateConfig as pinkBGConfig } from './PinkBG';
import SummerBG, { templateConfig as summerBGConfig } from './SummerBG';
import DarkForestBG, { templateConfig as darkForestBGConfig } from './DarkForestBG';
import BlueBG, { templateConfig as blueBGConfig } from './BlueBG';
import SpaceGreyBG, { templateConfig as spaceGreyBGConfig } from './SpaceGreyBG';
import InstaBG, { templateConfig as instaBGConfig } from './InstaBG';
import SunriseBG, { templateConfig as sunriseBGConfig } from './SunriseBG';
import FruitBG, { templateConfig as fruitBGConfig } from './FruitBG';
import BahamasBG, { templateConfig as bahamasBGConfig } from './BahamasBG';
import CoolSkyBG, { templateConfig as coolSkyBGConfig } from './CoolSkyBG';
import VibeyBG, { templateConfig as vibeyBGConfig } from './VibeyBG';
import VibesBG, { templateConfig as vibesBGConfig } from './VibesBG';
import FastText, { templateConfig as fastTextConfig } from './FastText';
import ChangelogFeature, { templateConfig as changelogFeatureConfig } from './ChangelogFeature';
import ChangelogFix, { templateConfig as changelogFixConfig } from './ChangelogFix';

export interface TemplateDefinition {
  id: string;
  name: string;
  duration: number; // in frames
  previewFrame: number; // fps for preview
  component: React.ComponentType | null; // Real React component for Remotion Player (null for DB templates)
  getCode: () => string; // Code string for database storage
  supportedFormats?: VideoFormat[]; // Formats this template works well with
  // Additional fields for database templates
  isFromDatabase?: boolean;
  isOfficial?: boolean;
  category?: string | null;
  creator?: {
    id: string;
    name: string | null;
  };
}

// Helper function to add format support to templates
function addFormatSupport(template: Omit<TemplateDefinition, 'supportedFormats'>): TemplateDefinition {
  const formatInfo = templateFormatAnalysis[template.id as keyof typeof templateFormatAnalysis];
  return {
    ...template,
    supportedFormats: formatInfo?.supportedFormats ?? ['landscape', 'portrait', 'square']
  };
}

export const TEMPLATES: TemplateDefinition[] = [
  // 🎯 PRIMARY TEMPLATES - User specified order
  
  // 1. Fast Text (moved to top)
  addFormatSupport({
    ...fastTextConfig,
    component: FastText,
  }),
  
  // 2. Prompt UI (now supports vertical with 99% width)
  addFormatSupport({
    ...promptUIConfig,
    component: PromptUI,
  }),
  
  // 3. Today 1%
  addFormatSupport({
    ...today1PercentConfig,
    component: Today1Percent,
  }),
  
  // 4. App Download
  addFormatSupport({
    ...appDownloadConfig,
    component: AppDownload,
  }),
  
  // 5. App Jiggle
  addFormatSupport({
    ...appJiggleConfig,
    component: AppJiggle,
  }),
  
  // 6. Audio Animation
  addFormatSupport({
    ...audioAnimationConfig,
    component: AudioAnimation,
  }),
  
  // 7. Gradient Text
  addFormatSupport({
    ...gradientTextConfig,
    component: GradientText,
  }),
  
  // 8. Dark BG Gradient Text
  addFormatSupport({
    ...darkBGGradientTextConfig,
    component: DarkBGGradientText,
  }),
  
  // 9. Keyboard Animation
  addFormatSupport({
    ...keyboardConfig,
    component: Keyboard,
  }),

  // 🎨 BACKGROUND GRADIENTS
  addFormatSupport({
    ...flareBGConfig,
    component: FlareBG,
  }),
  addFormatSupport({
    ...pinkBGConfig,
    component: PinkBG,
  }),
  addFormatSupport({
    ...summerBGConfig,
    component: SummerBG,
  }),
  addFormatSupport({
    ...darkForestBGConfig,
    component: DarkForestBG,
  }),
  addFormatSupport({
    ...blueBGConfig,
    component: BlueBG,
  }),
  addFormatSupport({
    ...spaceGreyBGConfig,
    component: SpaceGreyBG,
  }),
  addFormatSupport({
    ...instaBGConfig,
    component: InstaBG,
  }),
  addFormatSupport({
    ...sunriseBGConfig,
    component: SunriseBG,
  }),
  addFormatSupport({
    ...fruitBGConfig,
    component: FruitBG,
  }),
  addFormatSupport({
    ...bahamasBGConfig,
    component: BahamasBG,
  }),
  addFormatSupport({
    ...coolSkyBGConfig,
    component: CoolSkyBG,
  }),
  addFormatSupport({
    ...vibeyBGConfig,
    component: VibeyBG,
  }),
  addFormatSupport({
    ...vibesBGConfig,
    component: VibesBG,
  }),

  // 📚 EVERYTHING ELSE - Alphabetical order
  addFormatSupport({
    ...appleSignInConfig,
    component: AppleSignIn,
  }),
  addFormatSupport({
    ...carouselTextConfig,
    component: CarouselText,
  }),
  addFormatSupport({
    ...codingConfig,
    component: Coding,
  }),
  addFormatSupport({
    ...cursorClickSceneConfig,
    component: CursorClickScene,
  }),
  addFormatSupport({
    ...dotDotDotConfig,
    component: DotDotDot,
  }),
  addFormatSupport({
    ...drawOnConfig,
    component: DrawOn,
  }),
  addFormatSupport({
    ...dualScreenAppConfig,
    component: DualScreenApp,
  }),
  addFormatSupport({
    ...fadeInConfig,
    component: FadeIn,
  }),
  addFormatSupport({
    ...fintechConfig,
    component: FintechUI,
  }),
  addFormatSupport({
    ...githubSignInConfig,
    component: GitHubSignIn,
  }),
  addFormatSupport({
    ...googleSignInConfig,
    component: GoogleSignIn,
  }),
  addFormatSupport({
    ...growthConfig,
    component: GrowthGraph,
  }),
  addFormatSupport({
    ...highlightSweepConfig,
    component: HighlightSweep,
  }),
  addFormatSupport({
    ...knowsCodeConfig,
    component: KnowsCode,
  }),
  addFormatSupport({
    ...mobileAppConfig,
    component: MobileApp,
  }),
  addFormatSupport({
    ...morphingTextConfig,
    component: MorphingText,
  }),
  addFormatSupport({
    ...placeholdersConfig,
    component: Placeholders,
  }),
  addFormatSupport({
    ...promptIntroConfig,
    component: PromptIntro,
  }),
  addFormatSupport({
    ...scaleInConfig,
    component: ScaleIn,
  }),
  addFormatSupport({
    ...slideInConfig,
    component: SlideIn,
  }),
  addFormatSupport({
    ...teslaStockGraphConfig,
    component: TeslaStockGraph,
  }),
  addFormatSupport({
    ...wipeInConfig,
    component: WipeIn,
  }),
  addFormatSupport({
    ...wordFlipConfig,
    component: WordFlip,
  }),
  
  // 🎬 CHANGELOG TEMPLATES - For GitHub Integration
  addFormatSupport({
    ...changelogFeatureConfig,
    component: ChangelogFeature,
  }),
  addFormatSupport({
    ...changelogFixConfig,
    component: ChangelogFix,
  }),
]; 