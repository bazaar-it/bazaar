//memory-bank/sprints/sprint25/BAZAAR-262-performance-testing.md
# BAZAAR-262: Performance Testing for ESM Components

## Status: In Progress (May 26, 2025)

This ticket introduces a simple benchmark to measure how quickly custom components load using the new ESM workflow versus the legacy script tag approach.

### Test Implementation
- Added `componentLoad.test.ts` under `src/tests/performance`.
- The test dynamically imports an ESM module and compares it to loading an IIFE script via a `<script>` tag.
- It records load time with `performance.now()` and heap usage via `process.memoryUsage()`.
- Fixtures for both module formats live in `src/tests/performance/fixtures/`.

### Next Steps
- Integrate real build outputs instead of mock fixtures for more accurate numbers.
- Automate result aggregation and store metrics in `/memory-bank/benchmarking`.
