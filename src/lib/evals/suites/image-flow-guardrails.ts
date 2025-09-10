// src/lib/evals/suites/image-flow-guardrails.ts
import type { EvalSuite } from '../types';
import { TEST_IMAGES } from '../test-fixtures';

// Validates the new image flow behavior with real R2 URLs
// Tests embed vs recreate modes, TSX-only outputs, and URL hygiene

export const imageFlowGuardrailsSuite: EvalSuite = {
  id: 'image-flow-guardrails',
  name: 'Image Flow Guardrails',
  description: 'Validates embed vs recreate modes, TSX-only outputs, and URL hygiene with real R2 images.',
  modelPacks: ['optimal-pack', 'anthropic-pack'],
  services: ['brain', 'codeGenerator', 'editScene'],
  prompts: [
    {
      id: 'add-embed-hero',
      name: 'Add Scene - Embed Hero Image',
      type: 'image',
      input: {
        text: 'Create a hero section with this image as the background. Add a headline and call-to-action button.',
        image: TEST_IMAGES.hero.url,
        context: {
          mode: 'embed',
          imageAction: 'embed',
        },
      },
      expectedBehavior: {
        toolCalled: 'addScene',
        shouldAnalyzeImage: true,
        shouldUseContext: true,
        complexity: 'low',
        validation: {
          mustIncludeUrl: true,
          forbiddenUrls: false,
        }
      },
    },
    {
      id: 'add-recreate-ui-animation',
      name: 'Add Scene - Recreate Code Animation',
      type: 'image',
      input: {
        text: 'Recreate this code animation interface as motion graphics. Do not display the original image, create animated code blocks instead.',
        image: TEST_IMAGES.uiAnimation.url,
        context: {
          mode: 'recreate',
          imageAction: 'recreate',
        },
      },
      expectedBehavior: {
        toolCalled: 'addScene',
        shouldAnalyzeImage: true,
        shouldUseContext: true,
        complexity: 'medium',
        validation: {
          mustIncludeUrl: false,
          forbiddenUrls: false,
        }
      },
    },
    {
      id: 'add-recreate-stock-graph',
      name: 'Add Scene - Recreate Stock Graph',
      type: 'image',
      input: {
        text: 'Create an animated version of this stock graph. Build it with React components, do not use the image itself.',
        image: TEST_IMAGES.stockGraph.url,
        context: {
          mode: 'recreate',
          imageAction: 'recreate',
        },
      },
      expectedBehavior: {
        toolCalled: 'addScene',
        shouldAnalyzeImage: true,
        shouldUseContext: true,
        complexity: 'high',
        validation: {
          mustIncludeUrl: false,
          forbiddenUrls: false,
        }
      },
    },
    {
      id: 'edit-embed-logo',
      name: 'Edit Scene - Embed Logo',
      type: 'scene',
      input: {
        text: 'Add this company logo to the top-right corner of the scene.',
        context: {
          imageUrls: [TEST_IMAGES.logo.url],
          sceneUrls: ['ATTACH_SCENE_ID'],
          mode: 'embed',
          imageAction: 'embed',
        },
      },
      expectedBehavior: {
        toolCalled: 'editScene',
        editType: 'surgical',
        shouldUseContext: true,
        complexity: 'low',
        validation: {
          mustIncludeUrl: true,
          forbiddenUrls: false,
        }
      },
    },
    {
      id: 'edit-recreate-prompt-box',
      name: 'Edit Scene - Recreate Prompt Box Style',
      type: 'scene',
      input: {
        text: 'Update the scene to match the visual style of this prompt box UI - use the same colors, spacing, and typography but do not insert the image.',
        context: {
          imageUrls: [TEST_IMAGES.promptBox.url],
          sceneUrls: ['ATTACH_SCENE_ID'],
          mode: 'recreate',
          imageAction: 'recreate',
        },
      },
      expectedBehavior: {
        toolCalled: 'editScene',
        editType: 'creative',
        shouldUseContext: true,
        complexity: 'medium',
        validation: {
          mustIncludeUrl: false,
          forbiddenUrls: false,
        }
      },
    },
    {
      id: 'add-embed-content-image',
      name: 'Add Scene - Embed Content Image',
      type: 'image',
      input: {
        text: 'Create a content section with this image on the left and descriptive text on the right.',
        image: TEST_IMAGES.contentImage.url,
        context: {
          mode: 'embed',
          imageAction: 'embed',
        },
      },
      expectedBehavior: {
        toolCalled: 'addScene',
        shouldAnalyzeImage: true,
        shouldUseContext: true,
        complexity: 'low',
        validation: {
          mustIncludeUrl: true,
          forbiddenUrls: false,
        }
      },
    },
  ],
};

export default imageFlowGuardrailsSuite;

