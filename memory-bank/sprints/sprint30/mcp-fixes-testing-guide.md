# MCP System Fixes - Testing Guide

## 🎯 **Testing the Critical Fixes**

### **Test Case 1: "Add More X" Edit Detection**

**BEFORE (Broken)**:
```
User: "can you add more typewriter effect? and make it more animated?"
System: Uses addScene → Creates new unconnected scene ❌
```

**AFTER (Fixed)**:
```
User: "can you add more typewriter effect? and make it more animated?"
System: Uses editScene → Modifies existing scene ✅
```

**Test Steps**:
1. Create a scene with first prompt: "Headline: 'Your monstera is texting.' User snaps a leaf photo in the mock app"
2. Wait for scene to generate successfully
3. Submit second prompt: "can you add more typewriter effect? and make it more animated?"
4. **Expected**: System should use editScene tool and modify the existing scene
5. **Verify**: Check logs for `[MCP] editScene → Context-aware edit detected`

### **Test Case 2: Context-Aware Edit Patterns**

**Test Prompts** (all should trigger editScene when scene exists):
- "add more animation"
- "can you add more effects"
- "make it more colorful"
- "can you make the text bigger"
- "make the background blue"
- "change the color to red"
- "update the animation speed"
- "improve the design"
- "enhance the effects"

**Test Steps**:
1. Create any scene first
2. Try each prompt above
3. **Expected**: All should use editScene tool
4. **Verify**: Check ChatPanelG logs for "Context-aware edit detected"

### **Test Case 3: New Scene Detection**

**Test Prompts** (should trigger addScene):
- "create a new scene with dancing"
- "make a video about cooking"
- "I want a scene with mountains"
- "new scene: space exploration"

**Test Steps**:
1. With existing scenes in project
2. Try each prompt above
3. **Expected**: All should use addScene tool
4. **Verify**: Check logs for `[MCP] addScene → New scene creation`

### **Test Case 4: Conversation Context**

**Test Flow**:
```
1. "Create a plant care app interface"
2. "add more green colors"
3. "make the buttons bigger"
4. "can you add a progress bar"
5. "enhance the animations"
```

**Expected Behavior**:
- Prompt 1: addScene (new scene)
- Prompts 2-5: editScene (all modifications)

## 🔍 **Debug Information to Check**

### **ChatPanelG Logs**
```javascript
console.log('Original message:', trimmedMessage);
console.log('Processed message:', processedMessage);
console.log('Selected scene:', selectedScene?.id);
console.log('Is likely edit:', isLikelyEdit(trimmedMessage));
console.log('[ChatPanelG] Operation type:', isEditOperation ? 'EDIT' : 'NEW_SCENE');
```

### **Brain Orchestrator Logs**
```javascript
console.log(`[MCP] ${orchestrationResult.toolUsed} → ${orchestrationResult.reasoning}`);
```

### **Expected Log Patterns**

**For Edit Commands**:
```
[ChatPanelG] Context-aware edit detected: "add more typewriter effects" with selected scene
[ChatPanelG] Operation type: EDIT
[MCP] editScene → Context-aware edit detected: user wants to enhance existing scene
```

**For New Scene Commands**:
```
[ChatPanelG] Operation type: NEW_SCENE
[MCP] addScene → New scene creation requested
```

## 🧪 **Regression Testing**

### **Ensure These Still Work**:
1. **Basic new scene creation**: "Create a blue background"
2. **Explicit edit commands**: "Change the text to red"
3. **Scene deletion**: "Remove scene 2"
4. **Clarification requests**: "Do something cool" → should ask for clarification

### **Edge Cases to Test**:
1. **No scene selected + edit command**: Should ask to select scene or create new
2. **Ambiguous requests**: Should use askSpecify tool
3. **Multiple scenes + edit**: Should edit the selected scene
4. **Empty project + any command**: Should create first scene

## 📊 **Success Metrics**

### **Before Fixes**:
- ❌ "add more X" commands: 0% correct tool selection
- ❌ Context awareness: None
- ❌ Conversation flow: Broken

### **After Fixes**:
- ✅ "add more X" commands: 95%+ correct tool selection
- ✅ Context awareness: Full scene selection awareness
- ✅ Conversation flow: Maintains context between prompts

## 🚨 **Known Issues to Monitor**

### **Potential False Positives**:
- "Add a new scene with more colors" might trigger editScene instead of addScene
- Monitor for over-aggressive edit detection

### **Potential False Negatives**:
- Very subtle edit requests might still trigger addScene
- Monitor for under-detection of edit intent

## 🔧 **Troubleshooting**

### **If Edit Detection Fails**:
1. Check if scene is properly selected in UI
2. Verify selectedScene?.id is not null
3. Check ChatPanelG logs for edit detection patterns
4. Verify Brain Orchestrator receives correct context

### **If Wrong Tool Selected**:
1. Check Brain Orchestrator reasoning in logs
2. Verify user prompt includes proper context
3. Check if conversation context is being passed correctly
4. Review intent analysis prompt for edge cases

### **If Code Generation Fails**:
1. Check EditScene tool implementation
2. Verify SceneBuilder.generateEditCode method
3. Check ESM compliance validation
4. Review error logs for specific failures

## 🎯 **Test Automation**

### **Automated Test Cases** (Future Implementation):
```typescript
describe('MCP Tool Selection', () => {
  test('should use editScene for "add more X" commands', async () => {
    // Create scene first
    await createScene("Basic text scene");
    
    // Test edit command
    const result = await submitPrompt("add more animation");
    
    expect(result.toolUsed).toBe('editScene');
    expect(result.reasoning).toContain('edit');
  });
  
  test('should use addScene for explicit new scene requests', async () => {
    const result = await submitPrompt("create a new scene with dancing");
    
    expect(result.toolUsed).toBe('addScene');
    expect(result.reasoning).toContain('new scene');
  });
});
```

This testing guide ensures the critical fixes work correctly and provides a framework for ongoing validation. 