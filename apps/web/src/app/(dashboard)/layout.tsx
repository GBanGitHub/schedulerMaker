import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { Nav } from "@/components/nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-background">
      <Nav />
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-[1400px] mx-auto p-8 w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
