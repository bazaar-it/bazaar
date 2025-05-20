// src/tests/e2e/customComponentFlow.test.ts
import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { db } from '~/server/db';
import { customComponentJobs, projects, users } from '~/server/db/schema';
import { buildCustomComponent } from '~/server/workers/buildCustomComponent';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { type InputProps } from '~/types/input-props';
import type { OpenAI as OpenAITypes } from 'openai';

// Log the DATABASE_URL to ensure it's correctly loaded
console.log('DATABASE_URL in test scope:', process.env.DATABASE_URL);

// S3 mock
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => {
      // Import dependency needed within the mock factory
      const { randomUUID } = require('crypto');

      return {
        send: jest.fn().mockImplementation((command: any) => { // Explicitly type command as any
          if (command.constructor.name === 'PutObjectCommand') {
            // Simulate successful upload for PutObjectCommand
            return Promise.resolve({
              ETag: `"mock-etag-${randomUUID()}"`,
              VersionId: 'mock-version-id',
            });
          }
          // Handle other S3 commands if necessary, or return a generic success
          return Promise.resolve({});
        }),
      };
    }),
    PutObjectCommand: jest.fn().mockImplementation((params: any) => { // Explicitly type params as any
      return {
        constructor: { name: 'PutObjectCommand' },
        input: params,
      };
    }),
  };
});

// Placeholder for LLM response (TSX code)
const LLM_RESPONSE_PLACEHOLDER = `
// import { AbsoluteFill, useCurrentFrame } from 'remotion'; // Make sure this line is commented
// import React from 'react'; // Make sure this line is commented

export default function FireworksEffect() {
  const frame = useCurrentFrame();
  // Simple effect: a circle that changes color based on the frame
  const color = frame % 30 < 15 ? 'blue' : 'red';
  const size = 50 + (frame % 60); // Grows and shrinks

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: '50%',
        }}
      />
      <div style={{ marginTop: 20, fontSize: 30, color: 'black' }}>
        Frame: {frame}
      </div>
    </AbsoluteFill>
  );
}
`;

// OpenAI mock for generating TSX code
jest.mock('openai', () => {
  const mockCreate = jest.fn<
    (params: OpenAITypes.Chat.ChatCompletionCreateParamsNonStreaming) => Promise<OpenAITypes.Chat.ChatCompletion>
  >().mockResolvedValue({
    id: 'chatcmpl-mock-id-' + randomUUID(),
    object: 'chat.completion' as const,
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-mock-model',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant' as const,
          content: LLM_RESPONSE_PLACEHOLDER, // Mock returns the TSX code
          refusal: null, // Added to satisfy ChatCompletionMessage type
        },
        finish_reason: 'stop' as const,
        logprobs: null,
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 100, // Adjusted for typical code length
      total_tokens: 110,
    },
  });
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

const testUserId = 'test-user-id-for-component-flow';
const testProjectId = '00000000-0000-0000-0000-000000000000';
const testEffect = {
  type: "fadeIn",
  duration: 1000,
  target: "elementId"
};

// Define a basic valid InputProps for the test project, conforming to inputPropsSchema
const initialTestProjectProps: InputProps = {
  meta: {
    duration: 300, // Total composition duration in frames
    title: 'Test Project for Component Flow',
    // backgroundColor: 'rgba(0,0,0,0)' // Optional global background
  },
  scenes: [
    {
      id: 'defaultScene-' + randomUUID(), // Ensure unique scene ID
      type: 'background-color', // Must be one of SCENE_TYPES
      start: 0, // Start frame for this scene
      duration: 300, // Duration of this scene in frames
      data: { // Props specific to 'background-color' type
        color: 'rgba(50,50,150,0.5)', // Example: a blueish color
        // toColor: 'rgba(150,50,50,0.5)', // Optional: for animated background color
        // animationType: 'fade' // Optional: animation type for color change
      },
      // transitionToNext: undefined // Optional transition to the next scene
    },
  ],
};

describe('Custom Component Generation Pipeline', () => {
  beforeAll(async () => {
    console.log('DATABASE_URL in beforeAll:', process.env.DATABASE_URL);

    let user = await db.query.users.findFirst({
      where: eq(users.id, testUserId),
    });
    if (!user) {
      console.log(`Creating test user with ID: ${testUserId}`);
      [user] = await db.insert(users).values({
        id: testUserId,
        name: 'Test User for Component Flow',
        email: 'testuser.componentflow@example.com',
      }).returning();
      console.log('Test user created:', user);
    } else {
      console.log('Test user already exists:', user);
    }

    let project = await db.query.projects.findFirst({
      where: eq(projects.id, testProjectId),
    });

    if (!project) {
      console.log(`Creating test project with ID: ${testProjectId} and User ID: ${testUserId}`);
      [project] = await db
        .insert(projects)
        .values({
          id: testProjectId,
          title: 'Test Project for Component Flow',
          userId: testUserId,
          props: initialTestProjectProps,
        })
        .returning();
      console.log('Test project created:', project);
    } else {
      console.log('Test project already exists:', project);
    }
  });

  it('should handle the full component generation pipeline', async () => {
    console.log(`Attempting to insert customComponentJob with projectId: [${testProjectId}] (Type: ${typeof testProjectId})`);

    const [job] = await db.insert(customComponentJobs).values({
      id: randomUUID(),
      projectId: testProjectId,
      effect: JSON.stringify(testEffect),
      status: 'pending'
    }).returning();
    
    expect(job).toBeDefined();
    if (!job) throw new Error('Job creation failed');
    const jobId = job.id;
    
    expect(job).toHaveProperty('id');
    expect(job.status).toBe('pending');
    
    const tsxCode = `
// import { AbsoluteFill, useCurrentFrame } from 'remotion';
// import React from 'react';

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
    
    await db.update(customComponentJobs)
      .set({ tsxCode, status: 'building' })
      .where(eq(customComponentJobs.id, jobId));
    
    await buildCustomComponent(jobId);
    
    const [updatedJob] = await db.select()
      .from(customComponentJobs)
      .where(eq(customComponentJobs.id, jobId));
    
    expect(updatedJob).toBeDefined();
    if (!updatedJob) throw new Error('Failed to fetch updated job');
    
    expect(updatedJob.status).toBe('complete');
    expect(updatedJob.outputUrl).toBeDefined();
    
    expect(updatedJob.outputUrl).toContain(`${process.env.R2_PUBLIC_URL}`);
  }, 30000);
});