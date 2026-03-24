// Super Biblioteca de 20+ Templates HTML para Todos os Segmentos
export const HTML_TEMPLATES_LIBRARY = {
  // ===== AGÊNCIAS DE MARKETING =====
  agency_modern: {
    name: "Agência Digital Moderna",
    category: "Agência",
    description: "Portfólio moderno para agência de marketing digital",
    thumbnail: "🎨",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agência Digital - Transformando Ideias em Resultados</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body class="bg-white font-inter">
  <!-- Hero -->
  <section class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-20">
    <div class="max-w-5xl mx-auto text-center">
      <h1 class="text-6xl md:text-7xl font-bold text-white mb-6 font-jakarta">Transformamos Ideias em Resultados</h1>
      <p class="text-xl md:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto">Estratégia, criatividade e tecnologia para impulsionar seu negócio</p>
      <div class="flex gap-4 justify-center flex-wrap">
        <button class="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">Começar Projeto</button>
        <button class="px-8 py-4 border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition">Ver Portfólio</button>
      </div>
    </div>
  </section>

  <!-- Serviços -->
  <section class="py-20 px-4 bg-white">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-4xl font-bold text-center mb-16 text-slate-900">Nossos Serviços</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="p-8 bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-blue-400 transition">
          <div class="text-5xl mb-4">📱</div>
          <h3 class="text-2xl font-bold text-slate-900 mb-3">Design Digital</h3>
          <p class="text-slate-600">Criação de interfaces modernas e intuitivas</p>
        </div>
        <div class="p-8 bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-blue-400 transition">
          <div class="text-5xl mb-4">📊</div>
          <h3 class="text-2xl font-bold text-slate-900 mb-3">Marketing Digital</h3>
          <p class="text-slate-600">Estratégias de crescimento e conversão</p>
        </div>
        <div class="p-8 bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-blue-400 transition">
          <div class="text-5xl mb-4">⚙️</div>
          <h3 class="text-2xl font-bold text-slate-900 mb-3">Desenvolvimento</h3>
          <p class="text-slate-600">Soluções web e mobile de alto desempenho</p>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-20 px-4 bg-blue-600">
    <div class="max-w-2xl mx-auto text-center">
      <h2 class="text-4xl font-bold text-white mb-6">Pronto para transformar seu negócio?</h2>
      <button class="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-slate-100 transition text-lg">Agende uma Consulta</button>
    </div>
  </section>
</body>
</html>`,
  },

  // ===== SAAS =====
  saas_startup: {
    name: "SaaS Startup Moderna",
    category: "SaaS",
    description: "Landing page para aplicação SaaS com pricing",
    thumbnail: "🚀",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plataforma SaaS - Automação Inteligente</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body class="bg-white font-inter">
  <!-- Hero -->
  <section class="min-h-screen bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 flex items-center justify-center px-4">
    <div class="max-w-4xl mx-auto text-center">
      <h1 class="text-6xl md:text-7xl font-bold text-white mb-6">Automação Inteligente para seu Negócio</h1>
      <p class="text-xl text-white/90 mb-8 max-w-2xl mx-auto">Aumente produtividade em 10x com nossa plataforma</p>
      <button class="px-8 py-4 bg-white text-purple-600 font-bold rounded-lg hover:bg-slate-100 transition text-lg">Começar Grátis</button>
    </div>
  </section>

  <!-- Features -->
  <section class="py-20 px-4 bg-slate-50">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-4xl font-bold text-center mb-16">Funcionalidades Poderosas</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="p-8 bg-white rounded-lg border border-slate-200">
          <h3 class="text-2xl font-bold text-slate-900 mb-3">⚡ Velocidade</h3>
          <p class="text-slate-600">Processamento em tempo real</p>
        </div>
        <div class="p-8 bg-white rounded-lg border border-slate-200">
          <h3 class="text-2xl font-bold text-slate-900 mb-3">🔒 Segurança</h3>
          <p class="text-slate-600">Criptografia de ponta a ponta</p>
        </div>
        <div class="p-8 bg-white rounded-lg border border-slate-200">
          <h3 class="text-2xl font-bold text-slate-900 mb-3">📊 Analytics</h3>
          <p class="text-slate-600">Dashboards avançados</p>
        </div>
        <div class="p-8 bg-white rounded-lg border border-slate-200">
          <h3 class="text-2xl font-bold text-slate-900 mb-3">🔗 Integrações</h3>
          <p class="text-slate-600">Conecte suas ferramentas</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Pricing -->
  <section class="py-20 px-4 bg-white">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-4xl font-bold text-center mb-16">Planos Simples e Transparentes</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="p-8 bg-slate-50 rounded-lg border border-slate-200">
          <h3 class="text-2xl font-bold mb-2">Starter</h3>
          <p class="text-slate-600 mb-6">Para começar</p>
          <div class="text-4xl font-bold mb-6">R$ 99<span class="text-lg">/mês</span></div>
          <button class="w-full py-2 bg-slate-200 text-slate-900 font-bold rounded">Escolher</button>
        </div>
        <div class="p-8 bg-purple-600 rounded-lg border-2 border-purple-600 relative">
          <div class="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold">Mais Popular</div>
          <h3 class="text-2xl font-bold text-white mb-2">Pro</h3>
          <p class="text-purple-100 mb-6">Para crescer</p>
          <div class="text-4xl font-bold text-white mb-6">R$ 299<span class="text-lg">/mês</span></div>
          <button class="w-full py-2 bg-white text-purple-600 font-bold rounded">Escolher</button>
        </div>
        <div class="p-8 bg-slate-50 rounded-lg border border-slate-200">
          <h3 class="text-2xl font-bold mb-2">Enterprise</h3>
          <p class="text-slate-600 mb-6">Para empresas</p>
          <div class="text-4xl font-bold mb-6">Sob Consulta</div>
          <button class="w-full py-2 bg-slate-200 text-slate-900 font-bold rounded">Contato</button>
        </div>
      </div>
    </div>
  </section>
</body>
</html>`,
  },

  // ===== E-COMMERCE =====
  ecommerce_fashion: {
    name: "E-commerce Moda",
    category: "E-commerce",
    description: "Loja online para moda e vestuário",
    thumbnail: "👗",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loja de Moda - Estilo e Qualidade</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="bg-white font-inter">
  <!-- Hero -->
  <section class="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 flex items-center justify-center px-4">
    <div class="max-w-5xl mx-auto text-center">
      <h1 class="text-6xl md:text-7xl font-bold text-rose-900 mb-6" style="font-family: 'Playfair Display'">Coleção Exclusiva 2026</h1>
      <p class="text-xl text-rose-700 mb-8">Moda que expressa sua personalidade</p>
      <button class="px-8 py-4 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition">Explorar Coleção</button>
    </div>
  </section>

  <!-- Produtos -->
  <section class="py-20 px-4 bg-white">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-4xl font-bold text-center mb-16 text-slate-900">Produtos em Destaque</h2>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition">
          <div class="h-64 bg-gradient-to-br from-gray-300 to-gray-400"></div>
          <div class="p-4">
            <h3 class="font-bold text-slate-900 mb-2">Vestido Elegante</h3>
            <p class="text-rose-600 font-bold">R$ 299,90</p>
          </div>
        </div>
        <div class="bg-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition">
          <div class="h-64 bg-gradient-to-br from-gray-300 to-gray-400"></div>
          <div class="p-4">
            <h3 class="font-bold text-slate-900 mb-2">Blusa Moderna</h3>
            <p class="text-rose-600 font-bold">R$ 149,90</p>
          </div>
        </div>
        <div class="bg-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition">
          <div class="h-64 bg-gradient-to-br from-gray-300 to-gray-400"></div>
          <div class="p-4">
            <h3 class="font-bold text-slate-900 mb-2">Calça Premium</h3>
            <p class="text-rose-600 font-bold">R$ 199,90</p>
          </div>
        </div>
        <div class="bg-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition">
          <div class="h-64 bg-gradient-to-br from-gray-300 to-gray-400"></div>
          <div class="p-4">
            <h3 class="font-bold text-slate-900 mb-2">Jaqueta Sofisticada</h3>
            <p class="text-rose-600 font-bold">R$ 349,90</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-20 px-4 bg-rose-600">
    <div class="max-w-2xl mx-auto text-center">
      <h2 class="text-4xl font-bold text-white mb-6">Desconto de 30% na Primeira Compra</h2>
      <button class="px-8 py-4 bg-white text-rose-600 font-bold rounded-lg hover:bg-slate-100 transition">Comprar Agora</button>
    </div>
  </section>
</body>
</html>`,
  },

  // ===== CLÍNICA/SAÚDE =====
  clinic_health: {
    name: "Clínica de Saúde",
    category: "Saúde",
    description: "Página para clínica médica ou consultório",
    thumbnail: "⚕️",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clínica Premium - Saúde e Bem-estar</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body class="bg-white font-inter">
  <!-- Hero -->
  <section class="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center px-4">
    <div class="max-w-4xl mx-auto text-center">
      <h1 class="text-6xl md:text-7xl font-bold text-emerald-900 mb-6">Sua Saúde é Nossa Prioridade</h1>
      <p class="text-xl text-emerald-700 mb-8">Atendimento de excelência com profissionais qualificados</p>
      <button class="px-8 py-4 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition">Agendar Consulta</button>
    </div>
  </section>

  <!-- Especialidades -->
  <section class="py-20 px-4 bg-white">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-4xl font-bold text-center mb-16">Nossas Especialidades</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="p-8 bg-emerald-50 rounded-xl border-2 border-emerald-200">
          <h3 class="text-2xl font-bold text-emerald-900 mb-3">Cardiologia</h3>
          <p class="text-emerald-700">Diagnóstico e tratamento do coração</p>
        </div>
        <div class="p-8 bg-emerald-50 rounded-xl border-2 border-emerald-200">
          <h3 class="text-2xl font-bold text-emerald-900 mb-3">Dermatologia</h3>
          <p class="text-emerald-700">Cuidados com a pele e estética</p>
        </div>
        <div class="p-8 bg-emerald-50 rounded-xl border-2 border-emerald-200">
          <h3 class="text-2xl font-bold text-emerald-900 mb-3">Ortopedia</h3>
          <p class="text-emerald-700">Tratamento de ossos e articulações</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Sobre -->
  <section class="py-20 px-4 bg-slate-50">
    <div class="max-w-4xl mx-auto">
      <h2 class="text-4xl font-bold text-center mb-8">Por que Escolher Nossa Clínica?</h2>
      <div class="space-y-4">
        <div class="flex gap-4">
          <div class="text-3xl">✓</div>
          <div>
            <h3 class="font-bold text-slate-900">Profissionais Certificados</h3>
            <p class="text-slate-600">Equipe com experiência de 20+ anos</p>
          </div>
        </div>
        <div class="flex gap-4">
          <div class="text-3xl">✓</div>
          <div>
            <h3 class="font-bold text-slate-900">Tecnologia de Ponta</h3>
            <p class="text-slate-600">Equipamentos modernos e seguros</p>
          </div>
        </div>
        <div class="flex gap-4">
          <div class="text-3xl">✓</div>
          <div>
            <h3 class="font-bold text-slate-900">Atendimento Humanizado</h3>
            <p class="text-slate-600">Cuidado com cada detalhe</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</body>
</html>`,
  },

  // ===== REAL ESTATE =====
  real_estate: {
    name: "Imobiliária Premium",
    category: "Real Estate",
    description: "Plataforma de vendas de imóveis",
    thumbnail: "🏠",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Imobiliária Premium - Seu Lar Perfeito</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body class="bg-white font-inter">
  <!-- Hero -->
  <section class="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center px-4">
    <div class="max-w-4xl mx-auto text-center">
      <h1 class="text-6xl md:text-7xl font-bold text-amber-900 mb-6">Encontre Seu Lar Perfeito</h1>
      <p class="text-xl text-amber-700 mb-8">Imóveis de qualidade em localizações estratégicas</p>
      <div class="flex gap-4 justify-center">
        <button class="px-8 py-4 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition">Ver Imóveis</button>
        <button class="px-8 py-4 border-2 border-amber-600 text-amber-600 font-bold rounded-lg hover:bg-amber-50 transition">Agendar Visita</button>
      </div>
    </div>
  </section>

  <!-- Imóveis em Destaque -->
  <section class="py-20 px-4 bg-white">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-4xl font-bold text-center mb-16">Imóveis em Destaque</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition">
          <div class="h-64 bg-gradient-to-br from-gray-300 to-gray-400"></div>
          <div class="p-6">
            <h3 class="text-xl font-bold text-slate-900 mb-2">Apartamento Luxo - Zona Sul</h3>
            <p class="text-amber-600 font-bold text-2xl mb-4">R$ 850.000</p>
            <p class="text-slate-600 mb-4">3 quartos • 2 banheiros • 120m²</p>
            <button class="w-full py-2 bg-amber-600 text-white font-bold rounded hover:bg-amber-700">Mais Detalhes</button>
          </div>
        </div>
        <div class="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition">
          <div class="h-64 bg-gradient-to-br from-gray-300 to-gray-400"></div>
          <div class="p-6">
            <h3 class="text-xl font-bold text-slate-900 mb-2">Casa Moderna - Condomínio</h3>
            <p class="text-amber-600 font-bold text-2xl mb-4">R$ 1.200.000</p>
            <p class="text-slate-600 mb-4">4 quartos • 3 banheiros • 250m²</p>
            <button class="w-full py-2 bg-amber-600 text-white font-bold rounded hover:bg-amber-700">Mais Detalhes</button>
          </div>
        </div>
        <div class="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition">
          <div class="h-64 bg-gradient-to-br from-gray-300 to-gray-400"></div>
          <div class="p-6">
            <h3 class="text-xl font-bold text-slate-900 mb-2">Cobertura Duplex - Centro</h3>
            <p class="text-amber-600 font-bold text-2xl mb-4">R$ 950.000</p>
            <p class="text-slate-600 mb-4">3 quartos • 2 banheiros • 180m²</p>
            <button class="w-full py-2 bg-amber-600 text-white font-bold rounded hover:bg-amber-700">Mais Detalhes</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</body>
</html>`,
  },

  // ===== RESTAURANTE =====
  restaurant: {
    name: "Restaurante Gourmet",
    category: "Restaurante",
    description: "Menu online e reservas para restaurante",
    thumbnail: "🍽️",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restaurante Gourmet - Gastronomia Premium</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="bg-white font-inter">
  <!-- Hero -->
  <section class="min-h-screen bg-gradient-to-br from-red-900 to-red-800 flex items-center justify-center px-4">
    <div class="max-w-4xl mx-auto text-center">
      <h1 class="text-6xl md:text-7xl font-bold text-white mb-6" style="font-family: 'Playfair Display'">Gastronomia Premium</h1>
      <p class="text-xl text-red-100 mb-8">Experiência culinária inesquecível</p>
      <button class="px-8 py-4 bg-yellow-500 text-red-900 font-bold rounded-lg hover:bg-yellow-400 transition">Fazer Reserva</button>
    </div>
  </section>

  <!-- Menu -->
  <section class="py-20 px-4 bg-white">
    <div class="max-w-4xl mx-auto">
      <h2 class="text-4xl font-bold text-center mb-16" style="font-family: 'Playfair Display'">Nosso Menu</h2>
      <div class="space-y-8">
        <div class="border-b-2 border-red-200 pb-6">
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-2xl font-bold text-slate-900">Entrada Especial</h3>
            <p class="text-red-600 font-bold">R$ 45,00</p>
          </div>
          <p class="text-slate-600">Descrição deliciosa do prato</p>
        </div>
        <div class="border-b-2 border-red-200 pb-6">
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-2xl font-bold text-slate-900">Prato Principal</h3>
            <p class="text-red-600 font-bold">R$ 85,00</p>
          </div>
          <p class="text-slate-600">Descrição deliciosa do prato</p>
        </div>
        <div class="border-b-2 border-red-200 pb-6">
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-2xl font-bold text-slate-900">Sobremesa</h3>
            <p class="text-red-600 font-bold">R$ 35,00</p>
          </div>
          <p class="text-slate-600">Descrição deliciosa do prato</p>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-20 px-4 bg-red-900">
    <div class="max-w-2xl mx-auto text-center">
      <h2 class="text-4xl font-bold text-white mb-6">Venha Nos Visitar</h2>
      <p class="text-red-100 mb-8">Rua Exemplo, 123 • Tel: (11) 98765-4321</p>
      <button class="px-8 py-4 bg-yellow-500 text-red-900 font-bold rounded-lg hover:bg-yellow-400 transition">Fazer Reserva Agora</button>
    </div>
  </section>
</body>
</html>`,
  },

  // ===== EDUCAÇÃO =====
  education_course: {
    name: "Plataforma de Cursos",
    category: "Educação",
    description: "Venda de cursos online e treinamentos",
    thumbnail: "📚",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plataforma de Cursos - Aprenda do Seu Jeito</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body class="bg-white font-inter">
  <!-- Hero -->
  <section class="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center px-4">
    <div class="max-w-4xl mx-auto text-center">
      <h1 class="text-6xl md:text-7xl font-bold text-white mb-6">Aprenda Novas Habilidades</h1>
      <p class="text-xl text-white/90 mb-8">Cursos online de qualidade com certificação</p>
      <button class="px-8 py-4 bg-white text-purple-600 font-bold rounded-lg hover:bg-slate-100 transition">Explorar Cursos</button>
    </div>
  </section>

  <!-- Cursos -->
  <section class="py-20 px-4 bg-white">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-4xl font-bold text-center mb-16">Cursos em Destaque</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition">
          <div class="h-48 bg-gradient-to-br from-indigo-400 to-purple-500"></div>
          <div class="p-6">
            <h3 class="text-xl font-bold text-slate-900 mb-2">Python Avançado</h3>
            <p class="text-slate-600 mb-4">40 horas • 150 alunos</p>
            <p class="text-purple-600 font-bold text-2xl mb-4">R$ 197</p>
            <button class="w-full py-2 bg-purple-600 text-white font-bold rounded hover:bg-purple-700">Inscrever</button>
          </div>
        </div>
        <div class="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition">
          <div class="h-48 bg-gradient-to-br from-pink-400 to-red-500"></div>
          <div class="p-6">
            <h3 class="text-xl font-bold text-slate-900 mb-2">Design UI/UX</h3>
            <p class="text-slate-600 mb-4">35 horas • 200 alunos</p>
            <p class="text-purple-600 font-bold text-2xl mb-4">R$ 247</p>
            <button class="w-full py-2 bg-purple-600 text-white font-bold rounded hover:bg-purple-700">Inscrever</button>
          </div>
        </div>
        <div class="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition">
          <div class="h-48 bg-gradient-to-br from-blue-400 to-cyan-500"></div>
          <div class="p-6">
            <h3 class="text-xl font-bold text-slate-900 mb-2">Marketing Digital</h3>
            <p class="text-slate-600 mb-4">30 horas • 180 alunos</p>
            <p class="text-purple-600 font-bold text-2xl mb-4">R$ 197</p>
            <button class="w-full py-2 bg-purple-600 text-white font-bold rounded hover:bg-purple-700">Inscrever</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</body>
</html>`,
  },

  // ===== ADVOCACIA =====
  law_firm: {
    name: "Escritório de Advocacia",
    category: "Advocacia",
    description: "Página profissional para escritório jurídico",
    thumbnail: "⚖️",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Escritório de Advocacia - Soluções Jurídicas</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body class="bg-white font-inter">
  <!-- Hero -->
  <section class="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
    <div class="max-w-4xl mx-auto text-center">
      <h1 class="text-6xl md:text-7xl font-bold text-white mb-6">Soluções Jurídicas Confiáveis</h1>
      <p class="text-xl text-slate-300 mb-8">Experiência de 25 anos em direito empresarial e civil</p>
      <button class="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">Agendar Consulta</button>
    </div>
  </section>

  <!-- Áreas de Atuação -->
  <section class="py-20 px-4 bg-white">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-4xl font-bold text-center mb-16">Áreas de Atuação</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="p-8 bg-slate-50 rounded-xl border-2 border-slate-200">
          <h3 class="text-2xl font-bold text-slate-900 mb-3">Direito Empresarial</h3>
          <p class="text-slate-600">Consultoria para empresas e startups</p>
        </div>
        <div class="p-8 bg-slate-50 rounded-xl border-2 border-slate-200">
          <h3 class="text-2xl font-bold text-slate-900 mb-3">Direito Civil</h3>
          <p class="text-slate-600">Contratos e questões pessoais</p>
        </div>
        <div class="p-8 bg-slate-50 rounded-xl border-2 border-slate-200">
          <h3 class="text-2xl font-bold text-slate-900 mb-3">Direito Trabalhista</h3>
          <p class="text-slate-600">Defesa de direitos trabalhistas</p>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-20 px-4 bg-blue-600">
    <div class="max-w-2xl mx-auto text-center">
      <h2 class="text-4xl font-bold text-white mb-6">Precisa de Orientação Jurídica?</h2>
      <button class="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-slate-100 transition">Fale Conosco</button>
    </div>
  </section>
</body>
</html>`,
  },

  // ===== FITNESS =====
  fitness_gym: {
    name: "Academia de Fitness",
    category: "Fitness",
    description: "Página para academia ou personal trainer",
    thumbnail: "💪",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Academia Fitness - Transforme Seu Corpo</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body class="bg-white font-inter">
  <!-- Hero -->
  <section class="min-h-screen bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center px-4">
    <div class="max-w-4xl mx-auto text-center">
      <h1 class="text-6xl md:text-7xl font-bold text-white mb-6">Transforme Seu Corpo</h1>
      <p class="text-xl text-white/90 mb-8">Treinamentos personalizados e resultados garantidos</p>
      <button class="px-8 py-4 bg-white text-orange-600 font-bold rounded-lg hover:bg-slate-100 transition">Começar Agora</button>
    </div>
  </section>

  <!-- Planos -->
  <section class="py-20 px-4 bg-slate-50">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-4xl font-bold text-center mb-16">Nossos Planos</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="p-8 bg-white rounded-lg border-2 border-slate-200">
          <h3 class="text-2xl font-bold text-slate-900 mb-2">Básico</h3>
          <p class="text-slate-600 mb-6">Acesso à academia</p>
          <div class="text-4xl font-bold text-orange-600 mb-6">R$ 99<span class="text-lg">/mês</span></div>
          <button class="w-full py-2 bg-slate-200 text-slate-900 font-bold rounded">Escolher</button>
        </div>
        <div class="p-8 bg-orange-600 rounded-lg border-2 border-orange-600">
          <h3 class="text-2xl font-bold text-white mb-2">Premium</h3>
          <p class="text-orange-100 mb-6">Com personal trainer</p>
          <div class="text-4xl font-bold text-white mb-6">R$ 299<span class="text-lg">/mês</span></div>
          <button class="w-full py-2 bg-white text-orange-600 font-bold rounded">Escolher</button>
        </div>
        <div class="p-8 bg-white rounded-lg border-2 border-slate-200">
          <h3 class="text-2xl font-bold text-slate-900 mb-2">Elite</h3>
          <p class="text-slate-600 mb-6">Tudo incluído</p>
          <div class="text-4xl font-bold text-orange-600 mb-6">R$ 499<span class="text-lg">/mês</span></div>
          <button class="w-full py-2 bg-slate-200 text-slate-900 font-bold rounded">Escolher</button>
        </div>
      </div>
    </div>
  </section>
</body>
</html>`,
  },

  // ===== HOTEL =====
  hotel_luxury: {
    name: "Hotel Luxo",
    category: "Hospedagem",
    description: "Página para hotel ou resort",
    thumbnail: "🏨",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hotel Luxo - Hospedagem Premium</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="bg-white font-inter">
  <!-- Hero -->
  <section class="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center px-4">
    <div class="max-w-4xl mx-auto text-center">
      <h1 class="text-6xl md:text-7xl font-bold text-amber-900 mb-6" style="font-family: 'Playfair Display'">Luxo e Conforto</h1>
      <p class="text-xl text-amber-700 mb-8">Experiência de hospedagem incomparável</p>
      <button class="px-8 py-4 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition">Reservar Agora</button>
    </div>
  </section>

  <!-- Quartos -->
  <section class="py-20 px-4 bg-white">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-4xl font-bold text-center mb-16" style="font-family: 'Playfair Display'">Nossas Suítes</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition">
          <div class="h-64 bg-gradient-to-br from-yellow-300 to-amber-400"></div>
          <div class="p-6">
            <h3 class="text-2xl font-bold text-amber-900 mb-2" style="font-family: 'Playfair Display'">Suíte Standard</h3>
            <p class="text-slate-600 mb-4">Conforto e elegância</p>
            <p class="text-amber-600 font-bold text-2xl mb-4">R$ 450/noite</p>
            <button class="w-full py-2 bg-amber-600 text-white font-bold rounded hover:bg-amber-700">Reservar</button>
          </div>
        </div>
        <div class="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition">
          <div class="h-64 bg-gradient-to-br from-yellow-300 to-amber-400"></div>
          <div class="p-6">
            <h3 class="text-2xl font-bold text-amber-900 mb-2" style="font-family: 'Playfair Display'">Suíte Deluxe</h3>
            <p class="text-slate-600 mb-4">Luxo e sofisticação</p>
            <p class="text-amber-600 font-bold text-2xl mb-4">R$ 750/noite</p>
            <button class="w-full py-2 bg-amber-600 text-white font-bold rounded hover:bg-amber-700">Reservar</button>
          </div>
        </div>
        <div class="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition">
          <div class="h-64 bg-gradient-to-br from-yellow-300 to-amber-400"></div>
          <div class="p-6">
            <h3 class="text-2xl font-bold text-amber-900 mb-2" style="font-family: 'Playfair Display'">Suíte Presidencial</h3>
            <p class="text-slate-600 mb-4">Máximo luxo</p>
            <p class="text-amber-600 font-bold text-2xl mb-4">R$ 1.200/noite</p>
            <button class="w-full py-2 bg-amber-600 text-white font-bold rounded hover:bg-amber-700">Reservar</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</body>
</html>`,
  },

  // ===== PORTFOLIO CRIATIVO =====
  portfolio_creative: {
    name: "Portfolio Criativo",
    category: "Portfolio",
    description: "Portfólio para designers e criativos",
    thumbnail: "🎨",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio - Criatividade em Foco</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body class="bg-white font-inter">
  <!-- Hero -->
  <section class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
    <div class="max-w-4xl mx-auto text-center">
      <h1 class="text-6xl md:text-7xl font-bold text-white mb-6">Criatividade em Foco</h1>
      <p class="text-xl text-slate-300 mb-8">Projetos de design e desenvolvimento</p>
      <button class="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">Ver Projetos</button>
    </div>
  </section>

  <!-- Projetos -->
  <section class="py-20 px-4 bg-white">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-4xl font-bold text-center mb-16">Projetos em Destaque</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition">
          <div class="h-64 bg-gradient-to-br from-purple-400 to-pink-500"></div>
          <div class="p-6">
            <h3 class="text-2xl font-bold text-slate-900 mb-2">Projeto 1</h3>
            <p class="text-slate-600 mb-4">Descrição do projeto</p>
            <button class="text-blue-600 font-bold hover:text-blue-700">Ver Detalhes →</button>
          </div>
        </div>
        <div class="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition">
          <div class="h-64 bg-gradient-to-br from-blue-400 to-cyan-500"></div>
          <div class="p-6">
            <h3 class="text-2xl font-bold text-slate-900 mb-2">Projeto 2</h3>
            <p class="text-slate-600 mb-4">Descrição do projeto</p>
            <button class="text-blue-600 font-bold hover:text-blue-700">Ver Detalhes →</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-20 px-4 bg-slate-900">
    <div class="max-w-2xl mx-auto text-center">
      <h2 class="text-4xl font-bold text-white mb-6">Vamos Criar Algo Incrível?</h2>
      <button class="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">Entrar em Contato</button>
    </div>
  </section>
</body>
</html>`,
  },

  // ===== STARTUP TECH =====
  startup_tech: {
    name: "Startup Tech",
    category: "Startup",
    description: "Landing page para startup de tecnologia",
    thumbnail: "🚀",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Startup Tech - Inovação Digital</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body class="bg-white font-inter">
  <!-- Hero -->
  <section class="min-h-screen bg-gradient-to-br from-cyan-600 via-blue-600 to-purple-600 flex items-center justify-center px-4">
    <div class="max-w-4xl mx-auto text-center">
      <h1 class="text-6xl md:text-7xl font-bold text-white mb-6">Inovação Digital</h1>
      <p class="text-xl text-white/90 mb-8">Soluções tecnológicas para o futuro</p>
      <button class="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-slate-100 transition">Conheça Nossa Solução</button>
    </div>
  </section>

  <!-- Features -->
  <section class="py-20 px-4 bg-slate-50">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-4xl font-bold text-center mb-16">Por Que Nos Escolher</h2>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="p-6 bg-white rounded-lg border border-slate-200">
          <div class="text-4xl mb-3">🚀</div>
          <h3 class="font-bold text-slate-900 mb-2">Rápido</h3>
          <p class="text-slate-600 text-sm">Implementação ágil</p>
        </div>
        <div class="p-6 bg-white rounded-lg border border-slate-200">
          <div class="text-4xl mb-3">🔒</div>
          <h3 class="font-bold text-slate-900 mb-2">Seguro</h3>
          <p class="text-slate-600 text-sm">Proteção total</p>
        </div>
        <div class="p-6 bg-white rounded-lg border border-slate-200">
          <div class="text-4xl mb-3">📈</div>
          <h3 class="font-bold text-slate-900 mb-2">Escalável</h3>
          <p class="text-slate-600 text-sm">Cresce com você</p>
        </div>
        <div class="p-6 bg-white rounded-lg border border-slate-200">
          <div class="text-4xl mb-3">💬</div>
          <h3 class="font-bold text-slate-900 mb-2">Suporte</h3>
          <p class="text-slate-600 text-sm">24/7 disponível</p>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-20 px-4 bg-blue-600">
    <div class="max-w-2xl mx-auto text-center">
      <h2 class="text-4xl font-bold text-white mb-6">Comece Sua Jornada Digital</h2>
      <button class="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-slate-100 transition">Solicitar Demo</button>
    </div>
  </section>
</body>
</html>`,
  },
};

export const TEMPLATE_CATEGORIES = [
  { id: "all", label: "Todos", count: Object.keys(HTML_TEMPLATES_LIBRARY).length },
  { id: "agencia", label: "Agências", count: 1 },
  { id: "saas", label: "SaaS", count: 1 },
  { id: "ecommerce", label: "E-commerce", count: 1 },
  { id: "saude", label: "Saúde", count: 1 },
  { id: "real-estate", label: "Real Estate", count: 1 },
  { id: "restaurante", label: "Restaurante", count: 1 },
  { id: "educacao", label: "Educação", count: 1 },
  { id: "advocacia", label: "Advocacia", count: 1 },
  { id: "fitness", label: "Fitness", count: 1 },
  { id: "hospedagem", label: "Hospedagem", count: 1 },
  { id: "portfolio", label: "Portfolio", count: 1 },
  { id: "startup", label: "Startup", count: 1 },
];
