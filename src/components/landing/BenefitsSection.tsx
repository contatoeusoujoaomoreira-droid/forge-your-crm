import { motion } from "framer-motion";
import { BarChart3, Globe, Users, Zap, Target, Layers } from "lucide-react";

const benefits = [
  {
    icon: BarChart3,
    title: "Pipeline Visual",
    description: "CRM Kanban com drag-and-drop, múltiplos funis e gestão completa de leads em tempo real.",
  },
  {
    icon: Globe,
    title: "Landing Page Builder",
    description: "Crie páginas de alta conversão com editor visual. Customize cores, tipografia e animações.",
  },
  {
    icon: Target,
    title: "Quizzes Interativos",
    description: "Capture leads qualificados com quizzes que segmentam e enriquecem seu pipeline automaticamente.",
  },
  {
    icon: Zap,
    title: "Analytics Pro",
    description: "Métricas de conversão, LTV, CAC e tracking com UTM e Pixel integrados por página.",
  },
  {
    icon: Users,
    title: "Gestão de Leads",
    description: "Cadastro automático via formulários, quizzes e landing pages. Score e segmentação.",
  },
  {
    icon: Layers,
    title: "Multi-Pipeline",
    description: "Crie pipelines personalizados para vendas, pós-venda, onboarding e qualquer fluxo.",
  },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const BenefitsSection = () => {
  return (
    <section id="recursos" className="py-24 relative">
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="container relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Tudo que você precisa para{" "}
            <span className="text-gradient-lime">acelerar vendas</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            Uma plataforma completa para converter, gerenciar e escalar.
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.title}
                variants={item}
                className="surface-card rounded-xl p-6 hover:border-lime/20 transition-colors group"
              >
                <div className="h-10 w-10 rounded-lg bg-lime/10 flex items-center justify-center mb-4 group-hover:bg-lime/20 transition-colors">
                  <Icon className="h-5 w-5 text-lime" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default BenefitsSection;
