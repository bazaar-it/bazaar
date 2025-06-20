# Sprint 46: Duration System Analysis

## Essential Documentation

### 1. `overview.md` - Current State Analysis
- Documents all hardcoded duration values (60-300 frames)
- Shows exact file locations and line numbers
- Identifies 6+ inconsistent defaults across codebase

### 2. `animation-vs-scene-duration.md` - Technical Understanding
- **Scene Duration**: Container limit (when scene ends)
- **Animation Duration**: Content timing (what happens inside)
- Shows how Remotion enforces hard limits with `<Sequence>`
- Includes real code examples from PreviewPanelG.tsx

### 3. `duration-flow.md` - System Architecture
- Traces duration from user input → rendering
- Shows how generation.universal.ts handles duration
- Documents trust-based approach (router trusts tools)

### 4. `action-plan.md` - What To Do
- Simple fix: Update code generator prompt
- Let LLM be smart about duration context
- No overengineering needed

## Key Findings

✅ **System works** - Duration flows correctly through pipeline
✅ **LLM is smart** - Can understand "quick" vs "detailed" 
❌ **Inconsistent defaults** - Easy fix
❌ **No explicit duration parsing** - Not needed, LLM sees user prompt

## Bottom Line

The infrastructure works. We just need to:
1. Make code generator prompt slightly smarter about duration
2. Pick one default (150 frames) and stick to it
3. Trust the LLM to understand context