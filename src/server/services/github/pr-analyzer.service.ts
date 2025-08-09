// src/server/services/github/pr-analyzer.service.ts
/**
 * GitHub PR Analyzer Service
 * Analyzes pull requests to extract meaningful information for changelog videos
 */

import { Octokit } from '@octokit/rest';
import type { PRAnalysis, PRFile, PRCommit, BrandProfile } from '~/lib/types/github.types';

// Initialize Octokit (GitHub API client)
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Optional: for higher rate limits
});

/**
 * Analyze a GitHub PR to extract information for video generation
 */
export async function analyzeGitHubPR(params: {
  owner: string;
  repo: string;
  prNumber: number;
  prData?: any; // Optional pre-fetched PR data
}): Promise<PRAnalysis> {
  const { owner, repo, prNumber, prData } = params;
  
  try {
    // 1. Get PR details (if not provided)
    const pr = prData || (await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    })).data;
    
    // 2. Get PR files
    const filesResponse = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100, // Max 300 files
    });
    
    const files: PRFile[] = filesResponse.data.map(file => ({
      path: file.filename,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      status: file.status as PRFile['status'],
      patch: file.patch,
    }));
    
    // 3. Get PR commits
    const commitsResponse = await octokit.pulls.listCommits({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });
    
    const commits: PRCommit[] = commitsResponse.data.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || 'Unknown',
      timestamp: commit.commit.author?.date || new Date().toISOString(),
    }));
    
    // 4. Detect PR type from title and files
    const type = detectPRType(pr.title, pr.body || '', files);
    
    // 5. Detect impact level
    const impact = detectImpact(files, pr.additions, pr.deletions);
    
    // 6. Detect tech stack from files
    const techStack = await detectTechStack(owner, repo, files);
    
    // 7. Try to detect brand assets
    const brandAssets = await detectBrandAssets(owner, repo);
    
    // 8. Build analysis result
    const analysis: PRAnalysis = {
      prNumber,
      title: pr.title,
      description: pr.body || '',
      type,
      impact,
      files,
      commits,
      stats: {
        additions: pr.additions,
        deletions: pr.deletions,
        filesChanged: pr.changed_files,
      },
      author: {
        username: pr.user.login,
        avatarUrl: pr.user.avatar_url,
        profileUrl: pr.user.html_url,
      },
      repository: {
        name: repo,
        fullName: `${owner}/${repo}`,
        owner,
        url: `https://github.com/${owner}/${repo}`,
        language: null, // Will be fetched if needed
      },
      mergedAt: pr.merged_at || undefined,
      techStack,
      brandAssets,
    };
    
    return analysis;
    
  } catch (error) {
    console.error('Error analyzing GitHub PR:', error);
    throw new Error(`Failed to analyze PR #${prNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Detect PR type from title, body, and changed files
 */
function detectPRType(
  title: string, 
  body: string, 
  files: PRFile[]
): PRAnalysis['type'] {
  const combined = `${title} ${body}`.toLowerCase();
  
  // Check conventional commit patterns
  if (combined.match(/^feat(\(.*\))?:/)) return 'feature';
  if (combined.match(/^fix(\(.*\))?:/)) return 'fix';
  if (combined.match(/^refactor(\(.*\))?:/)) return 'refactor';
  if (combined.match(/^docs(\(.*\))?:/)) return 'docs';
  if (combined.match(/^style(\(.*\))?:/)) return 'style';
  if (combined.match(/^test(\(.*\))?:/)) return 'test';
  if (combined.match(/^chore(\(.*\))?:/)) return 'chore';
  
  // Check keywords
  if (combined.includes('feature') || combined.includes('add') || combined.includes('implement')) {
    return 'feature';
  }
  if (combined.includes('fix') || combined.includes('bug') || combined.includes('resolve')) {
    return 'fix';
  }
  if (combined.includes('refactor') || combined.includes('improve') || combined.includes('optimize')) {
    return 'refactor';
  }
  if (combined.includes('document') || combined.includes('readme')) {
    return 'docs';
  }
  
  // Check file patterns
  const hasOnlyDocs = files.every(f => 
    f.path.includes('.md') || 
    f.path.includes('docs/') ||
    f.path.includes('README')
  );
  if (hasOnlyDocs) return 'docs';
  
  const hasOnlyTests = files.every(f => 
    f.path.includes('.test.') || 
    f.path.includes('.spec.') ||
    f.path.includes('__tests__') ||
    f.path.includes('test/')
  );
  if (hasOnlyTests) return 'test';
  
  const hasOnlyStyles = files.every(f => 
    f.path.includes('.css') || 
    f.path.includes('.scss') ||
    f.path.includes('.less') ||
    f.path.includes('styles/')
  );
  if (hasOnlyStyles) return 'style';
  
  // Default to feature if significant code changes
  return 'feature';
}

/**
 * Detect impact level based on changes
 */
function detectImpact(
  files: PRFile[], 
  additions: number, 
  deletions: number
): 'major' | 'minor' | 'patch' {
  // Major: Breaking changes, large refactors, new features
  if (additions + deletions > 1000) return 'major';
  if (files.some(f => f.path.includes('package.json') && f.deletions > 10)) return 'major';
  if (files.some(f => f.path.includes('api/') && f.deletions > 50)) return 'major';
  
  // Minor: New features, non-breaking improvements
  if (additions > 100) return 'minor';
  if (files.length > 10) return 'minor';
  
  // Patch: Small fixes, documentation
  return 'patch';
}

/**
 * Detect technology stack from repository files
 */
async function detectTechStack(
  owner: string, 
  repo: string,
  files: PRFile[]
): Promise<string[]> {
  const techStack = new Set<string>();
  
  // Check for common config files
  const configFiles = files.map(f => f.path);
  
  // JavaScript/TypeScript
  if (configFiles.some(f => f.includes('package.json'))) {
    techStack.add('JavaScript');
    
    // Try to fetch package.json to get more details
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: 'package.json',
      });
      
      if ('content' in data) {
        const packageJson = JSON.parse(
          Buffer.from(data.content, 'base64').toString()
        );
        
        // Detect frameworks
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };
        
        if (deps['react']) techStack.add('React');
        if (deps['next']) techStack.add('Next.js');
        if (deps['vue']) techStack.add('Vue');
        if (deps['@angular/core']) techStack.add('Angular');
        if (deps['svelte']) techStack.add('Svelte');
        if (deps['express']) techStack.add('Express');
        if (deps['fastify']) techStack.add('Fastify');
        if (deps['typescript']) techStack.add('TypeScript');
        if (deps['tailwindcss']) techStack.add('Tailwind CSS');
        if (deps['@remotion/core']) techStack.add('Remotion');
      }
    } catch (error) {
      console.error('Error fetching package.json:', error);
    }
  }
  
  // Python
  if (configFiles.some(f => f.includes('requirements.txt') || f.includes('pyproject.toml'))) {
    techStack.add('Python');
  }
  
  // Go
  if (configFiles.some(f => f.includes('go.mod'))) {
    techStack.add('Go');
  }
  
  // Rust
  if (configFiles.some(f => f.includes('Cargo.toml'))) {
    techStack.add('Rust');
  }
  
  // Docker
  if (configFiles.some(f => f.includes('Dockerfile') || f.includes('docker-compose'))) {
    techStack.add('Docker');
  }
  
  // Kubernetes
  if (configFiles.some(f => f.includes('.yaml') && f.includes('kind:'))) {
    techStack.add('Kubernetes');
  }
  
  return Array.from(techStack);
}

/**
 * Detect brand assets from repository
 */
async function detectBrandAssets(
  owner: string,
  repo: string
): Promise<BrandProfile> {
  const brand: BrandProfile = {
    style: 'modern',
    detected: false,
  };
  
  try {
    // 1. Check for .github/bazaar.json config
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: '.github/bazaar.json',
      });
      
      if ('content' in data) {
        const config = JSON.parse(
          Buffer.from(data.content, 'base64').toString()
        );
        
        if (config.brand) {
          brand.logo = config.brand.logo;
          brand.primaryColor = config.brand.primaryColor;
          brand.secondaryColor = config.brand.secondaryColor;
          brand.font = config.brand.font;
          brand.style = config.brand.style || 'modern';
          brand.detected = true;
          return brand;
        }
      }
    } catch {
      // Config file doesn't exist, continue with detection
    }
    
    // 2. Try to find logo in common locations
    const logoLocations = [
      'logo.svg',
      'logo.png',
      'assets/logo.svg',
      'assets/logo.png',
      'public/logo.svg',
      'public/logo.png',
      'src/assets/logo.svg',
      'src/assets/logo.png',
    ];
    
    for (const location of logoLocations) {
      try {
        const { data } = await octokit.repos.getContent({
          owner,
          repo,
          path: location,
        });
        
        if ('download_url' in data) {
          brand.logo = data.download_url;
          brand.detected = true;
          break;
        }
      } catch {
        // File doesn't exist, continue
      }
    }
    
    // 3. Try to detect colors from CSS/theme files
    // This is simplified - in production, we'd parse CSS files
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: 'tailwind.config.js',
      });
      
      if ('content' in data) {
        const content = Buffer.from(data.content, 'base64').toString();
        
        // Very basic color extraction
        const primaryMatch = content.match(/primary['":\s]+['"]?(#[0-9a-fA-F]{6})/);
        if (primaryMatch) {
          brand.primaryColor = primaryMatch[1];
          brand.detected = true;
        }
      }
    } catch {
      // No tailwind config
    }
    
    // 4. Detect style from repository description and language
    try {
      const { data: repoData } = await octokit.repos.get({ owner, repo });
      
      if (repoData.description) {
        const desc = repoData.description.toLowerCase();
        if (desc.includes('enterprise') || desc.includes('business')) {
          brand.style = 'corporate';
        } else if (desc.includes('fun') || desc.includes('game')) {
          brand.style = 'playful';
        } else if (desc.includes('minimal') || desc.includes('simple')) {
          brand.style = 'minimal';
        }
      }
    } catch {
      // Couldn't get repo data
    }
    
  } catch (error) {
    console.error('Error detecting brand assets:', error);
  }
  
  return brand;
}

/**
 * Fetch detailed file changes for a PR
 */
export async function fetchPRDiff(params: {
  owner: string;
  repo: string;
  prNumber: number;
}): Promise<string> {
  const { owner, repo, prNumber } = params;
  
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}.diff`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3.diff',
          ...(process.env.GITHUB_TOKEN && {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          }),
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch diff: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error fetching PR diff:', error);
    throw error;
  }
}