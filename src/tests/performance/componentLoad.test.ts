// src/tests/performance/componentLoad.test.ts
import { describe, it, expect } from '@jest/globals';
import { performance } from 'perf_hooks';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

describe('Component load performance', () => {
  it('compares React.lazy style import to script tag injection', async () => {
    const esmUrl = pathToFileURL(path.resolve(__dirname, 'fixtures/sample-component.esm.js')).href;
    const iifePath = path.resolve(__dirname, 'fixtures/sample-component.iife.js');

    const startEsmMem = process.memoryUsage().heapUsed;
    const startEsm = performance.now();
    const esmModule = await import(esmUrl);
    const esmTime = performance.now() - startEsm;
    const esmMemory = process.memoryUsage().heapUsed - startEsmMem;

    const scriptContent = fs.readFileSync(iifePath, 'utf8');
    const startIifeMem = process.memoryUsage().heapUsed;
    const startIife = performance.now();
    const script = document.createElement('script');
    script.textContent = scriptContent;
    document.body.appendChild(script);
    const iifeTime = performance.now() - startIife;
    const iifeMemory = process.memoryUsage().heapUsed - startIifeMem;
    const globalComponent = (window as any).SampleComponent;

    expect(typeof esmModule.default).toBe('function');
    expect(typeof globalComponent).toBe('function');
    expect(typeof esmTime).toBe('number');
    expect(typeof iifeTime).toBe('number');

    console.log({ esmTime, esmMemory, iifeTime, iifeMemory });
  });
});
