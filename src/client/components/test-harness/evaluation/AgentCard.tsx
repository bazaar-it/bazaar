//src/client/components/test-harness/evaluation/AgentCard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { Artifact } from "~/types/a2a"; 

interface AgentCardProps {
  agentName: string;
  agentRole: string;
  status: string; // e.g., 'Active', 'Idle', 'Completed', 'Error'
  activityDetail?: string; // e.g., 'Generating design brief', 'Building component TSX'
  artifacts?: Artifact[];
  lastActivityTime?: Date;
}

export function AgentCard({ 
  agentName,
  agentRole,
  status,
  activityDetail,
  artifacts,
  lastActivityTime 
}: AgentCardProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          {agentName}
          <Badge variant={status === 'Active' ? 'default' : status === 'Completed' ? 'secondary' : status === 'Error' ? 'destructive' : 'outline'}>
            {status}
          </Badge>
        </CardTitle>
        <CardDescription>{agentRole}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {activityDetail && (
          <div>
            <p className="text-sm font-medium">Current Activity:</p>
            <p className="text-sm text-muted-foreground">{activityDetail}</p>
          </div>
        )}
        {lastActivityTime && (
          <div>
            <p className="text-sm font-medium">Last Active:</p>
            <p className="text-sm text-muted-foreground">{lastActivityTime.toLocaleString()}</p>
          </div>
        )}
        {artifacts && artifacts.length > 0 && (
          <div>
            <p className="text-sm font-medium">Artifacts:</p>
            <ul className="list-disc list-inside pl-4 text-sm text-muted-foreground">
              {artifacts.map((artifact, index) => (
                <li key={index}>
                  {artifact.name} ({artifact.type}) 
                  {artifact.url && <a href={artifact.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-1">View</a>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {(!activityDetail && (!artifacts || artifacts.length === 0)) && (
            <p className="text-sm text-muted-foreground">No specific activity or artifacts to display.</p>
        )}
      </CardContent>
    </Card>
  );
}
