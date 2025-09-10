jest.mock('../../server/services/ai/aiClient.service', () => ({
  AIClientService: {
    generateResponse: jest.fn().mockResolvedValue({ content: 'export default function Scene_X(){}\nexport const durationInFrames_X = 90;' })
  }
}));

// Mock heavy transitive imports to avoid touching DB/ESM code in test
jest.mock('../../tools/add/add_helpers/mediaValidation', () => ({
  MediaValidation: {
    validateAndFixCode: jest.fn().mockResolvedValue({ wasFixed: false, code: '' })
  }
}));
jest.mock('../../lib/utils/codeValidator', () => ({
  validateAndFixCode: jest.fn().mockResolvedValue({ valid: true, fixedCode: '', fixesApplied: [] })
}));
jest.mock('../../server/services/generation/code-cache.service', () => ({
  codeCache: { set: jest.fn(), get: jest.fn().mockReturnValue(null) }
}));

import { UnifiedCodeProcessor } from '../../tools/add/add_helpers/CodeGeneratorNEW';

describe('Image prompt assembly (Base + Mode)', () => {
  const codegen = new UnifiedCodeProcessor();

  test('Embed mode includes technical base and embed delta', async () => {
    const input = {
      imageUrls: ['https://example.com/img.png'],
      userPrompt: 'Place this as hero',
      functionName: 'Scene_X',
      projectId: 'p1',
      projectFormat: { format: 'landscape' as const, width: 1920, height: 1080 },
      imageAction: 'embed' as const,
    };

    await codegen.generateCodeFromImage(input as any);

    const { AIClientService } = require('../../server/services/ai/aiClient.service');
    const call = (AIClientService.generateResponse as jest.Mock).mock.calls[0];
    const system = call[2];
    expect(system.content).toMatch(/CRITICAL TECHNICAL RULES/);
    expect(system.content).toMatch(/MODE: EMBED/);
    expect(system.content).toMatch(/Canvas:/);
  });

  test('Recreate mode includes technical base and recreate delta', async () => {
    const { AIClientService } = require('../../server/services/ai/aiClient.service');
    (AIClientService.generateResponse as jest.Mock).mockClear();
    const input = {
      imageUrls: ['https://example.com/ui.png'],
      userPrompt: 'Recreate this UI',
      functionName: 'Scene_Y',
      projectId: 'p1',
      projectFormat: { format: 'landscape' as const, width: 1920, height: 1080 },
      imageAction: 'recreate' as const,
    };

    await codegen.generateCodeFromImage(input as any);
    const call = (AIClientService.generateResponse as jest.Mock).mock.calls[0];
    const system = call[2];
    expect(system.content).toMatch(/CRITICAL TECHNICAL RULES/);
    expect(system.content).toMatch(/MODE: RECREATE/);
    expect(system.content).toMatch(/Canvas:/);
  });
});
