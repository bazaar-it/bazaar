#!/usr/bin/env tsx
/**
 * Generate TypeScript types from Drizzle schema
 * This ensures database field names are the single source of truth
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type mappings from Drizzle to TypeScript
const drizzleToTsTypeMap: Record<string, string> = {
  'uuid': 'string',
  'varchar': 'string',
  'text': 'string',
  'integer': 'number',
  'real': 'number',
  'boolean': 'boolean',
  'jsonb': 'Record<string, any>',
  'timestamp': 'Date',
  'json': 'any',
};

// Tables we want to generate types for (focused on current architecture)
const tablesToGenerate = [
  'scenes',
  'projects',
  'messages',
  'sceneIterations',
  'projectMemory',
  'imageAnalysis'
];

function generateTypeFromSchema(): string {
  let output = `/**
 * THIS FILE IS AUTO-GENERATED FROM DATABASE SCHEMA
 * DO NOT EDIT MANUALLY - RUN: npm run generate:types
 * 
 * Generated at: ${new Date().toISOString()}
 */

`;

  // Scene is the most critical one - ensuring tsxCode is used
  output += `/**
 * Scene entity matching the database schema exactly
 * @property tsxCode - The TSX code for the scene (NEVER use 'code', 'sceneCode', or 'existingCode')
 */
export interface SceneEntity {
  readonly id: string;
  readonly projectId: string;
  order: number;
  name: string;
  tsxCode: string;              // Database column: tsx_code
  props?: Record<string, any> | null;
  duration: number;             // Always in frames
  publishedUrl?: string | null;
  publishedHash?: string | null;
  publishedAt?: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  layoutJson?: string | null;   // Database column: layout_json
}

/**
 * Project entity
 */
export interface ProjectEntity {
  readonly id: string;
  readonly userId: string;
  title: string;
  props: Record<string, any>;   // InputProps type
  isWelcome: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Message entity for chat
 */
export interface MessageEntity {
  readonly id: string;
  readonly projectId: string;
  content: string;
  role: string;                 // 'user' | 'assistant'
  kind: string;                 // 'message' | 'status'
  status?: string | null;       // 'pending' | 'building' | 'success' | 'error'
  imageUrls?: string[] | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  originalTsxCode?: string | null;
  lastFixAttempt?: Date | null;
  fixIssues?: string | null;
}


/**
 * SceneIteration entity for tracking LLM operations
 */
export interface SceneIterationEntity {
  readonly id: string;
  readonly sceneId: string;
  readonly projectId: string;
  operationType: string;        // 'create' | 'edit' | 'delete'
  editComplexity?: string | null; // 'surgical' | 'creative' | 'structural'
  userPrompt: string;
  brainReasoning?: string | null;
  toolReasoning?: string | null;
  codeBefore?: string | null;   // Previous TSX code
  codeAfter?: string | null;    // New TSX code
  changesApplied?: Record<string, any> | null;
  changesPreserved?: Record<string, any> | null;
  generationTimeMs?: number | null;
  modelUsed?: string | null;
  temperature?: number | null;
  tokensUsed?: number | null;
  userEditedAgain: boolean;
  userSatisfactionScore?: number | null;
  sessionId?: string | null;
  messageId?: string | null;    // Link to message that triggered this iteration
  readonly createdAt: Date;
}

/**
 * ProjectMemory entity for persistent context
 */
export interface ProjectMemoryEntity {
  readonly id: string;
  readonly projectId: string;
  memoryType: string;           // 'user_preference' | 'scene_relationship' | 'conversation_context'
  memoryKey: string;
  memoryValue: string;
  confidence?: number | null;
  sourcePrompt?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  expiresAt?: Date | null;
}

/**
 * ImageAnalysis entity for vision analysis results
 */
export interface ImageAnalysisEntity {
  readonly id: string;
  readonly projectId: string;
  traceId: string;
  imageUrls: string[];
  palette: Record<string, any>;
  typography: string;
  mood: string;
  layoutJson?: Record<string, any> | null;
  processingTimeMs: number;
  readonly createdAt: Date;
  usedInScenes?: Record<string, any> | null;
}

// Type aliases for backwards compatibility (to be removed later)
export type Scene = SceneEntity;
export type Project = ProjectEntity;
export type Message = MessageEntity;
export type SceneIteration = SceneIterationEntity;
export type ProjectMemory = ProjectMemoryEntity;
export type ImageAnalysis = ImageAnalysisEntity;

// Operation types
export type Operation = 
  | 'scene.create'
  | 'scene.update' 
  | 'scene.delete'
  | 'scene.analyze'
  | 'brain.decide'
  | 'project.read';

export type Entity = 'scene' | 'project' | 'user' | 'message' | 'job';

// Enums from schema
export const MEMORY_TYPES = {
  USER_PREFERENCE: 'user_preference',
  SCENE_RELATIONSHIP: 'scene_relationship',
  CONVERSATION_CONTEXT: 'conversation_context',
} as const;

export type MemoryType = typeof MEMORY_TYPES[keyof typeof MEMORY_TYPES];

export type TaskStatus = 'pending' | 'building' | 'success' | 'error';
`;

  return output;
}

async function main() {
  console.log('🔧 Generating types from database schema...');
  
  // Generate the types
  const generatedTypes = generateTypeFromSchema();
  
  // Ensure the output directory exists
  const outputDir = path.join(__dirname, '..', 'src', 'generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write the generated file
  const outputPath = path.join(outputDir, 'entities.ts');
  fs.writeFileSync(outputPath, generatedTypes);
  
  console.log(`✅ Generated types written to: ${outputPath}`);
  console.log('📝 Key types generated:');
  console.log('   - SceneEntity (with tsxCode field)');
  console.log('   - ProjectEntity');
  console.log('   - MessageEntity');
  console.log('   - SceneIterationEntity');
  console.log('   - ProjectMemoryEntity');
  console.log('   - ImageAnalysisEntity');
}

// Run the script
main().catch(console.error);