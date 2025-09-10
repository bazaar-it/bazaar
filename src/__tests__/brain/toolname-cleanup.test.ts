import { isValidToolName } from '../../lib/types/ai/brain.types';

describe('ToolName cleanup', () => {
  test('imageRecreatorScene is no longer a valid tool name', () => {
    expect(isValidToolName('imageRecreatorScene')).toBe(false);
  });

  test('add/edit remain valid', () => {
    expect(isValidToolName('addScene')).toBe(true);
    expect(isValidToolName('editScene')).toBe(true);
  });
});

