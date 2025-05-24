//src/app/projects/generate/new/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { projects } from '~/server/db/schema';

export default async function NewGenerateProjectPage() {
  console.log('NewGenerateProjectPage: Starting project creation');
  const session = await auth();
  
  if (!session?.user?.id) {
    console.log('NewGenerateProjectPage: No session, redirecting to login');
    redirect('/login');
  }

  // Create a new project with default props
  const projectTitle = `Video Project ${new Date().toLocaleDateString()}`;
  console.log('NewGenerateProjectPage: Creating project with title:', projectTitle);
  
  try {
    console.log('NewGenerateProjectPage: Inserting project into database');
    const [newProject] = await db.insert(projects).values({
      userId: session.user.id,
      title: projectTitle,
      props: {
        meta: {
          title: projectTitle,
          duration: 300, // 10 seconds at 30fps
          backgroundColor: '#000000',
        },
        scenes: [],
      },
    }).returning();
    console.log('NewGenerateProjectPage: Project created successfully:', newProject?.id);

    // Redirect to the generate page for this new project
    if (newProject) {
      console.log('Redirecting to generate page for project:', newProject.id);
      redirect(`/projects/${newProject.id}/generate`);
    } else {
      throw new Error('Failed to create project');
    }
  } catch (error) {
    console.error('Error creating new project:', error);
    console.log('Redirecting to /projects due to error');
    redirect('/projects');
  }
} 