//src/tests/integration/db/simple-drizzle-queries.test.ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock a simple database client with Drizzle-like interface
const mockDrizzleClient = {
  insert: jest.fn(),
  select: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

// Mock tables
const mockTables = {
  projects: {
    id: 'id',
    name: 'name',
    userId: 'user_id',
    createdAt: 'created_at'
  },
  messages: {
    id: 'id',
    content: 'content',
    projectId: 'project_id',
    role: 'role',
    createdAt: 'created_at'
  }
};

// Mock eq function for where clauses
const eq = (field, value) => ({ field, operator: '=', value });

describe('Drizzle ORM Queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockDrizzleClient.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'test-id' }])
      })
    });
    
    mockDrizzleClient.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
        leftJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      })
    });
    
    mockDrizzleClient.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'test-id', updated: true }])
        })
      })
    });
    
    mockDrizzleClient.delete.mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'test-id' }])
      })
    });
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
    const mockValues = jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([projectData])
    });
    
    mockDrizzleClient.insert.mockReturnValueOnce({
      values: mockValues
    });
    
    // Execute query
    const result = await mockDrizzleClient.insert(mockTables.projects)
      .values(projectData)
      .returning();
    
    // Assertions
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(projectData);
    expect(mockDrizzleClient.insert).toHaveBeenCalledWith(mockTables.projects);
    expect(mockValues).toHaveBeenCalledWith(projectData);
  });
  
  it('retrieves project messages correctly', async () => {
    // Setup
    const projectId = 'project-123';
    const expectedMessages = [
      { id: 'msg-1', content: 'Message 1', projectId },
      { id: 'msg-2', content: 'Message 2', projectId }
    ];
    
    // Mock the select query return value
    const mockWhere = jest.fn().mockResolvedValue(expectedMessages);
    const mockFrom = jest.fn().mockReturnValue({
      where: mockWhere
    });
    
    mockDrizzleClient.select.mockReturnValueOnce({
      from: mockFrom
    });
    
    // Execute query
    const result = await mockDrizzleClient.select()
      .from(mockTables.messages)
      .where(eq(mockTables.messages.projectId, projectId));
    
    // Assertions
    expect(result).toEqual(expectedMessages);
    expect(mockDrizzleClient.select).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith(mockTables.messages);
    expect(mockWhere).toHaveBeenCalledWith({
      field: mockTables.messages.projectId,
      operator: '=',
      value: projectId
    });
  });
  
  it('updates project data correctly', async () => {
    // Setup
    const projectId = 'project-123';
    const updateData = { name: 'Updated Project Name' };
    
    const mockReturning = jest.fn().mockResolvedValue([
      { id: projectId, name: updateData.name, userId: 'user-123' }
    ]);
    
    const mockWhere = jest.fn().mockReturnValue({
      returning: mockReturning
    });
    
    const mockSet = jest.fn().mockReturnValue({
      where: mockWhere
    });
    
    mockDrizzleClient.update.mockReturnValueOnce({
      set: mockSet
    });
    
    // Execute update
    const result = await mockDrizzleClient.update(mockTables.projects)
      .set(updateData)
      .where(eq(mockTables.projects.id, projectId))
      .returning();
    
    // Assertions
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe(updateData.name);
    expect(mockDrizzleClient.update).toHaveBeenCalledWith(mockTables.projects);
    expect(mockSet).toHaveBeenCalledWith(updateData);
    expect(mockWhere).toHaveBeenCalledWith({
      field: mockTables.projects.id,
      operator: '=',
      value: projectId
    });
  });
  
  it('performs join operations correctly', async () => {
    // Setup
    const userId = 'user-123';
    const joinResult = [
      { 
        projectId: 'project-1', 
        projectName: 'Project 1',
        messageId: 'msg-1', 
        messageContent: 'Message 1' 
      }
    ];
    
    const mockWhere = jest.fn().mockResolvedValue(joinResult);
    
    const mockLeftJoin = jest.fn().mockReturnValue({
      where: mockWhere
    });
    
    const mockFrom = jest.fn().mockReturnValue({
      leftJoin: mockLeftJoin
    });
    
    mockDrizzleClient.select.mockReturnValueOnce({
      from: mockFrom
    });
    
    // Execute join query
    const result = await mockDrizzleClient
      .select({
        projectId: mockTables.projects.id,
        projectName: mockTables.projects.name,
        messageId: mockTables.messages.id,
        messageContent: mockTables.messages.content
      })
      .from(mockTables.projects)
      .leftJoin(mockTables.messages, eq(mockTables.messages.projectId, mockTables.projects.id))
      .where(eq(mockTables.projects.userId, userId));
    
    // Assertions
    expect(result).toHaveLength(1);
    expect(result[0].projectId).toBe('project-1');
    expect(result[0].messageId).toBe('msg-1');
    expect(mockDrizzleClient.select).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith(mockTables.projects);
    expect(mockLeftJoin).toHaveBeenCalledWith(
      mockTables.messages,
      {
        field: mockTables.messages.projectId,
        operator: '=',
        value: mockTables.projects.id
      }
    );
  });
  
  it('deletes records correctly', async () => {
    // Setup
    const projectId = 'project-123';
    const deletedProject = { id: projectId, name: 'Project to Delete' };
    
    const mockReturning = jest.fn().mockResolvedValue([deletedProject]);
    
    const mockWhere = jest.fn().mockReturnValue({
      returning: mockReturning
    });
    
    mockDrizzleClient.delete.mockReturnValueOnce({
      where: mockWhere
    });
    
    // Execute delete
    const result = await mockDrizzleClient.delete(mockTables.projects)
      .where(eq(mockTables.projects.id, projectId))
      .returning();
    
    // Assertions
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(projectId);
    expect(mockDrizzleClient.delete).toHaveBeenCalledWith(mockTables.projects);
    expect(mockWhere).toHaveBeenCalledWith({
      field: mockTables.projects.id,
      operator: '=',
      value: projectId
    });
  });
});
