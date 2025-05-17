# Component Generation Test Harness

## Overview

This document outlines an automated testing suite for the Bazaar-Vid component generation pipeline, incorporating improvements from Sprint 20 and the A2A protocol implementation. The test harness is designed to evaluate the component generation process based on the metrics defined in our evaluation framework.

## Key Goals

1. Systematically evaluate component generation success rates
2. Test various component types and animation patterns
3. Log metrics to the database for trend analysis
4. Generate actionable reports to guide improvements
5. Integrate with the A2A protocol for detailed task monitoring

## Architecture

The test harness consists of four main modules:

1. **Test Generator**: Creates diverse test cases for component generation
2. **Test Runner**: Executes tests and captures results
3. **Metrics Collector**: Records performance data to the database
4. **Report Generator**: Creates daily/weekly summary reports

Each module is described in detail in its respective documentation file.

## Integration with A2A Protocol

The test harness leverages the recently implemented A2A protocol for:
- Detailed task status tracking
- Real-time streaming of generation progress
- Artifact collection and verification
- Comprehensive error diagnostics

By utilizing the SSE (Server-Sent Events) infrastructure, the test harness can monitor all state transitions during component generation.

## Integration with Sprint 20 Fixes

Recent improvements from Sprint 20 are incorporated:
- Corrected database table references (`bazaar-vid_custom_component_job`)
- Consistent tRPC procedure naming
- Improved error handling for component generation
- Better database integrity checks

## Directory Structure

```
/src/scripts/evaluation/
├── component-test-harness.ts       # Main test harness script
├── generators/                     # Test case generators
│   ├── prompt-generator.ts         # Creates diverse component prompts
│   ├── animation-generator.ts      # Creates specific animation test cases
│   └── edge-case-generator.ts      # Creates challenging edge cases
├── runners/                        # Test execution modules
│   ├── a2a-test-runner.ts          # Runs tests using A2A protocol
│   └── legacy-test-runner.ts       # Runs tests using direct API calls
├── collectors/                     # Metrics collection modules
│   ├── performance-collector.ts    # Collects timing metrics
│   ├── quality-collector.ts        # Collects code quality metrics
│   └── storage-collector.ts        # Collects R2/DB consistency metrics
└── reporters/                      # Reporting modules
    ├── daily-report-generator.ts   # Generates daily reports
    ├── trend-analyzer.ts           # Analyzes metric trends
    └── alert-generator.ts          # Generates alerts for metric degradation
```

## See Also

- [Test Case Generation](./test-case-generation.md)
- [Test Runners](./test-runners.md)
- [Metrics Collection](./metrics-collection.md)
- [Reporting](./reporting.md)
