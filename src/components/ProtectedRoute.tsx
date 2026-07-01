import { Navigate, Outlet } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";

export function ProtectedRoute({ requireRoles }: { requireRoles?: AppRole[] }) {
  const { user, roles, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (requireRoles && requireRoles.length && !requireRoles.some(r => roles.includes(r))) {
    return (
      <div className="p-8">
        <h2 className="text-lg font-bold font-serif">Access restricted</h2>
        <p className="text-sm text-muted-foreground mt-1">This area is reserved for: {requireRoles.join(", ")}. Ask your System Administrator to grant the required role.</p>
      </div>
    );
  }
  return <Outlet />;
}