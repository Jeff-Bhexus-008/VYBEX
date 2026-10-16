import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, ShieldX } from "lucide-react";
import { getAdminData } from "@/lib/server-fns";
import AdminPending from "@/components/admin/AdminPending";
import AdminContent from "@/components/admin/AdminContent";
import AdminReports from "@/components/admin/AdminReports";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authed/admin")({
  head: () => ({ meta: [{ title: "Admin — VYBEX" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin"],
    queryFn: () => getAdminData(),
    enabled: user?.role === "admin",
    retry: false,
    // The moderation queue must never be stale: always refetch on every visit.
    staleTime: 0,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin"] });

  if (user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-md pt-16 text-center animate-fade-in">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="h-8 w-8 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-extrabold tracking-tight">Admin area</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This section is restricted to VYBEX administrators. You don't have access to moderation tools.
        </p>
        <Button asChild variant="outline" className="mt-6 border-border">
          <Link to="/me">Back to my profile</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-6">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
        <ShieldAlert className="h-6 w-6 text-primary" aria-hidden="true" /> Content Management
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Review uploads, manage the catalogue and handle reports.</p>

      <Tabs defaultValue="pending" className="mt-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="pending">
            Pending{data?.pending?.length ? ` (${data.pending.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="content">Published</TabsTrigger>
          <TabsTrigger value="reports">
            Reports{data?.reports?.length ? ` (${data.reports.filter((r) => r.status === "open").length} open)` : ""}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          {isPending ? (
            <div className="h-40 animate-pulse rounded-xl bg-card/50" aria-hidden="true" />
          ) : isError ? (
            <div className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">Couldn't load the moderation queue.</p>
              <Button onClick={() => refetch()} className="mt-3 bg-primary text-primary-foreground">Try again</Button>
            </div>
          ) : (
            <AdminPending items={data?.pending} invalidate={invalidate} />
          )}
        </TabsContent>
        <TabsContent value="content" className="mt-4">
          <AdminContent items={data?.published} invalidate={invalidate} />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <AdminReports items={data?.reports} invalidate={invalidate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}