//memory-bank/evals/AI-EVALUATION-SYSTEM.md
# AI Evaluation & Model Comparison System

## Overview

The AI Evaluation System provides comprehensive testing and comparison capabilities for all AI models and model packs across the Bazaar-Vid pipeline. It enables systematic quality assessment, performance measurement, and cost analysis of different model configurations.

## Architecture

### Core Components

1. **EvalRunner** (`src/lib/evals/runner.ts`)
   - Orchestrates evaluation execution
   - Handles model switching and client management
   - Provides batch evaluation capabilities
   - Generates comparison reports

2. **Evaluation Types** (`src/lib/evals/types.ts`)
   - `EvalPrompt`: Test prompt with expected outputs
   - `EvalResult`: Individual test result with metrics
   - `EvalSuite`: Collection of related tests
   - `EvalComparison`: Side-by-side model comparison

3. **Test Suites** (`src/lib/evals/suites/`)
   - `basicPromptsSuite`: General text generation tests
   - `codeGenerationSuite`: Code quality and accuracy tests
   - `visionTestSuite`: Image analysis and description tests
   - `remotionSceneSuite`: Video scene generation tests

4. **CLI Interface** (`scripts/run-evals.ts`)
   - Interactive evaluation commands
   - Automated comparison workflows
   - Results visualization and export

## Evaluation Types

### Text Generation
- Code generation quality
- Creative writing assessment  
- Problem-solving capabilities
- Technical explanations

### Vision Analysis
- UI screenshot description
- Text extraction from images
- Design analysis and feedback
- Image-to-code generation

### Code Evaluation
- React component generation
- API endpoint creation
- Utility function quality
- TypeScript type accuracy

### Scene Generation
- Remotion animation code
- CSS styling accuracy
- Animation timing and easing
- Multi-element orchestration

## Model Pack Integration

The system leverages the centralized model management system to test all 5 pre-configured model packs:

1. **Starter Pack** - Cost-effective GPT-4o-mini baseline
2. **Performance Pack** - Premium GPT-4o for quality
3. **Mixed Pack** - Strategic model combination
4. **Claude Pack** - Claude 3.5 Sonnet for code excellence
5. **Haiku Pack** - Claude 3.5 Haiku for speed

## Usage Examples

### List Available Test Suites
```bash
npm run evals list
```

### Run Single Suite
```bash
npm run evals run basic-prompts claude-pack
```

### Compare Model Packs
```bash
npm run evals compare basic-prompts,code-generation claude-pack,performance-pack
```

### Quick Test
```bash
npm run evals:quick
```

### Batch Comparison
```bash
npm run evals:compare
```

## Metrics Collected

### Performance Metrics
- **Latency**: Response time in milliseconds
- **Token Count**: Input + output tokens consumed
- **Cost**: Estimated API cost in USD
- **Error Rate**: Failed requests per suite

### Quality Metrics
- **Output Validation**: Pattern matching and content verification
- **Code Compilation**: Syntax and type checking for generated code
- **Human Evaluation**: Optional manual quality scoring (1-10)
- **Consistency**: Output variation across multiple runs

## Results Storage

Evaluation results are automatically saved to `/memory-bank/evals/` with timestamped files:

- `results-YYYY-MM-DD.json`: Raw evaluation results
- `comparisons-YYYY-MM-DD.json`: Model comparison data
- `summary-YYYY-MM-DD.md`: Human-readable report

## Configuration

### Environment Variables
- `MODEL_PACK`: Default model pack for evaluations
- `OPENAI_API_KEY`: OpenAI API access
- `ANTHROPIC_API_KEY`: Anthropic API access

### BatchEvalConfig Options
```typescript
{
  suites: ['basic-prompts', 'code-generation'],
  modelPacks: ['claude-pack', 'performance-pack'],
  concurrency: 1,           // Parallel execution limit
  timeout: 30000,           // Request timeout (ms)
  saveResults: true,        // Auto-save results
  compareMode: true         // Generate comparisons
}
```

## Sample Evaluation Workflow

1. **Development Phase**
   ```bash
   # Quick sanity check
   npm run evals:quick
   
   # Test specific capability
   npm run evals run code-generation claude-pack
   ```

2. **Pre-Production Testing**
   ```bash
   # Compare top candidates
   npm run evals compare basic-prompts,code-generation claude-pack,performance-pack
   ```

3. **Production Monitoring**
   ```bash
   # Full evaluation suite
   npm run evals compare all-suites all-packs
   ```

## Integration with CI/CD

The evaluation system can be integrated into deployment pipelines to:

- Validate model performance before releases
- Catch quality regressions in AI outputs
- Benchmark new model versions
- Generate automated performance reports

## Cost Optimization

The system includes cost estimation and optimization features:

- **Token Tracking**: Monitor API usage across all tests
- **Cost Projection**: Estimate monthly costs for model packs
- **Efficiency Analysis**: Cost per quality unit comparison
- **Budget Alerts**: Warnings for high-cost test runs

## Quality Assurance

Built-in validation ensures reliable evaluation results:

- **Schema Validation**: Zod-based input/output verification
- **Error Handling**: Graceful failure and retry logic  
- **Consistency Checks**: Multiple runs for stability testing
- **Baseline Comparison**: Performance regression detection

## Future Enhancements

### Planned Features
- **A/B Testing**: Statistical significance testing
- **Custom Metrics**: Domain-specific quality measures
- **Real-time Monitoring**: Live performance dashboards
- **ML-based Scoring**: Automated quality assessment
- **Regression Testing**: Automated comparison with previous versions

### Integration Opportunities
- **Remotion Preview**: Visual validation of generated scenes
- **Code Execution**: Runtime testing of generated code
- **User Feedback**: Crowd-sourced quality ratings
- **Performance Profiling**: Detailed execution analysis

## Best Practices

### Test Design
- Use diverse, representative test cases
- Include edge cases and error conditions
- Balance automated and human evaluation
- Maintain test case version control

### Model Comparison  
- Test identical prompts across all models
- Control for external variables (temperature, tokens)
- Use statistical significance testing
- Document evaluation criteria clearly

### Results Analysis
- Look beyond single metrics (latency + quality)
- Consider cost-effectiveness trade-offs
- Validate findings with domain experts
- Track trends over time

This evaluation system provides comprehensive AI model testing capabilities that support informed decision-making about model selection, performance optimization, and quality assurance across the entire Bazaar-Vid AI pipeline.
