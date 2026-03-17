import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
