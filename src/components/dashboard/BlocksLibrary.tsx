// Biblioteca de blocos profissionais para GrapesJS
export const PROFESSIONAL_BLOCKS = {
  // ===== HERO SECTIONS =====
  hero_minimal: {
    label: "Hero Minimalista",
    category: "Hero",
    content: `
      <section class="min-h-screen bg-white flex items-center justify-center px-4">
        <div class="max-w-4xl mx-auto text-center">
          <h1 class="text-6xl md:text-7xl font-bold text-slate-900 mb-6">Transforme seu negócio</h1>
          <p class="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">Solução completa para gerenciar, vender e crescer</p>
          <button class="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">Começar Grátis</button>
        </div>
      </section>
    `,
  },

  hero_gradient: {
    label: "Hero com Gradiente",
    category: "Hero",
    content: `
      <section class="min-h-screen bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 flex items-center justify-center px-4">
        <div class="max-w-4xl mx-auto text-center">
          <h1 class="text-6xl md:text-7xl font-bold text-white mb-6">Crescimento Exponencial</h1>
          <p class="text-xl text-white/90 mb-8 max-w-2xl mx-auto">Ferramentas poderosas para escalar suas vendas</p>
          <div class="flex gap-4 justify-center">
            <button class="px-8 py-4 bg-white text-purple-600 font-bold rounded-lg hover:bg-slate-100 transition">Começar Agora</button>
            <button class="px-8 py-4 border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition">Ver Demo</button>
          </div>
        </div>
      </section>
    `,
  },

  hero_video: {
    label: "Hero com Vídeo",
    category: "Hero",
    content: `
      <section class="min-h-screen bg-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
        <div class="absolute inset-0 opacity-30">
          <video autoplay muted loop class="w-full h-full object-cover">
            <source src="https://example.com/video.mp4" type="video/mp4">
          </video>
        </div>
        <div class="max-w-4xl mx-auto text-center relative z-10">
          <h1 class="text-6xl md:text-7xl font-bold text-white mb-6">Vídeo de Fundo</h1>
          <p class="text-xl text-slate-300 mb-8">Crie impacto visual imediato</p>
          <button class="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Explorar</button>
        </div>
      </section>
    `,
  },

  // ===== FEATURES SECTIONS =====
  features_grid_3: {
    label: "Features Grid 3 Colunas",
    category: "Features",
    content: `
      <section class="py-20 px-4 bg-white">
        <div class="max-w-6xl mx-auto">
          <div class="text-center mb-16">
            <h2 class="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Recursos Principais</h2>
            <p class="text-xl text-slate-600">Tudo que você precisa em um único lugar</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="p-8 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-400 transition">
              <div class="text-5xl mb-4">⚡</div>
              <h3 class="text-2xl font-bold text-slate-900 mb-3">Rápido</h3>
              <p class="text-slate-600">Carregamento ultrarrápido e otimizado para performance</p>
            </div>
            <div class="p-8 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-400 transition">
              <div class="text-5xl mb-4">🔒</div>
              <h3 class="text-2xl font-bold text-slate-900 mb-3">Seguro</h3>
              <p class="text-slate-600">Proteção de dados com criptografia de ponta a ponta</p>
            </div>
            <div class="p-8 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-400 transition">
              <div class="text-5xl mb-4">🚀</div>
              <h3 class="text-2xl font-bold text-slate-900 mb-3">Escalável</h3>
              <p class="text-slate-600">Cresce com seu negócio sem limitações</p>
            </div>
          </div>
        </div>
      </section>
    `,
  },

  features_bento: {
    label: "Features Bento Box",
    category: "Features",
    content: `
      <section class="py-20 px-4 bg-slate-50">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-4xl font-bold text-slate-900 mb-16 text-center">Funcionalidades</h2>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="md:col-span-2 p-8 bg-white rounded-xl border border-slate-200">
              <div class="text-4xl mb-4">📊</div>
              <h3 class="text-2xl font-bold mb-2">Analytics Avançado</h3>
              <p class="text-slate-600">Dashboards em tempo real com insights profundos</p>
            </div>
            <div class="p-8 bg-white rounded-xl border border-slate-200">
              <div class="text-4xl mb-4">🤖</div>
              <h3 class="text-xl font-bold mb-2">IA Integrada</h3>
              <p class="text-slate-600 text-sm">Automação inteligente</p>
            </div>
            <div class="p-8 bg-white rounded-xl border border-slate-200">
              <div class="text-4xl mb-4">📱</div>
              <h3 class="text-xl font-bold mb-2">Mobile First</h3>
              <p class="text-slate-600 text-sm">Perfeito em qualquer tela</p>
            </div>
            <div class="md:col-span-2 p-8 bg-white rounded-xl border border-slate-200">
              <div class="text-4xl mb-4">🔗</div>
              <h3 class="text-2xl font-bold mb-2">Integrações</h3>
              <p class="text-slate-600">Conecte com suas ferramentas favoritas</p>
            </div>
          </div>
        </div>
      </section>
    `,
  },

  // ===== PRICING SECTIONS =====
  pricing_simple: {
    label: "Pricing Simples",
    category: "Pricing",
    content: `
      <section class="py-20 px-4 bg-white">
        <div class="max-w-6xl mx-auto">
          <div class="text-center mb-16">
            <h2 class="text-4xl font-bold text-slate-900 mb-4">Planos e Preços</h2>
            <p class="text-xl text-slate-600">Escolha o plano perfeito para você</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="p-8 bg-slate-50 rounded-xl border border-slate-200">
              <h3 class="text-2xl font-bold text-slate-900 mb-2">Básico</h3>
              <p class="text-slate-600 mb-6">Para começar</p>
              <div class="text-4xl font-bold text-slate-900 mb-6">R$ 99<span class="text-lg text-slate-600">/mês</span></div>
              <ul class="space-y-3 mb-8">
                <li class="flex items-center"><span class="text-green-600 mr-3">✓</span> 5 Landing Pages</li>
                <li class="flex items-center"><span class="text-green-600 mr-3">✓</span> Suporte por email</li>
                <li class="flex items-center"><span class="text-slate-400 mr-3">✗</span> IA Integrada</li>
              </ul>
              <button class="w-full py-3 bg-slate-200 text-slate-900 font-bold rounded-lg hover:bg-slate-300">Escolher</button>
            </div>
            <div class="p-8 bg-blue-600 rounded-xl border-2 border-blue-600 relative">
              <div class="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold">Mais Popular</div>
              <h3 class="text-2xl font-bold text-white mb-2">Pro</h3>
              <p class="text-blue-100 mb-6">Para crescer</p>
              <div class="text-4xl font-bold text-white mb-6">R$ 299<span class="text-lg text-blue-100">/mês</span></div>
              <ul class="space-y-3 mb-8 text-white">
                <li class="flex items-center"><span class="text-blue-200 mr-3">✓</span> Ilimitadas</li>
                <li class="flex items-center"><span class="text-blue-200 mr-3">✓</span> Suporte prioritário</li>
                <li class="flex items-center"><span class="text-blue-200 mr-3">✓</span> IA Integrada</li>
              </ul>
              <button class="w-full py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-slate-100">Escolher</button>
            </div>
            <div class="p-8 bg-slate-50 rounded-xl border border-slate-200">
              <h3 class="text-2xl font-bold text-slate-900 mb-2">Enterprise</h3>
              <p class="text-slate-600 mb-6">Para empresas</p>
              <div class="text-4xl font-bold text-slate-900 mb-6">Sob<span class="text-lg">Consulta</span></div>
              <ul class="space-y-3 mb-8">
                <li class="flex items-center"><span class="text-green-600 mr-3">✓</span> Tudo do Pro</li>
                <li class="flex items-center"><span class="text-green-600 mr-3">✓</span> API Completa</li>
                <li class="flex items-center"><span class="text-green-600 mr-3">✓</span> Suporte 24/7</li>
              </ul>
              <button class="w-full py-3 bg-slate-200 text-slate-900 font-bold rounded-lg hover:bg-slate-300">Contato</button>
            </div>
          </div>
        </div>
      </section>
    `,
  },

  // ===== TESTIMONIALS =====
  testimonials_carousel: {
    label: "Depoimentos Carrossel",
    category: "Social Proof",
    content: `
      <section class="py-20 px-4 bg-slate-50">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-4xl font-bold text-slate-900 mb-16 text-center">O que nossos clientes dizem</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="p-8 bg-white rounded-xl border border-slate-200">
              <div class="flex gap-1 mb-4">⭐⭐⭐⭐⭐</div>
              <p class="text-slate-600 mb-6">"Melhor plataforma que já usei. Aumentei minha conversão em 300%!"</p>
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full"></div>
                <div>
                  <p class="font-bold text-slate-900">João Silva</p>
                  <p class="text-sm text-slate-600">CEO, Tech Startup</p>
                </div>
              </div>
            </div>
            <div class="p-8 bg-white rounded-xl border border-slate-200">
              <div class="flex gap-1 mb-4">⭐⭐⭐⭐⭐</div>
              <p class="text-slate-600 mb-6">"Suporte excepcional e ferramentas incríveis. Recomendo!"</p>
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-gradient-to-br from-pink-400 to-red-600 rounded-full"></div>
                <div>
                  <p class="font-bold text-slate-900">Maria Santos</p>
                  <p class="text-sm text-slate-600">Empreendedora</p>
                </div>
              </div>
            </div>
            <div class="p-8 bg-white rounded-xl border border-slate-200">
              <div class="flex gap-1 mb-4">⭐⭐⭐⭐⭐</div>
              <p class="text-slate-600 mb-6">"ROI impressionante. Meu melhor investimento em marketing."</p>
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-600 rounded-full"></div>
                <div>
                  <p class="font-bold text-slate-900">Carlos Costa</p>
                  <p class="text-sm text-slate-600">Agência Digital</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `,
  },

  // ===== CTA SECTIONS =====
  cta_simple: {
    label: "CTA Simples",
    category: "CTA",
    content: `
      <section class="py-20 px-4 bg-blue-600">
        <div class="max-w-2xl mx-auto text-center">
          <h2 class="text-4xl font-bold text-white mb-6">Pronto para começar?</h2>
          <p class="text-xl text-blue-100 mb-8">Crie sua conta gratuitamente e veja os resultados em dias</p>
          <button class="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-slate-100 transition text-lg">Começar Agora</button>
        </div>
      </section>
    `,
  },

  cta_two_buttons: {
    label: "CTA Dois Botões",
    category: "CTA",
    content: `
      <section class="py-20 px-4 bg-gradient-to-r from-slate-900 to-slate-800">
        <div class="max-w-2xl mx-auto text-center">
          <h2 class="text-4xl font-bold text-white mb-6">Transforme seu negócio hoje</h2>
          <p class="text-xl text-slate-300 mb-8">Junte-se a milhares de empresas que já crescem com nossa plataforma</p>
          <div class="flex gap-4 justify-center">
            <button class="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">Começar Grátis</button>
            <button class="px-8 py-4 border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition">Ver Demo</button>
          </div>
        </div>
      </section>
    `,
  },

  // ===== FOOTER =====
  footer_simple: {
    label: "Footer Simples",
    category: "Footer",
    content: `
      <footer class="bg-slate-900 text-white py-12 px-4">
        <div class="max-w-6xl mx-auto">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 class="font-bold mb-4">Produto</h4>
              <ul class="space-y-2 text-slate-400">
                <li><a href="#" class="hover:text-white">Recursos</a></li>
                <li><a href="#" class="hover:text-white">Preços</a></li>
                <li><a href="#" class="hover:text-white">Segurança</a></li>
              </ul>
            </div>
            <div>
              <h4 class="font-bold mb-4">Empresa</h4>
              <ul class="space-y-2 text-slate-400">
                <li><a href="#" class="hover:text-white">Sobre</a></li>
                <li><a href="#" class="hover:text-white">Blog</a></li>
                <li><a href="#" class="hover:text-white">Carreiras</a></li>
              </ul>
            </div>
            <div>
              <h4 class="font-bold mb-4">Recursos</h4>
              <ul class="space-y-2 text-slate-400">
                <li><a href="#" class="hover:text-white">Documentação</a></li>
                <li><a href="#" class="hover:text-white">API</a></li>
                <li><a href="#" class="hover:text-white">Comunidade</a></li>
              </ul>
            </div>
            <div>
              <h4 class="font-bold mb-4">Legal</h4>
              <ul class="space-y-2 text-slate-400">
                <li><a href="#" class="hover:text-white">Privacidade</a></li>
                <li><a href="#" class="hover:text-white">Termos</a></li>
                <li><a href="#" class="hover:text-white">Contato</a></li>
              </ul>
            </div>
          </div>
          <div class="border-t border-slate-700 pt-8 text-center text-slate-400">
            <p>&copy; 2026 Sua Empresa. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    `,
  },
};

export const BLOCK_CATEGORIES = [
  { id: "hero", label: "Hero Sections", icon: "🎯" },
  { id: "features", label: "Features", icon: "⚡" },
  { id: "pricing", label: "Pricing", icon: "💰" },
  { id: "social-proof", label: "Social Proof", icon: "⭐" },
  { id: "cta", label: "CTA", icon: "🚀" },
  { id: "footer", label: "Footer", icon: "📍" },
];
