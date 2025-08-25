# Sprint 99.5: URL to Video V2

## 🎯 Mission
**"Film the website, don't imagine it"**

Transform the URL-to-video pipeline from a creative interpretation system to a high-fidelity representation system that produces 15-30 second videos faithfully representing the source website.

## 📋 Sprint Documents

1. **[ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)**
   - High-level pipeline design
   - Core philosophy and principles
   - Success metrics and targets

2. **[PIPELINE_DETAILED.md](./PIPELINE_DETAILED.md)**
   - Deep dive into each pipeline stage
   - Implementation details and algorithms
   - Error recovery strategies

3. **[DATA_SCHEMAS.md](./DATA_SCHEMAS.md)**
   - Complete TypeScript interfaces
   - Data flow specifications
   - Validation requirements

4. **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)**
   - 4-week development roadmap
   - Task breakdown and dependencies
   - Resource requirements

5. **[VISUAL_FLOW.md](./VISUAL_FLOW.md)**
   - Mermaid diagrams of complete flow
   - Visual representations of each stage
   - Example walkthroughs

6. **[V1_VS_V2_COMPARISON.md](./V1_VS_V2_COMPARISON.md)**
   - Detailed comparison with current system
   - ROI analysis and migration path
   - Technical debt resolution

## 🔄 Pipeline Overview

```
URL → Extract → BrandJSON → ScenePlan → EditInstructions → Video
```

### Key Innovations

1. **Evidence-Based Everything**: Every claim must point to a screenshot or DOM element
2. **Multi-Pass Analysis**: Structure → Content → Visual → Validation
3. **Capability-Based Matching**: Templates selected by requirements, not randomly
4. **Style Lock**: Consistent brand application across all scenes
5. **Quality Gates**: Pre-render validation ensures output quality

## 📊 Target Metrics

| Metric | Current (V1) | Target (V2) |
|--------|-------------|------------|
| **Fidelity** | ~40% | >85% |
| **Processing Time** | 90-120s | <60s |
| **Template Usage** | 25 | 45+ |
| **Evidence-Based** | 0% | 100% |
| **Video Duration** | 60-90s | 15-30s |

## 🏗️ Implementation Phases

### Week 1: Foundation
- Web extraction service with Playwright
- BrandJSON schema and analyzer
- Database schema and storage

### Week 2: Intelligence  
- Hero's Journey composer
- Template matching engine
- Style lock system

### Week 3: Execution
- Edit instruction processor
- Render orchestration
- Quality assurance

### Week 4: Integration
- API endpoints
- Inspector UI
- Migration and testing

## 🚀 Quick Start

### For Developers

1. **Review the architecture**: Start with `ARCHITECTURE_OVERVIEW.md`
2. **Understand the data flow**: Read `DATA_SCHEMAS.md`
3. **Check implementation tasks**: See `IMPLEMENTATION_PLAN.md`

### For Product/Design

1. **See the comparison**: Read `V1_VS_V2_COMPARISON.md`
2. **Understand the flow**: Check `VISUAL_FLOW.md`
3. **Review quality targets**: See metrics in `ARCHITECTURE_OVERVIEW.md`

## 🎯 Success Criteria

- [ ] 85%+ elements match source website
- [ ] 90%+ colors and fonts preserved
- [ ] 100% content is evidence-based (no hallucination)
- [ ] <60s end-to-end processing
- [ ] 15-30s focused output videos

## 🔧 Technical Stack

- **Extraction**: Playwright (headless Chrome)
- **Analysis**: GPT-4V for visual understanding
- **Storage**: R2 (screenshots), Postgres (metadata)
- **Rendering**: Remotion + Lambda
- **API**: tRPC for type safety

## 📈 Expected Impact

### User Benefits
- Videos that actually look like their website
- Faster processing times
- More consistent quality
- Better brand representation

### Business Benefits
- Higher user satisfaction (3.2 → 4.5 stars expected)
- Lower support burden (-70% quality tickets)
- Better conversion (+25% expected)
- Reduced processing costs (-50%)

## 🤝 Team

- **Lead**: Full-stack engineer
- **Support**: Frontend developer
- **Review**: Designer for quality validation
- **Testing**: QA for pipeline validation

## 📅 Timeline

- **Start Date**: [Current]
- **Phase 1 Complete**: Week 1
- **Phase 2 Complete**: Week 2
- **Phase 3 Complete**: Week 3
- **Full Integration**: Week 4
- **Production Ready**: Week 5

## 💡 Key Decisions

1. **Evidence over creativity**: Only use what exists on the page
2. **Quality over quantity**: 15-30s of great content vs 60-90s of generic
3. **Deterministic over random**: Capability matching vs random selection
4. **Fidelity over interpretation**: Film what's there, don't imagine

## 🔗 Related Sprints

- Sprint 99: URL to Video V1 (current system)
- Sprint 98: Auto-fix analysis
- Sprint 76: Critical bug fixes

## 📝 Notes

- This is a complete rewrite, not an iteration
- Backward compatibility maintained during migration
- A/B testing planned for validation
- Performance monitoring critical for success

---

**Remember**: The goal is not to create a video "inspired by" a website, but to create a video that faithfully represents what's actually on the website. Every design decision should support this core principle.