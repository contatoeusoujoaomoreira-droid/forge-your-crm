import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import UserThemeSync from "./components/UserThemeSync";

// Lazy-load heavy routes to reduce initial bundle and memory pressure
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PageEditor = lazy(() => import("./pages/PageEditor"));
const GrapesEditorUltra = lazy(() => import("./components/dashboard/GrapesEditorUltra"));
const LandingPagePublic = lazy(() => import("./pages/LandingPagePublic"));
const QuizPublic = lazy(() => import("./pages/QuizPublic"));
const FormPublic = lazy(() => import("./pages/FormPublic"));
const SchedulePublic = lazy(() => import("./pages/SchedulePublic"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
});

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

const Fallback = () => <div className="min-h-screen bg-background" />;

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <UserThemeSync />
            <Suspense fallback={<Fallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/editor/:id" element={<ProtectedRoute><PageEditor /></ProtectedRoute>} />
                <Route path="/editor-html/:id" element={<ProtectedRoute><GrapesEditorUltra /></ProtectedRoute>} />
                <Route path="/p/:slug" element={<LandingPagePublic />} />
                <Route path="/quiz/:slug" element={<QuizPublic />} />
                <Route path="/form/:slug" element={<FormPublic />} />
                <Route path="/agendar/:slug" element={<SchedulePublic />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
