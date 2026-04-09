import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Footer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <footer className="border-t border-border py-12">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <a href="/" className="text-lg font-bold tracking-tight">
              <span className="text-gradient-lime">Omni</span>{" "}
              <span className="text-foreground">Builder</span>
            </a>
            <p className="text-sm text-muted-foreground mt-1">
              Plataforma de aceleração de vendas.
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
            <button
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
              className="hover:text-foreground transition-colors"
            >
              {user ? "Dashboard" : "Entrar"}
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Omni Builder CRM. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;