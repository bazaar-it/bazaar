// src/server/services/a2a/__tests__/lifecycleManager.service.test.ts
import { BaseAgent, AgentLifecycleState } from '~/server/agents/base-agent';
import { LifecycleManager } from '../lifecycleManager.service';
import { TaskManager } from '../taskManager.service';

class MockAgent extends BaseAgent {
  constructor(name: string, tm: TaskManager) {
    super(name, tm);
  }
  async processMessage() { return null; }
}

describe('LifecycleManager', () => {
  const tm = TaskManager.getInstance();
  const manager = LifecycleManager.getInstance();

  beforeEach(() => {
    manager.stopMonitoring();
  });

  it('tracks heartbeats and states', async () => {
    const agent = new MockAgent('TestAgent', tm);
    manager.registerAgent(agent);
    await agent.init();
    manager.startMonitoring(20);
    expect(manager.getAgentStatuses()[0].state).toBe(AgentLifecycleState.Ready);
    await new Promise(r => setTimeout(r, 30));
    expect(manager.getAgentStatuses()[0].state).toBe(AgentLifecycleState.Ready);
    agent.stop();
    manager.stopMonitoring();
  });

  it('marks agent as error when heartbeat is missed', async () => {
    const agent = new MockAgent('Missed', tm);
    agent.heartbeatIntervalMs = 10000; // large interval so no heartbeat occurs
    manager.registerAgent(agent);
    await agent.init();
    await new Promise(r => setTimeout(r, 20));
    const status = manager.getAgentStatuses(10)[0];
    expect(status.state).toBe(AgentLifecycleState.Error);
  });
});
