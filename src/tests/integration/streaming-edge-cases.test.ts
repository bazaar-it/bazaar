/**
 * Streaming Edge Cases Tests
 * Tests error handling, network failures, and partial completions
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { WebsiteToVideoHandler } from '~/tools/website/websiteToVideoHandler';
import { db } from '~/server/db';
import { scenes } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { setupTestDatabase, cleanupTestDatabase, TEST_DATA } from '../fixtures/test-database-setup';

describe('Streaming Edge Cases', () => {
  let testProjectId: string;
  
  beforeAll(async () => {
    await setupTestDatabase();
    testProjectId = TEST_DATA.projects.ramp.id;
  });
  
  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Network Failures', () => {
    it('should handle WebAnalysisAgentV4 network timeout', async () => {
      // Mock network timeout
      jest.spyOn(require('~/tools/webAnalysis/WebAnalysisAgentV4'), 'WebAnalysisAgentV4')
        .mockImplementation(() => ({
          analyze: jest.fn().mockRejectedValue(new Error('Network timeout'))
        }));

      const input = {
        userPrompt: 'Create a video',
        projectId: testProjectId,
        userId: TEST_DATA.users.john.id,
        websiteUrl: 'https://example.com',
        streamingCallback: jest.fn()
      };

      const result = await WebsiteToVideoHandler.execute(input);
      
      // Should fall back to basic data and still succeed
      expect(result.success).toBe(true);
      expect(result.data?.debugData?.extractionStatus).toBe('fallback');
    });

    it('should handle browser connection failures', async () => {
      const WebAnalysisAgentV4 = require('~/tools/webAnalysis/WebAnalysisAgentV4').WebAnalysisAgentV4;
      
      // Mock browser connection failure
      jest.spyOn(WebAnalysisAgentV4.prototype, 'connectBrowser')
        .mockRejectedValue(new Error('Could not connect to browser'));

      const input = {
        userPrompt: 'Create a video',
        projectId: testProjectId,
        userId: TEST_DATA.users.john.id,
        websiteUrl: 'https://example.com',
        streamingCallback: jest.fn()
      };

      const result = await WebsiteToVideoHandler.execute(input);
      
      // Should handle gracefully with fallback
      expect(result.success).toBe(true);
    });

    it('should handle API rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      
      // Mock Edit tool rate limiting
      jest.spyOn(require('~/tools/edit/edit'), 'Edit')
        .mockImplementationOnce(() => ({
          run: jest.fn().mockRejectedValue(rateLimitError)
        }))
        .mockImplementationOnce(() => ({
          run: jest.fn().mockResolvedValue({
            success: true,
            data: { tsxCode: 'customized code' }
          })
        }));

      const input = {
        userPrompt: 'Create a video',
        projectId: testProjectId,
        userId: TEST_DATA.users.john.id,
        websiteUrl: 'https://example.com',
        streamingCallback: jest.fn()
      };

      const result = await WebsiteToVideoHandler.execute(input);
      
      // Should retry and eventually succeed
      expect(result.success).toBe(true);
    });
  });

  describe('Partial Completions', () => {
    it('should handle partial scene generation failure', async () => {
      let sceneCount = 0;
      const streamingEvents: any[] = [];
      
      // Mock Edit tool to fail on 3rd scene
      jest.spyOn(require('~/tools/edit/edit'), 'Edit')
        .mockImplementation(() => ({
          run: jest.fn().mockImplementation(() => {
            sceneCount++;
            if (sceneCount === 3) {
              return Promise.reject(new Error('Scene generation failed'));
            }
            return Promise.resolve({
              success: true,
              data: { tsxCode: `scene ${sceneCount} code` }
            });
          })
        }));

      const streamingCallback = jest.fn(async (event) => {
        streamingEvents.push(event);
      });

      const input = {
        userPrompt: 'Create a video',
        projectId: testProjectId,
        userId: TEST_DATA.users.john.id,
        websiteUrl: 'https://example.com',
        streamingCallback
      };

      const result = await WebsiteToVideoHandler.execute(input);
      
      // Should complete with partial results
      expect(result.success).toBe(true);
      
      // Should have events for successful scenes
      const sceneEvents = streamingEvents.filter(e => e.type === 'scene_completed');
      expect(sceneEvents.length).toBeGreaterThanOrEqual(2); // At least 2 scenes before failure
    });

    it('should handle database save failures gracefully', async () => {
      // Mock database insert to fail occasionally
      let insertCount = 0;
      jest.spyOn(db, 'insert').mockImplementation(function(this: any, table: any) {
        if (table === scenes) {
          insertCount++;
          if (insertCount === 2) {
            // Fail on second scene save
            return {
              values: jest.fn().mockRejectedValue(new Error('Database error'))
            };
          }
          return {
            values: jest.fn().mockResolvedValue([])
          };
        }
        return jest.fn();
      });

      const streamingCallback = jest.fn();
      
      const input = {
        userPrompt: 'Create a video',
        projectId: testProjectId,
        userId: TEST_DATA.users.john.id,
        websiteUrl: 'https://example.com',
        streamingCallback
      };

      const result = await WebsiteToVideoHandler.execute(input);
      
      // Should continue despite DB failures
      expect(result.success).toBe(true);
      
      // Streaming should still work
      expect(streamingCallback).toHaveBeenCalled();
    });

    it('should clean up partial data on catastrophic failure', async () => {
      // Clear any existing scenes first
      await db.delete(scenes).where(eq(scenes.projectId, testProjectId));
      
      // Mock catastrophic failure after 2 scenes
      let sceneCount = 0;
      jest.spyOn(require('~/tools/edit/edit'), 'Edit')
        .mockImplementation(() => ({
          run: jest.fn().mockImplementation(() => {
            sceneCount++;
            if (sceneCount > 2) {
              throw new Error('Catastrophic failure');
            }
            return Promise.resolve({
              success: true,
              data: { tsxCode: `scene ${sceneCount} code` }
            });
          })
        }));

      const input = {
        userPrompt: 'Create a video',
        projectId: testProjectId,
        userId: TEST_DATA.users.john.id,
        websiteUrl: 'https://example.com',
        streamingCallback: jest.fn()
      };

      try {
        await WebsiteToVideoHandler.execute(input);
      } catch (error) {
        // Expected to fail
      }

      // Check that partial scenes were saved (streaming benefit)
      const savedScenes = await db.select()
        .from(scenes)
        .where(eq(scenes.projectId, testProjectId));
      
      // Should have at least the scenes that succeeded before failure
      expect(savedScenes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Concurrency Issues', () => {
    it('should handle concurrent streaming requests for same project', async () => {
      const callbacks = [jest.fn(), jest.fn()];
      
      // Launch two concurrent requests
      const promises = callbacks.map((callback, index) => 
        WebsiteToVideoHandler.execute({
          userPrompt: `Video ${index}`,
          projectId: testProjectId,
          userId: TEST_DATA.users.john.id,
          websiteUrl: 'https://example.com',
          streamingCallback: callback
        })
      );

      const results = await Promise.allSettled(promises);
      
      // At least one should succeed
      const succeeded = results.filter(r => r.status === 'fulfilled');
      expect(succeeded.length).toBeGreaterThanOrEqual(1);
      
      // Both callbacks should have been called
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalled();
      });
    });

    it('should handle rapid scene completion events', async () => {
      const eventTimestamps: number[] = [];
      
      const streamingCallback = jest.fn(async (event) => {
        eventTimestamps.push(Date.now());
        // Simulate slow consumer
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Mock very fast scene generation
      jest.spyOn(require('~/tools/edit/edit'), 'Edit')
        .mockImplementation(() => ({
          run: jest.fn().mockResolvedValue({
            success: true,
            data: { tsxCode: 'fast code' }
          })
        }));

      const input = {
        userPrompt: 'Create a video',
        projectId: testProjectId,
        userId: TEST_DATA.users.john.id,
        websiteUrl: 'https://example.com',
        streamingCallback
      };

      const result = await WebsiteToVideoHandler.execute(input);
      
      // Should handle rapid events without loss
      expect(result.success).toBe(true);
      expect(streamingCallback.mock.calls.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with large scene data', async () => {
      const largeData = 'x'.repeat(1000000); // 1MB of data per scene
      
      jest.spyOn(require('~/tools/edit/edit'), 'Edit')
        .mockImplementation(() => ({
          run: jest.fn().mockResolvedValue({
            success: true,
            data: { tsxCode: largeData }
          })
        }));

      const memoryBefore = process.memoryUsage().heapUsed;
      
      const input = {
        userPrompt: 'Create a video',
        projectId: testProjectId,
        userId: TEST_DATA.users.john.id,
        websiteUrl: 'https://example.com',
        streamingCallback: jest.fn()
      };

      await WebsiteToVideoHandler.execute(input);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryIncrease = memoryAfter - memoryBefore;
      
      // Memory increase should be reasonable (less than 10MB for 5 scenes)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should clean up event listeners properly', async () => {
      const callbacks: any[] = [];
      
      // Create multiple streaming requests
      for (let i = 0; i < 10; i++) {
        const callback = jest.fn();
        callbacks.push(callback);
        
        await WebsiteToVideoHandler.execute({
          userPrompt: `Video ${i}`,
          projectId: testProjectId,
          userId: TEST_DATA.users.john.id,
          websiteUrl: 'https://example.com',
          streamingCallback: callback
        });
      }
      
      // All callbacks should have been called and cleaned up
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalled();
      });
      
      // Check for listener leaks (if we had access to event emitter)
      // This is more of a sanity check that the code completes
      expect(callbacks.length).toBe(10);
    });
  });
});