// src/server/services/evaluation/__tests__/metrics.service.test.ts

import { 
  evaluateResponse, 
  evaluateRemotionComponent,
  evaluateAgentResponse,
  evaluateScenePlan,
  type EvaluationCriteria
} from '../metrics.service';

describe('Metrics Service', () => {
  describe('evaluateResponse', () => {
    it('should evaluate required elements correctly', () => {
      const response = 'This is a test response with apple and banana';
      const criteria: EvaluationCriteria = {
        requiredElements: ['apple', 'banana', 'orange']
      };
      
      const result = evaluateResponse(response, criteria);
      
      expect(result.score).toBe(2/3); // 2 out of 3 elements present
      expect(result.missingElements).toContain('orange');
      expect(result.missingElements).not.toContain('apple');
      expect(result.missingElements).not.toContain('banana');
    });
    
    it('should evaluate required properties correctly', () => {
      const response = 'The component has width: 1920 and height: 1080';
      const criteria: EvaluationCriteria = {
        requiredProperties: ['width', 'height', 'depth']
      };
      
      const result = evaluateResponse(response, criteria);
      
      expect(result.score).toBe(2/3); // 2 out of 3 properties present
      expect(result.missingProperties).toContain('depth');
      expect(result.missingProperties).not.toContain('width');
      expect(result.missingProperties).not.toContain('height');
    });
    
    it('should evaluate expected values correctly', () => {
      const response = 'The background color is blue and the font size is 24px';
      const criteria: EvaluationCriteria = {
        expectedValues: {
          'backgroundColor': 'blue',
          'fontSize': '16px',
          'fontFamily': ['Arial', 'Helvetica']
        }
      };
      
      const result = evaluateResponse(response, criteria);
      
      expect(result.score).toBe(1/3); // 1 out of 3 values match
      expect(result.incorrectValues).toHaveLength(2);
      expect(result.incorrectValues.find(v => v.key === 'fontSize')).toBeDefined();
      expect(result.incorrectValues.find(v => v.key === 'fontFamily')).toBeDefined();
    });
    
    it('should evaluate array of expected values correctly', () => {
      const response = 'The animation type is rotate';
      const criteria: EvaluationCriteria = {
        expectedValues: {
          'animationType': ['spin', 'rotate', 'fade']
        }
      };
      
      const result = evaluateResponse(response, criteria);
      
      expect(result.score).toBe(1); // 1 out of 1 values match
      expect(result.incorrectValues).toHaveLength(0);
    });
    
    it('should evaluate code quality correctly', () => {
      const goodCode = `
        // This is a comment
        function test() {
          try {
            const value: string = "test";
            return value;
          } catch (error) {
            console.error(error);
          }
        }
      `;
      
      const badCode = `
        function test() {
          const value = test2();
          return value;
        }
      `;
      
      const goodResult = evaluateResponse(goodCode, { codeQuality: true });
      const badResult = evaluateResponse(badCode, { codeQuality: true });
      
      expect(goodResult.score).toBeGreaterThan(0.8); // At least 4 out of 5 quality checks pass
      expect(badResult.score).toBeLessThan(0.5); // Less than half of quality checks pass
      expect(goodResult.codeQualityIssues?.length).toBeLessThan(badResult.codeQualityIssues?.length || 0);
    });
  });
  
  describe('evaluateRemotionComponent', () => {
    it('should evaluate a valid Remotion component correctly', () => {
      const validComponent = `
        import React from 'react';
        import { Composition, useCurrentFrame } from 'remotion';
        
        export const MyComponent = () => {
          const frame = useCurrentFrame();
          
          return (
            <div style={{ color: 'blue' }}>
              {frame}
            </div>
          );
        };
        
        export const RemotionVideo = () => {
          return (
            <Composition
              id="MyComp"
              component={MyComponent}
              width={1920}
              height={1080}
              fps={30}
              durationInFrames={300}
            />
          );
        };
      `;
      
      const result = evaluateRemotionComponent(validComponent);
      
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.missingElements).toHaveLength(0);
      expect(result.missingProperties).toHaveLength(0);
    });
    
    it('should identify issues in an invalid Remotion component', () => {
      const invalidComponent = `
        import React from 'react';
        
        export const MyComponent = () => {
          return (
            <div style={{ color: 'blue' }}>
              Static content
            </div>
          );
        };
      `;
      
      const result = evaluateRemotionComponent(invalidComponent);
      
      expect(result.score).toBeLessThan(0.6);
      expect(result.missingElements).toContain('useCurrentFrame');
      expect(result.missingElements).toContain('Composition');
      expect(result.missingProperties).toContain('width');
      expect(result.missingProperties).toContain('height');
      expect(result.missingProperties).toContain('fps');
      expect(result.missingProperties).toContain('durationInFrames');
    });
  });
  
  describe('evaluateAgentResponse', () => {
    it('should evaluate agent responses against expected actions', () => {
      const agentResponse = `
        I've analyzed your request and here's my plan:
        
        1. First, I'll CREATE_SCENE with a blue background
        2. Then I'll ADD_COMPONENT to display the logo
        3. Finally, I'll APPLY_ANIMATION to make the logo rotate
        
        Let me execute this plan now.
      `;
      
      const expectedActions = [
        'CREATE_SCENE',
        'ADD_COMPONENT',
        'APPLY_ANIMATION'
      ];
      
      const result = evaluateAgentResponse(agentResponse, expectedActions);
      
      expect(result.score).toBe(1); // All expected actions are present
      expect(result.missingElements).toHaveLength(0);
    });
  });
  
  describe('evaluateScenePlan', () => {
    it('should evaluate scene plans against required elements', () => {
      const scenePlan = `
        The scene will consist of the following elements:
        1. A background with gradient colors
        2. A logo placed in the center
        3. Text appearing below the logo
        
        The composition will be 1920x1080, with the logo animation starting at frame 30
        and lasting until frame 90. The text will fade in from frames 60-90.
      `;
      
      const requiredElements = [
        'background',
        'logo',
        'text',
        'animation'
      ];
      
      const result = evaluateScenePlan(scenePlan, requiredElements);
      
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.missingElements).toHaveLength(0);
      expect(result.missingFeatures).toHaveLength(0);
    });
  });
}); 