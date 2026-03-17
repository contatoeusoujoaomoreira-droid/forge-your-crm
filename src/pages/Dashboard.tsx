import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 shadow-sm">
          <p className="text-sm text-muted-foreground">Área autenticada</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Bem-vindo ao seu painel</h1>
          <p className="mt-3 text-muted-foreground">
            Você entrou com <span className="font-medium text-foreground">{user?.email}</span>
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => navigate("/")}>Voltar para landing</Button>
            <Button variant="outline" onClick={handleSignOut}>Sair</Button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Dashboard;