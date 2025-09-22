import { z } from "zod";
import { AIClientService, type AIMessage } from "~/server/services/ai/aiClient.service";
import { resolveModel } from "~/config/models.config";
import { BRAND_TOKENIZER_PROMPT } from "~/config/prompts/active/brand-tokenizer";

const responseSchema = z.object({
  code: z.string().min(10),
  summary: z.string().optional(),
  tokens: z
    .object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
      accents: z.array(z.string()).optional(),
      fonts: z
        .object({
          heading: z.string().optional(),
          body: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type TokenizeSceneLLMResult = z.infer<typeof responseSchema> & {
  raw?: string;
};

function forceBrandThemeFallback(code: string): string {
  if (code.includes("brandThemeRuntime")) {
    return code;
  }

  const themeDeclarationPattern = /(const|let)\s+theme\s*=\s*[\s\S]*?window\.BrandTheme[\s\S]*?;/;
  const match = code.match(themeDeclarationPattern);

  if (!match) {
    return code;
  }

  const declaration = match[0];
  const indentationMatch = declaration.match(/^(\s*)/);
  const indent = indentationMatch?.[1] ?? "";

  const replacement = `${indent}const brandThemeRuntime = typeof window !== "undefined" ? window.BrandTheme : undefined;\n${indent}const theme = brandThemeRuntime?.useTheme?.() ?? brandThemeRuntime?.defaultTheme ?? { colors: {}, fonts: {}, assets: {} };`;

  return code.replace(themeDeclarationPattern, replacement);
}

export async function tokenizeSceneWithLLM(params: {
  sceneName: string;
  code: string;
  projectTitle?: string;
  order?: number;
}): Promise<TokenizeSceneLLMResult> {
  const { sceneName, code, projectTitle, order } = params;

  const modelConfig = resolveModel("editScene", {
    temperature: 0.15,
    maxTokens: 12_000,
  });

  const messages: AIMessage[] = [
    {
      role: "user",
      content: JSON.stringify({
        task: "rewrite-scene-for-brand-theme",
        projectTitle,
        sceneName,
        order,
        code,
      }),
    },
  ];

  console.log("[tokenizeSceneWithLLM] Request", {
    sceneName,
    projectTitle,
    order,
    codePreview: code.slice(0, 200),
  });

  const response = await AIClientService.generateResponse(
    modelConfig,
    messages,
    BRAND_TOKENIZER_PROMPT,
    {
      responseFormat: { type: "json_object" },
      reasoning_effort: "medium",
    },
  );

  if (!response.content) {
    throw new Error("LLM returned empty response while tokenizing scene");
  }

  try {
    let content = response.content.trim();
    if (content.startsWith("```")) {
      content = content.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
    }

    console.log("[tokenizeSceneWithLLM] Raw response", {
      sceneName,
      rawPreview: content.slice(0, 400),
    });

    const parsed = responseSchema.parse(JSON.parse(content));

    const safeCode = forceBrandThemeFallback(parsed.code);

    if (/_(optionalChain|nullishCoalesce)/.test(safeCode)) {
      throw new Error(
        `LLM produced compiled helper functions for scene "${sceneName}". Rejecting to avoid runtime polyfills.`,
      );
    }

    return { ...parsed, code: safeCode, raw: response.content };
  } catch (error) {
    throw new Error(
      `Failed to parse brand tokenization response for scene "${sceneName}": ${
        error instanceof Error ? error.message : String(error)
      }. Raw: ${response.content}`,
    );
  }
}
