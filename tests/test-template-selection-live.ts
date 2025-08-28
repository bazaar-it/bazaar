#!/usr/bin/env tsx
/**
 * Live test of the intelligent template selection system
 * Tests with real brand data to verify different templates are selected
 */

import { TemplateSelector } from './src/server/services/website/template-selector-v2';
import type { HeroJourneyScene } from './src/tools/narrative/herosJourney';
import type { SimplifiedBrandData } from './src/tools/webAnalysis/brandDataAdapter';

// Test brand data
const testBrands = {
  ramp: {
    name: 'Ramp (FinTech)',
    data: {
      page: {
        url: 'https://ramp.com',
        title: 'Ramp - Corporate Cards & Expense Management',
        description: 'Control spend, save time'
      },
      brand: {
        colors: {
          primary: '#FF6B00',
          secondary: '#1A1A1A',
          accents: ['#FF8533'],
          neutrals: ['#FFFFFF'],
          gradients: []
        },
        typography: {
          fonts: [{ family: 'Inter', weights: [400, 600] }],
          scale: { h1: '3rem', body: '1rem' }
        },
        buttons: {
          radius: '0.375rem',
          padding: '0.75rem 1.5rem'
        },
        voice: {
          taglines: ['Control spend, save time'],
          tone: 'professional'
        }
      },
      product: {
        value_prop: {
          headline: 'Control spend, save time, and automate finance',
          subhead: 'Modern finance automation'
        },
        features: [
          { title: 'Corporate Cards', desc: 'Virtual and physical cards' },
          { title: 'Expense Management', desc: 'Automated tracking' }
        ]
      },
      social_proof: {
        stats: {
          users: '25,000+',
          rating: '4.8'
        }
      }
    } as SimplifiedBrandData
  },
  
  figma: {
    name: 'Figma (Design)',
    data: {
      page: {
        url: 'https://figma.com',
        title: 'Figma - Collaborative Design Tool',
        description: 'Design together'
      },
      brand: {
        colors: {
          primary: '#F24E1E',
          secondary: '#0ACF83',
          accents: ['#A259FF', '#FFC700'],
          neutrals: ['#FFFFFF'],
          gradients: []
        },
        typography: {
          fonts: [{ family: 'Inter', weights: [400, 600] }],
          scale: { h1: '4rem', body: '1rem' }
        },
        buttons: {
          radius: '0.5rem',
          padding: '0.75rem 1.5rem'
        },
        voice: {
          taglines: ['Nothing great is made alone'],
          tone: 'creative'
        }
      },
      product: {
        value_prop: {
          headline: 'Nothing great is made alone',
          subhead: 'Design and build as a team'
        },
        features: [
          { title: 'Real-time Collaboration', desc: 'Work together' },
          { title: 'Design Systems', desc: 'Shared components' }
        ]
      },
      social_proof: {
        stats: {
          users: '4M+',
          rating: '4.7'
        }
      }
    } as SimplifiedBrandData
  },
  
  stripe: {
    name: 'Stripe (Developer Tools)',
    data: {
      page: {
        url: 'https://stripe.com',
        title: 'Stripe - Payment Infrastructure',
        description: 'Payment infrastructure for the internet'
      },
      brand: {
        colors: {
          primary: '#635BFF',
          secondary: '#00D4FF',
          accents: ['#7A73FF'],
          neutrals: ['#FFFFFF'],
          gradients: []
        },
        typography: {
          fonts: [{ family: 'SF Pro', weights: [400, 600] }],
          scale: { h1: '3.5rem', body: '1rem' }
        },
        buttons: {
          radius: '0.25rem',
          padding: '0.625rem 1.25rem'
        },
        voice: {
          taglines: ['Payment infrastructure for the internet'],
          tone: 'technical'
        }
      },
      product: {
        value_prop: {
          headline: 'Payment infrastructure for the internet',
          subhead: 'Millions of businesses use Stripe'
        },
        features: [
          { title: 'Global Payments', desc: '135+ currencies' },
          { title: 'Developer First', desc: 'Best-in-class APIs' }
        ]
      },
      social_proof: {
        stats: {
          users: 'Millions',
          rating: '4.9'
        }
      }
    } as SimplifiedBrandData
  }
};

// Test scenes
const testScenes: HeroJourneyScene[] = [
  {
    title: 'The Problem',
    emotionalBeat: 'problem',
    duration: 3000,
    narration: 'Current challenges',
    visualDescription: 'Show the problem'
  },
  {
    title: 'Discovery',
    emotionalBeat: 'discovery',
    duration: 3000,
    narration: 'Finding the solution',
    visualDescription: 'Reveal the answer'
  },
  {
    title: 'Transformation',
    emotionalBeat: 'transformation',
    duration: 3000,
    narration: 'Making the change',
    visualDescription: 'Show transformation'
  },
  {
    title: 'Triumph',
    emotionalBeat: 'triumph',
    duration: 3000,
    narration: 'Achieving success',
    visualDescription: 'Celebrate results'
  },
  {
    title: 'Call to Action',
    emotionalBeat: 'invitation',
    duration: 3000,
    narration: 'Join us today',
    visualDescription: 'Final CTA'
  }
];

async function runTest() {
  console.log('🧪 Testing Intelligent Template Selection\n');
  console.log('=' .repeat(60));
  
  const selector = new TemplateSelector();
  const results: Record<string, string[]> = {};
  
  // Test each brand
  for (const [key, brand] of Object.entries(testBrands)) {
    console.log(`\n📊 Testing ${brand.name}`);
    console.log('-'.repeat(40));
    
    try {
      const templates = await selector.selectTemplatesForJourney(
        testScenes,
        'dynamic',
        brand.data
      );
      
      results[key] = templates.map(t => t.templateId);
      
      templates.forEach((template, i) => {
        console.log(`  ${testScenes[i].emotionalBeat}: ${template.templateId}`);
      });
    } catch (error) {
      console.error(`  ❌ Error: ${error}`);
      results[key] = ['Error'];
    }
  }
  
  // Compare results
  console.log('\n' + '='.repeat(60));
  console.log('📈 RESULTS COMPARISON\n');
  
  // Check if templates are different
  const rampTemplates = results.ramp?.join(',') || '';
  const figmaTemplates = results.figma?.join(',') || '';
  const stripeTemplates = results.stripe?.join(',') || '';
  
  console.log('Template Sets:');
  console.log(`  Ramp:   ${rampTemplates}`);
  console.log(`  Figma:  ${figmaTemplates}`);
  console.log(`  Stripe: ${stripeTemplates}`);
  
  // Calculate uniqueness
  const allTemplates = [...(results.ramp || []), ...(results.figma || []), ...(results.stripe || [])];
  const uniqueTemplates = new Set(allTemplates);
  
  console.log('\n📊 Statistics:');
  console.log(`  Total templates used: ${allTemplates.length}`);
  console.log(`  Unique templates: ${uniqueTemplates.size}`);
  console.log(`  Template variety: ${Math.round((uniqueTemplates.size / allTemplates.length) * 100)}%`);
  
  // Check if each brand got different templates
  const identical = rampTemplates === figmaTemplates && figmaTemplates === stripeTemplates;
  
  if (identical) {
    console.log('\n❌ ISSUE: All brands received identical templates!');
    console.log('   The intelligent selection may not be working correctly.');
  } else {
    console.log('\n✅ SUCCESS: Different brands received varied templates!');
    console.log('   The intelligent selection is working as expected.');
  }
  
  // Show unique templates per emotional beat
  console.log('\n🎭 Templates by Emotional Beat:');
  testScenes.forEach((scene, i) => {
    const templates = [
      results.ramp?.[i],
      results.figma?.[i],
      results.stripe?.[i]
    ].filter(Boolean);
    const unique = new Set(templates);
    console.log(`  ${scene.emotionalBeat}: ${unique.size} unique (${Array.from(unique).join(', ')})`);
  });
}

// Run the test
runTest().catch(console.error);