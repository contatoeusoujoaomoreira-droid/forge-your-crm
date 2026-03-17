import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-lime/5 blur-[120px]" />

      <div className="container relative z-10 text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-lime/20 bg-lime/5 text-lime text-sm font-medium mb-8">
            <Zap className="h-4 w-4" />
            Plataforma de Aceleração de Vendas
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight max-w-4xl mx-auto">
            Converta mais.{" "}
            <span className="text-gradient-lime">Venda melhor.</span>{" "}
            Escale rápido.
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            CRM visual, landing pages de alta conversão, quizzes interativos e analytics avançado — tudo em uma única plataforma.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-gradient-lime text-primary-foreground hover:opacity-90 shadow-lime-lg text-base px-8 h-12"
            >
              Começar Grátis <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById("recursos")?.scrollIntoView({ behavior: "smooth" })}
              className="border-border text-foreground hover:bg-secondary text-base px-8 h-12"
            >
              Ver Recursos
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-20"
        >
          {[
            { value: "10x", label: "Mais conversões" },
            { value: "500+", label: "Empresas" },
            { value: "99.9%", label: "Uptime" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-gradient-lime">
                {stat.value}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
