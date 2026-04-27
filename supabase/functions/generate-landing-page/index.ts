import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROVIDER_ENDPOINTS: Record<string, { url: string; formatBody: (messages: any[], model?: string) => any; formatHeaders: (key: string) => Record<string, string> }> = {
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    formatBody: (messages) => ({ model: "gpt-4o", messages, stream: true }),
    formatHeaders: (key) => ({ Authorization: `Bearer ${key}`, "Content-Type": "application/json" }),
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    formatBody: (messages) => ({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      stream: true,
      system: messages[0]?.role === "system" ? messages[0].content : "",
      messages: messages.filter((m: any) => m.role !== "system"),
    }),
    formatHeaders: (key) => ({ "x-api-key": key, "Content-Type": "application/json", "anthropic-version": "2023-06-01" }),
  },
  google: {
    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent",
    formatBody: (messages) => ({
      contents: messages.filter((m: any) => m.role !== "system").map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      systemInstruction: messages[0]?.role === "system" ? { parts: [{ text: messages[0].content }] } : undefined,
    }),
    formatHeaders: (key) => ({ "Content-Type": "application/json" }),
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    formatBody: (messages) => ({ model: "llama-3.3-70b-versatile", messages, stream: true }),
    formatHeaders: (key) => ({ Authorization: `Bearer ${key}`, "Content-Type": "application/json" }),
  },
  deepseek: {
    url: "https://api.deepseek.com/v1/chat/completions",
    formatBody: (messages) => ({ model: "deepseek-chat", messages, stream: true }),
    formatHeaders: (key) => ({ Authorization: `Bearer ${key}`, "Content-Type": "application/json" }),
  },
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    formatBody: (messages) => ({ model: "google/gemini-2.5-flash", messages, stream: true }),
    formatHeaders: (key) => ({ Authorization: `Bearer ${key}`, "Content-Type": "application/json" }),
  },
  mistral: {
    url: "https://api.mistral.ai/v1/chat/completions",
    formatBody: (messages) => ({ model: "mistral-large-latest", messages, stream: true }),
    formatHeaders: (key) => ({ Authorization: `Bearer ${key}`, "Content-Type": "application/json" }),
  },
  together: {
    url: "https://api.together.xyz/v1/chat/completions",
    formatBody: (messages) => ({ model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", messages, stream: true }),
    formatHeaders: (key) => ({ Authorization: `Bearer ${key}`, "Content-Type": "application/json" }),
  },
  fireworks: {
    url: "https://api.fireworks.ai/inference/v1/chat/completions",
    formatBody: (messages) => ({ model: "accounts/fireworks/models/llama-v3p3-70b-instruct", messages, stream: true }),
    formatHeaders: (key) => ({ Authorization: `Bearer ${key}`, "Content-Type": "application/json" }),
  },
  perplexity: {
    url: "https://api.perplexity.ai/chat/completions",
    formatBody: (messages) => ({ model: "sonar-pro", messages, stream: true }),
    formatHeaders: (key) => ({ Authorization: `Bearer ${key}`, "Content-Type": "application/json" }),
  },
};

const systemPrompt = `Você é um especialista em criar landing pages de alta conversão. Você pode gerar páginas em dois formatos:

FORMATO 1 - HTML COMPLETO (quando o usuário pedir HTML):
- Retorne uma página HTML completa (<!DOCTYPE html> até </html>)
- Use CSS inline e fontes do Google Fonts
- Design moderno, responsivo, mobile-first
- Backgrounds escuros com acentos coloridos
- Animações CSS, hover effects, gradientes

FORMATO 2 - SEÇÕES JSON (quando o usuário pedir seções ou o prompt mencionar "seções"):
Retorne um array JSON com seções editáveis. Tipos disponíveis:
- hero: { headline, subtitle, ctaText, ctaUrl, badge, bgColor, textColor, accentColor, animation, paddingY }
- benefits: { title, subtitle, items: [{icon, title, description}], bgColor, textColor, animation, paddingY }
- features: { title, subtitle, items: [{icon, title, description}], bgColor, textColor, accentColor, animation, paddingY }
- pricing: { title, plans: [{name, price, features:[], ctaText, ctaUrl, highlight}], bgColor, textColor, accentColor, paddingY }
- cta: { headline, description, ctaText, ctaUrl, bgColor, textColor, accentColor, animation, paddingY }
- testimonials: { title, items: [{name, role, text, avatar}], bgColor, textColor, paddingY }
- faq: { title, items: [{question, answer}], bgColor, textColor, paddingY }
- gallery: { title, images: [{url, alt}], bgColor, textColor, paddingY }
- contact_form: { title, subtitle, ctaText, bgColor, textColor, accentColor, paddingY }
- stats: { title, stats: [{value, label, icon}], bgColor, textColor, accentColor, paddingY }
- logos: { title, logos: [{url, name}], bgColor, textColor, paddingY }
- countdown: { title, targetDate, bgColor, textColor, accentColor, paddingY }
- custom_html: { html, bgColor, paddingY }

Cada seção no array: { "section_type": "tipo", "config": { ...props } }
Use cores escuras (bgColor: #000000, #0A0A0A), texto claro, e acentos vibrantes (#84CC16, #3b82f6, #ef4444).
Crie pelo menos 5-8 seções para uma página completa.

REGRAS GERAIS:
- Textos persuasivos e chamadas fortes
- Crie conteúdo realista e profissional
- Se pedir alterações, mantenha a estrutura e altere apenas o pedido
- Coloque o resultado dentro de \`\`\`html\`\`\` ou \`\`\`json\`\`\` conforme o formato`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, externalKey, externalProvider } = await req.json();

    // Use external provider if specified
    if (externalKey && externalProvider && PROVIDER_ENDPOINTS[externalProvider]) {
      const provider = PROVIDER_ENDPOINTS[externalProvider];
      const allMessages = [{ role: "system", content: systemPrompt }, ...messages];
      const headers = provider.formatHeaders(externalKey);
      
      let url = provider.url;
      if (externalProvider === "google") {
        url = `${provider.url}?key=${externalKey}&alt=sse`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(provider.formatBody(allMessages)),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error(`${externalProvider} error:`, response.status, t);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: `Rate limit excedido no provedor ${externalProvider}. Aguarde alguns segundos ou troque para o Forge AI (Nativo).` }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        if (response.status === 413) {
          return new Response(JSON.stringify({ error: `Payload muito grande para o provedor ${externalProvider}. Use o Forge AI (Nativo) para edições com contexto HTML.` }), {
            status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        return new Response(JSON.stringify({ error: `Erro no provedor ${externalProvider}: ${response.status}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // For providers using OpenAI-compatible format, pass through directly
      if (externalProvider !== "google" && externalProvider !== "anthropic") {
        return new Response(response.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      // For Anthropic, transform SSE to OpenAI format
      if (externalProvider === "anthropic") {
        const reader = response.body!.getReader();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        
        const stream = new ReadableStream({
          async start(controller) {
            let buffer = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) { controller.enqueue(encoder.encode("data: [DONE]\n\n")); controller.close(); break; }
              buffer += decoder.decode(value, { stream: true });
              let idx;
              while ((idx = buffer.indexOf("\n")) !== -1) {
                const line = buffer.slice(0, idx).trim();
                buffer = buffer.slice(idx + 1);
                if (!line.startsWith("data: ")) continue;
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.type === "content_block_delta" && data.delta?.text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: data.delta.text } }] })}\n\n`));
                  }
                } catch {}
              }
            }
          },
        });

        return new Response(stream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      // For Google, transform SSE
      if (externalProvider === "google") {
        const reader = response.body!.getReader();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        
        const stream = new ReadableStream({
          async start(controller) {
            let buffer = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) { controller.enqueue(encoder.encode("data: [DONE]\n\n")); controller.close(); break; }
              buffer += decoder.decode(value, { stream: true });
              let idx;
              while ((idx = buffer.indexOf("\n")) !== -1) {
                const line = buffer.slice(0, idx).trim();
                buffer = buffer.slice(idx + 1);
                if (!line.startsWith("data: ")) continue;
                try {
                  const data = JSON.parse(line.slice(6));
                  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
                  }
                } catch {}
              }
            }
          },
        });

        return new Response(stream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
    }

    // Default: use Lovable AI gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-landing-page error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
