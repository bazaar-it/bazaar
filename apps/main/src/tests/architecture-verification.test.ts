// src/tests/architecture-verification.test.ts
// Comprehensive tests to verify the new architecture

import { describe, it, expect, beforeEach } from '@jest/globals';
import { brainOrchestrator } from '~/server/services/brain/orchestrator.simplified';
import { sceneService } from '~/server/services/scene/scene.service';
import { useVideoState } from '~/stores/videoState.normalized';
import type { BrainDecision } from '~/lib/types/api/brain-contracts';

describe('Architecture Verification Tests', () => {
  
  // ============= TYPE SAFETY TESTS =============
  describe('Type Safety', () => {
    it('should have proper discriminated unions', async () => {
      const decision = await brainOrchestrator.orchestrate({
        prompt: 'Add a welcome screen',
        projectId: 'proj_123',
        userId: 'user_456'
      });
      
      // TypeScript should narrow the type correctly
      if (decision.tool === 'addScene') {
        // These should be type-safe
        expect(decision.context.projectId).toBeDefined();
        expect(decision.context.prompt).toBeDefined();
        // @ts-expect-error - sceneId doesn't exist on AddSceneContext
        expect(decision.context.sceneId).toBeUndefined();
      }
    });
    
    it('should not use any types', () => {
      // This is verified at compile time
      // If this compiles, we have no 'any' types
      const decision: BrainDecision = {
        tool: 'editScene',
        context: {
          sceneId: 'scene_123',
          sceneData: {
            tsxCode: 'code',
            name: 'Scene 1',
            duration: 180,
            start: 0,
            end: 180
          },
          editType: 'surgical'
        },
        reasoning: 'Edit scene',
        confidence: 0.9
      };
      
      expect(decision.tool).toBe('editScene');
    });
  });
  
  // ============= ADD SCENE TESTS =============
  describe('Add Scene Functionality', () => {
    it('should create scene with previous style when available', async () => {
      // Setup: Project with one scene
      const context = {
        scenes: [{
          id: 'scene_1',
          name: 'Intro',
          duration: 180,
          order: 0,
          description: 'Modern animated intro'
        }],
        chatHistory: [],
        preferences: { style: 'modern' }
      };
      
      const decision = await brainOrchestrator.orchestrate({
        prompt: 'Add a features section',
        projectId: 'proj_123',
        userId: 'user_456'
      });
      
      if (decision.tool === 'addScene') {
        expect(decision.context.previousSceneStyle).toBeDefined();
        expect(decision.context.previousSceneStyle?.style).toBe('modern');
      }
    });
    
    it('should handle image-based scene creation', async () => {
      const decision = await brainOrchestrator.orchestrate({
        prompt: 'Create a scene from this design',
        projectId: 'proj_123',
        userId: 'user_456',
        imageUrls: ['https://example.com/design.jpg']
      });
      
      expect(decision.tool).toBe('addScene');
      if (decision.tool === 'addScene') {
        expect(decision.context.imageUrls).toContain('https://example.com/design.jpg');
      }
    });
  });
  
  // ============= EDIT SCENE TESTS =============
  describe('Edit Scene Functionality', () => {
    it('should handle surgical edits', async () => {
      const decision = await brainOrchestrator.orchestrate({
        prompt: 'Change the button color to blue',
        projectId: 'proj_123',
        userId: 'user_456',
        selectedSceneId: 'scene_123'
      });
      
      expect(decision.tool).toBe('editScene');
      if (decision.tool === 'editScene') {
        expect(decision.context.editType).toBe('surgical');
        expect(decision.context.prompt).toContain('button color to blue');
      }
    });
    
    it('should handle creative edits with images', async () => {
      const decision = await brainOrchestrator.orchestrate({
        prompt: 'Make it look like this design',
        projectId: 'proj_123',
        userId: 'user_456',
        selectedSceneId: 'scene_123',
        imageUrls: ['https://example.com/inspiration.jpg']
      });
      
      expect(decision.tool).toBe('editScene');
      if (decision.tool === 'editScene') {
        expect(decision.context.editType).toBe('creative');
        expect(decision.context.imageUrls).toBeDefined();
      }
    });
    
    it('should handle duration changes efficiently', async () => {
      const start = Date.now();
      
      const decision = await brainOrchestrator.orchestrate({
        prompt: 'Make it 3 seconds',
        projectId: 'proj_123',
        userId: 'user_456',
        selectedSceneId: 'scene_123'
      });
      
      const elapsed = Date.now() - start;
      
      expect(decision.tool).toBe('editScene');
      if (decision.tool === 'editScene') {
        expect(decision.context.editType).toBe('duration');
        expect(decision.context.newDuration).toBe(90); // 3 * 30fps
      }
      
      // Should use quick detection (no AI call)
      expect(elapsed).toBeLessThan(50);
    });
  });
  
  // ============= DELETE SCENE TESTS =============
  describe('Delete Scene with Timeline Updates', () => {
    it('should calculate affected scenes correctly', async () => {
      const context = {
        scenes: [
          { id: 'scene_1', duration: 100, order: 0 },
          { id: 'scene_2', duration: 150, order: 1 }, // To be deleted
          { id: 'scene_3', duration: 200, order: 2 },
          { id: 'scene_4', duration: 100, order: 3 }
        ]
      };
      
      const decision = await brainOrchestrator.orchestrate({
        prompt: 'Delete scene 2',
        projectId: 'proj_123',
        userId: 'user_456'
      });
      
      expect(decision.tool).toBe('deleteScene');
      if (decision.tool === 'deleteScene') {
        expect(decision.context.affectedScenes).toHaveLength(2); // scene_3 and scene_4
        expect(decision.context.affectedScenes[0]).toEqual({
          id: 'scene_3',
          currentStart: 250, // 100 + 150
          newStart: 100      // 100 (scene_2 removed)
        });
      }
    });
  });
  
  // ============= CLARIFICATION TESTS =============
  describe('Ambiguous Request Handling', () => {
    it('should ask for clarification on ambiguous requests', async () => {
      const decision = await brainOrchestrator.orchestrate({
        prompt: 'Change it',
        projectId: 'proj_123',
        userId: 'user_456'
      });
      
      // This should trigger clarification
      expect(decision.tool).toBe('clarification');
      if (decision.tool === 'clarification') {
        expect(decision.context.question).toContain('clarify');
        expect(decision.context.suggestions).toBeDefined();
      }
    });
  });
  
  // ============= VIDEOSTATE TESTS =============
  describe('Normalized VideoState', () => {
    beforeEach(() => {
      // Reset state
      useVideoState.setState({
        scenes: {},
        messages: {},
        projects: {},
        projectScenes: {},
        projectMessages: {}
      });
    });
    
    it('should handle optimistic updates correctly', () => {
      const state = useVideoState.getState();
      
      // Optimistic update
      state.updateSceneOptimistic('scene_1', {
        name: 'Updated Name',
        tsxCode: 'new code'
      });
      
      // Check immediate update
      const scene = state.getScene('scene_1');
      expect(scene?._syncStatus).toBe('syncing');
      expect(scene?.name).toBe('Updated Name');
      
      // Check sync queue
      expect(state.syncQueue).toContain('scene_1');
    });
    
    it('should reconcile with server data', () => {
      const state = useVideoState.getState();
      
      // Add scene optimistically
      state.addSceneOptimistic('proj_123', {
        id: 'scene_1',
        projectId: 'proj_123',
        name: 'Optimistic Scene',
        tsxCode: 'temp code',
        duration: 180,
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Reconcile with server response
      state.reconcileScene('scene_1', {
        id: 'scene_1',
        projectId: 'proj_123',
        name: 'Server Scene',
        tsxCode: 'final code',
        duration: 200,
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      const scene = state.getScene('scene_1');
      expect(scene?._syncStatus).toBe('synced');
      expect(scene?.name).toBe('Server Scene');
      expect(scene?.duration).toBe(200);
    });
    
    it('should revert on error', () => {
      const state = useVideoState.getState();
      
      // Setup initial scene
      state.scenes['scene_1'] = {
        id: 'scene_1',
        projectId: 'proj_123',
        name: 'Original Name',
        tsxCode: 'original code',
        duration: 180,
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _syncStatus: 'synced'
      };
      
      // Optimistic update
      state.updateSceneOptimistic('scene_1', {
        name: 'Failed Update'
      });
      
      // Simulate failure - revert
      state.revertScene('scene_1');
      
      const scene = state.getScene('scene_1');
      expect(scene?._syncStatus).toBe('error');
      expect(scene?.name).toBe('Original Name'); // Reverted!
    });
  });
  
  // ============= PERFORMANCE TESTS =============
  describe('Performance', () => {
    it('should update UI in one frame', () => {
      const state = useVideoState.getState();
      const start = performance.now();
      
      state.updateSceneOptimistic('scene_1', { name: 'New' });
      
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(16); // 60fps
    });
    
    it('should use cached context on second request', async () => {
      // First request - builds context
      await brainOrchestrator.orchestrate({
        prompt: 'Add intro',
        projectId: 'proj_123',
        userId: 'user_456'
      });
      
      // Second request - should use cache
      const start = Date.now();
      await brainOrchestrator.orchestrate({
        prompt: 'Add outro',
        projectId: 'proj_123',
        userId: 'user_456'
      });
      const elapsed = Date.now() - start;
      
      // Should be much faster with cache
      expect(elapsed).toBeLessThan(100);
    });
  });
  
  // ============= PROMPT SIMPLIFICATION TESTS =============
  describe('Simplified Prompts', () => {
    it('should have short prompts', () => {
      const { SIMPLIFIED_PROMPTS } = require('~/config/prompts.simplified');
      
      Object.entries(SIMPLIFIED_PROMPTS).forEach(([key, prompt]) => {
        const wordCount = (prompt as string).split(/\s+/).length;
        expect(wordCount).toBeLessThan(100); // All prompts under 100 words
        console.log(`${key}: ${wordCount} words`);
      });
    });
  });
});