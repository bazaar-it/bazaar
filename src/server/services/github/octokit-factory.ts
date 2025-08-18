// src/server/services/github/octokit-factory.ts
import { App } from '@octokit/app';
import type { Octokit } from '@octokit/rest';

/**
 * Create an installation-scoped Octokit client using the GitHub App credentials.
 * Falls back to throwing if required env vars are missing.
 */
export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!appId || !privateKey || !clientId || !clientSecret) {
    throw new Error(
      'Missing GitHub App env vars. Required: GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET'
    );
  }

  const app = new App({
    appId,
    privateKey,
    oauth: {
      clientId,
      clientSecret,
    },
  });

  const installationOctokit = await app.getInstallationOctokit(installationId);
  return installationOctokit as unknown as Octokit;
}
