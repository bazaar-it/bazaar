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
  supportedFormats?: VideoFormat[]; // Formats this template works well with
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
  // ✅ NEW FORMAT: Self-contained templates
  addFormatSupport({
    ...knowsCodeConfig,
    component: KnowsCode,
  }),
  addFormatSupport({
    ...promptIntroConfig,
    component: PromptIntro,
  }),
  addFormatSupport({
    ...fintechConfig,
    component: FintechUI,
  }),
  addFormatSupport({
    ...growthConfig,
    component: GrowthGraph,
  }),
  addFormatSupport({
    ...appleSignInConfig,
    component: AppleSignIn,
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
    ...codingConfig,
    component: Coding,
  }),
  addFormatSupport({
    ...blueGradientTextConfig,
    component: BlueGradientText,
  }),
  addFormatSupport({
    ...gradientTextConfig,
    component: GradientText,
  }),
  addFormatSupport({
    ...dualScreenAppConfig,
    component: DualScreenApp,
  }),
  addFormatSupport({
    ...audioAnimationConfig,
    component: AudioAnimation,
  }),
  addFormatSupport({
    ...promptUIConfig,
    component: PromptUI,
  }),
  addFormatSupport({
    ...generatingConfig,
    component: Generating,
  }),
  addFormatSupport({
    ...dotDotDotConfig,
    component: DotDotDot,
  }),
  addFormatSupport({
    ...placeholdersConfig,
    component: Placeholders,
  }),
  addFormatSupport({
    ...wordFlipConfig,
    component: WordFlip,
  }),
  addFormatSupport({
    ...morphingTextConfig,
    component: MorphingText,
  }),
  addFormatSupport({
    ...highlightSweepConfig,
    component: HighlightSweep,
  }),
  addFormatSupport({
    ...carouselTextConfig,
    component: CarouselText,
  }),
  addFormatSupport({
    ...drawOnConfig,
    component: DrawOn,
  }),
  addFormatSupport({
    ...wipeInConfig,
    component: WipeIn,
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
    ...fadeInConfig,
    component: FadeIn,
  }),
  addFormatSupport({
    ...teslaStockGraphConfig,
    component: TeslaStockGraph,
  }),
  addFormatSupport({
    ...cursorClickSceneConfig,
    component: CursorClickScene,
  }),
  addFormatSupport({
    ...mobileAppConfig,
    component: MobileApp,
  }),
]; 