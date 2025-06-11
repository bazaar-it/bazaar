# Bazaar-Vid Enhanced Evaluation System

## 🎯 Overview

The enhanced evaluation system provides comprehensive performance analysis for **model pack optimization**, **prompt engineering**, and **cost vs quality tradeoffs**. This addresses your key goals:

1. **Model Pack Performance**: Which models work best for which tasks
2. **Speed Optimization**: Reduce 1+ minute generation time
3. **Cost Efficiency**: Find where cheaper models maintain quality
4. **Image-to-Code Pipeline**: Test screenshot → button integration
5. **Real API Usage**: No mocks, real OpenAI/Anthropic calls with cost tracking

## 🚀 Key Features

### 📊 Model Pack Comparison
- Tests all 6 model packs across real workflows
- Measures speed, cost, quality, and accuracy
- Identifies optimal model for each use case
- Provides ranking and recommendations

### ⚡ Performance Benchmarking
- Speed-critical vs quality-critical scenarios
- Cost-efficiency analysis
- Real-world workflow testing
- P95 latency and cost per token metrics

### 🖼️ Image-to-Code Pipeline Testing
- Screenshot analysis accuracy
- Code generation quality from images
- Button integration workflows
- Style matching capabilities

### 🔬 Prompt Optimization (Future)
- A/B test different system prompts
- Find optimal prompt configurations
- Service-specific optimization

## 🎯 Available Model Packs

| Pack | Description | Best For | Speed | Cost | Quality |
|------|-------------|----------|-------|------|---------|
| `starter-pack-1` | GPT-4o-mini everywhere | Cost efficiency | ⚡⚡⚡ | 💰💰💰 | ⭐⭐ |
| `performance-pack` | GPT-4o balanced | General use | ⚡⚡ | 💰💰 | ⭐⭐⭐ |
| `openai-pack` | GPT-4.1 + GPT-4o mix | Premium quality | ⚡ | 💰 | ⭐⭐⭐⭐ |
| `claude-pack` | Claude Sonnet 4 | Code generation | ⚡⚡ | 💰💰 | ⭐⭐⭐⭐ |
| `mixed-pack` | O1-mini + Claude + GPT-4o | Complex reasoning | ⚡ | 💰 | ⭐⭐⭐⭐⭐ |
| `haiku-pack` | Claude Haiku | Speed | ⚡⚡⚡ | 💰💰💰 | ⭐⭐ |

## 🛠️ Usage

### Quick Test (5 minutes)
```bash
npm run eval:quick
```
Tests 5 prompts with 2 model packs for rapid feedback.

### Comprehensive Model Comparison (20-30 minutes)
```bash
npm run eval:compare
# or with options:
npm run eval compare-models --images --max=3 --verbose
```

### Performance Benchmark
```bash
npm run eval:benchmark
# or specific packs:
npm run eval benchmark claude-pack openai-pack
```

### Image-to-Code Pipeline Testing
```bash
npm run eval:pipeline
```
Tests real screenshot → button integration workflows.

### Advanced Usage
```bash
# List all available model packs
npm run eval list-packs

# Show all commands
npm run eval
```

## 📊 Example Output

### Model Pack Ranking
```
🏆 OVERALL RANKINGS:
🥇 1. Claude Pack
     Speed: 2,340ms | Cost: $0.0089 | Quality: 8.7/10
     High-quality outputs. Very reliable.

🥈 2. OpenAI Pack  
     Speed: 2,890ms | Cost: $0.0156 | Quality: 9.1/10
     Highest quality outputs. Premium performance.

🥉 3. Performance Pack
     Speed: 1,890ms | Cost: $0.0067 | Quality: 7.8/10
     Fast execution. Cost-effective.
```

### Category Winners
```
🏅 CATEGORY WINNERS:
⚡ Fastest: Haiku Pack (1,245ms average)
💰 Cheapest: Starter Pack ($0.0023 per operation)
🔥 Highest Quality: Mixed Pack (9.3/10 score)
🎯 Best Overall: Claude Pack
```

### Optimal Configurations
```
🎯 OPTIMAL CONFIGURATIONS:

📋 Speed-Critical Operations:
   🎯 Recommended: Haiku Pack
   📊 Expected: ~1.2s speed, $0.003 cost, 7.2/10 quality
   💡 Fastest response time for simple operations
   🔄 Alternatives: Starter Pack (15% slower), Performance Pack (35% slower)

📋 High-Quality Content Generation:
   🎯 Recommended: Mixed Pack  
   📊 Expected: ~3.1s speed, $0.018 cost, 9.3/10 quality
   💡 Highest quality outputs for complex reasoning
   🔄 Alternatives: OpenAI Pack (0.2 points lower), Claude Pack (0.6 points lower)
```

## 🎯 Test Categories

### ⚡ Speed Tests
- Simple scene creation
- Basic text edits
- Duration changes
- Color modifications

### 🔥 Quality Tests  
- Complex company intros
- Advanced animations
- Brand style interpretation
- Multi-step workflows

### 🖼️ Vision Tests
- Button integration from screenshots
- Dashboard recreation
- Style matching
- Image analysis accuracy

### 💰 Cost-Efficiency Tests
- Simple operations with cheaper models
- Quality threshold testing
- Cost per operation analysis

## 🔧 Real Workflow Scenarios

All tests use **real production workflows**:

1. **Company Intro Creation**: "generate an intro video for my company. its called Spinlio. we do cyber security..."
2. **Button Integration**: Upload screenshot → "recreate this button with hover animations"
3. **Complex Animations**: "add floating particles that move in a spiral pattern and change colors dynamically"
4. **Style Matching**: "match the exact color scheme and typography style from this design"

## 💡 Key Insights Expected

### Speed Optimization
- **Haiku Pack** likely fastest for simple operations (surgical edits, duration changes)
- **Starter Pack** good balance of speed and cost for basic tasks
- **Mixed Pack** worth the extra time for complex reasoning

### Cost Efficiency
- **Starter Pack** (GPT-4o-mini) probably handles 70% of tasks at 80% lower cost
- **Performance Pack** good middle ground
- **OpenAI Pack** worth premium for highest quality needs

### Quality Thresholds
- Simple edits: All packs likely perform well
- Complex reasoning: Premium packs (Claude, Mixed, OpenAI) likely necessary
- Image analysis: GPT-4o models likely superior for vision tasks

### Pipeline Bottlenecks
- Image analysis likely takes 2-4 seconds
- Code generation probably 1-3 seconds  
- Context building and tool selection under 1 second
- **Target**: Reduce total pipeline from 60s+ to under 15s

## 🎯 Action Items Post-Evaluation

1. **Update Default Model Pack**: Based on best overall performance
2. **Create Smart Model Selection**: Route simple tasks to cheaper models
3. **Optimize System Prompts**: Based on prompt optimization results
4. **Cache Common Operations**: Reduce repeated API calls
5. **Parallel Processing**: Run independent operations concurrently

## 📈 Expected Performance Improvements

**Current State**: 60+ seconds from prompt to video
**Target State**: 10-15 seconds for most operations

**Optimization Strategy**:
1. **Fast Path** (80% of operations): Use Haiku/Starter pack for simple tasks
2. **Quality Path** (15% of operations): Use Claude/Mixed pack for complex reasoning  
3. **Premium Path** (5% of operations): Use OpenAI pack for highest quality needs

This evaluation system provides the data needed to implement intelligent model selection and reduce generation time while maintaining quality where it matters most.

## 🚀 Getting Started

1. **Set up environment variables** (OPENAI_API_KEY, ANTHROPIC_API_KEY)
2. **Run quick test**: `npm run eval:quick` 
3. **Review results** and identify patterns
4. **Run comprehensive comparison**: `npm run eval:compare`
5. **Implement optimizations** based on findings

The system provides real data to answer: "Where can we use cheaper/faster models without sacrificing quality?"