// src/server/agents/__tests__/base-agent-lifecycle.test.ts
import { BaseAgent, AgentLifecycleState } from '../base-agent';
import { TaskManager } from '../../services/a2a/taskManager.service';

class TestAgent extends BaseAgent {
  constructor(taskManager: TaskManager) {
    super('TestAgent', taskManager);
  }
  async processMessage() {
    return null;
  }
}

describe('BaseAgent lifecycle', () => {
  const tm = TaskManager.getInstance();

  it('should transition lifecycle states', async () => {
    const agent = new TestAgent(tm);
    expect(agent.getStatus()).toBe(AgentLifecycleState.Initializing);

    await agent.init();
    expect(agent.getStatus()).toBe(AgentLifecycleState.Ready);

    await agent.start();
    expect(agent.getStatus()).toBe(AgentLifecycleState.Processing);

    await agent.stop();
    expect(agent.getStatus()).toBe(AgentLifecycleState.Stopping);

    await agent.destroy();
    expect(agent.getStatus()).toBe(AgentLifecycleState.Stopping);
  });
});
