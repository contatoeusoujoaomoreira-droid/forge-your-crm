import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();

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
            Pronto para <span className="text-gradient-lime">acelerar</span>?
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Comece grátis em segundos. Sem cartão de crédito. Sem compromisso.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="mt-8 bg-gradient-lime text-primary-foreground hover:opacity-90 shadow-lime-lg text-base px-10 h-12"
          >
            Criar Conta Grátis <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
