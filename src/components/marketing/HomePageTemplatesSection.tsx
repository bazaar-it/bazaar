"use client";
import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

import type { MarketingHeaderRef } from "~/components/marketing/MarketingHeader";
import { TEMPLATES, type TemplateDefinition } from "~/templates/registry";
import { Player } from "@remotion/player";
import { transform } from 'sucrase';

// Get dimensions based on format
const getFormatDimensions = (format: string) => {
  switch (format) {
    case 'portrait':
      return { width: 1080, height: 1920 };
    case 'square':
      return { width: 1080, height: 1080 };
    case 'landscape':
    default:
      return { width: 1920, height: 1080 };
  }
};

// Template compilation hook (simplified for homepage)
const useCompiledTemplate = (template: HomePageTemplate, format: string = 'landscape') => {
  const dimensions = getFormatDimensions(format);
  
  // For hardcoded templates, just return the component directly
  if (!template.isFromDatabase && template.component) {
    return {
      component: template.component,
      isCompiling: false,
      compilationError: null,
      playerProps: {
        component: template.component,
        durationInFrames: template.duration,
        fps: 30,
        compositionWidth: dimensions.width,
        compositionHeight: dimensions.height,
      }
    };
  }
  
  // For database templates, we need to compile them (simplified for homepage)
  const [component, setComponent] = React.useState<React.ComponentType | null>(null);
  const [isCompiling, setIsCompiling] = React.useState(true);
  const [compilationError, setCompilationError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (template.isFromDatabase) {
      setIsCompiling(true);
      
      const compileTemplate = async () => {
        let blobUrl: string | null = null;
        try {
          const code = template.getCode();
          
          // Transform TypeScript/JSX to JavaScript using sucrase
          const { code: transformed } = transform(code, {
            transforms: ['typescript', 'jsx'],
            jsxRuntime: 'classic',
            production: false,
          });
          
          // Create a blob URL for the module
          const blob = new Blob([transformed], { 
            type: 'application/javascript'
          });
          blobUrl = URL.createObjectURL(blob);
          
          // Import the module dynamically
          const module = await import(/* webpackIgnore: true */ blobUrl);
          
          if (module.default && typeof module.default === 'function') {
            setComponent(() => module.default);
            setCompilationError(null);
          } else {
            throw new Error('No default export found in template code');
          }
          
        } catch (error) {
          console.error('Failed to compile database template:', error);
          setCompilationError(error as Error);
        } finally {
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
          }
          setIsCompiling(false);
        }
      };
      
      compileTemplate();
    }
  }, [template]);

  return { 
    component, 
    isCompiling, 
    compilationError,
    playerProps: component ? {
      component,
      durationInFrames: template.duration,
      fps: 30,
      compositionWidth: dimensions.width,
      compositionHeight: dimensions.height,
    } : null
  };
};

// Template thumbnail component (from TemplatesPanelG)
const TemplateThumbnail = ({ template, format }: { template: HomePageTemplate; format: string }) => {
  const { component, isCompiling, compilationError, playerProps } = useCompiledTemplate(template, format);

  if (compilationError) {
    return (
      <div className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xs font-medium">Template Error</div>
          <div className="text-gray-500 text-xs mt-1">Failed to compile</div>
        </div>
      </div>
    );
  }

  if (isCompiling || !component) {
    return (
      <div className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <div className="text-gray-500 text-xs">Compiling...</div>
        </div>
      </div>
    );
  }

  // Calculate safe initial frame (frame 15 or halfway through if template is shorter)
  const safeInitialFrame = Math.min(template.previewFrame || 15, Math.floor(template.duration / 2));

  return (
    <div className="w-full h-full">
      <Player
        component={playerProps?.component || component}
        durationInFrames={playerProps?.durationInFrames || 150}
        fps={playerProps?.fps || 30}
        compositionWidth={playerProps?.compositionWidth || 1920}
        compositionHeight={playerProps?.compositionHeight || 1080}
        controls={false}
        showVolumeControls={false}
        autoPlay={false}
        initialFrame={safeInitialFrame}
        style={{ width: '100%', height: '100%', pointerEvents: 'none', objectFit: 'cover' }}
      />
    </div>
  );
};

// Template video player for hover state
const TemplateVideoPlayer = ({ template, format }: { template: HomePageTemplate; format: string }) => {
  const { component, isCompiling, compilationError, playerProps } = useCompiledTemplate(template, format);

  if (compilationError || isCompiling || !component) {
    // Fall back to thumbnail on error/loading
    return <TemplateThumbnail template={template} format={format} />;
  }

  return (
    <div className="w-full h-full">
      <Player
        component={playerProps?.component || component}
        durationInFrames={playerProps?.durationInFrames || 150}
        fps={playerProps?.fps || 30}
        compositionWidth={playerProps?.compositionWidth || 1920}
        compositionHeight={playerProps?.compositionHeight || 1080}
        controls={false}
        showVolumeControls={false}
        autoPlay={true}
        loop={true}
        style={{ width: '100%', height: '100%', pointerEvents: 'none', objectFit: 'cover' }}
      />
    </div>
  );
};

// Extended template definition for homepage display
interface HomePageTemplate extends TemplateDefinition {
  description?: string | null;
  thumbnailUrl?: string | null;
  usageCount?: number;
  isFromDatabase?: boolean;
  creator?: { id: string; name: string | null };
}

interface HomePageTemplatesSectionProps {
  marketingHeaderRef?: React.RefObject<MarketingHeaderRef | null>;
}

export default function HomePageTemplatesSection({ marketingHeaderRef }: HomePageTemplatesSectionProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  // Fetch 6 most recent templates - use same query structure as TemplatesPanelG
  const { data: templatesData, isLoading } = api.templates.getAll.useQuery({
    format: 'landscape', // Default to landscape for homepage
    limit: 6,
  });

  // Extract items from paginated response
  const databaseTemplates = templatesData?.items || [];

  // Combine hardcoded and database templates (same as TemplatesPanelG)
  const combinedTemplates = React.useMemo(() => {
    // Convert database templates to HomePageTemplate format
    const dbTemplatesFormatted: HomePageTemplate[] = databaseTemplates.map(dbTemplate => ({
      id: dbTemplate.id,
      name: dbTemplate.name,
      duration: dbTemplate.duration,
      previewFrame: dbTemplate.previewFrame || 15,
      component: null, // Database templates don't have components (type allows null)
      getCode: () => dbTemplate.tsxCode,
      supportedFormats: dbTemplate.supportedFormats as ('landscape' | 'portrait' | 'square')[],
      isFromDatabase: true, // Mark as database template
      isOfficial: dbTemplate.isOfficial,
      category: dbTemplate.category,
      creator: dbTemplate.creator || undefined,
      description: dbTemplate.description || undefined,
      thumbnailUrl: dbTemplate.thumbnailUrl || undefined,
      usageCount: dbTemplate.usageCount || 0,
    }));
    
    // Convert hardcoded templates to HomePageTemplate format
    const hardcodedTemplatesFormatted: HomePageTemplate[] = TEMPLATES.map((template) => {
      // Deterministic usage count based on template name hash
      const hash = template.name.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const usageCount = Math.abs(hash % 500) + 50; // 50-550 uses based on name
      
      return {
        id: template.id,
        name: template.name,
        duration: template.duration,
        previewFrame: template.previewFrame,
        component: template.component,
        getCode: template.getCode,
        supportedFormats: template.supportedFormats,
        description: "Professional template for creating engaging videos",
        thumbnailUrl: null, // Hardcoded templates don't have thumbnails
        usageCount,
        isFromDatabase: false,
      };
    });
    
    // Combine with database templates (same order as TemplatesPanelG)
    return [...hardcodedTemplatesFormatted, ...dbTemplatesFormatted];
  }, [databaseTemplates]);

  // Get 6 most recent templates for homepage
  const recentTemplates = React.useMemo(() => {
    // Filter by landscape format (for homepage)
    const landscapeTemplates = combinedTemplates.filter(template => {
      if (!template.supportedFormats || template.supportedFormats.length === 0) {
        return true; // Show templates with no format restrictions
      }
      return template.supportedFormats.includes('landscape');
    });
    
    // Take first 6 templates and ensure they have all required fields for display
    return landscapeTemplates.slice(0, 6).map(template => ({
      ...template,
      description: template.description || "Professional template for creating engaging videos",
      thumbnailUrl: template.thumbnailUrl || null,
      usageCount: template.usageCount || 0,
    }));
  }, [combinedTemplates]);

  // Debug: Log what we're getting
  React.useEffect(() => {
    console.log('[CommunityTemplatesSection] Hardcoded templates (TEMPLATES):', TEMPLATES.length);
    console.log('[CommunityTemplatesSection] Database templates:', databaseTemplates.length);
    console.log('[CommunityTemplatesSection] Combined templates:', combinedTemplates.length);
    console.log('[CommunityTemplatesSection] Final homepage templates:', recentTemplates.length);
    if (recentTemplates.length > 0) {
      console.log('[CommunityTemplatesSection] Templates shown:', recentTemplates.map(t => ({
        name: t.name,
        isFromDatabase: t.isFromDatabase || false,
        usageCount: t.usageCount || 0,
        thumbnailUrl: t.thumbnailUrl || 'none'
      })));
    }
  }, [databaseTemplates, combinedTemplates, recentTemplates]);

  const handleTemplateClick = async (templateId: string, templateName: string) => {
    if (status === "authenticated" && session?.user) {
      // Store the selected template and redirect to quick create
      sessionStorage.setItem('selectedTemplateId', templateId);
      sessionStorage.setItem('selectedTemplateName', templateName);
      router.push('/projects/quick-create');
    } else {
      // Store intended template selection and open login
      sessionStorage.setItem('intendedTemplateId', templateId);
      sessionStorage.setItem('intendedTemplateName', templateName);
      marketingHeaderRef?.current?.openLoginModal();
    }
  };

  const formatUsageCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  if (isLoading) {
    return (
      <section className="py-16 px-4 bg-gray-50/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Start with templates. Customize with prompts.
            </h2>
          </div>
          
          {/* Loading skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-video bg-gray-200 rounded-t-xl" />
                <div className="p-4">
                  <div className="h-3 bg-gray-200 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Don't show section if no templates
  if (recentTemplates.length === 0) {
    return null;
  }

  return (
    <section className="py-16 px-4 bg-gray-50/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Start with templates. Customize with prompts.
          </h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {recentTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group relative"
              onClick={() => handleTemplateClick(template.id, template.name)}
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
            >
              {/* Video thumbnail preview */}
              <div className="aspect-video bg-black rounded-t-xl overflow-hidden relative">
                <div className="absolute inset-0">
                  {hoveredTemplate === template.id ? (
                    <TemplateVideoPlayer template={template} format="landscape" />
                  ) : (
                    <TemplateThumbnail template={template} format="landscape" />
                  )}
                </div>
                
                {/* Hover overlay with template name and + icon */}
                {hoveredTemplate === template.id && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-white text-sm font-medium truncate">
                        {template.name}
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-1 ml-2 flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Template info - only usage count */}
              <div className="p-4">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>Remixed {formatUsageCount(template.usageCount || 0)} times</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
