import { motion } from "framer-motion";
import camilaImg from "@/assets/testimonials/camila.jpg";
import rafaelImg from "@/assets/testimonials/rafael.jpg";
import julianaImg from "@/assets/testimonials/juliana.jpg";
import pedroImg from "@/assets/testimonials/pedro.jpg";
import marianaImg from "@/assets/testimonials/mariana.jpg";
import lucasImg from "@/assets/testimonials/lucas.jpg";
import beatrizImg from "@/assets/testimonials/beatriz.jpg";
import thiagoImg from "@/assets/testimonials/thiago.jpg";
import fernandaImg from "@/assets/testimonials/fernanda.jpg";
import diegoImg from "@/assets/testimonials/diego.jpg";
import priscilaImg from "@/assets/testimonials/priscila.jpg";
import andreImg from "@/assets/testimonials/andre.jpg";
import carolinaImg from "@/assets/testimonials/carolina.jpg";
import marcosImg from "@/assets/testimonials/marcos.jpg";
import gabrielaImg from "@/assets/testimonials/gabriela.jpg";
import felipeImg from "@/assets/testimonials/felipe.jpg";
import isabellaImg from "@/assets/testimonials/isabella.jpg";
import rodrigoImg from "@/assets/testimonials/rodrigo.jpg";
import amandaImg from "@/assets/testimonials/amanda.jpg";
import gustavoImg from "@/assets/testimonials/gustavo.jpg";

const testimonials = [
  { name: "Camila Ferreira", role: "CEO, Lumiar Digital", text: "Eu estava perdida com planilhas e perdendo leads. O Forge AI organizou tudo e minhas vendas triplicaram em 3 meses.", photo: camilaImg },
  { name: "Rafael Oliveira", role: "Founder, Growth Lab", text: "O quiz interativo capturou 4x mais leads qualificados que meus formulários antigos. Game changer total.", photo: rafaelImg },
  { name: "Juliana Costa", role: "CMO, Vetta Marketing", text: "Finalmente um CRM que não precisa de manual. Arrastar e soltar leads entre etapas é intuitivo demais.", photo: julianaImg },
  { name: "Pedro Mendes", role: "Diretor, AutoTech Solutions", text: "A landing page builder salvou R$15mil que eu gastaria com agência. E converte mais do que a anterior.", photo: pedroImg },
  { name: "Mariana Santos", role: "Consultora de Vendas", text: "Meu sonho era ter tudo num lugar só: CRM, landing pages, agenda. Encontrei no Forge AI e nunca mais saí.", photo: marianaImg },
  { name: "Lucas Andrade", role: "Growth Hacker, ScaleUp", text: "Os analytics me mostram exatamente de onde vêm as conversões. Já cortei 40% do gasto com ads inúteis.", photo: lucasImg },
  { name: "Beatriz Lima", role: "Empreendedora", text: "Eu não sabia nem mexer em ferramentas de marketing. O Forge AI é tão simples que criei minha primeira página em 10 min.", photo: beatrizImg },
  { name: "Thiago Ramos", role: "CEO, Digital Storm", text: "A integração quiz → CRM → WhatsApp automatizou todo meu funil. Recebi lead qualificado dormindo.", photo: thiagoImg },
  { name: "Fernanda Alves", role: "Head de Marketing, Nexus", text: "Testei 5 plataformas antes. Nenhuma tinha tudo junto assim. O Forge AI é absurdamente completo.", photo: fernandaImg },
  { name: "Diego Souza", role: "Dono, Hamburgueria Brasa", text: "O checkout com redirect pro WhatsApp triplicou meus pedidos delivery. Simples, bonito, funciona.", photo: diegoImg },
  { name: "Priscila Nogueira", role: "Coach de Carreira", text: "Minha agenda ficou profissional e os clientes agendam sozinhos. Zero ligações e zero confusão.", photo: priscilaImg },
  { name: "André Martins", role: "Fundador, LeadPro", text: "O pipeline visual mudou meu jogo. Consigo ver exatamente onde cada negociação está travada.", photo: andreImg },
  { name: "Carolina Ribeiro", role: "Designer, Studio CR", text: "Os templates são lindos. Personalizei tudo sem saber código. Meus clientes acham que contratei dev.", photo: carolinaImg },
  { name: "Marcos Silva", role: "Vendedor, Imobiliária Plus", text: "Cada imóvel tem sua landing page e quiz de perfil. As visitas qualificadas aumentaram 280%.", photo: marcosImg },
  { name: "Gabriela Torres", role: "Nutricionista", text: "Criei um quiz de avaliação nutricional que gera leads todos os dias. É como ter um vendedor 24h.", photo: gabrielaImg },
  { name: "Felipe Castro", role: "CTO, TechFlow", text: "A API e o domínio próprio deram profissionalismo total ao nosso produto. SSL automático é diferencial.", photo: felipeImg },
  { name: "Isabella Moreira", role: "Social Media Manager", text: "Eu criei formulários bonitos estilo Typeform em minutos. Os clientes adoram preencher.", photo: isabellaImg },
  { name: "Rodrigo Peixoto", role: "CEO, Agência Impulso", text: "Migrei 12 clientes pra cá. Todos economizaram em ferramentas e viram resultado imediato.", photo: rodrigoImg },
  { name: "Amanda Dias", role: "Psicóloga Clínica", text: "O agendamento online reduziu 90% das faltas. Os pacientes recebem confirmação automática.", photo: amandaImg },
  { name: "Gustavo Henrique", role: "E-commerce, GH Store", text: "O checkout personalizado com countdown e notificações aumentou minha taxa de conversão em 65%.", photo: gustavoImg },
];

const TestimonialsSection = () => {
  const row1 = testimonials.slice(0, 10);
  const row2 = testimonials.slice(10, 20);

  const renderCard = (t: typeof testimonials[0], i: number) => (
    <div key={i} className="flex-shrink-0 w-[340px] surface-card rounded-xl p-5 mx-2">
      <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">"{t.text}"</p>
      <div className="flex items-center gap-3">
        <img
          src={t.photo}
          alt={t.name}
          className="h-10 w-10 rounded-full object-cover border-2 border-primary/20"
          loading="lazy"
        />
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
