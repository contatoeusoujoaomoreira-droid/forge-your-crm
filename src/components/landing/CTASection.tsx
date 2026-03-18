import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const WHATSAPP = "554999837-2865";

const CTASection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <section id="contato" className="py-24 relative">
      <div className="absolute inset-0 grid-bg-subtle" />
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            Pronto para <span className="text-gradient-lime">escalar suas vendas</span>?
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Junte-se a mais de 500 empresas que já usam o Forge AI.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Button
              size="lg"
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
              className="bg-gradient-lime text-primary-foreground hover:opacity-90 shadow-lime-lg text-base px-10 h-12"
            >
              {user ? "Abrir painel" : "Acessar Plataforma"} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.open(`https://wa.me/${WHATSAPP.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Olá! Quero saber mais sobre o Forge AI.")}`, "_blank")}
              className="border-border text-foreground hover:bg-secondary text-base px-8 h-12 gap-2"
            >
              <MessageCircle className="h-5 w-5" /> WhatsApp
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
