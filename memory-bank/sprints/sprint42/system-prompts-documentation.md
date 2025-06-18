# System Prompts Documentation

This document catalogs all system prompts found in `/src/config/prompts.config.ts`, categorized by their purpose and indicating which ones are actively used in the pipeline.

## Overview

The system contains **20 distinct system prompts** organized into 5 main categories:
1. Brain Orchestrator Prompts (1)
2. MCP Tools Prompts (9)
3. Core Services Prompts (7)
4. Vision and Image Prompts (3)
5. AI Services Prompts (4)

## 1. Brain Orchestrator Prompts

### BRAIN_ORCHESTRATOR ✅ ACTIVE
- **Purpose**: Intelligent motion graphics assistant that analyzes user requests and selects the best tool
- **Key Features**:
  - Multi-step workflow detection
  - Scene boundary rules
  - Multimodal image handling
  - Tool selection hierarchy
- **Usage**: Used in `/src/brain/orchestrator_functions/intentAnalyzer.ts`
- **Status**: Core component of the new orchestration system

## 2. MCP Tools Prompts

### ADD_SCENE ❌ NOT ACTIVELY USED
- **Purpose**: Create new Remotion scenes based on user descriptions
- **Key Features**: Scene type selection, duration suggestions, style consistency
- **Status**: Referenced in config but not found in active codebase

### EDIT_SCENE ❌ NOT ACTIVELY USED
- **Purpose**: Modify existing Remotion scenes
- **Key Features**: Surgical/creative/structural edit types, duration detection
- **Status**: Referenced in config but not found in active codebase

### DELETE_SCENE ❌ NOT ACTIVELY USED
- **Purpose**: Handle scene deletion requests
- **Key Features**: Deletion confirmation, alternatives suggestion
- **Status**: Referenced in config but not found in active codebase

### CHANGE_DURATION ❌ NOT ACTIVELY USED
- **Purpose**: Modify scene durations without touching animation code
- **Key Features**: Duration pattern detection, timeline updates
- **Status**: Referenced in config but not found in active codebase

### ANALYZE_IMAGE ❌ NOT ACTIVELY USED
- **Purpose**: Analyze uploaded images for video creation
- **Key Features**: Visual content analysis, style extraction, video potential
- **Status**: Referenced in config but not found in active codebase

### CREATE_SCENE_FROM_IMAGE ❌ NOT ACTIVELY USED
- **Purpose**: Generate new video scenes based on uploaded images
- **Key Features**: Visual theme extraction, animation generation
- **Status**: Referenced in config but not found in active codebase

### EDIT_SCENE_WITH_IMAGE ❌ NOT ACTIVELY USED
- **Purpose**: Modify existing scenes using uploaded images as reference
- **Key Features**: Image integration, style matching
- **Status**: Referenced in config but not found in active codebase

### FIX_BROKEN_SCENE ✅ ACTIVE
- **Purpose**: Fix specific errors in broken scenes while preserving 99% of original code
- **Key Features**: 
  - Surgical error fixes only
  - Export pattern corrections
  - Font family fixes
  - Interpolate() outputRange fixes
- **Usage**: Used in `/src/server/services/scene/edit/ErrorFixer.ts`
- **Status**: Critical component for error recovery

## 3. Core Services Prompts

### CODE_GENERATOR_WITH_REFERENCE ✅ ACTIVE
- **Purpose**: Generate NEW scene code based on previous scene style
- **Key Features**: Style consistency, reference-based generation
- **Usage**: Used in `/src/tools/add/add_helpers/CodeGeneratorNEW.ts`
- **Status**: Fast path for code generation

### CODE_GENERATOR ✅ ACTIVE
- **Purpose**: Convert JSON guidance to high-quality Remotion code
- **Key Features**: 
  - Critical ESM rules
  - Export pattern enforcement
  - Font family restrictions
  - Interpolate() outputRange validation
- **Usage**: Used in multiple code generation services
- **Status**: Core code generation prompt

### DIRECT_CODE_EDITOR_SURGICAL ✅ ACTIVE
- **Purpose**: Make precise, minimal changes to existing Remotion scene code
- **Key Features**: Minimal modifications, preservation of animations
- **Usage**: Used in surgical edit operations
- **Status**: Active for precise edits

### DIRECT_CODE_EDITOR_SURGICAL_UNIFIED ✅ ACTIVE
- **Purpose**: Unified surgical editing with duration detection
- **Key Features**: Single operation for changes and duration analysis
- **Usage**: Used in `/src/tools/edit/edit_helpers/SurgicalEditorNEW.ts`
- **Status**: Primary surgical edit prompt

### DIRECT_CODE_EDITOR_CREATIVE ✅ ACTIVE
- **Purpose**: Make creative improvements to existing code
- **Key Features**: Visual design enhancements, modern effects
- **Usage**: Used in creative edit operations
- **Status**: Active for creative modifications

### DIRECT_CODE_EDITOR_CREATIVE_UNIFIED ✅ ACTIVE
- **Purpose**: Unified creative editing with duration detection
- **Key Features**: Creative improvements with timing analysis
- **Usage**: Used in `/src/tools/edit/edit_helpers/CreativeEditorNEW.ts`
- **Status**: Primary creative edit prompt

### DIRECT_CODE_EDITOR_STRUCTURAL ❌ NOT ACTIVELY USED
- **Purpose**: Make structural changes to code layout
- **Key Features**: Layout reorganization, element repositioning
- **Status**: Defined but not found in active usage

### DIRECT_CODE_EDITOR_STRUCTURAL_UNIFIED ❌ NOT ACTIVELY USED
- **Purpose**: Unified structural editing with duration detection
- **Key Features**: Layout changes with timing analysis
- **Status**: Defined but not found in active usage

### SCENE_BUILDER ❌ NOT ACTIVELY USED
- **Purpose**: Coordinate scene creation and technical implementation
- **Key Features**: Scene processing, validation, integration
- **Status**: Referenced in config but not found in active codebase

### LAYOUT_GENERATOR ❌ NOT ACTIVELY USED
- **Purpose**: Generate optimal layouts for scene content
- **Key Features**: Responsive layouts, visual hierarchy
- **Status**: Referenced in config but not found in active codebase

### IMAGE_CODE_GENERATOR ❌ NOT ACTIVELY USED
- **Purpose**: Generate motion graphics from images
- **Key Features**: Image-based animation creation
- **Status**: Defined but not found in active usage

## 4. Vision and Image Prompts

### VISION_ANALYSIS ❌ NOT ACTIVELY USED
- **Purpose**: Analyze images and visual content for video creation
- **Key Features**: Content identification, style analysis
- **Status**: Referenced in config but not found in active codebase

### VISION_ANALYZE_IMAGE ✅ ACTIVE
- **Purpose**: Extract EXACT visual specifications for 1:1 motion graphics recreation
- **Key Features**: 
  - Pixel-perfect specifications
  - Exact color extraction
  - Element positioning
  - Motion graphics focus
- **Usage**: Used in `/src/server/services/generation/codeGenerator.service.ts`
- **Status**: Active for image analysis

### IMAGE_DESCRIPTION ❌ NOT ACTIVELY USED
- **Purpose**: Generate detailed descriptions of uploaded images
- **Key Features**: Visual element description, creative interpretation
- **Status**: Referenced in config but not found in active codebase

## 5. Image-to-Code Prompts

### IMAGE_TO_CODE ✅ ACTIVE
- **Purpose**: Recreate uploaded images as animated React/Remotion components
- **Key Features**: 
  - 1:1 visual recreation
  - Motion graphics additions
  - ESM compliance
- **Usage**: Used in image-to-code generation workflows
- **Status**: Active for image-based generation

### IMAGE_GUIDED_EDIT ❌ NOT ACTIVELY USED
- **Purpose**: Update existing code based on image references
- **Key Features**: Style matching, layout updates
- **Status**: Defined but not found in active usage

## 6. AI Services Prompts

### PREFERENCE_EXTRACTOR ✅ ACTIVE
- **Purpose**: Analyze user conversations to extract persistent preferences
- **Key Features**: 
  - Explicit/implicit preference detection
  - Confidence scoring
  - Context-aware preferences
- **Usage**: Used in `/src/server/services/brain/preferenceExtractor.service.ts`
- **Status**: Active for preference learning

### TITLE_GENERATOR ✅ ACTIVE
- **Purpose**: Generate concise, descriptive titles for video projects
- **Key Features**: 2-6 word titles, professional tone
- **Usage**: Used in `/src/server/services/ai/titleGenerator.service.ts`
- **Status**: Active for project naming

### CONVERSATIONAL_RESPONSE ✅ ACTIVE
- **Purpose**: Generate brief, friendly responses about completed operations
- **Key Features**: Concise feedback, encouraging tone
- **Usage**: Used in `/src/server/services/ai/conversationalResponse.service.ts`
- **Status**: Active for user communication

### CLARIFICATION_QUESTION ❌ NOT ACTIVELY USED
- **Purpose**: Ask clarification questions for ambiguous requests
- **Key Features**: Specific questions, helpful guidance
- **Status**: Defined but not found in active usage

## Summary

### Actively Used Prompts (12/20):
1. **BRAIN_ORCHESTRATOR** - Core orchestration
2. **FIX_BROKEN_SCENE** - Error recovery
3. **CODE_GENERATOR_WITH_REFERENCE** - Fast path generation
4. **CODE_GENERATOR** - Standard code generation
5. **DIRECT_CODE_EDITOR_SURGICAL** - Precise edits
6. **DIRECT_CODE_EDITOR_SURGICAL_UNIFIED** - Unified surgical edits
7. **DIRECT_CODE_EDITOR_CREATIVE** - Creative modifications
8. **DIRECT_CODE_EDITOR_CREATIVE_UNIFIED** - Unified creative edits
9. **VISION_ANALYZE_IMAGE** - Image analysis
10. **IMAGE_TO_CODE** - Image-based generation
11. **PREFERENCE_EXTRACTOR** - User preference learning
12. **TITLE_GENERATOR** - Project naming
13. **CONVERSATIONAL_RESPONSE** - User feedback

### Unused/Legacy Prompts (8/20):
- Most MCP tool prompts (ADD_SCENE, EDIT_SCENE, DELETE_SCENE, etc.)
- Structural editing prompts
- Some image-related prompts
- CLARIFICATION_QUESTION

### Key Observations:
1. The system has moved from individual MCP tool prompts to a unified orchestrator approach
2. Direct code editing prompts (surgical/creative) are actively used
3. Image processing has specific active prompts (VISION_ANALYZE_IMAGE, IMAGE_TO_CODE)
4. Many legacy prompts remain in the config but are not actively used
5. The active prompts focus on code generation, editing, error fixing, and user interaction