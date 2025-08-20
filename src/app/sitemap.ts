// src/app/sitemap.ts
import { siteConfig } from '~/config/site';
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;
  
  // Static routes that should be in the sitemap
  const routes = [
    { path: '', priority: 1.0 },
    { path: '/ai-motion-graphics-software-demo', priority: 0.95 },
    { path: '/faq', priority: 0.9 },
    { path: '/login', priority: 0.8 },
    { path: '/privacy', priority: 0.7 },
    { path: '/terms', priority: 0.7 }
  ].map(
    ({ path, priority }) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly' as const,
      priority,
    })
  );

  // TODO: Add dynamic routes for projects here once we have them
  // This would typically involve querying your database for all public projects
  // const projects = await getProjectsForSitemap();
  // const projectRoutes = projects.map((project) => ({
  //   url: `${baseUrl}/projects/${project.id}`,
  //   lastModified: project.updatedAt,
  //   changeFrequency: 'weekly' as const,
  //   priority: 0.7,
  // }));

  return [...routes]; //, ...projectRoutes];
}
