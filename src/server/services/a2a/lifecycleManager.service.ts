// src/server/services/a2a/lifecycleManager.service.ts
import { AgentLifecycleState, type BaseAgent } from "~/server/agents/base-agent";

interface AgentInfo {
  state: AgentLifecycleState;
  lastHeartbeat: number;
}

export class LifecycleManager {
  private static instance: LifecycleManager;
  private agents: Map<string, AgentInfo> = new Map();
  private monitorTimer: NodeJS.Timeout | null = null;
  private defaultUnresponsiveTimeout = 30000;

  private constructor() {}

  static getInstance(): LifecycleManager {
    if (!LifecycleManager.instance) {
      LifecycleManager.instance = new LifecycleManager();
    }
    return LifecycleManager.instance;
  }

  registerAgent(agent: BaseAgent): void {
    const name = agent.getName();
    this.agents.set(name, { state: AgentLifecycleState.Initializing, lastHeartbeat: Date.now() });
  }

  updateState(agentName: string, state: AgentLifecycleState): void {
    const info = this.agents.get(agentName);
    if (info) {
      info.state = state;
    } else {
      this.agents.set(agentName, { state, lastHeartbeat: Date.now() });
    }
  }

  recordHeartbeat(agentName: string): void {
    const info = this.agents.get(agentName);
    if (info) {
      info.lastHeartbeat = Date.now();
    }
  }

  private checkHealth(timeout: number): void {
    const now = Date.now();
    for (const [name, info] of this.agents) {
      if (now - info.lastHeartbeat > timeout && info.state !== AgentLifecycleState.Error) {
        info.state = AgentLifecycleState.Error;
      }
    }
  }

  getAgentStatuses(timeout: number = this.defaultUnresponsiveTimeout): { name: string; state: AgentLifecycleState; lastHeartbeat: number }[] {
    this.checkHealth(timeout);
    return Array.from(this.agents.entries()).map(([name, info]) => ({
      name,
      state: info.state,
      lastHeartbeat: info.lastHeartbeat,
    }));
  }

  startMonitoring(interval = 10000): void {
    if (this.monitorTimer) return;
    this.monitorTimer = setInterval(() => {
      this.checkHealth(interval * 2);
    }, interval);
  }

  stopMonitoring(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }
}

export const lifecycleManager = LifecycleManager.getInstance();
