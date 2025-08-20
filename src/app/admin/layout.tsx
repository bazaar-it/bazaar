//src/app/admin/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import AdminSidebar from "~/components/AdminSidebar";

export const metadata = {
  title: "Admin Dashboard | Bazaar",
  description: "Backend management dashboard for Bazaar-Vid",
};

async function checkAdminStatus(userId: string): Promise<boolean> {
  const user = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
    
  return user[0]?.isAdmin || false;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check
  const session = await auth();
  
  // Double-check authentication
  if (!session?.user?.id) {
    redirect("/login");
  }
  
  // Check admin status directly from database
  const isAdmin = await checkAdminStatus(session.user.id);
  if (!isAdmin) {
    redirect("/403");
  }
  
  // Only render admin UI if authorized
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
} 