# TICKET-001: Generate Types from Database Schema

## Overview
Create automated type generation from Drizzle schema to ensure `tsxCode` is used everywhere (never `code`, `existingCode`, or `sceneCode`).

## Current State

### Problem Areas
1. **Manual type definitions** scattered across codebase:
   - `/src/tools/helpers/types.ts` has `existingCode` instead of `tsxCode`
   - `/src/lib/types/api/golden-rule-contracts.ts` has manual Scene interface
   - Multiple places define scene types differently

2. **Field name inconsistencies**:
   ```typescript
   // Current EditToolInput (WRONG)
   export interface EditToolInput extends BaseToolInput {
     sceneId: string;
     existingCode: string;  // ❌ Should be tsxCode
     editType: 'creative' | 'surgical' | 'error-fix';
   }
   ```

3. **Database schema** in `/src/server/db/schema.ts`:
   ```typescript
   export const scenes = pgTable('scenes', {
     id: uuid('id').defaultRandom().primaryKey(),
     projectId: uuid('project_id').references(() => projects.id),
     name: text('name').notNull(),
     tsxCode: text('tsx_code').notNull(),  // ← This is the truth!
     duration: integer('duration').notNull(),
     // ...
   });
   ```

## Implementation Plan

### Step 1: Create Type Generation Script

Create `/scripts/generate-types.ts`:
```typescript
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/server/db/schema';
import fs from 'fs';
import path from 'path';

async function generateTypes() {
  // Read the schema and generate TypeScript types
  const schemaTypes = generateSchemaTypes(schema);
  
  // Generate the output file
  const output = `
// THIS FILE IS AUTO-GENERATED FROM DATABASE SCHEMA
// DO NOT EDIT MANUALLY - RUN npm run generate:types

export interface SceneEntity {
  readonly id: string;
  readonly projectId: string;
  name: string;
  tsxCode: string;      // Database column: tsx_code
  duration: number;     // Always in frames (30fps)
  order: number;
  layoutJson?: string | null;
  props?: Record<string, any> | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProjectEntity {
  readonly id: string;
  readonly userId: string;
  name: string;
  description?: string | null;
  isWelcome: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface UserEntity {
  readonly id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
`;

  // Write to file
  const outputPath = path.join(process.cwd(), 'src/generated/entities.ts');
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, output);
  
  console.log('✅ Types generated successfully at:', outputPath);
}

generateTypes().catch(console.error);
```

### Step 2: Update package.json

Add scripts:
```json
{
  "scripts": {
    "generate:types": "tsx scripts/generate-types.ts",
    "dev": "npm run generate:types && next dev",
    "build": "npm run generate:types && next build",
    "db:push": "drizzle-kit push:pg && npm run generate:types"
  }
}
```

### Step 3: Create Generated Types Directory

Create `/src/generated/` directory with `.gitignore`:
```
# Ignore all files except .gitignore
*
!.gitignore
!entities.ts
```

### Step 4: Update All Imports

Replace all manual type imports with generated ones:

1. **Update tool types** `/src/tools/helpers/types.ts`:
   ```typescript
   import { SceneEntity } from '~/generated/entities';
   
   export interface EditToolInput extends BaseToolInput {
     sceneId: string;
     tsxCode: string;  // ✓ Fixed! Was existingCode
     editType: 'creative' | 'surgical' | 'error-fix';
     imageUrls?: string[];
     visionAnalysis?: any;
     errorDetails?: string;
   }
   ```

2. **Update all services** to import from generated:
   ```typescript
   import { SceneEntity, ProjectEntity } from '~/generated/entities';
   ```

3. **Remove manual definitions** from:
   - `/src/lib/types/api/golden-rule-contracts.ts` (Scene interface)
   - Any other manual scene type definitions

## After Implementation

### File Structure
```
src/
├── generated/
│   ├── .gitignore
│   └── entities.ts          # Auto-generated, DO NOT EDIT
├── tools/
│   └── helpers/
│       └── types.ts         # Now uses tsxCode everywhere
└── server/
    └── db/
        └── schema.ts        # Source of truth
```

### Type Safety Achieved
```typescript
// This will now cause TypeScript error:
const scene: SceneEntity = {
  existingCode: "...",  // ❌ Property 'existingCode' does not exist
  code: "...",         // ❌ Property 'code' does not exist
  tsxCode: "...",      // ✓ Only this works!
};
```

## Testing Plan

### 1. Type Generation Test
```bash
# Run type generation
npm run generate:types

# Verify file exists
ls -la src/generated/entities.ts

# Check content has tsxCode field
grep "tsxCode" src/generated/entities.ts
```

### 2. Compilation Test
```bash
# Should fail if any file uses existingCode
npm run typecheck

# Expected errors for any usage of:
# - existingCode
# - code
# - sceneCode
```

### 3. Integration Test
Create test file `/src/test-types.ts`:
```typescript
import { SceneEntity } from './generated/entities';

// This should compile
const validScene: SceneEntity = {
  id: '123',
  projectId: '456',
  name: 'Test Scene',
  tsxCode: '<div>Hello</div>',
  duration: 150,
  order: 0,
  createdAt: new Date(),
  updatedAt: new Date()
};

// This should NOT compile
const invalidScene: SceneEntity = {
  id: '123',
  existingCode: '<div>Hello</div>',  // ❌ TypeScript error!
};
```

### 4. CI/CD Integration
Add to `.github/workflows/ci.yml`:
```yaml
- name: Generate Types
  run: npm run generate:types
  
- name: Type Check
  run: npm run typecheck
```

## Rollback Plan

If issues arise:
1. Keep manual types as backup in `/src/lib/types/api/scene.backup.ts`
2. Can temporarily switch imports back
3. Fix generation script and re-run

## Success Criteria

- [ ] `npm run generate:types` creates entities.ts
- [ ] All files import from `~/generated/entities`
- [ ] TypeScript prevents use of `existingCode`, `code`, or `sceneCode`
- [ ] Build process automatically generates types
- [ ] No manual Scene type definitions remain

## Dependencies

- Drizzle ORM schema must be up to date
- TypeScript 5.0+ for proper type inference

## Time Estimate

- Script creation: 1 hour
- Import updates: 2 hours  
- Testing: 1 hour
- **Total: 4 hours**