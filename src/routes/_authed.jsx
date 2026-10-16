import { createFileRoute, Outlet } from "@tanstack/react-router";
import AppLayout from "@/components/AppLayout";
import { AuthGateError, requireSignedIn } from "@/components/auth/AuthGate";

export const Route = createFileRoute("/_authed")({
  ssr: false,
  beforeLoad: requireSignedIn,
  errorComponent: AuthGateError,
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}