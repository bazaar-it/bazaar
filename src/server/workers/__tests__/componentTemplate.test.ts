// src/server/workers/__tests__/componentTemplate.test.ts
import { describe, it, expect } from '@jest/globals';
import { applyComponentTemplate, validateComponentTemplate } from '../componentTemplate';

// Basic tests for the component template system

describe('component template utilities', () => {
  it('generates code with default export and required imports', () => {
    const code = applyComponentTemplate('MyScene', '', '<div />');
    expect(code).toContain('const MyScene');
    expect(code).toContain('export default MyScene');
    expect(validateComponentTemplate(code)).toBe(true);
  });

  it('validateComponentTemplate detects missing export', () => {
    const code = "import React from 'react';\nconst Foo = () => null;";
    expect(validateComponentTemplate(code)).toBe(false);
  });
});
