import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { buildCustomComponent } from '~/server/workers/buildCustomComponent';
import { eq } from 'drizzle-orm';

// Mock S3 client
jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn().mockResolvedValue({});
  const mockS3Client = jest.fn().mockImplementation(() => ({
    send: mockSend
  }));
  const mockPutObjectCommand = jest.fn();
  
  return {
    S3Client: mockS3Client,
    PutObjectCommand: mockPutObjectCommand
  };
});

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: `
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import React from 'react';

export default function FireworksEffect() {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill style={{backgroundColor: 'transparent'}}>
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: \`translate(-50%, -50%) scale(\${Math.min(1, frame / 30)})\`,
        width: 20,
        height: 20,
        borderRadius: '50%',
        backgroundColor: 'yellow',
        boxShadow: '0 0 30px 10px rgba(255, 255, 0, 0.8)'
      }} />
    </AbsoluteFill>
  );
}
`
              }
            }]
          })
        }
      }
    }))
  };
});

describe('Custom Component Generation Pipeline', () => {
  // Test data
  const testProjectId = 'test-project-id';
  const testEffect = 'Create a fireworks explosion animation';
  let jobId: string;
  
  // Mock the worker process
  beforeAll(async () => {
    // Ensure database tables exist and are empty for testing
    await db.delete(customComponentJobs);
  });
  
  afterAll(async () => {
    // Clean up
    await db.delete(customComponentJobs).where(eq(customComponentJobs.id, jobId));
  });
  
  it('should handle the full component generation pipeline', async () => {
    // STEP 1: Create custom component job (simulating chat request)
    const [job] = await db.insert(customComponentJobs).values({
      id: crypto.randomUUID(),
      projectId: testProjectId,
      effect: testEffect,
      tsxCode: '', // Will be populated by LLM
      status: 'pending'
    }).returning();
    
    jobId = job.id;
    
    expect(job).toBeDefined();
    expect(job.status).toBe('pending');
    
    // STEP 2: Generate TSX code (simulating LLM generation)
    // In a real implementation, we'd use the OpenAI API here
    const tsxCode = `
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import React from 'react';

export default function FireworksEffect() {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill style={{backgroundColor: 'transparent'}}>
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: \`translate(-50%, -50%) scale(\${Math.min(1, frame / 30)})\`,
        width: 20,
        height: 20,
        borderRadius: '50%',
        backgroundColor: 'yellow',
        boxShadow: '0 0 30px 10px rgba(255, 255, 0, 0.8)'
      }} />
    </AbsoluteFill>
  );
}
`;
    
    // Update the job with the generated code
    await db.update(customComponentJobs)
      .set({ tsxCode, status: 'building' })
      .where(eq(customComponentJobs.id, jobId));
    
    // STEP 3: Build the component (this would be done by the worker)
    await buildCustomComponent(job);
    
    // Fetch the updated job
    const [updatedJob] = await db.select()
      .from(customComponentJobs)
      .where(eq(customComponentJobs.id, jobId));
    
    // Verify the job was processed
    expect(updatedJob.status).toBe('success');
    expect(updatedJob.outputUrl).toBeDefined();
    
    // Step 4: Verify the component URL is valid
    expect(updatedJob.outputUrl).toContain(`${process.env.R2_PUBLIC_URL}`);
    
    // In a complete E2E test, we would also test:
    // 1. The chat interface receives streaming updates
    // 2. The component is loaded in the preview panel
    // 3. The video timeline is updated
    // However, these require browser testing (Playwright/Cypress)
  }, 30000); // 30s timeout for this test
}); 