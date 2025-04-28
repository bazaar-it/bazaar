// src/app/projects/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { projects } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "~/server/auth";
import { NewProjectButton } from "~/components/client/NewProjectButton";

/**
 * Projects dashboard that lists all projects for the logged-in user
 * Server component that fetches data directly from the database
 */
export default async function ProjectsPage() {
  // Get session to check auth and user ID
  const session = await auth();
  
  // Redirect to sign-in if not authenticated
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Fetch all projects for the logged-in user, sorted by last updated
  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .orderBy(desc(projects.updatedAt));

  // Show message if no projects
  if (userProjects.length === 0) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Your Projects</h1>
        
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-8">
          <p>You don't have any projects yet.</p>
          <p className="mt-2">
            Click the button below to create your first project.
          </p>
        </div>
        
        <NewProjectButton />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Projects</h1>
        <NewProjectButton />
      </div>
      
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {userProjects.map((project) => (
          <li 
            key={project.id}
            className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
          >
            <Link 
              href={`/projects/${project.id}/edit`}
              className="block p-4"
            >
              <h2 className="text-xl font-semibold">{project.title}</h2>
              <p className="text-gray-500 text-sm mt-1">
                {project.updatedAt 
                  ? new Date(project.updatedAt).toLocaleDateString() 
                  : "No date available"}
              </p>
              <div className="mt-3 text-blue-600">Edit project →</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
} 