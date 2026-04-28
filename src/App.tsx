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
import PageEditor from "./pages/PageEditor";
import GrapesEditorUltra from "./components/dashboard/GrapesEditorUltra";
import LandingPagePublic from "./pages/LandingPagePublic";
import QuizPublic from "./pages/QuizPublic";
import FormPublic from "./pages/FormPublic";
import SchedulePublic from "./pages/SchedulePublic";
import CheckoutPublic from "./pages/CheckoutPublic";
import NotFound from "./pages/NotFound";
import UserThemeSync from "./components/UserThemeSync";

const queryClient = new QueryClient();

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
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/editor/:id" element={<ProtectedRoute><PageEditor /></ProtectedRoute>} />
              <Route path="/editor-html/:id" element={<ProtectedRoute><GrapesEditorUltra /></ProtectedRoute>} />
              <Route path="/p/:slug" element={<LandingPagePublic />} />
              <Route path="/quiz/:slug" element={<QuizPublic />} />
              <Route path="/form/:slug" element={<FormPublic />} />
              <Route path="/agendar/:slug" element={<SchedulePublic />} />
              <Route path="/checkout/:slug" element={<CheckoutPublic />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
