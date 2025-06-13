# Sprint 41: Architectural Principles

This document indexes all architectural principles for Sprint 41. Each principle has its own detailed document.

## Core Architecture Principles

1. **[Separation of Concerns](./PRINCIPLE_01_SEPARATION_OF_CONCERNS.md)**
   - Brain decides, generation.ts executes
   - Clear boundaries between decision and execution

2. **[Zero Transformation](./PRINCIPLE_02_ZERO_TRANSFORMATION.md)**
   - Use database field names everywhere
   - No mapping or transformation layers

3. **[Single Implementation](./PRINCIPLE_03_SINGLE_IMPLEMENTATION.md)**
   - One solution per problem
   - Delete duplicates ruthlessly

4. **[Simplicity Over Complexity](./PRINCIPLE_04_SIMPLICITY_OVER_COMPLEXITY.md)**
   - Prefer 100 lines over 2000 lines
   - Remove unnecessary abstractions

## Performance Principles

5. **[Speed First](./PRINCIPLE_05_SPEED_FIRST.md)**
   - <100ms decision time
   - <16ms UI updates
   - Optimistic updates everywhere

## Configuration Principles

6. **[Structured Prompts](./PRINCIPLE_06_STRUCTURED_PROMPTS.md)**
   - Organized in `/src/brain/config/prompts/`
   - Separate files for maintainability
   - Version controlled and documented

7. **[Smart Model Configuration](./PRINCIPLE_07_MODEL_CONFIG.md)**
   - Right model for right task
   - Temperature settings matter
   - Cost vs quality tradeoffs

## State Management Principles

8. **[Normalized State](./PRINCIPLE_08_STATE_MANAGEMENT.md)**
   - Flat structure for performance
   - Single source of truth
   - Optimistic updates pattern

## Tool & Execution Principles

9. **[Direct Tool Access](./PRINCIPLE_09_DIRECT_TOOL_ACCESS.md)**
   - No unnecessary wrappers
   - Tools called directly where needed
   - Clear tool boundaries

10. **[Trust The Code](./PRINCIPLE_10_TRUST_THE_CODE.md)**
    - Database writes are reliable
    - State updates are immediate
    - No defensive programming

## Quick Reference

- **Brain**: Decisions only (~100 lines)
- **Generation**: Execution only
- **Fields**: Database names only (`tsxCode`)
- **State**: Normalized and flat
- **Prompts**: <50 words
- **Response Time**: <100ms
- **Duplicates**: Zero tolerance
- **Wrappers**: None
- **Trust**: Complete