import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    price: "Grátis",
    unit: "",
    description: "Para quem está começando a organizar seus leads.",
    features: ["1 Pipeline", "50 Leads", "1 Landing Page", "Analytics básico", "Formulário de contato"],
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 97",
    unit: "/mês",
    description: "Para equipes que precisam de performance.",
    features: ["Pipelines ilimitados", "Leads ilimitados", "10 Landing Pages", "Analytics avançado", "Quiz Builder", "Pixel & UTM tracking", "Suporte prioritário"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "R$ 297",
    unit: "/mês",
    description: "Para operações de alta escala e customização.",
    features: ["Tudo do Pro", "Landing Pages ilimitadas", "Custom domain", "API access", "White label", "Onboarding dedicado", "SLA garantido"],
    highlight: false,
  },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <section id="planos" className="py-24 relative">
      <div className="container relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Planos que <span className="text-gradient-lime">escalam com você</span>
          </h2>
          <p className="text-muted-foreground mt-4">
            Comece grátis. Upgrade quando precisar.
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={item}
              className={`relative rounded-xl p-6 flex flex-col ${
                plan.highlight
                  ? "surface-card-lime shadow-lime-lg border-lime/30"
                  : "surface-card"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-lime text-primary-foreground text-xs font-bold flex items-center gap-1">
                  <Zap className="h-3 w-3" /> POPULAR
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  {plan.unit && <span className="text-sm text-muted-foreground">{plan.unit}</span>}
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-lime shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className={`mt-6 w-full ${
                  plan.highlight
                    ? "bg-gradient-lime text-primary-foreground hover:opacity-90 shadow-lime"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
                onClick={() => navigate("/auth")}
              >
                {plan.price === "Grátis" ? "Começar Grátis" : "Assinar Agora"}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
