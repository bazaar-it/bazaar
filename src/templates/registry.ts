// Import templates that have been updated to the new format
import KnowsCode, { templateConfig as knowsCodeConfig } from './KnowsCode';
import PromptIntro, { templateConfig as promptIntroConfig } from './PromptIntro';
import FintechUI, { templateConfig as fintechConfig } from './FintechUI';
import GrowthGraph, { templateConfig as growthConfig } from './GrowthGraph';
import AppleSignIn, { templateConfig as appleSignInConfig } from './AppleSignIn';
import GitHubSignIn, { templateConfig as githubSignInConfig } from './GitHubSignIn';
import GoogleSignIn, { templateConfig as googleSignInConfig } from './GoogleSignIn';
import Coding, { templateConfig as codingConfig } from './Coding';
import BlueGradientText, { templateConfig as blueGradientTextConfig } from './BlueGradientText';
import GradientText, { templateConfig as gradientTextConfig } from './GradientText';
import DualScreenApp, { templateConfig as dualScreenAppConfig } from './DualScreenApp';
import AudioAnimation, { templateConfig as audioAnimationConfig } from './AudioAnimation';
import PromptUI, { templateConfig as promptUIConfig } from './PromptUI';
import Generating, { templateConfig as generatingConfig } from './Generating';
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

export interface TemplateDefinition {
  id: string;
  name: string;
  duration: number; // in frames
  previewFrame: number; // fps for preview
  component: React.ComponentType; // Real React component for Remotion Player
  getCode: () => string; // Code string for database storage
}

export const TEMPLATES: TemplateDefinition[] = [
  // ✅ NEW FORMAT: Self-contained templates
  {
    ...knowsCodeConfig,
    component: KnowsCode,
  },
  {
    ...promptIntroConfig,
    component: PromptIntro,
  },
  {
    ...fintechConfig,
    component: FintechUI,
  },
  {
    ...growthConfig,
    component: GrowthGraph,
  },
  {
    ...appleSignInConfig,
    component: AppleSignIn,
  },
  {
    ...githubSignInConfig,
    component: GitHubSignIn,
  },
  {
    ...googleSignInConfig,
    component: GoogleSignIn,
  },
  {
    ...codingConfig,
    component: Coding,
  },
  {
    ...blueGradientTextConfig,
    component: BlueGradientText,
  },
  {
    ...gradientTextConfig,
    component: GradientText,
  },
  {
    ...dualScreenAppConfig,
    component: DualScreenApp,
  },
  {
    ...audioAnimationConfig,
    component: AudioAnimation,
  },
  {
    ...promptUIConfig,
    component: PromptUI,
  },
  {
    ...generatingConfig,
    component: Generating,
  },
  {
    ...dotDotDotConfig,
    component: DotDotDot,
  },
  {
    ...placeholdersConfig,
    component: Placeholders,
  },
  {
    ...wordFlipConfig,
    component: WordFlip,
  },
  {
    ...morphingTextConfig,
    component: MorphingText,
  },
  {
    ...highlightSweepConfig,
    component: HighlightSweep,
  },
  {
    ...carouselTextConfig,
    component: CarouselText,
  },
  {
    ...drawOnConfig,
    component: DrawOn,
  },
  {
    ...wipeInConfig,
    component: WipeIn,
  },
  {
    ...scaleInConfig,
    component: ScaleIn,
  },
  {
    ...slideInConfig,
    component: SlideIn,
  },
  {
    ...fadeInConfig,
    component: FadeIn,
  },
  {
    ...teslaStockGraphConfig,
    component: TeslaStockGraph,
  },
  {
    ...cursorClickSceneConfig,
    component: CursorClickScene,
  },
  {
    ...mobileAppConfig,
    component: MobileApp,
  },
]; 