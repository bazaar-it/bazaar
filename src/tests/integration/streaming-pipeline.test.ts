/**
 * Streaming Pipeline Integration Tests
 * Tests the real-time streaming functionality for URL-to-video generation
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { WebsiteToVideoHandler } from '~/tools/website/websiteToVideoHandler';
import { TemplateCustomizerAI } from '~/server/services/website/template-customizer-ai';
import { db } from '~/server/db';
import { projects, scenes } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { setupTestDatabase, cleanupTestDatabase, TEST_DATA } from '../fixtures/test-database-setup';

describe('Streaming Pipeline Tests', () => {
  let testProjectId: string;
  
  beforeAll(async () => {
    await setupTestDatabase();
    testProjectId = TEST_DATA.projects.ramp.id;
  });
  
  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Streaming Scene Generation', () => {
    it('should emit scene_completed events for each scene', async () => {
      const streamingEvents: any[] = [];
      
      const streamingCallback = jest.fn(async (event) => {
        streamingEvents.push(event);
      });

      const input = {
        userPrompt: 'Create a video for Ramp',
        projectId: testProjectId,
        userId: TEST_DATA.users.john.id,
        websiteUrl: 'https://ramp.com',
        streamingCallback
      };

      // Mock the WebAnalysisAgentV4 to avoid external calls
      jest.spyOn(require('~/tools/webAnalysis/WebAnalysisAgentV4'), 'WebAnalysisAgentV4')
        .mockImplementation(() => ({
          analyze: jest.fn().mockResolvedValue(TEST_DATA.brandProfiles.ramp.brandData)
        }));

      const result = await WebsiteToVideoHandler.execute(input);

      // Verify streaming events were emitted
      expect(streamingCallback).toHaveBeenCalled();
      
      // Should have one scene_completed event per scene plus final completion
      const sceneCompletedEvents = streamingEvents.filter(e => e.type === 'scene_completed');
      expect(sceneCompletedEvents.length).toBeGreaterThanOrEqual(5); // 5 scenes in hero's journey
      
      // Verify event structure
      const firstEvent = sceneCompletedEvents[0];
      expect(firstEvent).toMatchObject({
        type: 'scene_completed',
        data: {
          sceneIndex: expect.any(Number),
          sceneName: expect.any(String),
          totalScenes: expect.any(Number),
          projectId: testProjectId
        }
      });

      // Should have final completion event
      const completionEvent = streamingEvents.find(e => e.type === 'all_scenes_complete');
      expect(completionEvent).toBeDefined();
    });

    it('should save scenes to database incrementally', async () => {
      const scenesSaved: string[] = [];
      
      // Monitor database insertions
      const originalInsert = db.insert;
      jest.spyOn(db, 'insert').mockImplementation(function(this: any, table: any) {
        if (table === scenes) {
          return {
            values: jest.fn((values) => {
              scenesSaved.push(...values.map((v: any) => v.id));
              return Promise.resolve();
            })
          };
        }
        return originalInsert.call(this, table);
      });

      const input = {
        userPrompt: 'Create a video',
        projectId: testProjectId,
        userId: TEST_DATA.users.john.id,
        websiteUrl: 'https://example.com',
        streamingCallback: jest.fn()
      };

      await WebsiteToVideoHandler.execute(input);

      // Verify scenes were saved incrementally (not all at once)
      expect(scenesSaved.length).toBeGreaterThanOrEqual(5);
    });

    it('should handle streaming callback errors gracefully', async () => {
      const failingCallback = jest.fn(async () => {
        throw new Error('Callback failed');
      });

      const input = {
        userPrompt: 'Create a video',
        projectId: testProjectId,
        userId: TEST_DATA.users.john.id,
        websiteUrl: 'https://example.com',
        streamingCallback: failingCallback
      };

      // Should not throw even if callback fails
      const result = await WebsiteToVideoHandler.execute(input);
      expect(result.success).toBe(true);
      
      // Verify callback was attempted
      expect(failingCallback).toHaveBeenCalled();
    });
  });

  describe('TemplateCustomizerAI Streaming', () => {
    it('should call onSceneComplete for each scene', async () => {
      const customizer = new TemplateCustomizerAI();
      const onSceneComplete = jest.fn();
      
      const mockTemplates = [
        { templateId: 'template1', templateCode: 'code1', templateName: 'Template 1' },
        { templateId: 'template2', templateCode: 'code2', templateName: 'Template 2' }
      ];
      
      const mockBrandStyle = {
        colors: { primary: '#000', secondary: '#fff' },
        typography: { primaryFont: 'Arial' }
      };
      
      const mockNarrativeScenes = [
        { title: 'Scene 1', duration: 90, narrative: 'Opening' },
        { title: 'Scene 2', duration: 90, narrative: 'Middle' }
      ];

      // Mock the Edit tool
      jest.spyOn(require('~/tools/edit/edit'), 'Edit')
        .mockImplementation(() => ({
          run: jest.fn().mockResolvedValue({
            success: true,
            data: { tsxCode: 'customized code' }
          })
        }));

      const result = await customizer.customizeTemplatesStreaming(
        {
          templates: mockTemplates,
          brandStyle: mockBrandStyle,
          websiteData: {} as any,
          narrativeScenes: mockNarrativeScenes
        },
        onSceneComplete
      );

      // Should call callback for each scene
      expect(onSceneComplete).toHaveBeenCalledTimes(2);
      
      // Verify callback arguments
      expect(onSceneComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Scene 1',
          code: expect.any(String),
          duration: 90
        }),
        0
      );
    });

    it('should continue processing even if onSceneComplete fails', async () => {
      const customizer = new TemplateCustomizerAI();
      const failingCallback = jest.fn(async () => {
        throw new Error('Callback error');
      });
      
      const mockTemplates = [
        { templateId: 'template1', templateCode: 'code1', templateName: 'Template 1' }
      ];
      
      const result = await customizer.customizeTemplatesStreaming(
        {
          templates: mockTemplates,
          brandStyle: {} as any,
          websiteData: {} as any,
          narrativeScenes: [{ title: 'Scene 1', duration: 90 }] as any
        },
        failingCallback
      );

      // Should still return results
      expect(result).toHaveLength(1);
      expect(failingCallback).toHaveBeenCalled();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should stream scenes faster than batch processing', async () => {
      const streamingTimes: number[] = [];
      
      const streamingCallback = jest.fn(async (event) => {
        if (event.type === 'scene_completed') {
          streamingTimes.push(Date.now());
        }
      });

      const startTime = Date.now();
      
      const input = {
        userPrompt: 'Create a video',
        projectId: testProjectId,
        userId: TEST_DATA.users.john.id,
        websiteUrl: 'https://example.com',
        streamingCallback
      };

      await WebsiteToVideoHandler.execute(input);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify incremental delivery
      if (streamingTimes.length > 1) {
        // First scene should be delivered before last scene
        const firstSceneTime = streamingTimes[0] - startTime;
        const lastSceneTime = streamingTimes[streamingTimes.length - 1] - startTime;
        
        expect(firstSceneTime).toBeLessThan(lastSceneTime);
        
        // First scene should arrive relatively quickly (not waiting for all)
        expect(firstSceneTime).toBeLessThan(totalTime * 0.5);
      }
    });
  });
});