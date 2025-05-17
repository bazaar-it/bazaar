# A2A Video Generation Flow

This document outlines the desired end-to-end flow for generating a video based on a user's prompt, involving multiple A2A (Agent-to-Agent) interactions.

## 1. User Input & Project Initiation
   - **Trigger**: User submits a prompt (e.g., "create a 5 seconds animation of a snake old school snake game") via an interface (e.g., `/test/evaluation-dashboard` or a dedicated creation page).
   - **Action**:
     - A new project is created in the system.
     - A unique `projectId` is generated and associated with the session.

## 2. User Interaction & Initial Analysis
   - **Agent**: `UserInteractionAgent` (or a similar dedicated agent).
   - **Interface**: A chat-like panel (e.g., `ChatPanel.tsx`) to display communication with the user.
   - **Responsibilities**:
     - Receives the initial prompt.
     - Performs initial analysis of the user's intent.
     - Communicates progress, asks clarifying questions, and provides feedback to the user throughout the process.
     - This agent might be responsible for invoking the `CoordinatorAgent` or the first "real" processing agent.

## 3. Orchestration by CoordinatorAgent
   - **Agent**: `CoordinatorAgent`.
   - **Responsibilities**:
     - Manages the overall workflow and sequence of operations.
     - Knows about all other specialized agents and their capabilities.
     - Invokes subsequent agents based on the current state of the task.
     - Receives results/status from other agents and decides the next step.

## 4. Scene Planning
   - **Agent**: `ScenePlannerAgent`.
   - **Trigger**: Invoked by the `CoordinatorAgent` after initial prompt analysis.
   - **Services Used**: `scenePlanner.service.ts`.
   - **Responsibilities**:
     - Takes the user's prompt and breaks it down into a sequence of scenes.
     - Defines the content, duration, and general characteristics of each scene.
     - Outputs a scene plan (e.g., an array of scene descriptions).

## 5. Animation Design Brief (ADB) Generation
   - **Agent**: `ADBAgent` (Animation Design Brief Agent).
   - **Trigger**: Invoked by the `CoordinatorAgent` after successful scene planning, for each planned scene.
   - **Services Used**: `animationDesigner.service.ts`.
   - **Responsibilities**:
     - Takes a scene description (from the `ScenePlannerAgent`).
     - Generates a detailed Animation Design Brief (ADB) for that scene. The ADB specifies elements, animations, timings, assets, etc., in a structured format (e.g., Zod schema `animationDesignBriefSchema`).

## 6. Remotion Code Generation (Component Building)
   - **Agent**: `BuilderAgent` (or `ComponentBuilderAgent`).
   - **Trigger**: Invoked by the `CoordinatorAgent` after ADB generation for a scene.
   - **Responsibilities**:
     - Takes an ADB as input.
     - Generates the corresponding Remotion React component code (`.tsx`) that implements the design specified in the ADB.

## 7. Code Evaluation, Build, and Deployment
   - **Agent(s)**: Could be the `BuilderAgent` or specialized agents like `BuildAgent`, `DeployAgent`.
   - **Trigger**: After Remotion code generation.
   - **Responsibilities**:
     - **Evaluation**: Linting, basic static analysis of the generated code.
     - **Build**: Compiling the Remotion component/video (e.g., using Remotion CLI or an automated build process).
     - **Upload**: Storing the build artifacts (e.g., video file, component bundle) to a storage service (e.g., R2).
     - **Output URL**: Obtaining a publicly accessible URL for the generated video or preview.

## 8. Display in Remotion Player
   - **Interface**: A Remotion Player instance on the frontend.
   - **Trigger**: Once the video is built and an output URL is available, or if a live preview mechanism from ADBs is in place.
   - **Action**:
     - The output URL is provided to the Remotion Player.
     - Alternatively, for previews, the ADB data is fed to a dynamic Remotion composition (like `DynamicVideo.tsx`) that renders based on the brief.
     - The user can view the generated animation.

## Continuous User Updates
   - The `UserInteractionAgent` should provide continuous feedback to the user in the `ChatPanel` at each significant step (e.g., "Planning scenes...", "Generating design for scene 1...", "Building component for scene 1...", "Video ready!").

This flow aims for a modular, agent-based system where each agent has specific responsibilities, and the `CoordinatorAgent` orchestrates their interactions.
