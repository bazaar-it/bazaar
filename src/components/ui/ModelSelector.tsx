"use client";

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Sparkles, Zap, Brain } from "lucide-react";

export interface ModelOption {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai';
  description?: string;
  speed?: 'fast' | 'medium' | 'slow';
  capability?: 'basic' | 'advanced' | 'premium';
}

// Available models for selection
export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Fast and efficient for quick edits',
    speed: 'fast',
    capability: 'basic'
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    description: 'Balanced performance and quality (default)',
    speed: 'medium',
    capability: 'advanced'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'OpenAI fast model',
    speed: 'fast',
    capability: 'basic'
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openai',
    description: 'OpenAI advanced model',
    speed: 'slow',
    capability: 'premium'
  }
];

interface ModelSelectorProps {
  value?: string;
  onChange?: (modelId: string) => void;
  className?: string;
  showDescription?: boolean;
  disabled?: boolean;
}

export function ModelSelector({
  value = 'claude-sonnet-4-20250514', // Default model
  onChange,
  className = '',
  showDescription = true,
  disabled = false
}: ModelSelectorProps) {
  const selectedModel = AVAILABLE_MODELS.find(m => m.id === value) || AVAILABLE_MODELS[1];

  const getSpeedIcon = (speed?: string) => {
    switch (speed) {
      case 'fast': return <Zap className="h-3 w-3" />;
      case 'medium': return <Sparkles className="h-3 w-3" />;
      case 'slow': return <Brain className="h-3 w-3" />;
      default: return null;
    }
  };

  const getCapabilityColor = (capability?: string) => {
    switch (capability) {
      case 'basic': return 'bg-green-500/10 text-green-500';
      case 'advanced': return 'bg-blue-500/10 text-blue-500';
      case 'premium': return 'bg-purple-500/10 text-purple-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue>
            <div className="flex items-center gap-2">
              {getSpeedIcon(selectedModel.speed)}
              <span className="font-medium">{selectedModel.name}</span>
              <Badge variant="outline" className={`text-xs ${getCapabilityColor(selectedModel.capability)}`}>
                {selectedModel.provider}
              </Badge>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {AVAILABLE_MODELS.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {getSpeedIcon(model.speed)}
                  <span className="font-medium">{model.name}</span>
                  <Badge variant="outline" className={`text-xs ${getCapabilityColor(model.capability)}`}>
                    {model.provider}
                  </Badge>
                </div>
                {showDescription && model.description && (
                  <span className="text-xs text-muted-foreground ml-5">
                    {model.description}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}