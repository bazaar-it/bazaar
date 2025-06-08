// Import templates that have been updated to the new format
import KnowsCode, { templateConfig as knowsCodeConfig } from './KnowsCode';
import PromptIntro, { templateConfig as promptIntroConfig } from './PromptIntro';
import FintechUI, { templateConfig as fintechConfig } from './FintechUI';
import FloatingElements, { templateConfig as floatingConfig } from './FloatingElements';
import GrowthGraph, { templateConfig as growthConfig } from './GrowthGraph';
import AppleSignIn, { templateConfig as appleSignInConfig } from './AppleSignIn';
import GitHubSignIn, { templateConfig as githubSignInConfig } from './GitHubSignIn';
import GoogleSignIn, { templateConfig as googleSignInConfig } from './GoogleSignIn';

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
    ...floatingConfig,
    component: FloatingElements,
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
  }
];