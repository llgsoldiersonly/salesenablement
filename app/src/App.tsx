import { lazy, Suspense } from "react";
import { Logo } from "./components/ui/Logo";

const path = window.location.pathname.replace(/\/$/, "") || "/";

const RepApp = lazy(() => import("./components/RepApp"));
const AdminApp = lazy(() =>
  import("./components/AdminApp").then((m) => ({ default: m.AdminApp })),
);
const CloserApp = lazy(() =>
  import("./components/CloserApp").then((m) => ({ default: m.CloserApp })),
);
const LeadsApp = lazy(() =>
  import("./components/LeadsApp").then((m) => ({ default: m.LeadsApp })),
);

function PortalLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface">
      <Logo variant="full" size={96} className="animate-pulse" />
      <p className="text-sm text-subtle">Loading…</p>
    </div>
  );
}

export default function App() {
  const Portal =
    path === "/admin"
      ? AdminApp
      : path === "/closers"
        ? CloserApp
        : path === "/leads"
          ? LeadsApp
          : RepApp;
  return (
    <Suspense fallback={<PortalLoading />}>
      <Portal />
    </Suspense>
  );
}
