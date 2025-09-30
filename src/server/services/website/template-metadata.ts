import type { VideoFormat } from "~/lib/types/video/remotion-constants";
import type { ServerTemplateMetadata } from "~/templates/metadata/canonical";
import { serverTemplateMetadata } from "~/templates/metadata/canonical";

export interface TemplateMetadata {
  id: string;
  name: string;
  duration: number;
  category?: string;
  supportedFormats: VideoFormat[];
  styles: string[];
  primaryUse: string;
  source: ServerTemplateMetadata["source"];
}

const canonicalServerMetadata: TemplateMetadata[] = serverTemplateMetadata.map((template) => ({
  id: template.id,
  name: template.name,
  duration: template.duration,
  category: template.category,
  supportedFormats: template.supportedFormats,
  styles: template.styles,
  primaryUse: template.primaryUse,
  source: template.source,
}));

export const TEMPLATE_METADATA: TemplateMetadata[] = canonicalServerMetadata;

export function getTemplateMetadata(templateId: string): TemplateMetadata | undefined {
  return canonicalServerMetadata.find((template) => template.id === templateId);
}

export function getTemplatesByCategory(category: string): TemplateMetadata[] {
  return canonicalServerMetadata.filter((template) => template.category === category);
}
