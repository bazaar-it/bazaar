// src/tests/e2e/fullComponentPipeline.e2e.test.ts
import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import { db } from '~/server/db';
import { customComponentJobs, projects, users } from '~/server/db/schema';
import { type InputProps } from '~/types/input-props';
import { buildCustomComponent } from '~/server/workers/buildCustomComponent';
import path from 'path';
import fs from 'fs/promises';
import { eq } from 'drizzle-orm';

// Mock S3 operations to avoid actual R2 uploads
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockImplementation((command: any) => {
        if (command.constructor.name === 'PutObjectCommand') {
          // Store the uploaded content for verification
          const key = command.input.Key;
          const body = command.input.Body;
          
          // Save content for later verification
          mockUploadedContent[key] = body;
          
          // Simulate successful upload for PutObjectCommand
          return Promise.resolve({
            ETag: `"mock-etag-${uuidv4()}"`,
            $metadata: { httpStatusCode: 200 }
          });
        }
        
        if (command.constructor.name === 'HeadObjectCommand') {
          const key = command.input.Key;
          // Only return success if we have content for this key
          if (mockUploadedContent[key]) {
            // Simulate HeadObject for R2 verification
            return Promise.resolve({
              ContentLength: mockUploadedContent[key].length,
              ContentType: 'application/javascript',
              $metadata: { httpStatusCode: 200 }
            });
          } else {
            // Simulate not found
            return Promise.reject(new Error('NotFound'));
          }
        }
        
        // Handle other S3 commands if necessary
        return Promise.resolve({
          $metadata: { httpStatusCode: 200 }
        });
      }),
    })),
    PutObjectCommand: jest.fn().mockImplementation((params) => {
      return {
        constructor: { name: 'PutObjectCommand' },
        input: params,
      };
    }),
    HeadObjectCommand: jest.fn().mockImplementation((params) => {
      return {
        constructor: { name: 'HeadObjectCommand' },
        input: params,
      };
    }),
  };
});

// Mock storage for uploaded content
const mockUploadedContent: Record<string, string> = {};

// Allow console logs for easier debugging
console.log('DATABASE_URL in test scope:', process.env.DATABASE_URL);

/**
 * End-to-end test of the full component pipeline:
 * 1. Create a component in the database
 * 2. Process it through the build system
 * 3. Verify it completes successfully and has a valid R2 URL
 */
describe('Full Component Pipeline E2E Test', () => {
  // Use a consistent test user and project IDs
  const testUserId = 'test-user-id-for-pipeline-e2e';
  const testProjectId = '00000000-0000-0000-0000-000000000001';
  
  // Define a basic valid InputProps for the test project
  const initialTestProjectProps: InputProps = {
    meta: {
      duration: 300, // Total composition duration in frames
      title: 'Test Project for E2E Pipeline Test',
    },
    scenes: [
      {
        id: 'defaultScene-' + uuidv4(), // Ensure unique scene ID
        type: 'background-color', // Must be one of SCENE_TYPES
        start: 0, // Start frame for this scene
        duration: 300, // Duration of this scene in frames
        data: { // Props specific to 'background-color' type
          color: 'rgba(50,50,150,0.5)', // Example: a blueish color
        },
      },
    ],
  };
  
  // Test component - simple but complete Remotion component
  const simpleTsxComponent = `
    // These imports will be handled by wrapTsxWithGlobals
    // import { AbsoluteFill, useCurrentFrame } from 'remotion';
    // import React from 'react';

    export default function E2ETestComponent() {
      const frame = useCurrentFrame();
      const opacity = Math.min(1, frame / 30);
      
      return (
        <AbsoluteFill
          style={{
            backgroundColor: 'darkblue',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 70,
              fontWeight: 'bold',
              color: 'white',
              opacity,
              fontFamily: 'Arial, sans-serif',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            E2E Test Component
            <div style={{ fontSize: 40, marginTop: 20 }}>
              Frame: {frame}
            </div>
          </div>
        </AbsoluteFill>
      );
    }
  `;
  
  // Problematic component example with common issues found in production
  const problematicTsxComponent = `
    import React from 'react';
    import { AbsoluteFill, useCurrentFrame } from 'remotion';
    
    function ProblematicComponent() {
      const frame = useCurrentFrame();
      
      return (
        <AbsoluteFill
          style={{
            backgroundColor: 'red',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div style={{ color: 'white', fontSize: 40 }}>
            Problematic Component: {frame}
          </div>
        </AbsoluteFill>
      );
    }
    // Missing export statement
  `;

  let jobId: string;
  let problematicJobId: string;
  const tempDir = path.join(process.cwd(), 'temp');
  
  beforeAll(async () => {
    // Generate unique IDs for this test run
    jobId = uuidv4();
    problematicJobId = uuidv4();
    
    // Create temp directory if it doesn't exist
    await fs.mkdir(tempDir, { recursive: true }).catch(() => {
      // Directory might already exist, that's fine
    });
    
    try {
      // Set up test user if it doesn't exist
      let user = await db.query.users.findFirst({
        where: eq(users.id, testUserId),
      });
      
      if (!user) {
        console.log(`Creating test user with ID: ${testUserId}`);
        [user] = await db.insert(users).values({
          id: testUserId,
          name: 'Test User for E2E Pipeline',
          email: 'testuser.e2epipeline@example.com',
        }).returning();
        console.log('Test user created:', user);
      } else {
        console.log('Test user already exists:', user);
      }

      // Set up test project if it doesn't exist
      let project = await db.query.projects.findFirst({
        where: eq(projects.id, testProjectId),
      });

      if (!project) {
        console.log(`Creating test project with ID: ${testProjectId} and User ID: ${testUserId}`);
        [project] = await db
          .insert(projects)
          .values({
            id: testProjectId,
            title: 'Test Project for E2E Pipeline',
            userId: testUserId,
            props: initialTestProjectProps,
          })
          .returning();
        console.log('Test project created:', project);
      } else {
        console.log('Test project already exists:', project);
      }
    } catch (error) {
      console.error('Setup error:', error);
      throw error;
    }
  });
  
  afterAll(async () => {
    // Clean up test components from DB in a safe way
    try {
      await db.delete(customComponentJobs)
        .where(eq(customComponentJobs.id, jobId));
      console.log(`Cleaned up test component with ID ${jobId}`);
      
      await db.delete(customComponentJobs)
        .where(eq(customComponentJobs.id, problematicJobId));
      console.log(`Cleaned up problematic test component with ID ${problematicJobId}`);
      
      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true }).catch(err => {
        console.warn('Failed to clean up temp directory:', err);
      });
    } catch (error) {
      console.error('Failed to clean up test components:', error);
    }
  });
  
  it('should build a valid component and verify it completes successfully', async () => {
    console.log(`Creating test component with ID ${jobId}`);
    
    // Step 1: Create a component in the database
    const [job] = await db.insert(customComponentJobs).values({
      id: jobId,
      projectId: testProjectId,
      tsxCode: simpleTsxComponent,
      effect: JSON.stringify({ type: 'fadeIn', duration: 1000, target: 'text' }),
      status: 'generated', // Start with 'generated' status
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    expect(job).toBeDefined();
    if (!job) throw new Error('Job creation failed');
    expect(job.id).toBe(jobId);
    expect(job.status).toBe('generated');
    
    console.log('Building component...');
    const buildResult = await buildCustomComponent(jobId);
    
    // Check build succeeded
    expect(buildResult).toBe(true);
    
    // Step 3: Verify component record was updated correctly in DB
    const updatedComponent = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, jobId),
    });
    
    // The component should exist
    expect(updatedComponent).not.toBeNull();
    
    // Status should be 'complete'
    expect(updatedComponent?.status).toBe('complete');
    
    // Should have an R2 outputUrl with the expected format
    expect(updatedComponent?.outputUrl).toBeDefined();
    expect(updatedComponent?.outputUrl).toContain(process.env.R2_PUBLIC_URL as string);
    expect(updatedComponent?.outputUrl).toContain(`custom-components/${jobId}.js`);
    
    // Verify the content of the built JS file
    const componentKey = `custom-components/${jobId}.js`;
    const builtContent = mockUploadedContent[componentKey];
    expect(builtContent).toBeDefined();
    
    // Verify key features in the built output:
    
    // 1. Check for window.__REMOTION_COMPONENT assignment
    expect(builtContent).toContain('window.__REMOTION_COMPONENT');
    
    // 2. Check for handling of global React
    expect(builtContent).toContain('window.React');
    
    // 3. Check for E2ETestComponent name, confirming our component was included
    expect(builtContent).toContain('E2ETestComponent');
    
    console.log(`Component built successfully. Output URL: ${updatedComponent?.outputUrl}`);
  }, 30000); // Allow up to 30 seconds for the full test
  
  it('should handle problematic components and fix common issues', async () => {
    console.log(`Creating problematic test component with ID ${problematicJobId}`);
    
    // Step 1: Create a component with problematic code in the database
    const [job] = await db.insert(customComponentJobs).values({
      id: problematicJobId,
      projectId: testProjectId,
      tsxCode: problematicTsxComponent,
      effect: JSON.stringify({ type: 'fadeIn', duration: 1000, target: 'text' }),
      status: 'generated',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    expect(job).toBeDefined();
    if (!job) throw new Error('Job creation failed');
    expect(job.id).toBe(problematicJobId);
    
    console.log('Building problematic component...');
    const buildResult = await buildCustomComponent(problematicJobId);
    
    // Check if build succeeded despite issues
    expect(buildResult).toBe(true);
    
    // Verify component record was updated
    const updatedComponent = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, problematicJobId),
    });
    
    // Should have completed successfully despite issues
    expect(updatedComponent?.status).toBe('complete');
    
    // Verify the content of the built JS file
    const componentKey = `custom-components/${problematicJobId}.js`;
    const builtContent = mockUploadedContent[componentKey];
    expect(builtContent).toBeDefined();
    
    // Check that the sanitizer/wrapper fixed the common issues:
    
    // 1. Should convert direct imports to window globals
    expect(builtContent).toContain('window.React');
    expect(builtContent).toContain('window.Remotion');
    
    // 2. Should add window.__REMOTION_COMPONENT assignment
    expect(builtContent).toContain('window.__REMOTION_COMPONENT');
    
    // 3. Should include our component name
    expect(builtContent).toContain('ProblematicComponent');
    
    console.log(`Problematic component built successfully with fixes applied. Output URL: ${updatedComponent?.outputUrl}`);
  }, 30000);
});
