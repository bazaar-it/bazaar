// src/server/utils/__tests__/tsxPreprocessor.test.ts
import { preprocessTsx } from '../tsxPreprocessor';

describe('preprocessTsx React import handling', () => {
  it('converts default + named React imports to window globals', () => {
    const input = `import React, { useState, useEffect } from 'react';
const MyComp = () => {
  const [val, setVal] = useState(0);
  React.useEffect(() => { setVal(val + 1); }, []);
  return <div>{val}</div>;
};
export default MyComp;`;

    const { code } = preprocessTsx(input, 'MyComp');

    expect(code).toContain('const React = window.React');
    expect(code).toContain('const { useState, useEffect } = window.React');
  });
});
