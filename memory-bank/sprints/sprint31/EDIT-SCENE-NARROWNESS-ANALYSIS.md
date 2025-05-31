//memory-bank/sprints/sprint31/EDIT-SCENE-NARROWNESS-ANALYSIS.md
# EditScene Tool Narrowness Analysis

## 🚨 PROBLEM IDENTIFIED

The EditScene tool is **TOO NARROW** and restrictive for creative user requests.

### Current Flow Issues:

**1. Brain LLM Intent Analysis**
- Too literal in interpreting user requests
- Doesn't understand creative/holistic context
- "Make it more modern" gets treated as a minimal change

**2. DirectCodeEditor Surgical Approach**
- Phase 1: Identifies single `targetElement` + `requestedChange`
- Phase 2: Makes minimal changes only
- **RULE**: "Keep ALL existing animations exactly as-is"
- **RULE**: "Preserve exact same component structure"

### Problematic User Scenarios:

**❌ "Make it more modern"**
- Current: Changes one specific element minimally
- Needed: Font updates, color schemes, spacing, effects, animations

**❌ "Move text A under text B"**
- Current: Only moves the text element
- Needed: May require layout restructuring, spacing adjustments, animation timing changes

**❌ "Make it more elegant"**
- Current: Too vague, asks for clarification or makes minimal change
- Needed: Holistic style improvements

## 🎯 PROPOSED SOLUTIONS

### 1. **Context-Aware Intent Analysis**

Update Brain LLM prompt to distinguish:
- **Surgical edits**: "change text color to blue" → minimal changes
- **Creative edits**: "make it more modern" → holistic changes
- **Structural edits**: "move A under B" → layout changes

### 2. **Edit Scope Classification**

Add scope detection to DirectCodeEditor:
```typescript
interface EditScope {
  type: 'surgical' | 'creative' | 'structural';
  allowedChanges: string[];
  preservationLevel: 'strict' | 'flexible' | 'creative';
}
```

### 3. **Flexible Preservation Rules**

Instead of "keep everything exactly as-is":
- **Surgical**: Preserve everything except target
- **Creative**: Preserve core functionality, allow style changes  
- **Structural**: Preserve content, allow layout/animation changes

### 4. **Multi-Element Change Detection**

Detect when "move A under B" requires:
- Moving element A
- Adjusting element B spacing
- Updating container layout
- Timing animation adjustments

## 📋 IMPLEMENTATION PLAN

### Phase 1: Brain LLM Enhancement
- [ ] Add creative context detection
- [ ] Classify edit scope (surgical/creative/structural)
- [ ] Pass scope to EditScene tool

### Phase 2: DirectCodeEditor Enhancement  
- [ ] Accept edit scope parameter
- [ ] Flexible preservation rules based on scope
- [ ] Multi-element change analysis for structural edits

### Phase 3: Testing & Validation
- [ ] Test "make it more modern" scenarios
- [ ] Test "move A under B" scenarios  
- [ ] Test mixed creative + structural requests

## 🔄 CURRENT STATE

**Status**: Analysis complete, ready for implementation
**Next Step**: Update Brain LLM intent analysis prompt
**Risk Level**: Medium (need to balance creativity vs. breaking functionality)
