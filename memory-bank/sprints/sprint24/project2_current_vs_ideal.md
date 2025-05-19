// /memory-bank/sprints/sprint24/project2_current_vs_ideal.md
# Project 2: Agent-to-Agent (A2A) System - Current vs. Ideal Pipeline

## Overview
This document outlines the current end-to-end pipeline for Project 2, the Agent-to-Agent (A2A) system, and proposes an ideal, simplified architecture. The A2A system is primarily observed and tested via the evaluation dashboard (`src/app/test/evaluation-dashboard/page.tsx`). It aims to enable collaborative task processing by specialized AI agents.

## Current End-to-End Pipeline

The A2A system processes tasks through a network of agents communicating via a message bus.

1.  **Task Submission (User via Evaluation Dashboard):**
    *   **UI Interaction:** User interacts with `src/app/test/evaluation-dashboard/page.tsx` (e.g., using `TaskInputForm.tsx`).
    *   **API Call:** A request is typically made to a tRPC procedure (e.g., in `a2a.ts` or a dedicated task router) to create a new task.
    *   **Task Creation:** `taskManager.service.ts` creates a task in the database with an initial 'submitted' status.

2.  **Task Processing Initiation (`TaskProcessorService`):**
    *   **Polling/Trigger:** `TaskProcessorService` (`src/server/services/a2a/taskProcessor.service.ts`) polls for tasks in 'submitted' status or is triggered.
    *   **Agent Invocation:** For a new task, the `TaskProcessorService` typically invokes an initial agent, often a `CoordinatorAgent`.

3.  **Agent Interaction & Message Bus:**
    *   **Agent Registration:** Agents (e.g., `CoordinatorAgent`, `ADBAgent`, `ScenePlannerAgent`, `BuilderAgent`, `CritiqueAgent`) are registered with an `AgentRegistryService`.
    *   **Message Bus:** Agents communicate by publishing messages to and subscribing to topics on a `MessageBus` (`src/server/lib/message-bus.ts`).
    *   **Example Flow:**
        1.  `CoordinatorAgent` receives the initial task.
        2.  It might break down the task and publish sub-tasks or requests to other agents (e.g., `ADBAgent` to generate an Animation Design Brief).
        3.  `ADBAgent` processes its task, potentially calling an LLM, and publishes results back to the `CoordinatorAgent` or a shared topic.
        4.  This continues until the task is completed or fails.
    *   **Agent Logic:** Each agent (`src/server/agents/*`) contains its own logic for processing messages, interacting with LLMs, and calling other services or agents.

4.  **State Management & Updates:**
    *   **Task Manager:** `taskManager.service.ts` updates the task's status and results in the database throughout its lifecycle.
    *   **SSE Updates:** `sseManager.service.ts` pushes real-time updates about task progress and agent activities to connected clients (like the evaluation dashboard).

5.  **Visualization & Monitoring:**
    *   **Evaluation Dashboard:** Displays task status, agent messages, and potentially visualizations like `AgentNetworkGraph.tsx`.

## Current Assumptions & Challenges

*   **Agent Lifecycle Management:** Significant "churn" with `TaskProcessorService` restarting, leading to agents being re-initialized frequently. This impacts stability and statefulness.
*   **Message Bus Reliability:** Ensuring messages are delivered and processed correctly, especially with potential agent restarts.
*   **Observability & Debugging:**
    *   Excessive and often unclear logging makes it hard to trace task flow and agent interactions.
    *   Difficult to understand the context and state of individual agents.
*   **Error Handling & Recovery:** Limited mechanisms for handling agent failures, retrying steps, or gracefully degrading.
*   **Scalability:** The current model might face challenges with a large number of agents or high task volume.
*   **Agent Discovery & Orchestration:** How agents discover each other and how complex workflows are orchestrated can be implicit or hardcoded.
*   **Testing:** Lack of granular testing for individual agents and their interactions.

## Desired State & Improvements

*   **Stable Agent Lifecycle:** Agents should be long-lived or managed in a way that doesn't cause frequent churn. Consider a more robust agent supervisor model.
*   **Enhanced Observability:**
    *   Structured, tagged logging for clear traceability.
    *   Improved diagnostic tools and UI feedback in the evaluation dashboard.
*   **Robust Message Bus:** Guaranteed message delivery, dead-letter queues, and potentially transactional messaging.
*   **Clear Error Handling & Fault Tolerance:** Well-defined error states, retry policies, and strategies for agent failures.
*   **Modular Agent Design:** Agents with well-defined responsibilities and interfaces.
*   **Explicit Orchestration:** Clearer definition of workflows, perhaps using a dedicated orchestration engine or a more structured approach within the `CoordinatorAgent`.
*   **Comprehensive Testing Framework:** Unit tests for individual agents, integration tests for agent collaborations, and end-to-end tests.
*   **Centralized Configuration:** Manage agent capabilities, LLM prompts, and behaviors centrally.

## Simplified Architecture Proposal (Ideal)

1.  **Task Input Layer (Client/API):**
    *   `EvaluationDashboard` -> tRPC endpoint for task submission.
    *   `TaskCreationService`: Handles initial task intake, validation, and persistence.

2.  **Orchestration Engine / Master Agent:**
    *   A dedicated `WorkflowOrchestratorService` or a highly reliable `MasterCoordinatorAgent`.
    *   Responsible for interpreting the overall task, breaking it into sub-tasks, and dispatching them to appropriate worker agents.
    *   Manages the state of the overall workflow.

3.  **Worker Agents (Modular & Specialized):**
    *   Examples: `InformationExtractionAgent`, `ContentGenerationAgent`, `CodeBuildingAgent`, `ReviewCritiqueAgent`.
    *   Each agent focuses on a specific capability.
    *   Stateless or with carefully managed state.

4.  **Communication Layer (Enhanced Message Bus):**
    *   Robust, potentially persistent message queue (e.g., Redis Streams, RabbitMQ, or a more advanced in-memory bus with persistence).
    *   Clear topic definitions and message schemas.
    *   Supports reliable request-reply and publish-subscribe patterns.

5.  **Agent Management Service:**
    *   Handles agent registration, discovery, health checks, and lifecycle.
    *   Ensures agents are available and can be scaled if needed.

6.  **State & Persistence Layer (`TaskManagerService` & Database):**
    *   Reliably stores task states, intermediate results, and final outputs.
    *   Provides transactional updates.

7.  **Monitoring & Logging Layer:**
    *   Centralized logging service with structured logs.
    *   Real-time monitoring dashboard (extending `EvaluationDashboard`) for task progress, agent status, and system health.
    *   `SseManagerService` for client updates.

This ideal architecture emphasizes stability, modularity, clear communication channels, and robust management of agents and tasks, addressing the key challenges of the current A2A system.
