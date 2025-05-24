# Sprint 26 TODO - Current Focus

## 🔥 CRITICAL ISSUES (Must Fix Immediately)

### BAZAAR-300: Fix Component Generation Patterns
**Status**: 🚨 BLOCKING USER EXPERIENCE
**Priority**: P0 - Critical

**Problem**: Generated components use `import React` and `import ... from 'remotion'` which breaks compilation in Monaco editor.

**Quick Fixes Needed**:
1. **Fix LLM Prompt** in `src/server/api/routers/generation.ts` (lines 364-395)
   - Remove instruction to "Import necessary Remotion hooks"
   - Add instruction to use `window.Remotion` destructuring
   - Add forbidden patterns list

2. **Add Validation** in `src/app/projects/[id]/generate/GenerateVideoClient.tsx`
   - Check for forbidden imports before compilation
   - Show clear error messages for invalid patterns

3. **Update Fallback Components** 
   - Fix `generatePlaceholderCode` to use window.Remotion pattern
   - Update agent fallback patterns

**Expected Outcome**: All generated components compile successfully in Monaco editor

---

### BAZAAR-301: Improve Animation Focus
**Status**: 🔥 HIGH PRIORITY
**Priority**: P1 - High

**Problem**: Generated components show text descriptions instead of visual animations.

**Fixes Needed**:
1. **Update Scene Planning** to generate animation props instead of descriptive text
2. **Enhance Component Generation Prompt** to focus on visual effects
3. **Create Animation Templates** for common patterns

**Expected Outcome**: Bubble animation prompt generates actual animated bubble, not text about bubbles

---

## 📋 CURRENT STATE SUMMARY

### ✅ What's Working
- Storyboard JSON as single source of truth
- tRPC integration for server-side LLM calls
- Monaco editor interface
- Remotion Player preview (when code compiles)
- Progressive enhancement (fallback → AI)

### ❌ What's Broken
- **Component compilation fails** due to import statements
- **Generated code violates Sprint 25/26 patterns**
- **Components show text instead of animations**
- **Inconsistent patterns across templates**

### 🎯 Success Criteria
1. User submits "bubble expanding and exploding" prompt
2. All 5 generated scenes compile without errors
3. Monaco editor shows no red error indicators  
4. Remotion Player renders actual animated bubble
5. No `import React` or `import ... from 'remotion'` in any generated code

---

## 🛠️ IMPLEMENTATION PLAN

### Phase 1: Fix Compilation (BAZAAR-300)
**Estimated Time**: 4-6 hours

1. **Update LLM Prompt** (30 min)
   - File: `src/server/api/routers/generation.ts`
   - Replace import instructions with window.Remotion pattern
   - Add forbidden patterns list

2. **Add Code Validation** (1-2 hours)
   - File: `src/app/projects/[id]/generate/GenerateVideoClient.tsx`
   - Create `validateComponentCode` function
   - Integrate validation into `compileComponent`

3. **Fix Fallback Components** (1-2 hours)
   - Update `generatePlaceholderCode` function
   - Update agent fallback patterns
   - Ensure all templates use window.Remotion

4. **Test & Verify** (1-2 hours)
   - Test bubble animation prompt
   - Verify all scenes compile
   - Check Monaco editor shows no errors

### Phase 2: Improve Animations (BAZAAR-301)
**Estimated Time**: 6-8 hours

1. **Update Scene Planning** (2-3 hours)
   - Modify planScenes prompt to focus on animation parameters
   - Separate visual concepts from descriptive text

2. **Enhance Component Generation** (3-4 hours)
   - Update generateComponentCode prompt with animation focus
   - Add animation pattern examples
   - Emphasize visual elements over text

3. **Create Animation Templates** (1-2 hours)
   - Build common animation patterns library
   - Document animation best practices

---

## 🧪 TESTING STRATEGY

### Manual Testing Checklist
- [ ] Submit bubble animation prompt
- [ ] Verify all 5 scenes generate
- [ ] Check all components compile in Monaco
- [ ] Confirm Remotion Player renders scenes
- [ ] Verify no import statements in generated code
- [ ] Check animations are visual, not text-based

### Validation Checks
- [ ] No `import React` in any generated component
- [ ] No `import ... from 'remotion'` in any generated component  
- [ ] All components use `window.Remotion` destructuring
- [ ] Components focus on visual animation over text display
- [ ] Monaco editor shows no compilation errors

---

## 📁 FILES TO MODIFY

### High Priority (Phase 1)
- `src/server/api/routers/generation.ts` - Fix LLM prompts
- `src/app/projects/[id]/generate/GenerateVideoClient.tsx` - Add validation
- `src/app/projects/[id]/generate/agents/promptOrchestrator.ts` - Fix fallback

### Medium Priority (Phase 2)  
- `src/server/api/routers/generation.ts` - Enhance animation prompts
- `src/app/projects/[id]/generate/utils/animationTemplates.ts` - New file
- `src/app/projects/[id]/generate/types/storyboard.ts` - Add animation types

---

## 🎯 DEFINITION OF DONE

### Sprint 26 Success Criteria
1. ✅ User can submit any animation prompt and get working components
2. ✅ All generated components compile successfully in Monaco editor
3. ✅ Remotion Player renders all scenes without errors
4. ✅ Generated animations are visual effects, not text descriptions
5. ✅ Code follows Sprint 25/26 ESM patterns consistently
6. ✅ No import statements in any generated component code

### User Experience Goal
**Before**: User submits prompt → Components fail to compile → Red error banners → Broken experience

**After**: User submits prompt → Components compile successfully → Animated preview works → Smooth experience

---

## 🚀 NEXT ACTIONS

### Immediate (Today)
1. **Start with BAZAAR-300** - Fix the compilation issues first
2. **Focus on LLM prompt changes** - Highest impact, lowest risk
3. **Test with bubble animation example** - Use user's exact prompt as test case

### This Week
1. Complete BAZAAR-300 (fix compilation)
2. Start BAZAAR-301 (improve animations)
3. Document patterns for future reference

### Future Sprints
1. Implement full esbuild pipeline (Sprint 25 lessons)
2. Add component library with pre-built templates
3. Enhanced validation and quality checks 