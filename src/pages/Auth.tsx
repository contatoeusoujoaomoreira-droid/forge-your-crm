import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Bem-vindo de volta!", description: "Login realizado com sucesso." });
      navigate("/dashboard");
    } catch (error: any) {
      const msg = error?.message || "";
      let description = "Ocorreu um erro. Tente novamente.";
      if (msg.includes("Invalid login credentials")) {
        description = "E-mail ou senha incorretos.";
      } else if (msg.includes("Email not confirmed")) {
        description = "E-mail não confirmado. Verifique sua caixa de entrada.";
      }
      toast({ title: "Erro", description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast({ title: "Informe seu e-mail", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      setResetSent(true);
      toast({ title: "E-mail enviado!", description: "Verifique sua caixa de entrada para redefinir a senha." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/dashboard`,
      });
      if (error) {
        toast({ title: "Erro", description: "Falha ao entrar com Google.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao entrar com Google. Tente na URL publicada.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 grid-bg-subtle" />
      <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md relative z-10">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="surface-card rounded-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">
              <span className="text-gradient-lime">Omni</span> <span className="text-foreground">Builder CRM</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {mode === "forgot" ? "Recuperar senha" : "Sua plataforma all-in-one de CRM, automação e vendas"}
            </p>
          </div>

          {mode === "forgot" ? (
            resetSent ? (
              <div className="text-center space-y-4">
                <div className="text-4xl">📧</div>
                <p className="text-sm text-muted-foreground">Enviamos um link de recuperação para <strong className="text-foreground">{email}</strong>. Verifique sua caixa de entrada.</p>
                <Button variant="outline" onClick={() => { setMode("login"); setResetSent(false); }} className="w-full">Voltar ao Login</Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required className="mt-1.5 bg-secondary/50 border-border" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-lime text-primary-foreground hover:opacity-90 shadow-lime">
                  {loading ? "Enviando..." : "Enviar Link de Recuperação"}
                </Button>
                <button type="button" onClick={() => setMode("login")} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
                  ← Voltar ao login
                </button>
              </form>
            )
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleGoogleLogin} className="w-full mb-6 border-border hover:bg-secondary/50">
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuar com Google
              </Button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required className="mt-1.5 bg-secondary/50 border-border" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative mt-1.5">
                    <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="bg-secondary/50 border-border pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-lime text-primary-foreground hover:opacity-90 shadow-lime">
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground mt-6">
            Acesso exclusivo por convite. Contate o administrador.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
