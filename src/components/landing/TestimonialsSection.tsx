import { motion } from "framer-motion";

const testimonials = [
  { name: "Camila Ferreira", role: "CEO, Lumiar Digital", text: "Eu estava perdida com planilhas e perdendo leads. O Forge AI organizou tudo e minhas vendas triplicaram em 3 meses.", gradient: "from-pink-500 to-rose-500" },
  { name: "Rafael Oliveira", role: "Founder, Growth Lab", text: "O quiz interativo capturou 4x mais leads qualificados que meus formulários antigos. Game changer total.", gradient: "from-blue-500 to-cyan-500" },
  { name: "Juliana Costa", role: "CMO, Vetta Marketing", text: "Finalmente um CRM que não precisa de manual. Arrastar e soltar leads entre etapas é intuitivo demais.", gradient: "from-violet-500 to-purple-500" },
  { name: "Pedro Mendes", role: "Diretor, AutoTech Solutions", text: "A landing page builder salvou R$15mil que eu gastaria com agência. E converte mais do que a anterior.", gradient: "from-amber-500 to-orange-500" },
  { name: "Mariana Santos", role: "Consultora de Vendas", text: "Meu sonho era ter tudo num lugar só: CRM, landing pages, agenda. Encontrei no Forge AI e nunca mais saí.", gradient: "from-emerald-500 to-green-500" },
  { name: "Lucas Andrade", role: "Growth Hacker, ScaleUp", text: "Os analytics me mostram exatamente de onde vêm as conversões. Já cortei 40% do gasto com ads inúteis.", gradient: "from-red-500 to-pink-500" },
  { name: "Beatriz Lima", role: "Empreendedora", text: "Eu não sabia nem mexer em ferramentas de marketing. O Forge AI é tão simples que criei minha primeira página em 10 min.", gradient: "from-teal-500 to-cyan-500" },
  { name: "Thiago Ramos", role: "CEO, Digital Storm", text: "A integração quiz → CRM → WhatsApp automatizou todo meu funil. Recebi lead qualificado dormindo.", gradient: "from-indigo-500 to-blue-500" },
  { name: "Fernanda Alves", role: "Head de Marketing, Nexus", text: "Testei 5 plataformas antes. Nenhuma tinha tudo junto assim. O Forge AI é absurdamente completo.", gradient: "from-fuchsia-500 to-pink-500" },
  { name: "Diego Souza", role: "Dono, Hamburgueria Brasa", text: "O checkout com redirect pro WhatsApp triplicou meus pedidos delivery. Simples, bonito, funciona.", gradient: "from-orange-500 to-red-500" },
  { name: "Priscila Nogueira", role: "Coach de Carreira", text: "Minha agenda ficou profissional e os clientes agendam sozinhos. Zero ligações e zero confusão.", gradient: "from-sky-500 to-blue-500" },
  { name: "André Martins", role: "Fundador, LeadPro", text: "O pipeline visual mudou meu jogo. Consigo ver exatamente onde cada negociação está travada.", gradient: "from-lime-500 to-green-500" },
  { name: "Carolina Ribeiro", role: "Designer, Studio CR", text: "Os templates são lindos. Personalizei tudo sem saber código. Meus clientes acham que contratei dev.", gradient: "from-purple-500 to-violet-500" },
  { name: "Marcos Silva", role: "Vendedor, Imobiliária Plus", text: "Cada imóvel tem sua landing page e quiz de perfil. As visitas qualificadas aumentaram 280%.", gradient: "from-cyan-500 to-teal-500" },
  { name: "Gabriela Torres", role: "Nutricionista", text: "Criei um quiz de avaliação nutricional que gera leads todos os dias. É como ter um vendedor 24h.", gradient: "from-rose-500 to-pink-500" },
  { name: "Felipe Castro", role: "CTO, TechFlow", text: "A API e o domínio próprio deram profissionalismo total ao nosso produto. SSL automático é diferencial.", gradient: "from-blue-600 to-indigo-500" },
  { name: "Isabella Moreira", role: "Social Media Manager", text: "Eu criei formulários bonitos estilo Typeform em minutos. Os clientes adoram preencher.", gradient: "from-pink-400 to-fuchsia-500" },
  { name: "Rodrigo Peixoto", role: "CEO, Agência Impulso", text: "Migrei 12 clientes pra cá. Todos economizaram em ferramentas e viram resultado imediato.", gradient: "from-emerald-400 to-teal-500" },
  { name: "Amanda Dias", role: "Psicóloga Clínica", text: "O agendamento online reduziu 90% das faltas. Os pacientes recebem confirmação automática.", gradient: "from-violet-400 to-purple-500" },
  { name: "Gustavo Henrique", role: "E-commerce, GH Store", text: "O checkout personalizado com countdown e notificações aumentou minha taxa de conversão em 65%.", gradient: "from-amber-400 to-orange-500" },
];

const TestimonialsSection = () => {
  const row1 = testimonials.slice(0, 10);
  const row2 = testimonials.slice(10, 20);

  const renderCard = (t: typeof testimonials[0], i: number) => (
    <div key={i} className="flex-shrink-0 w-[340px] surface-card rounded-xl p-5 mx-2">
      <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">"{t.text}"</p>
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-sm font-bold`}>
          {t.name[0]}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{t.name}</p>
          <p className="text-[11px] text-muted-foreground">{t.role}</p>
        </div>
      </div>
    </div>
  );

  return (
    <section className="py-24 overflow-hidden">
      <div className="container mb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-4xl font-bold text-center">
            Quem usa, <span className="text-gradient-lime">recomenda</span>
          </h2>
          <p className="text-muted-foreground mt-4 text-center max-w-xl mx-auto">
            +500 empresas crescendo com Forge AI
          </p>
        </motion.div>
      </div>

      {/* Row 1 - scroll left */}
      <div className="relative mb-4">
        <div className="flex animate-scroll-left" style={{ width: "fit-content" }}>
          {[...row1, ...row1].map((t, i) => renderCard(t, i))}
        </div>
      </div>

      {/* Row 2 - scroll right (reversed) */}
      <div className="relative">
        <div className="flex animate-scroll-left" style={{ width: "fit-content", animationDirection: "reverse", animationDuration: "40s" }}>
          {[...row2, ...row2].map((t, i) => renderCard(t, i))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
