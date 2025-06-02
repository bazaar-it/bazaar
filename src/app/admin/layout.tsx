//src/app/admin/layout.tsx
import AdminSidebar from "~/components/AdminSidebar";

export const metadata = {
  title: "Admin Dashboard | Bazaar",
  description: "Backend management dashboard for Bazaar-Vid",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
} 