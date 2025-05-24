import { AgentRegistry } from "../a2a/agentRegistry.service";
import { BaseAgent } from "~/server/agents/base-agent";
import type { AgentCard, AgentSkill, Message, Artifact, AgentCapabilities, TextPart, Part } from "~/types/a2a";
import { createTextMessage } from "~/types/a2a";
import crypto from "crypto";

// Mock BaseAgent for testing purposes
class MockAgent extends BaseAgent {
  constructor(name: string, description?: string) {
    super(name, description);
  }
  async processMessage(message: any): Promise<any> {
    return null; // Not used in these tests
  }
  // Override getAgentCard to return a predictable and compliant card
  getAgentCard(): AgentCard {
    const skillId = `${this.name.toLowerCase()}-skill1`;
    const mockMessageInput: Message = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      parts: [{ type: 'text', text: "User query example" } as TextPart]
    };
    const mockMessageOutput: Message = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      parts: [{ type: 'text', text: "Agent response example" } as TextPart]
    };

    const mockSkill: AgentSkill = {
      id: skillId,
      name: `${this.name} Skill 1`,
      description: `Description for ${this.name} Skill 1`,
      inputModes: ["text"],
      outputModes: ["text"],
      // Optional fields can be omitted or set to undefined/null if appropriate
      inputSchema: { type: "object", properties: { query: { type: "string"} } },
      outputSchema: { type: "object", properties: { result: { type: "string"} } },
      examples: [{
        name: "Example 1",
        description: "Example usage of the skill",
        input: { message: mockMessageInput },
        output: { message: mockMessageOutput }
      }]
    };

    return {
      name: this.name,
      description: this.description || "Mock agent description",
      url: `/api/a2a/agents/${this.name.toLowerCase()}`,
      provider: {
        name: "Bazaar-Vid Test",
        url: "https://test.bazaar-vid.com"
      },
      version: "1.0.0",
      documentationUrl: null, // Or a mock URL string
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: true
      } as AgentCapabilities,
      authentication: null,
      defaultInputModes: ["text"],
      defaultOutputModes: ["text"],
      skills: [mockSkill],
    };
  }
}

describe("AgentRegistry Service", () => {
  let registryInstance: AgentRegistry;
  let agent1: MockAgent;
  let agent2: MockAgent;

  beforeEach(() => {
    registryInstance = new AgentRegistry(); // Create a new instance for each test for isolation
    
    agent1 = new MockAgent("TestAgent1", "Description for TestAgent1");
    agent2 = new MockAgent("TestAgent2", "Description for TestAgent2");
  });

  it("should correctly register an agent", () => {
    registryInstance.registerAgent(agent1);
    expect(registryInstance.getAgent("TestAgent1")).toBe(agent1);
    expect(registryInstance.getAgent("testagent1")).toBe(agent1); // Check case-insensitivity
  });

  it("should retrieve a registered agent by name", () => {
    registryInstance.registerAgent(agent1);
    const retrievedAgent = registryInstance.getAgent("TestAgent1");
    expect(retrievedAgent).toBeInstanceOf(MockAgent);
    expect(retrievedAgent?.name).toBe("TestAgent1");
  });

  it("should return undefined for a non-existent agent", () => {
    expect(registryInstance.getAgent("NonExistentAgent")).toBeUndefined();
  });

  it("should retrieve all registered agents", () => {
    registryInstance.registerAgent(agent1);
    registryInstance.registerAgent(agent2);
    const allAgents = registryInstance.getAllAgents();
    expect(allAgents).toHaveLength(2);
    expect(allAgents).toContain(agent1);
    expect(allAgents).toContain(agent2);
  });

  it("should retrieve an agent card for a registered agent", () => {
    registryInstance.registerAgent(agent1);
    const card: AgentCard | undefined = registryInstance.getAgentCard("TestAgent1");
    expect(card).toBeDefined();
    if (card) {
      expect(card.name).toBe("TestAgent1");
      expect(card.description).toBe("Description for TestAgent1");
      expect(card.skills).toBeDefined();
      expect(card.skills).toHaveLength(1);
      if (card.skills?.[0]) {
        expect(card.skills[0].id).toBe("testagent1-skill1");
      }
    }
  });

  it("should return undefined card for a non-existent agent", () => {
    const card: AgentCard | undefined = registryInstance.getAgentCard("NonExistentAgent");
    expect(card).toBeUndefined();
  });

  it("should retrieve all agent cards", () => {
    registryInstance.registerAgent(agent1);
    registryInstance.registerAgent(agent2);
    const allCards: AgentCard[] = registryInstance.getAllAgentCards();
    expect(allCards).toHaveLength(2);
    const card1 = allCards.find(c => c.name === "TestAgent1");
    const card2 = allCards.find(c => c.name === "TestAgent2");
    expect(card1).toBeDefined();
    expect(card2).toBeDefined();
    if (card1?.skills) {
      expect(card1.skills).toHaveLength(1);
    }
  });

  it("should handle case-insensitivity for agent names", () => {
    registryInstance.registerAgent(agent1); // Registered as "TestAgent1"
    expect(registryInstance.getAgent("testagent1")).toBe(agent1);
    expect(registryInstance.getAgentCard("testAGEnt1")).toBeDefined();
  });
}); 