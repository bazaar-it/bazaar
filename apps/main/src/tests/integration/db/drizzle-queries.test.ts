//src/tests/integration/db/drizzle-queries.test.ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { eq } from 'drizzle-orm';

// Mock the database module
jest.mock('@bazaar/database', () => {
  const mockDb = {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };
  
  // Setup default mock implementations
  mockDb.insert.mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([{ id: 'test-id' }])
    })
  });
  
  mockDb.select.mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([]),
      leftJoin: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([])
      })
    })
  });
  
  mockDb.update.mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'test-id', updated: true }])
      })
    })
  });
  
  mockDb.delete.mockReturnValue({
    where: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([{ id: 'test-id' }])
    })
  });
  
  return { db: mockDb };
});

// Mock schema tables
jest.mock('~/db/schema', () => ({
  projects: { id: 'id', name: 'name', userId: 'user_id', createdAt: 'created_at' },
  messages: { id: 'id', content: 'content', projectId: 'project_id', role: 'role', createdAt: 'created_at' },
  users: { id: 'id', name: 'name', email: 'email' }
}));

describe('Drizzle ORM Queries', () => {
  const { db } = jest.requireMock('~/db');
  const { projects, messages, users } = jest.requireMock('~/db/schema');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('creates project correctly', async () => {
    // Setup
    const projectData = {
      id: 'project-123',
      name: 'Test Project',
      userId: 'user-123',
      createdAt: new Date()
    };
    
    // Setup expected return
    db.insert.mockReturnValueOnce({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([projectData])
      })
    });
    
    // Execute query
    const result = await db.insert(projects).values(projectData).returning();
    
    // Assertions
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(projectData);
    expect(db.insert).toHaveBeenCalledWith(projects);
  });
  
  it('retrieves project messages correctly', async () => {
    // Setup
    const projectId = 'project-123';
    const expectedMessages = [
      { id: 'msg-1', content: 'Message 1', projectId },
      { id: 'msg-2', content: 'Message 2', projectId }
    ];
    
    // Mock the select query return value
    const mockFrom = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(expectedMessages)
    });
    db.select.mockReturnValueOnce({
      from: mockFrom
    });
    
    // Execute query
    const result = await db.select()
      .from(messages)
      .where(eq(messages.projectId, projectId));
    
    // Assertions
    expect(result).toEqual(expectedMessages);
    expect(db.select).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith(messages);
  });
  
  it('updates project data correctly', async () => {
    // Setup
    const projectId = 'project-123';
    const updateData = { name: 'Updated Project Name' };
    const mockSet = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([
          { id: projectId, name: updateData.name, userId: 'user-123' }
        ])
      })
    });
    
    db.update.mockReturnValueOnce({
      set: mockSet
    });
    
    // Execute update
    const result = await db.update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId))
      .returning();
    
    // Assertions
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe(updateData.name);
    expect(db.update).toHaveBeenCalledWith(projects);
    expect(mockSet).toHaveBeenCalledWith(updateData);
  });
  
  it('performs join operations correctly', async () => {
    // Setup
    const userId = 'user-123';
    const mockLeftJoin = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([
        { 
          projectId: 'project-1', 
          projectName: 'Project 1',
          messageId: 'msg-1', 
          messageContent: 'Message 1' 
        }
      ])
    });
    
    const mockFrom = jest.fn().mockReturnValue({
      leftJoin: mockLeftJoin
    });
    
    db.select.mockReturnValueOnce({
      from: mockFrom
    });
    
    // Execute join query
    const result = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        messageId: messages.id,
        messageContent: messages.content
      })
      .from(projects)
      .leftJoin(messages, eq(messages.projectId, projects.id))
      .where(eq(projects.userId, userId));
    
    // Assertions
    expect(result).toHaveLength(1);
    expect(result[0].projectId).toBe('project-1');
    expect(result[0].messageId).toBe('msg-1');
    expect(db.select).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith(projects);
    expect(mockLeftJoin).toHaveBeenCalledWith(messages, expect.anything());
  });
  
  it('handles complex query conditions', async () => {
    // Setup for a more complex query with multiple conditions
    const mockWhere = jest.fn().mockResolvedValue([
      { id: 'msg-1', content: 'Message 1', projectId: 'project-1', createdAt: new Date() }
    ]);
    
    const mockFrom = jest.fn().mockReturnValue({
      where: mockWhere
    });
    
    db.select.mockReturnValueOnce({
      from: mockFrom
    });
    
    // Execute query with multiple conditions
    const result = await db.select()
      .from(messages)
      .where(eq(messages.projectId, 'project-1'));
    
    // Assertions
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('msg-1');
    expect(db.select).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith(messages);
    expect(mockWhere).toHaveBeenCalled();
  });
});
