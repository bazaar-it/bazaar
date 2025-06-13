# TICKET-001: Generate Types from Database Schema - Progress

## Status: IN PROGRESS

## Objective
Create automated type generation from Drizzle schema to ensure `tsxCode` is used everywhere (never `code`, `existingCode`, or `sceneCode`).

## What I've Done So Far

### ✅ Step 1: Created Type Generation Script
- Created `/scripts/generate-types.ts` that generates TypeScript interfaces from database schema
- Focused on tables used in current architecture (removed `customComponentJobs` as it's not used)
- Script generates `SceneEntity` with `tsxCode` field (never `code` or `existingCode`)

### ✅ Step 2: Generated Types File
- Running `npm run generate:types` creates `/src/generated/entities.ts`
- Key types generated:
  - `SceneEntity` - with `tsxCode` field
  - `ProjectEntity`
  - `MessageEntity`
  - `SceneIterationEntity`
  - `ProjectMemoryEntity`
  - `ImageAnalysisEntity`

### ✅ Step 3: Added NPM Scripts
- Added `"generate:types": "tsx scripts/generate-types.ts"` to package.json
- Modified `"dev"` to run type generation first: `"npm run generate:types && next dev"`
- Modified `"build"` to run type generation first: `"npm run generate:types && next build"`

### 🔄 Step 4: Update Imports (IN PROGRESS)
Need to update all files that import Scene types to use the generated types instead of manual definitions.

## Current State

The type generation system is working. When you run:
- `npm run dev` - Types are generated before starting dev server
- `npm run build` - Types are generated before building
- `npm run generate:types` - Manually generate types

## Next Steps

1. Find all files importing Scene types from schema
2. Update them to import from `~/generated/entities` instead
3. Remove manual Scene type definitions
4. Ensure TypeScript compilation fails if anyone tries to use `existingCode`

## Key Achievement

The generated `SceneEntity` type ensures `tsxCode` is the only valid field name. Using `code`, `existingCode`, or `sceneCode` will cause TypeScript compilation errors.