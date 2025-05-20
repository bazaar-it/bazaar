// __mocks__/uuid.js

/**
 * Mock implementation of uuid v4 function
 * @returns {string} A mock UUID string
 */
function v4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Export for ESM compatibility
export { v4 };
export default { v4 };

// CommonJS compatibility
if (typeof module !== 'undefined') {
  module.exports = { v4 };
  module.exports.v4 = v4;
}

// Complete mock implementation for all UUID versions
const uuidMock = {
  v1: v4,
  v3: v4,
  v4: v4,
  v5: v4,
  NIL: '00000000-0000-0000-0000-000000000000',
  /**
   * @returns {Array} Array representation of UUID
   */
  parse: () => new Array(16).fill(0),
  /**
   * @returns {string} String representation of UUID
   */
  stringify: () => v4(),
  /**
   * @returns {boolean} Always returns true in mock
   */
  validate: () => true,
  /**
   * @returns {number} Always returns 4 in mock
   */
  version: () => 4
};

// Export all functions for compatibility with all import types
if (typeof module !== 'undefined') {
  Object.assign(module.exports, uuidMock);
}

export { uuidMock as uuid }; 