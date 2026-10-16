import { createFileRoute, Outlet } from "@tanstack/react-router";
import AppLayout from "@/components/AppLayout";

export const Route = createFileRoute("/_site")({
  component: SiteLayout,
});

function SiteLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}