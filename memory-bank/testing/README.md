# Bazaar-Vid Testing Documentation

This directory contains detailed documentation, strategies, and troubleshooting guides related to testing in the Bazaar-Vid project. The goal is to provide comprehensive resources for developers to understand, write, run, and maintain tests effectively.

## Index of Documentation

*   **Main Testing Guide:** [`../../tests.md`](../../tests.md)
    *   The primary document for getting started with testing in the project.
*   **Sprint-Specific Testing Status & Learnings:** [`../sprints/sprint24/`](../sprints/sprint24/)
    *   Find progress updates, status reports, and specific testing challenges addressed in recent development cycles.
*   **Component Pipeline Testing:** [`./component-pipeline-testing.md`](./component-pipeline-testing.md)
    *   Documentation on testing the automated component generation and building pipeline.
*   **Custom Component Testing Strategy:** [`./custom-component-testing-strategy.md`](./custom-component-testing-strategy.md)
    *   Details on how custom Remotion components are tested.
*   **Jest ESM Troubleshooting:** [`./jest_esm_troubleshooting.md`](./jest_esm_troubleshooting.md)
    *   Guide to resolving issues related to Jest and ECMAScript Modules.
*   **Jest Mocking Strategy:** [`./jest_mocking_strategy.md`](./jest_mocking_strategy.md)
    *   Explains the recommended approach for mocking dependencies in Jest tests.
*   **Jest Mocking Type Resolution Strategy:** [`./jest_mocking_type_resolution_strategy.md`](./jest_mocking_type_resolution_strategy.md)
    *   Provides guidance on handling TypeScript type issues when mocking.
*   **Test Results:** [`./test-results.md`](./test-results.md)
    *   Location for storing and reviewing outcomes of test runs.
*   **Test Coverage Map:** [`./coverage-map.md`](./coverage-map.md) (To be created/updated)
    *   Overview of test coverage across different parts of the application.
*   **Component Analysis Results:** [`./component-analysis-results.md`](./component-analysis-results.md)
    *   Results from analysis of existing components, potentially informing testing efforts.

## Improving Test Coverage

Based on best practices [1, 2], we aim to improve test coverage by focusing on:

*   **Feature Coverage:** Ensuring core features and user journeys are well-tested.
*   **Use Case / Scenario Coverage:** Testing the application from the end-user perspective.
*   **Automation:** Leveraging automated tests for efficiency and breadth of testing.

We are working towards creating a [coverage map](./coverage-map.md) to visualize current test coverage and identify areas for improvement.

## Contributing to Testing

Refer to the main [Testing Guide](../../tests.md) for instructions on contributing new tests and updating existing ones.

[1]: https://www.mabl.com/articles/how-to-improve-test-coverage-in-software-development
[2]: https://www.functionize.com/blog/how-to-use-ai-and-technical-strategies-to-improve-qa-test-coverage 