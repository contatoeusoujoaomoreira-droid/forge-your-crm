import { describe, expect, it } from 'vitest';
import { API_METHODS, canRemoveLocalConnection, isPublicHttpsUrl } from '../../supabase/functions/_shared/integrationPolicy';

describe('integrações externas', () => {
  it('permite consulta, envio, atualização e exclusão REST', () => {
    expect(API_METHODS).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
  });
  it('aceita endereço público HTTPS e recusa destinos locais ou com senha', () => {
    expect(isPublicHttpsUrl('https://crm.example.com/api')).toBe(true);
    for (const url of ['http://crm.example.com', 'https://127.0.0.1', 'https://localhost', 'https://10.0.0.1', 'https://[::1]', 'https://user:pass@crm.example.com']) expect(isPublicHttpsUrl(url)).toBe(false);
  });
  it('mantém cadastro local quando a exclusão remota falha', () => {
    expect(canRemoveLocalConnection({ ok: false, status: 401 })).toBe(false);
    expect(canRemoveLocalConnection({ ok: false, status: 500 })).toBe(false);
    expect(canRemoveLocalConnection({ ok: true, status: 200 })).toBe(true);
  });
});