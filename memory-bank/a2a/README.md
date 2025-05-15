# Agent-to-Agent (A2A) System Documentation

This directory contains documentation for the Agent-to-Agent (A2A) system, a modular framework for managing the component generation pipeline in Bazaar-Vid.

## Overview

The A2A system uses a message-passing architecture where specialized agents collaborate to generate, build, and deploy custom Remotion components. The system is designed for:

- **Modularity**: Each agent has a specific responsibility
- **Resilience**: Better error handling and recovery
- **Traceability**: Complete audit trail of component lifecycle
- **Extensibility**: Easy to add new capabilities

## Google A2A Protocol Alignment

Our implementation is designed to align with Google's [Agent-to-Agent (A2A) protocol](https://github.com/google/A2A), an open standard for agent interoperability. This alignment provides:

- Standardized task lifecycle states (submitted, working, input-required, completed, etc.)
- Agent discovery through standard AgentCard format
- Structured content types (text, file, data) for agent communication
- Real-time updates via Server-Sent Events (SSE)

## Documentation

- [Architecture Overview](./architecture-overview.md) - High-level system design
- [Core Components](./core-components.md) - BaseAgent and MessageBus implementation
- [Agent Types](./agent-types.md) - Detailed agent implementations
- [Message Protocol](./message-protocol.md) - Message types and flow
- [Database Schema](./database-schema.md) - Database requirements
- [Integration](./integration.md) - Integration with existing systems

## Implementation Progress

The A2A system will be implemented in phases, starting with core functionality and gradually adding features to align with the Google A2A protocol. See the [Integration](./integration.md) document for the detailed implementation plan.

## Table of Contents

- [Architecture Overview](./architecture-overview.md)
- [Core Components](./core-components.md)
- [Agent Types](./agent-types.md)
- [Message Protocol](./message-protocol.md)
- [Database Schema](./database-schema.md)
- [Integration with Existing Systems](./integration.md)
- [Implementation Plan](./implementation-plan.md)

## Introduction

The Agent-to-Agent (A2A) system is designed to improve the reliability, traceability, and modularity of the component generation pipeline in Bazaar-Vid. By breaking down the process into specialized agents that communicate through a message bus, we can create a more resilient system where failures in one part don't affect others, and the entire process can be monitored and debugged more easily.

The system is particularly well-suited for resolving issues in the current pipeline, where component generation, error fixing, storage in R2, and UI updates are tightly coupled processes that can fail at different stages.

## Getting Started

To understand the A2A system, start with the [Architecture Overview](./architecture-overview.md) document, which provides a high-level view of the system and its components. Then, explore the specific agents and their responsibilities in [Agent Types](./agent-types.md).

For technical details about implementation, refer to the [Core Components](./core-components.md) and [Message Protocol](./message-protocol.md) documents.
