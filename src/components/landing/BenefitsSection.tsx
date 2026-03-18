import { motion } from "framer-motion";
import { BarChart3, Globe, Users, Zap, Target, Layers, FileText, Calendar, ShoppingCart, Bot } from "lucide-react";

const benefits = [
  { icon: BarChart3, title: "CRM Visual Kanban", description: "Pipeline drag-and-drop, múltiplos funis, histórico de atividades, tags e gestão completa de leads." },
  { icon: Globe, title: "Landing Page Builder", description: "Editor visual + HTML. Templates prontos, tipografia avançada, animações e publicação com domínio próprio." },
  { icon: Target, title: "Quizzes Interativos", description: "9 templates, lógica de pontuação, captura de lead e integração automática com o CRM." },
  { icon: FileText, title: "Formulários Dinâmicos", description: "Estilo Typeform, campos condicionais, múltiplas etapas e 6 templates profissionais prontos." },
  { icon: Calendar, title: "Agendamento Nativo", description: "Link público estilo Calendly, confirmação automática, visão de calendário e integração CRM." },
  { icon: ShoppingCart, title: "Checkout & Pedidos", description: "Checkout personalizável, redirect WhatsApp, countdown, notificações de compra e métricas." },
  { icon: Zap, title: "Analytics Avançado", description: "KPIs globais, métricas por módulo, tracking UTM, Pixel Meta/Google e exportação de dados." },
  { icon: Bot, title: "IA Nativa Integrada", description: "Geração de páginas com IA, créditos por usuário, suporte a chaves externas (GPT, Gemini, Claude)." },
  { icon: Users, title: "Multi-Usuários", description: "Sistema de permissões granulares, super admin, controle de créditos IA por pessoa." },
  { icon: Layers, title: "Hospedagem + SSL", description: "Publicação automática, subdomínio grátis, domínio próprio com SSL Let's Encrypt integrado." },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const BenefitsSection = () => {
  return (
    <section id="recursos" className="py-24 relative">
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="container relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Tudo que você precisa para{" "}
            <span className="text-gradient-lime">dominar o mercado</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            10 módulos integrados numa plataforma unificada.
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
        >
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.title}
                variants={item}
                className="surface-card rounded-xl p-5 hover:border-lime/20 transition-colors group"
              >
                <div className="h-9 w-9 rounded-lg bg-lime/10 flex items-center justify-center mb-3 group-hover:bg-lime/20 transition-colors">
                  <Icon className="h-4 w-4 text-lime" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1.5">{b.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{b.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default BenefitsSection;
