// Centralized WhatsApp dispatch — single entry point for all UI code.
// Future migration: swap `supabase.functions.invoke` for a fetch to the VPS worker
// without touching any caller. Provider routing is resolved server-side based on
// the user's saved connection.
import { supabase } from "@/integrations/supabase/client";

export type WhatsappPayloadKind = "text" | "image" | "audio" | "document" | "video";

export interface SendWhatsappInput {
  to: string;                 // E.164 or raw jid (group: ...@g.us)
  clientId?: string;          // chat_clients.id (optional, lets backend resolve raw_jid)
  kind?: WhatsappPayloadKind; // default: "text"
  text?: string;
  mediaUrl?: string;
  mediaBase64?: string;
  filename?: string;
  caption?: string;
  asVoiceNote?: boolean;      // for audio: send as recorded voice note
  connectionId?: string;      // if user has multiple connections
}

export interface SendWhatsappResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  raw?: unknown;
}

export async function sendWhatsapp(input: SendWhatsappInput): Promise<SendWhatsappResult> {
  const { data, error } = await supabase.functions.invoke("send-whatsapp", { body: input });
  if (error) return { ok: false, error: error.message };
  const r = (data || {}) as any;
  return { ok: !!r?.success || !!r?.ok, providerMessageId: r?.providerMessageId || r?.id, raw: r, error: r?.error };
}

export async function testWhatsapp(to: string, text: string): Promise<SendWhatsappResult> {
  const { data, error } = await supabase.functions.invoke("test-whatsapp", { body: { to, text } });
  if (error) return { ok: false, error: error.message };
  return { ok: !!data?.success, raw: data };
}

export async function syncChatAvatars(): Promise<{ ok: boolean; count?: number }> {
  const { data, error } = await supabase.functions.invoke("sync-chat-avatars", { body: {} });
  if (error) return { ok: false };
  return { ok: true, count: (data as any)?.updated };
}
