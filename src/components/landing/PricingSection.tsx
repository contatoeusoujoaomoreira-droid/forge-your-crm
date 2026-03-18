import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Zap, MessageCircle } from "lucide-react";

const WHATSAPP = "554999837-2865";

const plans = [
  {
    name: "Básico",
    price: "R$ 67",
    unit: "/mês",
    description: "Para empreendedores que querem organizar e vender mais.",
    features: ["1 Pipeline", "100 Leads", "3 Landing Pages", "Forms ilimitados", "1 Quiz", "Analytics básico", "Link de agendamento", "Checkout básico"],
    highlight: false,
    cta: "Quero o Básico",
    whatsMsg: "Olá! Quero assinar o plano *Básico* do Forge AI (R$67/mês). Como prossigo?",
  },
  {
    name: "Pro",
    price: "R$ 97",
    unit: "/mês",
    description: "Para quem precisa de performance e escala real.",
    features: ["Pipelines ilimitados", "Leads ilimitados", "10 Landing Pages", "Forms + Quiz ilimitados", "Analytics avançado", "Pixel & UTM tracking", "Domínio próprio", "IA nativa (100 créditos)", "Suporte prioritário"],
    highlight: true,
    cta: "Quero o Pro",
    whatsMsg: "Olá! Quero assinar o plano *Pro* do Forge AI (R$97/mês). Como prossigo?",
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    unit: "",
    description: "Para operações de alta escala e personalização total.",
    features: ["Tudo do Pro", "Landing Pages ilimitadas", "White label", "API access", "Onboarding dedicado", "IA ilimitada", "SLA garantido", "Gerente de conta"],
    highlight: false,
    cta: "Falar com Consultor",
    whatsMsg: "Olá! Tenho interesse no plano *Enterprise* do Forge AI. Gostaria de uma consultoria personalizada.",
  },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const PricingSection = () => {
  const handlePlanClick = (msg: string) => {
    window.open(`https://wa.me/${WHATSAPP.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <section id="planos" className="py-24 relative">
      <div className="container relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Planos que <span className="text-gradient-lime">escalam com você</span>
          </h2>
          <p className="text-muted-foreground mt-4">
            Comece hoje. Sem fidelidade. Cancele quando quiser.
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
                  <Zap className="h-3 w-3" /> MAIS POPULAR
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
                className={`mt-6 w-full gap-2 ${
                  plan.highlight
                    ? "bg-gradient-lime text-primary-foreground hover:opacity-90 shadow-lime"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
                onClick={() => handlePlanClick(plan.whatsMsg)}
              >
                <MessageCircle className="h-4 w-4" />
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
