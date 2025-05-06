import type { ChatCompletionTool } from "openai/resources/chat/completions";

/**
 * Tool for applying JSON patches to update video properties
 */
export const applyPatchTool: ChatCompletionTool = {
    type: "function",
    function: {
        name: "applyJsonPatch",
        description: "Apply a JSON-Patch (RFC-6902) to modify the current video properties.",
        parameters: {
            type: "object",
            properties: {
                operations: {
                    type: "array",
                    description: "An array of JSON Patch operations.",
                    items: {
                        type: "object",
                        properties: {
                            op: { type: "string", enum: ["add", "remove", "replace", "copy", "move", "test"] },
                            path: { type: "string", description: "A JSON Pointer path." },
                            value: { description: "The value for 'add' or 'replace' operations." },
                            from: { type: "string", description: "A JSON Pointer path for 'copy' or 'move'." }
                        },
                        required: ["op", "path"]
                    }
                },
                explanation: { // Optional explanation for better UX
                   type: "string",
                   description: "A brief explanation of the changes made, to show the user."
                }
            },
            required: ["operations"]
        }
    }
};

/**
 * Tool for generating custom Remotion components
 */
export const generateRemotionComponentTool: ChatCompletionTool = {
    type: "function",
    function: {
        name: "generateRemotionComponent",
        description: "Request the generation of a new custom Remotion component when the desired effect cannot be achieved with simple property changes via JSON Patch.",
        parameters: {
            type: "object",
            properties: {
                effectDescription: {
                    type: "string",
                    description: "A detailed natural language description of the visual effect needed for the new component.",
                },
            },
            required: ["effectDescription"],
        },
    },
};

/**
 * Tool for planning multi-scene videos
 */
export const scenePlannerTool: ChatCompletionTool = {
    type: "function",
    function: {
        name: "planVideoScenes",
        description: "Analyze user intent to plan multiple scenes with appropriate durations",
        parameters: {
            type: "object",
            properties: {
                intent: {
                    type: "string",
                    description: "Summary of the user's overall video intent"
                },
                reasoning: {
                    type: "string",
                    description: "Explain your reasoning for how you've broken down the user's request into scenes, including why you chose this number of scenes, their durations, and how they work together to fulfill the request. This is for logging purposes and will not be shown to the user."
                },
                sceneCount: {
                    type: "integer",
                    description: "Number of scenes needed to fulfill the request (minimum 1, maximum 10)",
                    minimum: 1,
                    maximum: 10
                },
                totalDuration: {
                    type: "integer",
                    description: "Total suggested video duration in seconds (maximum 60 seconds)",
                    minimum: 1,
                    maximum: 60
                },
                fps: {
                    type: "integer",
                    description: "Frames per second (normally 30)",
                    default: 30
                },
                scenes: {
                    type: "array",
                    description: "Detailed breakdown of each scene",
                    items: {
                        type: "object",
                        properties: {
                            id: {
                                type: "string",
                                description: "Unique ID for this scene to track across generation steps"
                            },
                            description: {
                                type: "string", 
                                description: "Detailed description of this scene's content and purpose"
                            },
                            durationInSeconds: {
                                type: "number",
                                description: "Recommended duration for this scene in seconds"
                            },
                            effectType: {
                                type: "string",
                                enum: ["text", "image", "custom"],
                                description: "Preferred scene type for this content"
                            }
                        },
                        required: ["id", "description", "durationInSeconds", "effectType"]
                    }
                }
            },
            required: ["intent", "reasoning", "sceneCount", "totalDuration", "fps", "scenes"]
        }
    }
};

/**
 * All available tools for the LLM
 */
export const CHAT_TOOLS: ChatCompletionTool[] = [
    scenePlannerTool,
    generateRemotionComponentTool,
    applyPatchTool
]; 