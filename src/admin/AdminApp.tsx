import "@/index.css";
import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import AdminLayout from "@/pages/admin/_AdminLayout";
import Auth from "@/pages/_Auth";
import ResetPassword from "@/pages/_ResetPassword";

const AdminDashboard = lazy(() => import("@/pages/admin/_AdminDashboard"));
const PostEditor = lazy(() => import("@/pages/admin/_PostEditor"));
const UserManagement = lazy(() => import("@/pages/admin/_UserManagement"));

const queryClient = new QueryClient();
const AdminRouteFallback = () => <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;

const AdminApp = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Suspense fallback={<AdminRouteFallback />}><AdminDashboard /></Suspense>} />
              <Route path="posts/new" element={<Suspense fallback={<AdminRouteFallback />}><PostEditor /></Suspense>} />
              <Route path="posts/:id/edit" element={<Suspense fallback={<AdminRouteFallback />}><PostEditor /></Suspense>} />
              <Route path="users" element={<ProtectedRoute requireAdmin><Suspense fallback={<AdminRouteFallback />}><UserManagement /></Suspense></ProtectedRoute>} />
            </Route>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default AdminApp;
