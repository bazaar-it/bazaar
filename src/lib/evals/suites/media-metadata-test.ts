// Media Metadata Service Test Suite
import type { EvalSuite } from '../types';
import { TEST_IMAGES } from '../test-fixtures';

// Tests the MediaMetadataService for proper image analysis and tagging
export const mediaMetadataSuite: EvalSuite = {
  id: 'media-metadata-test',
  name: 'Media Metadata Service Test',
  description: 'Tests the MediaMetadataService extracts proper tags and metadata from images.',
  modelPacks: ['optimal-pack'],
  services: ['brain'],
  prompts: [
    {
      id: 'metadata-hero-image',
      name: 'Extract Hero Image Metadata',
      type: 'image',
      input: {
        text: 'Analyze this hero image and create a scene with it.',
        image: TEST_IMAGES.hero.url,
        context: {
          mode: 'embed',
          imageAction: 'embed',
          testMetadata: true,
        },
      },
      expectedBehavior: {
        toolCalled: 'addScene',
        shouldAnalyzeImage: true,
        shouldUseContext: true,
        complexity: 'low',
        metadata: {
          expectedTags: ['background', 'hero', 'banner', 'image'],
          minConfidence: 0.7,
        }
      },
    },
    {
      id: 'metadata-logo',
      name: 'Extract Logo Metadata',
      type: 'image',
      input: {
        text: 'Add this logo to a new scene.',
        image: TEST_IMAGES.logo.url,
        context: {
          mode: 'embed',
          imageAction: 'embed',
          testMetadata: true,
        },
      },
      expectedBehavior: {
        toolCalled: 'addScene',
        shouldAnalyzeImage: true,
        shouldUseContext: true,
        complexity: 'low',
        metadata: {
          expectedTags: ['logo', 'brand', 'jupitrr', 'company'],
          minConfidence: 0.8,
        }
      },
    },
    {
      id: 'metadata-ui-animation',
      name: 'Extract UI Animation Metadata',
      type: 'image',
      input: {
        text: 'Analyze this UI animation design.',
        image: TEST_IMAGES.uiAnimation.url,
        context: {
          mode: 'recreate',
          imageAction: 'recreate',
          testMetadata: true,
        },
      },
      expectedBehavior: {
        toolCalled: 'addScene',
        shouldAnalyzeImage: true,
        shouldUseContext: true,
        complexity: 'medium',
        metadata: {
          expectedTags: ['animation', 'code', 'ui', 'interface', 'design'],
          minConfidence: 0.7,
        }
      },
    },
    {
      id: 'metadata-stock-graph',
      name: 'Extract Stock Graph Metadata',
      type: 'image',
      input: {
        text: 'Analyze this stock graph visualization.',
        image: TEST_IMAGES.stockGraph.url,
        context: {
          mode: 'recreate',
          imageAction: 'recreate',
          testMetadata: true,
        },
      },
      expectedBehavior: {
        toolCalled: 'addScene',
        shouldAnalyzeImage: true,
        shouldUseContext: true,
        complexity: 'high',
        metadata: {
          expectedTags: ['graph', 'chart', 'data', 'visualization', 'stocks', 'finance'],
          minConfidence: 0.7,
        }
      },
    },
    {
      id: 'metadata-prompt-box',
      name: 'Extract Prompt Box Metadata',
      type: 'image',
      input: {
        text: 'Analyze this prompt box UI design.',
        image: TEST_IMAGES.promptBox.url,
        context: {
          mode: 'recreate',
          imageAction: 'recreate',
          testMetadata: true,
        },
      },
      expectedBehavior: {
        toolCalled: 'addScene',
        shouldAnalyzeImage: true,
        shouldUseContext: true,
        complexity: 'medium',
        metadata: {
          expectedTags: ['prompt', 'input', 'ui', 'form', 'interface', 'design'],
          minConfidence: 0.7,
        }
      },
    },
  ],
};

export default mediaMetadataSuite;