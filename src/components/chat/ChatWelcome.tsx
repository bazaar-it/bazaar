"use client";

import React from 'react';
import { Card } from "~/components/ui/card";
import { Plus, Edit, Trash2 } from 'lucide-react';

interface ChatWelcomeProps {
  onExampleClick: (message: string) => void;
}

const examples = [
  {
    type: 'create',
    title: 'Create',
    subtitle: 'New Scene',
    message: "Animate a hero section for Finance.ai. Use white text on a black background. Add a heading that says 'Smarter Finance. Powered by AI.' The subheading is 'Automate reports, optimize decisions, and forecast in real-time.' Use blue and white colors similar to Facebook's branding. At the bottom center, add a neon blue 'Try Now' button with a gentle pulsing animation.",
    icon: Plus,
    gradient: 'from-green-50 to-emerald-50',
    borderColor: 'border-green-200',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    titleColor: 'text-green-800',
    subtitleColor: 'text-green-700',
    textColor: 'text-green-600'
  },
  {
    type: 'edit',
    title: 'Edit',
    subtitle: 'Modify Scene',
    message: "Make the header bold and increase font size to 120px.",
    icon: Edit,
    gradient: 'from-blue-50 to-cyan-50',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-800',
    subtitleColor: 'text-blue-700',
    textColor: 'text-blue-600'
  },
  {
    type: 'delete',
    title: 'Delete',
    subtitle: 'Remove Scene',
    message: "Delete the CTA scene.",
    icon: Trash2,
    gradient: 'from-red-50 to-pink-50',
    borderColor: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    titleColor: 'text-red-800',
    subtitleColor: 'text-red-700',
    textColor: 'text-red-600'
  }
];

export function ChatWelcome({ onExampleClick }: ChatWelcomeProps) {
  return (
    <div className="text-center p-8 space-y-6">
      {/* Welcome Header */}
      <div>
        <p className="text-lg font-medium">Welcome to your new project</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create, edit or delete scenes — all with simple prompts.
        </p>
      </div>

      {/* Examples Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Examples</h3>
        
        <div className="grid gap-3">
          {examples.map((example) => {
            const Icon = example.icon;
            return (
              <Card 
                key={example.type}
                className={`p-3 bg-gradient-to-br ${example.gradient} ${example.borderColor} hover:shadow-md transition-shadow cursor-pointer`}
                onClick={() => onExampleClick(example.message)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 ${example.iconBg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${example.iconColor}`} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${example.titleColor} mb-1`}>{example.title}</div>
                    <div className={`text-sm ${example.subtitleColor} mb-2`}>{example.subtitle}</div>
                    <div className={`text-xs ${example.textColor} leading-relaxed`}>
                      "{example.message}"
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}