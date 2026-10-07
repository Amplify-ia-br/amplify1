import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { FileText, Users, LogOut, ExternalLink, TicketCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { assetSrc } from "@/lib/assets";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoAmplify from "@/assets/logo-amplify-branco.png";

const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const navItems = [
    { to: "/admin", label: "Posts", icon: FileText, exact: true },
    { to: "/admin/amplify-day/convites", label: "Convites", icon: TicketCheck, exact: false },
    ...(isAdmin ? [{ to: "/admin/users", label: "Usuários", icon: Users, exact: false }] : []),
  ];

  const isActive = (to: string, exact: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-4 md:gap-8">
            <Link to="/admin" className="flex items-center gap-2">
              <img src={assetSrc(logoAmplify)} alt="Amplify" className="h-6 w-auto sm:h-7" />
              <span className="hidden text-sm font-semibold text-muted-foreground sm:inline">Admin</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive(item.to, item.exact)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-0 sm:gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/blog" target="_blank" aria-label="Ver site">
                <ExternalLink className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Ver site</span>
              </Link>
            </Button>
            <span className="hidden md:inline text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="Sair">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
        <nav className="md:hidden border-t border-border flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm",
                isActive(item.to, item.exact) ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
