// Mock database for tests
const createMockQueryFn = () => jest.fn(() => Promise.resolve(null));

const mockDb = {
  select: jest.fn(() => ({
    from: jest.fn(() => ({
      where: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve([])),
        orderBy: jest.fn(() => Promise.resolve([])),
      })),
      orderBy: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve([])),
      })),
    })),
  })),

  insert: jest.fn(() => ({
    values: jest.fn(() => ({
      returning: jest.fn(() => Promise.resolve([{ id: 'test-id' }])),
    })),
  })),

  update: jest.fn(() => ({
    set: jest.fn(() => ({
      where: jest.fn(() => ({
        returning: jest.fn(() => Promise.resolve([{ id: 'test-id' }])),
      })),
    })),
  })),

  delete: jest.fn(() => ({
    where: jest.fn(() => Promise.resolve()),
  })),

  query: {
    brandRepository: {
      findFirst: createMockQueryFn(),
    },
    projectBrandUsage: {
      findFirst: createMockQueryFn(),
    },
    brandProfiles: {
      findFirst: createMockQueryFn(),
    },
    users: {
      findFirst: jest.fn(() => Promise.resolve({ id: 'test-user', isAdmin: true })),
    },
  },
};

mockDb.transaction = jest.fn(async (callback) => callback(mockDb));

export const db = mockDb;
