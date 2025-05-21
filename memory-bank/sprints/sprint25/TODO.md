//memory-bank/sprints/sprint25/TODO.md
- [ ] Implement BAZAAR-255 ESM build pipeline
- [ ] Update loaders per BAZAAR-256
- [ ] Decide on import map vs bundling for runtime deps (BAZAAR-258)
- [ ] Prototype server-side wrapper (BAZAAR-259)
- [ ] Extend tests for new flow (BAZAAR-260)
- [x] Adjust generation templates (BAZAAR-257)

# Sprint 25 TODO

## Custom Component Improvements

### ESM Component Implementation

- [ ] BAZAAR-255: Implement ESM Build Pipeline
  - [x] Update esbuild configuration for ESM output
  - [x] Configure proper export handling
  - [x] Test build output format
  - [ ] Verify compatibility with React.lazy
  - [ ] Update build worker to handle ESM output

- [IN PROGRESS] BAZAAR-256: Implement React.lazy Component Loading
  - [x] Replace script tag injection with ESM imports
  - [x] Implement React.lazy and Suspense
  - [x] Add error boundary for component failures
  - [x] Test with different component types
  - [ ] Add refresh mechanism for updated components
  - [IN PROGRESS] Resolve ESM Component Loading Issues in Test Harness
    - **Status:** Attempted fix for `react/jsx-dev-runtime` error by switching Sucrase JSX runtime to 'classic'. Awaiting test results.
    - Investigate and resolve errors preventing dynamic components from loading (e.g., module specifier errors, context errors).

- [x] BAZAAR-257: Update Component Templates
  - [x] Modify templates to use ES modules
  - [x] Update export patterns for React.lazy compatibility
  - [x] Remove IIFE and global registration
  - [x] Add proper prop type definitions
  - [x] Update documentation comments

- [ ] BAZAAR-258: Manage Runtime Dependencies
  - [x] Identify common runtime dependencies
  - [x] Create strategy for dependency resolution
  - [ ] Implement import maps for browser
  - [ ] Handle versioning for shared dependencies
  - [ ] Test with various component requirements

- [ ] BAZAAR-259: Implement Server-Side Component Validation
  - [ ] Create server-side component validator
  - [ ] Implement server-side component rendering
  - [ ] Add validation for React hooks usage
  - [ ] Implement server-side component validation
  - [ ] Create rendering safeguards

- [x] BAZAAR-261: Update documentation for ESM components
  - [x] Add developer guide for creating ESM-compatible components
  - [x] Update API documentation to reflect new component loading pattern

- [ ] BAZAAR-262: Performance testing for ESM components
  - [x] Measure component load time before and after ESM migration
  - [x] Track memory usage with new component loading approach
  - [x] Benchmark React.lazy vs script tag approach

- [x] BAZAAR-263: Implement shared module system
  - [x] Create a system for shared utilities across components
  - [x] Implement version management for shared modules
  - [x] Add documentation for using shared modules
