import { z } from "zod";
import { AIClientService, type AIMessage } from "~/server/services/ai/aiClient.service";
import { resolveModel } from "~/config/models.config";
import { BRAND_EDITOR_PROMPT } from "~/config/prompts/active/brand-editor";
import { forceBrandThemeFallback } from "~/server/services/automation/sceneTokenizer.service";
import type { BrandTheme } from "~/lib/theme/brandTheme";

const responseSchema = z.object({
  code: z.string().min(10),
  summary: z.string().optional(),
});

export type BrandEditLLMResult = z.infer<typeof responseSchema> & {
  raw?: string;
};

interface EditSceneForBrandParams {
  sceneName: string;
  code: string;
  projectTitle?: string;
  order?: number;
  brandTheme: BrandTheme;
  brandMetadata?: Record<string, unknown>;
}

export async function editSceneForBrandWithLLM({
  sceneName,
  code,
  projectTitle,
  order,
  brandTheme,
  brandMetadata = {},
}: EditSceneForBrandParams): Promise<BrandEditLLMResult> {
  const modelConfig = resolveModel("editScene", {
    temperature: 0.35,
    maxTokens: 14_000,
  });

  const payload = {
    task: "edit-scene-for-brand",
    projectTitle,
    sceneName,
    order,
    brandTheme,
    brandMetadata,
    code,
    strictBrandMode: true,
    expectations: {
      replaceLegacyText: true,
      applyBrandPalette: true,
      refreshCopyFromTheme: true,
      updateLogosAndInitials: true,
    },
  };

  const messages: AIMessage[] = [
    {
      role: "user",
      content: JSON.stringify(payload),
    },
  ];

  const response = await AIClientService.generateResponse(
    modelConfig,
    messages,
    BRAND_EDITOR_PROMPT,
    {
      responseFormat: { type: "json_object" },
      reasoning_effort: "medium",
    },
  );

  if (!response.content) {
    throw new Error("LLM returned empty response while editing scene for brand");
  }

  try {
    let content = response.content.trim();
    if (content.startsWith("```")) {
      content = content.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
    }

    const parsed = responseSchema.parse(JSON.parse(content));
    const safeCode = forceBrandThemeFallback(parsed.code, brandTheme);

    if (/_(optionalChain|nullishCoalesce)/.test(safeCode)) {
      throw new Error(
        `LLM produced compiled helper functions for scene "${sceneName}". Rejecting to avoid runtime polyfills.`,
      );
    }

    return { ...parsed, code: safeCode, raw: response.content };
  } catch (error) {
    throw new Error(
      `Failed to parse brand edit response for scene "${sceneName}": ${
        error instanceof Error ? error.message : String(error)
      }. Raw: ${response.content}`,
    );
  }
}
