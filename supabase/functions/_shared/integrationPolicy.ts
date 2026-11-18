export function isPublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && !url.username && !url.password &&
      !host.includes(':') && !host.startsWith('[') && !/^\d+(\.\d+){3}$/.test(host) &&
      host.includes('.') && !/(^|\.)(localhost|local|internal|test|invalid)$/.test(host);
  } catch { return false; }
}

export const API_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
export function canRemoveLocalConnection(remote: { ok: boolean; status: number }): boolean {
  return remote.ok;
}