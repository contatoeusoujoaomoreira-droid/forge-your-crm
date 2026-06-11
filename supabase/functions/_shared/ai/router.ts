// AI Router with fallback chain, circuit breaker, usage logging (Wave 3+4)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { AIProvider, GenerateOptions, GenerateResult } from "./provider.ts";
import { lovableProvider, openaiProvider, groqProvider, geminiProvider, anthropicProvider, openrouterProvider } from "./providers.ts";

export interface RouteStep { provider: string; model: string; apiKey?: string }

const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function buildProvider(p: string, apiKey?: string): AIProvider {
  switch (p) {
    case "lovable": return lovableProvider;
    case "openai": return openaiProvider(apiKey!);
    case "groq": return groqProvider(apiKey!);
    case "gemini": return geminiProvider(apiKey!);
    case "anthropic": return anthropicProvider(apiKey!);
    case "openrouter": return openrouterProvider(apiKey!);
    default: throw new Error(`unknown provider ${p}`);
  }
}

export async function routeGenerate(chain: RouteStep[], opts: GenerateOptions, ctx: { tenantId?: string; agentId?: string; requestId?: string } = {}): Promise<GenerateResult & { provider: string; model: string }> {
  const sb = admin();
  let lastErr: any;
  for (const step of chain) {
    // circuit breaker
    const { data: skip } = await sb.rpc("circuit_should_skip", { _provider: step.provider, _model: step.model });
    if (skip) { lastErr = new Error(`circuit_open:${step.provider}/${step.model}`); continue; }
    const started = Date.now();
    try {
      const provider = buildProvider(step.provider, step.apiKey);
      const res = await provider.generate(step.model, opts);
      const dur = Date.now() - started;
      await sb.rpc("circuit_record_result", { _provider: step.provider, _model: step.model, _ok: true });
      await sb.rpc("record_llm_usage", {
        _tenant: ctx.tenantId ?? null, _agent: ctx.agentId ?? null,
        _provider: step.provider, _model: step.model,
        _in_tok: res.inputTokens, _out_tok: res.outputTokens,
        _duration_ms: dur, _request_id: ctx.requestId ?? null, _meta: {},
      });
      return { ...res, provider: step.provider, model: step.model };
    } catch (e: any) {
      lastErr = e;
      await sb.rpc("circuit_record_result", { _provider: step.provider, _model: step.model, _ok: false, _error: String(e?.message || e).slice(0, 500) });
      continue;
    }
  }
  throw lastErr || new Error("all providers failed");
}
