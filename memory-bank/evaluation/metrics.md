# Bazaar-Vid Evaluation Metrics Framework

This document establishes formal evaluation metrics for the AI-driven components of Bazaar-Vid, following an eval-driven development approach. These metrics are designed to guide empirical improvement rather than feature-based development.

## Component Generation Pipeline Metrics

The component generation pipeline converts user requests into functional Remotion components through multiple stages (Prompt → Codegen → DB → R2 → UI). Success requires coordination between LLM code generation, build processes, and runtime integration.

### Quantitative Metrics

#### 1. Success Rate
**Definition**: Percentage of component generation requests that result in usable, renderable components.
**Current Baseline**: ~90% (estimated)
**Target**: 98%
**Measurement Method**: 
- Automated testing of component generation with diverse prompts
- Daily production logs analysis
- Count of components marked 'complete' with valid R2 URLs versus total attempts

**Sub-metrics by Pipeline Stage**:
- **Prompt to Code Generation**: % of prompts resulting in syntactically valid code
- **Code to Database**: % of generated code properly stored in DB
- **Database to R2**: % of DB entries resulting in valid R2 bundles
- **R2 to UI Rendering**: % of R2 bundles that render without errors in the video editor

**Alert Threshold**: < 85% success rate triggers investigation

#### 2. First-Attempt Success
**Definition**: Percentage of components that build successfully without requiring syntax fixes or developer intervention.
**Current Baseline**: ~75% (estimated from error analysis)
**Target**: 95%
**Measurement Method**:
- Track ratio of components requiring fixes vs total generations
- Monitor `applySyntaxFix` and `confirmSyntaxFix` calls per component
- Log LLM generation attempts per component

#### 3. Generation Speed
**Definition**: Time elapsed during each stage of component generation.
**Current Baseline**: To be established
**Targets**:
- **Prompt to Code**: < 10 seconds
- **Code to Build**: < 15 seconds 
- **End-to-End**: < 30 seconds
**Measurement Method**:
- Timestamp logging at each pipeline stage
- Performance tracking in the metrics database table
- Percentile analysis (p50, p95, p99)

**Sub-metrics**:
- **Time to First Token**: Time from prompt submission to first LLM response token
- **Build Time**: Time spent in esbuild compilation
- **Upload Time**: Time to upload to R2 storage

#### 4. Code Quality Scores
**Definition**: Objective measures of generated code quality.
**Current Baseline**: 78.6% of components have static analysis issues despite successful builds
**Target**: < 10% of components with static analysis issues
**Measurement Method**:
- Automated static analysis via ESLint/TypeScript
- Track specific error types (missing exports, direct imports, etc.)
- Apply custom code quality scoring function

**Key Quality Sub-metrics**:
- **Export Compliance**: % of components with proper export declarations
- **Import Structure**: % of components with correct window globals usage
- **Symbol Declaration**: % of components with no redeclaration issues
- **Error UI Prevention**: % of components that don't default to error display UI

### Qualitative Metrics

#### 1. Animation Fidelity
**Definition**: How closely the generated component matches the requested animation.
**Measurement Method**:
- Human evaluation on 1-5 scale
- Sampling across animation categories (text, shapes, transitions, etc.)
- Regular review sessions with design team
**Target**: Average score > 4.2

#### 2. Visual Consistency
**Definition**: How well components maintain consistent styling with the application.
**Measurement Method**:
- Design review against style guide
- User feedback on component aesthetics
**Target**: 90% of components match design system

### Testing & Measurement Implementation

1. **Automated Testing Suite**:
   - Create test harness for component generation with diverse prompts
   - Run daily with results logged to metrics database
   - Generate automated reports showing trends

2. **Production Telemetry**:
   - Add timing instrumentation to all pipeline stages
   - Log component generation events with all relevant metadata
   - Track user interactions with components (add to video, remove, etc.)

3. **Visualization Dashboard**:
   - Build admin dashboard showing key metrics over time
   - Alert system for metric degradation
   - Daily/weekly summary reports

## A2A Protocol Implementation Metrics

The A2A (Agent-to-Agent) protocol provides real-time task status updates via Server-Sent Events (SSE) and enables interactive agent scenarios.

### Quantitative Metrics

#### 1. Task Completion Rate
**Definition**: Percentage of A2A tasks that complete successfully.
**Target**: 99% completion rate
**Measurement Method**:
- Track task status changes in database
- Calculate completion percentage across all tasks
- Segment by task type (generation, analysis, etc.)

**Sub-metrics**:
- **Task Success by Type**: Analyze performance across different task types
- **Error Distribution**: Categorize error types and frequencies
- **Recovery Rate**: % of initially failed tasks that succeed after retry

**Alert Threshold**: < 95% success rate triggers investigation

#### 2. Real-Time Update Latency
**Definition**: Speed and reliability of status updates to frontend.
**Targets**:
- **Time to First Update**: < 100ms from task initiation
- **Update Frequency**: Every meaningful state change
- **Status Delivery Reliability**: 99.9% of status updates delivered
**Measurement Method**:
- Server-side timestamp logging
- Client-side event receipt timing
- End-to-end latency calculations

**Sub-metrics**:
- **SSE Connection Time**: How long it takes to establish SSE connection
- **Message Processing Time**: How long the client takes to process updates
- **Jitter**: Variation in update delivery times

#### 3. Stream Reliability
**Definition**: Stability and resilience of SSE connections.
**Targets**:
- **Connection Drop Rate**: < 0.5%
- **Reconnection Success Rate**: > 99%
- **Long-Running Task Support**: Maintain connection for tasks > 5 minutes
**Measurement Method**:
- Log connection events (establish, drop, reconnect)
- Track client-side reconnection attempts
- Monitor server-side connection pool

**Sub-metrics**:
- **Reconnection Time**: Average time to reestablish dropped connections
- **Missed Events**: Count of events lost during reconnection
- **Connection Lifespan**: Distribution of connection duration times

#### 4. Component Integration Metrics
**Definition**: How well UI components integrate with the A2A system.
**Targets**:
- **Event Processing Rate**: > 99.9% of events properly displayed
- **Memory Stability**: No memory leaks during extended SSE sessions
- **Render Performance**: UI updates without jank
**Measurement Method**:
- Frontend performance profiling
- Memory usage tracking over time
- UI event processing timing

### Qualitative Metrics

#### 1. User Feedback Clarity
**Definition**: How clearly task status is communicated to users.
**Measurement Method**:
- User surveys on status comprehension
- Task completion time studies with different status displays
- A/B testing of status visualization approaches
**Target**: Average rating > 4.5/5

#### 2. Developer Experience
**Definition**: Ease of integrating and extending A2A components.
**Measurement Method**:
- Time for new developers to implement custom A2A components
- Documentation completeness assessment
- Developer satisfaction surveys
**Target**: New component implementation in < 2 hours

### Testing & Measurement Implementation

1. **A2A Testing Framework**:
   - Create test harness that simulates various task types
   - Generate load tests with multiple concurrent tasks
   - Simulate network conditions (latency, drops, etc.)

2. **Client Instrumentation**:
   - Add timing code to `useSSE`, `useTaskStatus` hooks
   - Track React rendering performance
   - Monitor UI update consistency

3. **Server Instrumentation**:
   - Log all SSE connection lifecycle events
   - Track task state transitions
   - Measure server-side processing time for events

## Evaluation Process

1. **Baseline Establishment**:
   - Run initial evaluation suite to establish current performance
   - Document all metrics in baseline report
   - Identify critical areas for improvement

2. **Continuous Evaluation**:
   - Schedule daily automated test runs
   - Weekly metric review meetings
   - Monthly deep-dive analysis

3. **Improvement Targeting**:
   - Prioritize changes based on metric gaps
   - Set incremental improvement goals
   - Document impact of each change on metrics

4. **Reporting**:
   - Generate automated weekly reports
   - Maintain metrics dashboard
   - Alert on significant metric changes

## Next Steps

1. Implement instrumentation for baseline metrics collection
2. Build automated testing suite for both systems
3. Establish initial baseline measurements
4. Set up visualization and alerting system
5. Begin eval-driven improvement cycle
