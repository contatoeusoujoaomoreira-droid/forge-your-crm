/**
 * HTML/CSS Validator
 * 
 * Valida e sanitiza HTML/CSS para garantir:
 * 1. Segurança (prevenir XSS)
 * 2. Consistência (estilos aplicados corretamente)
 * 3. Performance (sem CSS ineficiente)
 */

// Tags HTML permitidas
const ALLOWED_TAGS = [
  "div",
  "section",
  "article",
  "header",
  "footer",
  "nav",
  "main",
  "aside",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "span",
  "a",
  "button",
  "img",
  "video",
  "iframe",
  "ul",
  "ol",
  "li",
  "table",
  "tr",
  "td",
  "th",
  "form",
  "input",
  "textarea",
  "label",
  "select",
  "option",
  "br",
  "hr",
  "strong",
  "em",
  "i",
  "b",
  "u",
  "code",
  "pre",
  "blockquote",
];

// Atributos permitidos por tag
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  "*": ["class", "id", "style", "data-*"],
  a: ["href", "target", "rel", "title"],
  img: ["src", "alt", "width", "height", "loading"],
  video: ["src", "controls", "width", "height", "poster"],
  iframe: ["src", "width", "height", "frameborder", "allow"],
  input: ["type", "name", "value", "placeholder", "required"],
  button: ["type", "onclick"],
  form: ["action", "method", "target"],
};

// Propriedades CSS perigosas
const DANGEROUS_CSS_PROPS = [
  "behavior",
  "binding",
  "-moz-binding",
  "-webkit-binding",
  "expression",
];

/**
 * Valida se uma tag HTML é permitida
 */
export const isAllowedTag = (tag: string): boolean => {
  return ALLOWED_TAGS.includes(tag.toLowerCase());
};

/**
 * Valida se um atributo é permitido para uma tag
 */
export const isAllowedAttribute = (tag: string, attr: string): boolean => {
  const tagAttrs = ALLOWED_ATTRIBUTES[tag.toLowerCase()] || [];
  const globalAttrs = ALLOWED_ATTRIBUTES["*"] || [];
  const allAttrs = [...tagAttrs, ...globalAttrs];

  // Suportar data-* attributes
  if (attr.startsWith("data-")) return true;

  return allAttrs.includes(attr.toLowerCase());
};

/**
 * Valida se uma propriedade CSS é segura
 */
export const isSafeCSS = (css: string): boolean => {
  const lowerCSS = css.toLowerCase();

  // Verificar propriedades perigosas
  for (const dangerous of DANGEROUS_CSS_PROPS) {
    if (lowerCSS.includes(dangerous)) {
      return false;
    }
  }

  // Verificar expressões JavaScript
  if (lowerCSS.includes("javascript:") || lowerCSS.includes("expression(")) {
    return false;
  }

  return true;
};

/**
 * Sanitiza um atributo style
 */
export const sanitizeStyle = (style: string): string => {
  if (!isSafeCSS(style)) {
    return "";
  }

  // Remover caracteres perigosos
  let sanitized = style
    .replace(/javascript:/gi, "")
    .replace(/expression\(/gi, "")
    .replace(/behavior:/gi, "")
    .replace(/-moz-binding:/gi, "")
    .replace(/-webkit-binding:/gi, "");

  return sanitized;
};

/**
 * Valida HTML completo
 */
export const validateHTML = (html: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Verificar se tem tags de fechamento
  const openTags = html.match(/<(\w+)[^>]*>/g) || [];
  const closeTags = html.match(/<\/(\w+)>/g) || [];

  if (openTags.length !== closeTags.length) {
    errors.push("Número de tags abertas e fechadas não corresponde");
  }

  // Verificar tags não permitidas
  const allTags = html.match(/<\/?(\w+)[^>]*>/g) || [];
  for (const tag of allTags) {
    const tagName = tag.match(/\w+/)?.[0];
    if (tagName && !isAllowedTag(tagName)) {
      errors.push(`Tag não permitida: <${tagName}>`);
    }
  }

  // Verificar atributos perigosos
  const attrPattern = /(\w+)=["']([^"']*)["']/g;
  let match;
  while ((match = attrPattern.exec(html)) !== null) {
    const [, attr, value] = match;
    if (attr.toLowerCase().startsWith("on")) {
      errors.push(`Atributo de evento não permitido: ${attr}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitiza HTML completo
 */
export const sanitizeHTML = (html: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Remover scripts
  const scripts = doc.querySelectorAll("script");
  scripts.forEach((script) => script.remove());

  // Remover event handlers
  const allElements = doc.querySelectorAll("*");
  allElements.forEach((element) => {
    // Remover atributos de evento
    Array.from(element.attributes).forEach((attr) => {
      if (attr.name.toLowerCase().startsWith("on")) {
        element.removeAttribute(attr.name);
      }
    });

    // Sanitizar style
    if (element.hasAttribute("style")) {
      const style = element.getAttribute("style") || "";
      element.setAttribute("style", sanitizeStyle(style));
    }
  });

  return doc.body.innerHTML;
};

/**
 * Valida e otimiza CSS para performance
 */
export const optimizeCSS = (css: string): string => {
  // Remover comentários
  let optimized = css.replace(/\/\*[\s\S]*?\*\//g, "");

  // Remover espaços em branco desnecessários
  optimized = optimized
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .trim();

  // Remover regras vazias
  optimized = optimized.replace(/[^{}]+\{\}/g, "");

  return optimized;
};

/**
 * Minifica HTML
 */
export const minifyHTML = (html: string): string => {
  return html
    .replace(/<!--[\s\S]*?-->/g, "") // Remover comentários
    .replace(/\s+/g, " ") // Remover espaços múltiplos
    .replace(/>\s+</g, "><") // Remover espaços entre tags
    .trim();
};

/**
 * Valida URL para segurança
 */
export const isValidURL = (url: string): boolean => {
  try {
    const urlObj = new URL(url, window.location.origin);
    // Apenas permitir http, https e mailto
    return ["http:", "https:", "mailto:"].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

/**
 * Sanitiza URL
 */
export const sanitizeURL = (url: string): string => {
  if (!url) return "#";

  // Verificar se é uma URL relativa
  if (url.startsWith("/") || url.startsWith("#")) {
    return url;
  }

  // Verificar se é uma URL absoluta segura
  if (isValidURL(url)) {
    return url;
  }

  return "#";
};

/**
 * Valida e sanitiza um objeto de configuração de seção
 */
export const validateSectionConfig = (config: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validar cores
  const colorPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (config.bgColor && !colorPattern.test(config.bgColor)) {
    errors.push("Cor de fundo inválida");
  }
  if (config.textColor && !colorPattern.test(config.textColor)) {
    errors.push("Cor de texto inválida");
  }

  // Validar números
  if (config.paddingY && (isNaN(config.paddingY) || config.paddingY < 0)) {
    errors.push("Padding Y inválido");
  }

  // Validar URLs
  if (config.ctaUrl && !sanitizeURL(config.ctaUrl)) {
    errors.push("URL do CTA inválida");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
