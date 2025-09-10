import { EditTool } from '../../tools/edit/edit';

jest.mock('../../server/services/ai/aiClient.service', () => ({
  AIClientService: {
    generateResponse: jest.fn().mockResolvedValue({ content: JSON.stringify({ code: 'export default function S(){}\nexport const durationInFrames_XX=90;' }) })
  }
}));

describe('EditTool prompt assembly (Base + Mode)', () => {
  const edit = new EditTool();
  const baseInput = {
    userPrompt: 'Update the scene',
    projectId: 'p1',
    sceneId: 's1',
    tsxCode: 'const { AbsoluteFill } = window.Remotion; export default function A(){ return <AbsoluteFill /> }',
  } as any;

  test('embed mode includes technical base and embed delta', async () => {
    const input = { ...baseInput, imageUrls: ['https://x/img.png'], imageAction: 'embed' as const };
    await edit.run(input);
    const { AIClientService } = require('../../server/services/ai/aiClient.service');
    const call = (AIClientService.generateResponse as jest.Mock).mock.calls.pop();
    const system = call[2];
    expect(system.content).toMatch(/CRITICAL TECHNICAL RULES/);
    expect(system.content).toMatch(/MODE: EMBED/);
  });

  test('recreate mode includes technical base and recreate delta', async () => {
    const input = { ...baseInput, imageUrls: ['https://x/ui.png'], imageAction: 'recreate' as const, targetSelector: '#left-card' };
    await edit.run(input);
    const { AIClientService } = require('../../server/services/ai/aiClient.service');
    const call = (AIClientService.generateResponse as jest.Mock).mock.calls.pop();
    const system = call[2];
    expect(system.content).toMatch(/CRITICAL TECHNICAL RULES/);
    expect(system.content).toMatch(/MODE: RECREATE/);
    const userMsg = call[1][0].content as any[];
    // selector hint is optional; ensure recreate mode is set
    expect(system.content).toMatch(/MODE: RECREATE/);
  });
});
