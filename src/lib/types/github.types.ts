// src/lib/types/github.types.ts
/**
 * GitHub Integration Types
 */

export interface GitHubPREvent {
  action: 'opened' | 'closed' | 'synchronize' | 'reopened';
  number: number;
  pull_request: {
    id: number;
    number: number;
    title: string;
    body: string | null;
    state: 'open' | 'closed';
    merged: boolean;
    merged_at: string | null;
    created_at: string;
    updated_at: string;
    html_url: string;
    diff_url: string;
    patch_url: string;
    user: {
      login: string;
      avatar_url: string;
      html_url: string;
    };
    head: {
      ref: string;
      sha: string;
      repo: {
        name: string;
        full_name: string;
        owner: {
          login: string;
        };
      };
    };
    base: {
      ref: string;
      sha: string;
      repo: {
        name: string;
        full_name: string;
      };
    };
    commits: number;
    additions: number;
    deletions: number;
    changed_files: number;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      avatar_url: string;
    };
    description: string | null;
    html_url: string;
    language: string | null;
    default_branch: string;
  };
}

export interface PRAnalysis {
  prNumber: number;
  title: string;
  description: string;
  type: 'feature' | 'fix' | 'refactor' | 'docs' | 'style' | 'test' | 'chore';
  impact: 'major' | 'minor' | 'patch';
  files: PRFile[];
  commits: PRCommit[];
  stats: {
    additions: number;
    deletions: number;
    filesChanged: number;
  };
  author: {
    username: string;
    avatarUrl: string;
    profileUrl: string;
  };
  repository: {
    name: string;
    fullName: string;
    owner: string;
    url: string;
    language: string | null;
  };
  mergedAt?: string;
  techStack?: string[];
  brandAssets?: BrandProfile;
}

export interface PRFile {
  path: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  status: 'added' | 'removed' | 'modified' | 'renamed';
}

export interface PRCommit {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
}

export interface BrandProfile {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  font?: string;
  style: 'modern' | 'playful' | 'corporate' | 'minimal' | 'bold';
  detected: boolean;
}

export interface ChangelogVideoRequest {
  prAnalysis: PRAnalysis;
  style?: 'automatic' | 'feature' | 'fix' | 'announcement';
  format?: 'landscape' | 'square' | 'portrait';
  duration?: number; // in seconds
  branding?: 'auto' | 'custom' | 'none';
}

export interface ChangelogVideoResponse {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  gifUrl?: string;
  duration: number;
  format: string;
  createdAt: string;
  prNumber: number;
  repository: string;
}

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  webhookSecret: string;
  clientId?: string;
  clientSecret?: string;
}

export interface ChangelogEntry {
  id: string;
  prNumber: number;
  title: string;
  description: string;
  type: 'feature' | 'fix' | 'improvement' | 'breaking';
  videoUrl: string;
  thumbnailUrl: string;
  gifUrl?: string;
  mergedAt: Date;
  author: {
    name: string;
    avatar: string;
    url: string;
  };
  repository: {
    name: string;
    fullName: string;
    owner: string;
  };
  version?: string;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Webhook verification
export interface WebhookHeaders {
  'x-github-event'?: string;
  'x-github-signature-256'?: string;
  'x-github-delivery'?: string;
}

// Configuration stored in repo
export interface BazaarConfig {
  changelog?: {
    enabled: boolean;
    triggers: ('merge' | 'release' | 'manual')[];
    style: 'branded' | 'minimal' | 'animated';
    videoFormat: 'landscape' | 'square' | 'portrait';
    autoDeploy: boolean;
    deployTo?: string;
    generateFor?: ('features' | 'fixes' | 'all')[];
  };
  brand?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    font?: string;
    style?: 'modern' | 'playful' | 'corporate' | 'minimal';
  };
}