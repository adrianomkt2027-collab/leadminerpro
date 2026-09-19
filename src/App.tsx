import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import HistoryPage from "./pages/History";
import WhatsAppPage from "./pages/WhatsApp";
import AdminPage from "./pages/Admin";
import CnpjExtractor from "./pages/CnpjExtractor";
import MapsExtractor from "./pages/MapsExtractor";
import ImportLeads from "./pages/ImportLeads";
import ProfilePage from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import CookieBanner from "./components/CookieBanner";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!session) return <Navigate to="/auth" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const AuthRoute = () => {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (session) return <Navigate to="/dashboard" replace />;
  return <Auth />;
};

const AppRoutes = () => (
  <HashRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<AuthRoute />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path="/whatsapp" element={<ProtectedRoute><WhatsAppPage /></ProtectedRoute>} />
      <Route path="/maps" element={<ProtectedRoute><MapsExtractor /></ProtectedRoute>} />
      <Route path="/cnpj" element={<ProtectedRoute><CnpjExtractor /></ProtectedRoute>} />
      <Route path="/import" element={<ProtectedRoute><ImportLeads /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </HashRouter>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
        <CookieBanner />
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
