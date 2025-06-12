// src/lib/types/api/service-contracts.ts
// Service-level contracts for the simplified 3-tool architecture

import type { Scene } from '@/server/db/schema';
import type { StandardApiResponse, SceneOperationResponse, DeleteOperationResponse } from './golden-rule-contracts';

/**
 * Debug information shared across services
 */
export interface ServiceDebugInfo {
  prompt?: { system: string; user: string };
  response?: string;
  parsed?: any;
  generationTime?: number;
  [key: string]: any; // Allow service-specific debug fields
}

/**
 * Base response for all internal services
 * Note: These are internal - public API uses StandardApiResponse
 */
export interface BaseServiceResponse {
  reasoning: string;
  debug?: ServiceDebugInfo;
}

/**
 * Layout generation service response (internal)
 */
export interface LayoutServiceResponse extends BaseServiceResponse {
  layoutJson: any; // Raw JSON object (not stringified)
}

/**
 * Code generation service response (internal)
 * Used by: CodeGenerator, ImageToCodeGenerator
 */
export interface CodeServiceResponse extends BaseServiceResponse {
  tsxCode: string;    // Generated TSX code (using DB field name)
  name: string;       // Scene name
  duration: number;   // Duration in frames
}

/**
 * Code editing service response (internal)
 * Used by: SurgicalEditor, CreativeEditor, ErrorFixer
 */
export interface CodeEditServiceResponse extends BaseServiceResponse {
  tsxCode: string;            // Updated TSX code (using DB field name)
  changes: string[];          // List of changes made
  preserved: string[];        // List of things preserved
  newDurationFrames?: number; // New duration if changed
}

/**
 * Simplified Scene Service Contract
 * Public interface for the 3-tool architecture
 */
export interface SceneServiceContract {
  // Add scene (handles both text and image creation)
  addScene(input: {
    projectId: string;
    prompt: string;
    imageUrls?: string[];
    order?: number;
    previousSceneJson?: string;
  }): Promise<StandardApiResponse<SceneOperationResponse>>;
  
  // Edit scene (handles all edit types)
  editScene(input: {
    sceneId: string;
    prompt?: string;
    editType?: 'surgical' | 'creative' | 'fix';
    imageUrls?: string[];
    duration?: number;
  }): Promise<StandardApiResponse<SceneOperationResponse>>;
  
  // Delete scene
  deleteScene(input: {
    sceneId: string;
  }): Promise<StandardApiResponse<DeleteOperationResponse>>;
}

/**
 * Internal service contracts for modular architecture
 */
export interface InternalServiceContracts {
  // Layout generation
  layoutGenerator: {
    generateLayout(prompt: string, context?: any): Promise<LayoutServiceResponse>;
  };
  
  // Code generation
  codeGenerator: {
    generateCode(layoutJson: any, prompt: string): Promise<CodeServiceResponse>;
  };
  
  // Image to code
  imageToCodeGenerator: {
    generateFromImage(imageUrls: string[], prompt: string): Promise<CodeServiceResponse>;
  };
  
  // Editors
  surgicalEditor: {
    edit(code: string, prompt: string, imageUrls?: string[]): Promise<CodeEditServiceResponse>;
  };
  
  creativeEditor: {
    edit(code: string, prompt: string, imageUrls?: string[]): Promise<CodeEditServiceResponse>;
  };
  
  errorFixer: {
    fix(code: string, error: string): Promise<CodeEditServiceResponse>;
  };
}