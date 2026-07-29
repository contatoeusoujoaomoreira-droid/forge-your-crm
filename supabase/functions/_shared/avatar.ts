// Persistência nativa de fotos de perfil no storage do CRM.
// Objetivo: desacoplar avatares da API do WhatsApp (URLs temporárias que
// expiram quando a instância cai/desconecta).

const BUCKET = 'chat-media';

export const isStoredAvatar = (url?: string | null) =>
  !!url && url.includes(`/storage/v1/object/public/${BUCKET}/`);

const extFromContentType = (ct?: string | null) => {
  const t = (ct || '').toLowerCase();
  if (t.includes('png')) return 'png';
  if (t.includes('webp')) return 'webp';
  if (t.includes('gif')) return 'gif';
  return 'jpg';
};

/**
 * Baixa a imagem remota e envia para o bucket público `chat-media`,
 * retornando a URL pública permanente. Retorna undefined em qualquer falha
 * (nunca lança), para não bloquear o processamento da mensagem.
 */
export async function persistAvatar(
  admin: any,
  opts: { userId: string; clientKey: string; remoteUrl?: string | null; headers?: Record<string, string> },
): Promise<string | undefined> {
  const { userId, clientKey, remoteUrl, headers } = opts;
  try {
    if (!remoteUrl || !/^https?:\/\//i.test(remoteUrl)) return undefined;
    if (isStoredAvatar(remoteUrl)) return remoteUrl; // já é nosso

    const res = await fetch(remoteUrl, { headers: headers || {} }).catch(() => null);
    if (!res?.ok) return undefined;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return undefined;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (!buf.length || buf.length > 5 * 1024 * 1024) return undefined;

    const safeKey = (clientKey || 'contato').replace(/[^a-zA-Z0-9_-]/g, '');
    const path = `${userId}/avatars/${safeKey}-${Date.now()}.${extFromContentType(contentType)}`;

    const { error } = await admin.storage.from(BUCKET).upload(path, buf, {
      contentType,
      upsert: true,
      cacheControl: '31536000',
    });
    if (error) return undefined;

    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl || undefined;
  } catch (_) {
    return undefined;
  }
}
