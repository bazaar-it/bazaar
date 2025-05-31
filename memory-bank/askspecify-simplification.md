//memory-bank/askspecify-simplification.md
# askSpecify Tool Simplification - Implementation Complete

## **BEFORE: Over-Engineered Flow**
```
User: "make it 3 seconds"
↓
Brain LLM: "This is ambiguous, need clarification"
↓  
Brain LLM: calls askSpecify tool
↓
askSpecify Tool: calls conversationalResponseService  
↓
conversationalResponseService: generates question via another LLM call
↓
askSpecify Tool: returns question
↓
Brain LLM: sends question to user
```

## **AFTER: Simplified Direct Flow**
```
User: "make it 3 seconds"
↓
Brain LLM: "This is ambiguous, I'll ask directly"
↓
Brain LLM: generates clarification question in response
↓
User sees: "I can help with that! Do you want to:
1. Trim the scene to 3 seconds total, or
2. Speed up the animations to fit in 3 seconds?

Please let me know which option you prefer."
```

## **Changes Made**

### **1. Removed askSpecify Tool (`orchestrator.ts`)**
- ✅ Removed `askSpecifyTool` from imports
- ✅ Removed from tool initialization array
- ✅ Commented out askSpecify handling in `processToolResult`
- ✅ Commented out askSpecify case in `prepareToolInput`

### **2. Updated Brain LLM Prompt**
- ✅ Removed askSpecify from tool selection options
- ✅ Added clarification detection logic
- ✅ Added new JSON response format for clarifications:
  ```json
  {
    "needsClarification": true,
    "clarificationQuestion": "Specific question to ask the user",
    "reasoning": "Why clarification is needed"
  }
  ```

### **3. Added Direct Clarification Handling**
- ✅ Added logic in `processUserInput` to detect `needsClarification` 
- ✅ Return clarification question directly as chat response
- ✅ Keep `isAskSpecify: true` flag for compatibility
- ✅ Added type definitions for clarification response

### **4. Enhanced Follow-up Detection**
- ✅ Existing follow-up detection logic remains unchanged
- ✅ Brain LLM still recognizes when user responds to clarification
- ✅ Proceeds with appropriate tool (editScene, addScene, deleteScene)

## **Benefits Achieved**

1. **🚀 Faster Response**: Eliminated double LLM calls
2. **🧠 More Contextual**: Brain has full conversation context
3. **🎯 Natural Flow**: Direct conversational questions
4. **🔧 Easier Debug**: Fewer layers to trace
5. **💰 Cost Effective**: One LLM call instead of two

## **Example Clarification Questions**

**Duration Ambiguity:**
```
"I can help with that! Do you want to:
1. Trim the scene to 3 seconds total, or
2. Speed up the animations to fit in 3 seconds?

Please let me know which option you prefer."
```

**Scene Reference Ambiguity:**
```
"I see you have multiple scenes. Which scene's background would you like me to change?

Scene 1: Product Demo (ID: abc123)
Scene 2: Call to Action (ID: def456)

Please specify which scene you'd like to modify."
```

## **Compatibility Notes**

- ✅ `isAskSpecify: true` flag maintained for frontend compatibility
- ✅ Follow-up detection logic unchanged
- ✅ All existing clarification flows work the same
- ✅ No frontend changes required

## **Status: ✅ COMPLETE**

The askSpecify tool has been successfully removed and replaced with direct Brain LLM clarification handling. The system is now simpler, faster, and more intelligent while maintaining full backward compatibility.
