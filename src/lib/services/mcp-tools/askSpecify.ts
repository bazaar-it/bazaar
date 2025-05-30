import { z } from "zod";
import { BaseMCPTool } from "./base";

const askSpecifyInputSchema = z.object({
  userPrompt: z.string().describe("User's ambiguous request"),
  ambiguityType: z.enum(["multiple_options", "missing_details", "unclear_intent"]).describe("Type of ambiguity"),
  sessionId: z.string().describe("Project/session identifier"),
  userId: z.string().describe("User identifier"),
  clarificationCount: z.number().optional().describe("Number of clarifications already asked"),
});

type AskSpecifyInput = z.infer<typeof askSpecifyInputSchema>;

interface AskSpecifyOutput {
  question: string;
  options?: string[];
  suggestedAction: string;
}

export class AskSpecifyTool extends BaseMCPTool<AskSpecifyInput, AskSpecifyOutput> {
  name = "askSpecify";
  description = "Ask user for clarification when request is ambiguous. Max 2 clarifications per session.";
  inputSchema = askSpecifyInputSchema;
  
  protected async execute(input: AskSpecifyInput): Promise<AskSpecifyOutput> {
    // TODO PHASE2: Save clarificationCount in userContext to persist across calls
    // Prevent infinite clarification loops
    const clarificationCount = input.clarificationCount || 0;
    if (clarificationCount >= 2) {
      return {
        question: "I'll proceed with my best interpretation of your request.",
        suggestedAction: "proceed_with_best_guess",
      };
    }

    // Generate contextual clarification questions
    switch (input.ambiguityType) {
      case "multiple_options":
        return {
          question: "I see multiple ways to interpret your request. Which would you prefer?",
          options: [
            "Option A: Create a new scene",
            "Option B: Edit the current scene", 
            "Option C: Something else (please specify)",
          ],
          suggestedAction: "wait_for_user_choice",
        };
        
      case "missing_details":
        return {
          question: "Could you provide more details about what you'd like to see?",
          suggestedAction: "wait_for_more_details",
        };
        
      case "unclear_intent":
        return {
          question: "I'm not sure what you'd like me to do. Could you rephrase your request?",
          suggestedAction: "wait_for_clarification",
        };
        
      default:
        return {
          question: "Could you provide more specific details about what you'd like?",
          suggestedAction: "wait_for_clarification",
        };
    }
  }
}

export const askSpecifyTool = new AskSpecifyTool(); 