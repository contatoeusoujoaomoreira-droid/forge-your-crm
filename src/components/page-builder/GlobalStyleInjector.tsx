/**
 * GlobalStyleInjector
 * 
 * Componente que injeta estilos globais consistentes em todos os ambientes
 * (editor, preview, publicação). Garante que a renderização seja 100% WYSIWYG.
 */

export const GLOBAL_STYLES = `
  /* Reset e Base */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    width: 100%;
    height: 100%;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background-color: #ffffff;
    color: #1a1a1a;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Tipografia */
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
    font-weight: 700;
    line-height: 1.2;
  }

  h1 { font-size: 3rem; }
  h2 { font-size: 2.25rem; }
  h3 { font-size: 1.875rem; }
  h4 { font-size: 1.5rem; }
  h5 { font-size: 1.25rem; }
  h6 { font-size: 1rem; }

  p {
    margin-bottom: 1rem;
  }

  a {
    color: inherit;
    text-decoration: none;
    transition: all 0.3s ease;
  }

  button {
    cursor: pointer;
    border: none;
    font-family: inherit;
    transition: all 0.3s ease;
  }

  /* Animações Base */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideLeft {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes slideRight {
    from { opacity: 0; transform: translateX(-30px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes bounceIn {
    0% { opacity: 0; transform: scale(0.3); }
    50% { opacity: 1; transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  @keyframes flipIn {
    from { opacity: 0; transform: rotateY(90deg); }
    to { opacity: 1; transform: rotateY(0); }
  }

  @keyframes rotateIn {
    from { opacity: 0; transform: rotate(-10deg); }
    to { opacity: 1; transform: rotate(0); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Aplicação de Animações */
  .animate-fade-in { animation: fadeIn 0.8s ease-in-out; }
  .animate-slide-up { animation: slideUp 0.8s ease-out; }
  .animate-slide-down { animation: slideDown 0.8s ease-out; }
  .animate-slide-left { animation: slideLeft 0.8s ease-out; }
  .animate-slide-right { animation: slideRight 0.8s ease-out; }
  .animate-scale-in { animation: scaleIn 0.6s ease-out; }
  .animate-bounce-in { animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
  .animate-flip-in { animation: flipIn 0.6s ease-out; perspective: 1000px; }
  .animate-rotate-in { animation: rotateIn 0.6s ease-out; }
  .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

  /* Utilitários de Layout */
  .section-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }

  .section-padding-sm { padding-top: 2rem; padding-bottom: 2rem; }
  .section-padding-md { padding-top: 4rem; padding-bottom: 4rem; }
  .section-padding-lg { padding-top: 6rem; padding-bottom: 6rem; }
  .section-padding-xl { padding-top: 8rem; padding-bottom: 8rem; }

  /* Grid Responsivo */
  .grid-auto {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }

  @media (min-width: 768px) {
    .grid-auto {
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    }
  }

  /* Botões */
  .btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .btn-primary {
    background-color: #3b82f6;
    color: #ffffff;
  }

  .btn-primary:hover {
    background-color: #2563eb;
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(59, 130, 246, 0.2);
  }

  .btn-secondary {
    background-color: transparent;
    color: #1a1a1a;
    border: 2px solid #1a1a1a;
  }

  .btn-secondary:hover {
    background-color: #1a1a1a;
    color: #ffffff;
  }

  /* Cards */
  .card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.5rem;
    transition: all 0.3s ease;
  }

  .card:hover {
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    transform: translateY(-4px);
  }

  /* Responsividade Base */
  @media (max-width: 768px) {
    h1 { font-size: 2rem; }
    h2 { font-size: 1.5rem; }
    h3 { font-size: 1.25rem; }
    h4 { font-size: 1.125rem; }
  }

  /* Acessibilidade */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* Impressão */
  @media print {
    body {
      background: white;
      color: black;
    }
    a {
      text-decoration: underline;
    }
  }
`;

export const GlobalStyleInjector = () => {
  return (
    <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />
  );
};

/**
 * Função auxiliar para injetar estilos em um documento iframe
 * Usada no editor para garantir que os estilos sejam aplicados ao canvas
 */
export const injectStylesIntoIframe = (iframeDoc: Document) => {
  const styleElement = iframeDoc.createElement("style");
  styleElement.textContent = GLOBAL_STYLES;
  iframeDoc.head.appendChild(styleElement);

  // Adicionar Tailwind CSS
  const tailwindScript = iframeDoc.createElement("script");
  tailwindScript.src = "https://cdn.tailwindcss.com";
  iframeDoc.head.appendChild(tailwindScript);

  // Adicionar Google Fonts
  const fontLink = iframeDoc.createElement("link");
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap";
  fontLink.rel = "stylesheet";
  iframeDoc.head.appendChild(fontLink);
};

/**
 * Função para gerar HTML completo com todos os estilos injetados
 * Usada para salvar e publicar páginas
 */
export const generateCompleteHTML = (
  bodyContent: string,
  title: string = "Landing Page",
  metaDescription: string = ""
): string => {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${metaDescription}">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${GLOBAL_STYLES}
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
};
