# Logging Strategy and Goals

This document outlines the logging strategy for the Bazaar-Vid application, focusing on providing clear and targeted console log output for different development scenarios.

## Core Objective: Separated Console Logging

The primary goal is to have distinct console logging behaviors depending on how the application is started:

1.  **`npm run dev` (Standard Mode / Project 1 Focus):**
    *   **Console Output:** Should primarily display logs relevant to the main application (Project 1: Standard Video Editor, UI, general backend services using `logger`, `chatLogger`, `componentsLogger`, etc.).
    *   **Suppressed Logs:** Console logs from specialized A2A (Project 2) agents (via `a2aLogger`) at `info` or `debug` levels should be suppressed to avoid excessive noise during general development. Critical errors (`error` level) from A2A agents will still appear on the console.
    *   **Log Agent Service:** All logs, regardless of source or level (above each logger's base configuration), are still sent to the central Log Agent service for comprehensive storage and analysis. This ensures no information is lost, even if not displayed on the console.

2.  **`scripts/startup-with-a2a.sh` (A2A Mode / Project 2 Focus):**
    *   **Console Output:** Should display detailed logs from *both* the main application and all A2A (Project 2) agents, including `info` and `debug` levels from `a2aLogger`. This provides a complete view when working on or debugging A2A functionalities.
    *   **Log Agent Service:** All logs are sent to the Log Agent service.

## Implementation: `LOGGING_MODE` Environment Variable

This separation of console log verbosity for `a2aLogger` is achieved using the `LOGGING_MODE` environment variable:
- When `scripts/startup-with-a2a.sh` is run, it sets `LOGGING_MODE=a2a`.
- The `src/lib/logger.ts` configuration checks this variable. If `LOGGING_MODE` is set to `a2a`, the console transport for `a2aLogger` uses the standard `LOG_LEVEL` (or `info`). Otherwise (e.g., during a standard `npm run dev`), `a2aLogger`'s console transport level is set to `error`, effectively silencing its `info` and `debug` messages on the console.

## Current Challenges: Cross-Project Log Investigation

An ongoing investigation addresses reports where initiating actions in Project 1 (Standard Video Editor) sometimes leads to logs from Project 2 (A2A system) appearing more prominently than expected, potentially in the Log Agent output or general console noise if `LOGGING_MODE` isn't set. The goal of the `LOGGING_MODE` variable is to specifically control the *console verbosity* of `a2aLogger` during different development modes. The root cause of any deeper log context bleeding is tracked in sprint-specific documents.
- For progress on this investigation, see relevant entries in `/memory-bank/sprints/sprint24/progress.md`.

## Key Documentation References

For more details on the logging system and related components:

- **Log Agent Service Design:** For a comprehensive overview of the Log Agent service (architecture, endpoints, data schema, etc.), refer to `/memory-bank/sprints/sprint22/logagent.md`.
- **Winston Logger Configuration (`src/lib/logger.ts`):** This file contains the core setup for all primary loggers (`logger`, `a2aLogger`, `componentsLogger`) and specialized child loggers (`chatLogger`, `buildLogger`, `scenePlannerLogger`, etc.), including their formats and transports.
- **Log Agent Integration (`src/scripts/log-agent/`):
    - `config.ts`: Configuration for the Log Agent client.
    - `integration.ts`: Functions for interacting with the Log Agent service.
    - `logger-transport.ts`: The custom Winston transport that sends logs to the Log Agent service.
- **Sprint-Specific Progress & Issues:** Consult files within `/memory-bank/sprints/` for ongoing work and detailed tickets, particularly `/memory-bank/sprints/sprint24/` for recent logging-related discussions and investigations. Other relevant documents for project context include `project1_current_vs_ideal.md` and `project2_current_vs_ideal.md` also in the sprint folders.

This strategy aims to enhance the developer experience by providing relevant log views for specific tasks while ensuring all necessary information is captured centrally for thorough analysis and debugging.
