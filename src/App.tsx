import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import QuizPublic from "./pages/QuizPublic";
import FormPublic from "./pages/FormPublic";
import SchedulePublic from "./pages/SchedulePublic";
import CheckoutPublic from "./pages/CheckoutPublic";
import NotFound from "./pages/NotFound";
import StorePublic from "./pages/StorePublic";
import UserThemeSync from "./components/UserThemeSync";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PLATFORM_HOSTS = ["localhost", "127.0.0.1", "omnibuildercrm.online", "www.omnibuildercrm.online"];
const host = typeof window !== "undefined" ? window.location.hostname : "";
const isStoreDomain = !!host && !PLATFORM_HOSTS.includes(host) && !host.endsWith(".lovable.app") && !host.endsWith(".lovableproject.com");

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <UserThemeSync />
            <Routes>
              <Route path="/" element={isStoreDomain ? <StorePublic domain={host} /> : <Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/quiz/:slug" element={<QuizPublic />} />
              <Route path="/form/:slug" element={<FormPublic />} />
              <Route path="/agendar/:slug" element={<SchedulePublic />} />
              <Route path="/checkout/:slug" element={<CheckoutPublic />} />
              <Route path="/loja/:slug" element={<StorePublic />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
