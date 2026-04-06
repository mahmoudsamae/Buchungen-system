import { Sidebar } from "@/components/navigation/sidebar";
import { adminNav } from "@/lib/navigation";

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar title="Super Admin" items={adminNav} basePath="/admin" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
