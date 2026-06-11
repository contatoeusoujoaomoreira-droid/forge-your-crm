// Concrete provider implementations (Wave 3)
import type { AIProvider, GenerateOptions, GenerateResult } from "./provider.ts";

const json = (r: Response) => r.json();

function buildMessages(opts: GenerateOptions) {
  const msgs = [...opts.messages];
  if (opts.system && !msgs.some((m) => m.role === "system")) {
    msgs.unshift({ role: "system", content: opts.system });
  }
  return msgs;
}

export const lovableProvider: AIProvider = {
  name: "lovable",
  async generate(model, opts) {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: buildMessages(opts), temperature: opts.temperature ?? 0.7, max_tokens: opts.maxTokens }),
    });
    if (!r.ok) throw new Error(`lovable ${r.status}: ${await r.text()}`);
    const d = await json(r);
    return {
      text: d?.choices?.[0]?.message?.content ?? "",
      inputTokens: d?.usage?.prompt_tokens ?? 0,
      outputTokens: d?.usage?.completion_tokens ?? 0,
      raw: d,
    };
  },
};

export function openaiProvider(apiKey: string): AIProvider {
  return {
    name: "openai",
    async generate(model, opts) {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: buildMessages(opts), temperature: opts.temperature ?? 0.7, max_tokens: opts.maxTokens }),
      });
      if (!r.ok) throw new Error(`openai ${r.status}: ${await r.text()}`);
      const d = await json(r);
      return { text: d?.choices?.[0]?.message?.content ?? "", inputTokens: d?.usage?.prompt_tokens ?? 0, outputTokens: d?.usage?.completion_tokens ?? 0, raw: d };
    },
  };
}

export function groqProvider(apiKey: string): AIProvider {
  return {
    name: "groq",
    async generate(model, opts) {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: buildMessages(opts), temperature: opts.temperature ?? 0.7, max_tokens: opts.maxTokens }),
      });
      if (!r.ok) throw new Error(`groq ${r.status}: ${await r.text()}`);
      const d = await json(r);
      return { text: d?.choices?.[0]?.message?.content ?? "", inputTokens: d?.usage?.prompt_tokens ?? 0, outputTokens: d?.usage?.completion_tokens ?? 0, raw: d };
    },
  };
}

export function geminiProvider(apiKey: string): AIProvider {
  return {
    name: "gemini",
    async generate(model, opts) {
      const contents = buildMessages(opts).filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
      const system = opts.system || opts.messages.find((m) => m.role === "system")?.content;
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, systemInstruction: system ? { parts: [{ text: system }] } : undefined, generationConfig: { temperature: opts.temperature ?? 0.7, maxOutputTokens: opts.maxTokens } }),
      });
      if (!r.ok) throw new Error(`gemini ${r.status}: ${await r.text()}`);
      const d = await json(r);
      const text = d?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
      return { text, inputTokens: d?.usageMetadata?.promptTokenCount ?? 0, outputTokens: d?.usageMetadata?.candidatesTokenCount ?? 0, raw: d };
    },
  };
}

export function anthropicProvider(apiKey: string): AIProvider {
  return {
    name: "anthropic",
    async generate(model, opts) {
      const msgs = opts.messages.filter((m) => m.role !== "system");
      const system = opts.system || opts.messages.find((m) => m.role === "system")?.content;
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model, system, messages: msgs, max_tokens: opts.maxTokens ?? 1024, temperature: opts.temperature ?? 0.7 }),
      });
      if (!r.ok) throw new Error(`anthropic ${r.status}: ${await r.text()}`);
      const d = await json(r);
      return { text: d?.content?.[0]?.text ?? "", inputTokens: d?.usage?.input_tokens ?? 0, outputTokens: d?.usage?.output_tokens ?? 0, raw: d };
    },
  };
}

export function openrouterProvider(apiKey: string): AIProvider {
  return {
    name: "openrouter",
    async generate(model, opts) {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: buildMessages(opts), temperature: opts.temperature ?? 0.7, max_tokens: opts.maxTokens }),
      });
      if (!r.ok) throw new Error(`openrouter ${r.status}: ${await r.text()}`);
      const d = await json(r);
      return { text: d?.choices?.[0]?.message?.content ?? "", inputTokens: d?.usage?.prompt_tokens ?? 0, outputTokens: d?.usage?.completion_tokens ?? 0, raw: d };
    },
  };
}
