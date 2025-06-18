# Model Configuration Simplification

## Summary

Simplified the model configuration from 17+ models down to just 4 models that are actually used in the codebase.

## Changes Made

### 1. Model Packs
Created 3 clean model packs:
- **optimal-pack** (default): Best balance with GPT-4.1 brain + Claude Sonnet 4 for code
- **anthropic-pack**: All Claude Sonnet 4
- **openai-pack**: All OpenAI (GPT-4.1 + GPT-4o-mini)

### 2. Models Used
Only 4 models are now configured:
- `brain`: For orchestration decisions
- `codeGenerator`: For generating new scene code
- `editScene`: For editing existing scenes
- `titleGenerator`: For generating titles

### 3. Removed Models
Deleted all unused models:
- addScene, deleteScene (tools don't use AI)
- analyzeImage, createSceneFromImage, editSceneWithImage
- fixBrokenScene, sceneBuilder, layoutGenerator
- directCodeEditor (surgical/creative/structural)
- visionAnalysis, imageDescription

### 4. Files Updated
- `/src/config/models.config.ts` - Complete rewrite with only 4 models
- `/src/lib/types/ai/brain.types.ts` - Added missing fields to ToolSelectionResult
- `/src/lib/evals/types.ts` - Updated ServiceType to only include used services
- `/src/lib/evals/suites/basic-prompts.ts` - Updated model packs and services

### 5. API Key Configuration
The client registry now only initializes providers when needed, reducing startup overhead.

## Benefits
- Cleaner, simpler configuration
- Reduced complexity
- Only pay for models actually used
- Easier to understand and maintain