import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isEditor, loading: roleLoading } = useUserRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (!requireAdmin && !isEditor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 space-y-4">
        <h1 className="text-2xl font-heading font-bold">Acesso negado</h1>
        <p className="text-muted-foreground">Sua conta não tem permissão para acessar a área administrativa.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
