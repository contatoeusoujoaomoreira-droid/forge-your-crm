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

const systemPrompt = `Você é um especialista em criar landing pages de alta conversão. Quando o usuário pedir para criar uma landing page, site ou página, você DEVE responder APENAS com o código HTML completo e funcional.

REGRAS:
1. Sempre retorne uma página HTML completa (<!DOCTYPE html> até </html>)
2. Use design moderno, responsivo e profissional
3. Inclua CSS inline e/ou <style> tags - NÃO use links externos de CSS
4. Use fontes do Google Fonts via <link>
5. Crie seções completas: hero, benefícios, depoimentos, preços, FAQ, CTA, footer
6. Use cores vibrantes, gradientes, sombras e efeitos modernos
7. Faça o design mobile-first e responsivo
8. Inclua animações CSS suaves
9. Use emojis e ícones quando apropriado
10. Crie textos persuasivos e chamadas para ação fortes
11. O código deve ser 100% funcional sem dependências externas
12. Use backgrounds escuros com acentos coloridos (estilo moderno)
13. Inclua media queries para responsividade
14. Adicione hover effects nos botões e links

Se o usuário pedir alterações ou melhorias, modifique o HTML mantendo a estrutura completa.
Se o usuário fizer perguntas gerais, responda normalmente em texto.

IMPORTANTE: Quando gerar HTML, comece SEMPRE com \`\`\`html e termine com \`\`\`. O HTML deve estar dentro deste bloco de código.`;

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
        model: "google/gemini-3-flash-preview",
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
