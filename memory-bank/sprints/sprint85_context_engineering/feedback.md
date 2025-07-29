in regards to /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/memory-bank/sprints/sprint85_context_engineering/implementation-plan.md --- 
### Step 3: Enhanced Brain Orchestrator
```typescript
// src/brain/orchestratorNEW.ts - Modified version
interface ContextualDecision {
  action: 'generate' | 'edit' | 'delete' | 'trim';
  contexts: string[];
  reasoning: string;
  confidence: number;
  suggestedContexts?: string[]; // Additional contexts user might want
}

class BrainOrchestratorV2 {
  async process(input: ProcessInput): Promise<ContextualDecision> {
    const contextSuggestions = await this.analyzeForContexts(input);
    
    const systemPrompt = `
You are a director AI that selects appropriate contexts for video generation.

Available contexts:
${this.getAvailableContextsList()}

Based on the user's request, select the most appropriate contexts.
You can combine multiple contexts for complex requests.

Examples:
- "Create animated text" → ['typography']
- "Create text with particles" → ['typography', 'particles']
- "Recreate this image as animated scene" → ['image-recreation', 'transitions']
- "Create TikTok-ready text animation" → ['typography', 'tiktok', 'transitions']

Return a decision with:
- action: What to do (generate/edit/delete/trim)
- contexts: Array of context IDs to use
- reasoning: Why these contexts
- confidence: 0-1 score
- suggestedContexts: Other contexts that might enhance the result
    `;

    const decision = await this.llm.complete({
      systemPrompt,
      userPrompt: this.buildPrompt(input),
      responseFormat: 'json'
    });

    return decision;
  }
---- 
we hve to remember that we already have a context system bult at /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/brain/orchestrator_functions/contextBuilder.ts
/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/brain/orchestrator_functions/intentAnalyzer.ts --------- and there is no way at all that we are doing the suggested regew stupid arcitericare as poropsed in 
### 3. Enhanced Brain Orchestrator
```typescript
// Updated Brain Orchestrator
class BrainOrchestratorV2 {
  async process(input: ProcessInput): Promise<ContextualDecision> {
    // Detect style references
    const styleReferences = this.detectStyleReferences(input.prompt);
    
    // Select static contexts
    const staticContexts = await this.selectStaticContexts(input);
    
    // Prepare dynamic context requests
    const dynamicRequests: DynamicContextRequest[] = [];
    
    if (styleReferences.length > 0) {
      for (const style of styleReferences) {
        dynamicRequests.push({
          type: 'style',
          key: `style:${style}`,
          query: style,
          priority: 'high'
        });
      }
    }
    
    return {
      action: 'generate',
      contexts: staticContexts,
      dynamicRequests: dynamicRequests,
      reasoning: `Using ${staticContexts.join(', ')} with dynamic style context for ${styleReferences.join(', ')}`,
      confidence: 0.9
    };
  }

  private detectStyleReferences(prompt: string): string[] {
    const patterns = [
      /in the style of\s+([^,.\n]+)/gi,
      /like\s+([^,.\n]+?)(?:'s|'s)/gi,
      /similar to\s+([^,.\n]+)/gi,
      /inspired by\s+([^,.\n]+)/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+style/gi
    ];
    
    const references = [];
    for (const pattern of patterns) {
      const matches = prompt.matchAll(pattern);
      for (const match of matches) {
        references.push(match[1].trim());
      }
    }
    
    return [...new Set(references)];
  }
}
---
and it is wrng to say that all the agent are falling back to the genered code editor pormpt. 

idelaly, what we have is the brian who understands the intent of the user, and build the ocntext, and then makes sure that the other agent are set off doing their work. so for exmaple, if a user says, make a 15 second video of my brancd, scale.ai, in the style of an apple animations, - it sends of f inmoratino like / i need to use X agent for X task, Y agent for y atask, for exmaple a webagent that goes on and browses the scale.ai website, gathers relevant information, another agent that might be browsing apple style animations, and they are not going in cluecless, but rather they go in websearch with a goal of gathering infomraiton that is requitee to ggernete the video, and just keeps going until it has what it needs. and then sends all the inofmwation to the code generators, that decides have many scenes to make, what to put in scene 1, what o put into scene 2, scene n, etc, and makes sure that they are consistent with 1 eachother and 2, the context like scal.ai and apple in this exmaple. maybe even have a deep research agwnt thaty knows the capabilites of the codegen and code edtior, and can go on and try to generete several exmaples, while doing search, while gathering context,. and making scenes, chekcing if the timing is right, checkeing if the scnees are being consistent with eachother, etc, etc,. . this might alwo me a nother service, like yolo mode or somehting where it start with the user just brain dumpring what ut wants, and maybe clicking on severla animations and tempaltes that it likes, and then leave their email, and we have a deep research agent that goes on by itself for 20 minutes, and generate the fullvideo , render it, and sends it to the mail to the user when its done. and then the user can open it in bazaar, and it make small edits to it if it wants, clik a aleemnt in the vido and change color, or change timing, or change icons, or whatever it wants. 

also, we ened to add a frame counter in the header of the preview panel, suvh hat when the video is playing, the suer can see exalcty what frame it is, and when its pausing on a a frame, it can send the frame to ai in the hat, and say change tthis part, or make this freen, or "cut it here", it makes it a bit more specific. i think that would be a nice feature. 

also we shoudl look more in to integrations. what intergatoins can be valuabel for our system to gather context fom? github is an obvuous answer, to read the code form github, gather the styling files direlcyt, and actually maiig the video look more like their atual code. but wht else. what are some more integratiosn that could be relevant?  lets try to think deeply om this