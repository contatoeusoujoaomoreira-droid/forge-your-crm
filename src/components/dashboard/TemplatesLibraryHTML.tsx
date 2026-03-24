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

  // ===== FINANÇAS / INVESTIMENTOS =====
  finance_invest: {
    name: "Finanças & Investimentos",
    category: "Finanças",
    description: "Landing page para consultoria financeira ou corretora",
    thumbnail: "💰",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InvestSmart - Seu Futuro Financeiro</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body class="bg-slate-950 font-inter text-slate-100">
  <section class="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
    <div class="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(30,58,138,0.3),transparent)] pointer-events-none"></div>
    <div class="max-w-4xl mx-auto text-center relative z-10">
      <div class="inline-block px-4 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">Novo: Consultoria de Cripto Ativos</div>
      <h1 class="text-6xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Multiplique seu Patrimônio</h1>
      <p class="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">Estratégias de investimento personalizadas para alcançar sua liberdade financeira.</p>
      <div class="flex gap-4 justify-center">
        <button class="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20">Começar Agora</button>
        <button class="px-8 py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition border border-slate-700">Falar com Consultor</button>
      </div>
    </div>
  </section>
  <section class="py-24 bg-slate-900/50 border-y border-slate-800">
    <div class="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
      <div class="text-center">
        <div class="text-4xl font-bold text-blue-500 mb-2">+R$ 2Bi</div>
        <p class="text-slate-400">Sob Gestão</p>
      </div>
      <div class="text-center">
        <div class="text-4xl font-bold text-blue-500 mb-2">15k+</div>
        <p class="text-slate-400">Clientes Ativos</p>
      </div>
      <div class="text-center">
        <div class="text-4xl font-bold text-blue-500 mb-2">12 Anos</div>
        <p class="text-slate-400">De Experiência</p>
      </div>
    </div>
  </section>
</body>
</html>`,
  },

  // ===== VIAGENS / TURISMO =====
  travel_agency: {
    name: "Agência de Viagens",
    category: "Viagens",
    description: "Landing page para pacotes turísticos e destinos",
    thumbnail: "✈️",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Explore o Mundo - Destinos Inesquecíveis</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body class="bg-white font-['Plus_Jakarta_Sans']">
  <section class="relative h-screen flex items-center justify-center overflow-hidden">
    <div class="absolute inset-0 bg-black/40 z-10"></div>
    <div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center"></div>
    <div class="relative z-20 text-center px-4">
      <h1 class="text-6xl md:text-8xl font-extrabold text-white mb-6 drop-shadow-2xl">Explore o Mundo</h1>
      <p class="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto">Pacotes exclusivos para os destinos mais desejados do planeta.</p>
      <div class="bg-white p-4 rounded-2xl shadow-2xl max-w-4xl mx-auto flex flex-wrap gap-4 items-end">
        <div class="flex-1 min-w-[200px] text-left">
          <label class="block text-xs font-bold text-slate-500 mb-2 uppercase">Destino</label>
          <input type="text" placeholder="Para onde você quer ir?" class="w-full p-3 bg-slate-50 rounded-lg border-none focus:ring-2 focus:ring-blue-500">
        </div>
        <div class="flex-1 min-w-[200px] text-left">
          <label class="block text-xs font-bold text-slate-500 mb-2 uppercase">Data</label>
          <input type="date" class="w-full p-3 bg-slate-50 rounded-lg border-none focus:ring-2 focus:ring-blue-500">
        </div>
        <button class="px-10 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition">Buscar</button>
      </div>
    </div>
  </section>
</body>
</html>`,
  },

  // ===== EVENTOS / CONFERÊNCIAS =====
  event_conference: {
    name: "Conferência Tech",
    category: "Eventos",
    description: "Página de inscrição para eventos e workshops",
    thumbnail: "🎟️",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TechConf 2026 - O Futuro da Tecnologia</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
</head>
<body class="bg-black font-['Space_Grotesk'] text-white">
  <section class="min-h-screen flex flex-col items-center justify-center px-4 py-20 border-b border-white/10">
    <div class="text-blue-500 font-bold tracking-widest mb-4">24-26 DE MARÇO • SÃO PAULO</div>
    <h1 class="text-7xl md:text-9xl font-bold text-center mb-8 tracking-tighter">TECH<br><span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">CONF</span></h1>
    <p class="text-xl text-slate-400 text-center max-w-2xl mb-12">A maior conferência de tecnologia da América Latina. 3 dias de imersão total no futuro.</p>
    <div class="flex gap-6">
      <button class="px-12 py-5 bg-white text-black font-bold rounded-full hover:bg-blue-500 hover:text-white transition-all duration-300">Garantir Ingresso</button>
      <button class="px-12 py-5 border border-white/20 rounded-full hover:bg-white/5 transition">Ver Agenda</button>
    </div>
  </section>
</body>
</html>`,
  },

  // ===== PET SHOP / VETERINÁRIA =====
  pet_shop: {
    name: "Pet Care & Shop",
    category: "Pet",
    description: "Landing page para pet shops e clínicas veterinárias",
    thumbnail: "🐾",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PetLove - Cuidado com Carinho</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body class="bg-orange-50 font-['Quicksand']">
  <section class="py-20 px-4">
    <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
      <div class="flex-1">
        <h1 class="text-5xl md:text-6xl font-bold text-orange-900 mb-6">Tudo que seu pet precisa em um só lugar</h1>
        <p class="text-xl text-orange-800/70 mb-8">Banho e tosa, veterinário 24h e os melhores produtos para o seu melhor amigo.</p>
        <div class="flex gap-4">
          <button class="px-8 py-4 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 transition shadow-lg shadow-orange-500/30">Agendar Banho</button>
          <button class="px-8 py-4 bg-white text-orange-900 font-bold rounded-2xl hover:bg-orange-100 transition border border-orange-200">Ver Loja</button>
        </div>
      </div>
      <div class="flex-1 bg-orange-200 rounded-[40px] h-[500px] w-full relative overflow-hidden">
        <div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=800&q=80')] bg-cover bg-center"></div>
      </div>
    </div>
  </section>
</body>
</html>`,
  },

  // ===== ARQUITETURA / DESIGN INTERIORES =====
  architecture_studio: {
    name: "Estúdio de Arquitetura",
    category: "Arquitetura",
    description: "Portfolio minimalista para arquitetos e designers",
    thumbnail: "📐",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Minimal Arch - Arquitetura Contemporânea</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
</head>
<body class="bg-[#f8f7f4] font-['Outfit'] text-[#1a1a1a]">
  <header class="p-8 flex justify-between items-center">
    <div class="text-2xl font-bold tracking-tighter">MINIMAL.</div>
    <div class="space-x-8 text-sm font-medium uppercase tracking-widest">
      <a href="#" class="hover:opacity-50">Projetos</a>
      <a href="#" class="hover:opacity-50">O Estúdio</a>
      <a href="#" class="hover:opacity-50">Contato</a>
    </div>
  </header>
  <section class="px-8 py-20">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-8xl md:text-[12rem] font-light leading-[0.8] tracking-tighter mb-20">DESIGN<br>PUREZA.</h1>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-20 items-end">
        <div class="aspect-[4/5] bg-neutral-200 overflow-hidden">
          <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80" class="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700">
        </div>
        <div class="max-w-md">
          <p class="text-2xl mb-10 leading-relaxed">Criamos espaços que respiram. Arquitetura focada na essência, luz e materialidade.</p>
          <button class="group flex items-center gap-4 text-sm font-bold uppercase tracking-widest">
            Ver Projetos 
            <span class="w-12 h-[1px] bg-black group-hover:w-20 transition-all"></span>
          </button>
        </div>
      </div>
    </div>
  </section>
</body>
</html>`,
  },

  // ===== APP LANDING PAGE =====
  app_landing: {
    name: "App Showcase",
    category: "App",
    description: "Landing page para lançamento de aplicativos mobile",
    thumbnail: "📱",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AppFlow - Organize sua Vida</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body class="bg-white font-inter">
  <section class="py-24 px-4 overflow-hidden">
    <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-20">
      <div class="flex-1 text-center md:text-left">
        <h1 class="text-6xl font-extrabold text-slate-900 mb-6 leading-tight">O app que vai mudar sua rotina.</h1>
        <p class="text-xl text-slate-600 mb-10">Gerencie tarefas, tempo e projetos em um só lugar com design intuitivo.</p>
        <div class="flex flex-wrap gap-4 justify-center md:justify-start">
          <button class="px-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-slate-800 transition flex items-center gap-3">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.96.95-2.04 1.9-3.3 1.9-1.24 0-1.63-.76-3.1-.76-1.48 0-1.92.74-3.1.76-1.2.02-2.43-1.07-3.4-2.48-1.98-2.86-3.5-8.05-1.46-11.58 1.02-1.74 2.8-2.85 4.74-2.88 1.48-.02 2.88 1 3.78 1 .9 0 2.6-1.24 4.37-1.06 1.74.07 3.3.7 4.37 2.26-3.57 2.1-3 6.57.55 8.1-.7 1.74-1.6 3.46-3.05 4.74zM12.72 4.1c-.8-1-1.34-2.4-1.2-3.8 1.2.05 2.66.8 3.53 1.8.78.9 1.45 2.3 1.3 3.7-1.34.1-2.83-.7-3.63-1.7z"/></svg>
            App Store
          </button>
          <button class="px-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-slate-800 transition flex items-center gap-3">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3.609 1.814L13.792 12 3.61 22.186c-.18.18-.29.43-.29.71 0 .55.45 1 1 1 .28 0 .53-.11.71-.29l10.89-10.89c.18-.18.29-.43.29-.71 0-.28-.11-.53-.29-.71L5.03 1.104c-.18-.18-.43-.29-.71-.29-.55 0-1 .45-1 1 0 .28.11.53.29.71z"/></svg>
            Google Play
          </button>
        </div>
      </div>
      <div class="flex-1 relative">
        <div class="w-[300px] h-[600px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-800 shadow-2xl mx-auto relative overflow-hidden">
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20"></div>
          <div class="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 p-6 flex flex-col justify-center">
            <div class="w-full h-4 bg-white/20 rounded-full mb-4"></div>
            <div class="w-2/3 h-4 bg-white/20 rounded-full mb-8"></div>
            <div class="grid grid-cols-2 gap-4">
              <div class="aspect-square bg-white/10 rounded-2xl"></div>
              <div class="aspect-square bg-white/10 rounded-2xl"></div>
              <div class="aspect-square bg-white/10 rounded-2xl"></div>
              <div class="aspect-square bg-white/10 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</body>
</html>`,
  },

  // ===== EDUCAÇÃO / INFOPRODUTO =====
  infoproduct_masterclass: {
    name: "Masterclass Infoproduto",
    category: "Educação",
    description: "Landing page de alta conversão para cursos e mentorias",
    thumbnail: "🎓",
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Masterclass - O Caminho para o Sucesso</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
</head>
<body class="bg-slate-50 font-inter">
  <section class="py-20 px-4">
    <div class="max-w-4xl mx-auto text-center">
      <div class="text-red-600 font-bold mb-4 uppercase tracking-widest">Aula Gratuita e Exclusiva</div>
      <h1 class="text-5xl md:text-7xl font-black text-slate-900 mb-8 leading-tight">Como faturar seus primeiros R$ 10k online</h1>
      <p class="text-xl text-slate-600 mb-12">Descubra o método passo a passo que já ajudou mais de 5.000 pessoas a mudarem de vida.</p>
      <div class="bg-white p-8 rounded-3xl shadow-2xl border border-slate-200">
        <h3 class="text-2xl font-bold mb-6">Garanta sua vaga agora!</h3>
        <form class="space-y-4">
          <input type="text" placeholder="Seu melhor e-mail" class="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none">
          <button class="w-full py-5 bg-red-600 text-white font-black text-xl rounded-xl hover:bg-red-700 transition-all transform hover:scale-[1.02]">QUERO ACESSAR A AULA AGORA!</button>
        </form>
        <p class="text-xs text-slate-400 mt-4">🔒 Seus dados estão seguros conosco.</p>
      </div>
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
  { id: "educacao", label: "Educação", count: 2 },
  { id: "advocacia", label: "Advocacia", count: 1 },
  { id: "fitness", label: "Fitness", count: 1 },
  { id: "hospedagem", label: "Hospedagem", count: 1 },
  { id: "portfolio", label: "Portfolio", count: 1 },
  { id: "startup", label: "Startup", count: 1 },
  { id: "financas", label: "Finanças", count: 1 },
  { id: "viagens", label: "Viagens", count: 1 },
  { id: "eventos", label: "Eventos", count: 1 },
  { id: "pet", label: "Pet", count: 1 },
  { id: "arquitetura", label: "Arquitetura", count: 1 },
  { id: "app", label: "App", count: 1 },
];
