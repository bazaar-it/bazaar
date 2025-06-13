# Sprint 41 TODO List

## Critical - Architecture Alignment

### 1. Move Tool Execution to generation.ts 🔴
- [ ] Remove ToolExecutor from brain/orchestrator_functions/
- [ ] Brain should ONLY return decisions
- [ ] generation.ts should handle all tool execution
- [ ] Maintain clean separation: decide vs execute

### 2. Fix Field Name Inconsistencies 🔴
- [ ] Change all `sceneCode` to `tsxCode` (match database)
- [ ] Update all type definitions
- [ ] Remove all field mapping/transformation code
- [ ] Single source of truth: database schema

### 3. Simplify Brain to Sprint 40 Vision 🔴
- [ ] Brain should be ~100 lines total
- [ ] Only make decisions, return tool + context
- [ ] Remove complex orchestration logic
- [ ] Trust the original Sprint 40 design

## High Priority - Core Integration

### 4. Integrate Normalized VideoState 🟡
- [ ] Switch to videoState.normalized.ts
- [ ] Remove old nested VideoState
- [ ] Implement single handleApiResponse method
- [ ] Add optimistic UI support

### 5. Simplify Prompts 🟡
- [ ] Reduce all prompts to 30-50 words
- [ ] Remove verbose prompt files
- [ ] Trust AI models more
- [ ] Follow Sprint 40 examples

### 6. Clean Up Duplicate Files 🟡
- [ ] Keep only one orchestrator
- [ ] Keep only one VideoState
- [ ] Keep only one generation router
- [ ] Archive or delete old versions

## Medium Priority - Optimization

### 7. Align Tools with Simplified Architecture
- [ ] Review if current tool structure is too complex
- [ ] Consider Sprint 40's simpler approach
- [ ] Keep modular organization but simplify execution

### 8. Type System Improvements
- [ ] Create single source of truth for types
- [ ] Use discriminated unions properly
- [ ] Remove duplicate type definitions
- [ ] Ensure type flow matches data flow

### 9. Testing & Verification
- [ ] Test new execution flow
- [ ] Verify field names work end-to-end
- [ ] Check optimistic UI performance
- [ ] Validate simplified prompts quality

## Low Priority - Future Improvements

### 10. Documentation Updates
- [ ] Update CLAUDE.md with new architecture
- [ ] Create architecture diagram
- [ ] Document decision vs execution separation
- [ ] Add examples of proper usage

### 11. Performance Optimization
- [ ] Implement caching as Sprint 40 intended
- [ ] Optimize for <100ms decisions
- [ ] Add performance monitoring

### 12. Final Cleanup
- [ ] Remove all console.logs
- [ ] Remove debug code
- [ ] Final code review
- [ ] Update tests

## Key Principles to Follow

1. **Trust Sprint 40 Vision** - It was well thought out
2. **Brain Decides, Generation Executes** - Clear separation
3. **Zero Transformation** - Use DB field names everywhere
4. **Simplicity Over Complexity** - 100 lines > 2000 lines
5. **Trust AI Models** - Short prompts work better

## Order of Execution

1. First: Fix execution location (move to generation.ts)
2. Second: Fix field names (sceneCode → tsxCode)
3. Third: Integrate normalized VideoState
4. Fourth: Simplify prompts
5. Fifth: Clean up duplicates

## Success Metrics

- Brain under 100 lines ✓
- All execution in generation.ts ✓
- Zero field transformations ✓
- Single VideoState implementation ✓
- All prompts under 50 words ✓
- No duplicate files ✓

## Notes

- The restructure_brain code is a suggestion, not gospel
- Sprint 40's original vision is the north star
- Simplicity and clarity over clever abstractions
- When in doubt, choose the simpler approach