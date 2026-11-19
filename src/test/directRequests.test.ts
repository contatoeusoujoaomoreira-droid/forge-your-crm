import { describe, expect, it } from 'vitest';
import { shouldAttendDirect, matchCustomAdRules } from '../../supabase/functions/_shared/adIntent';

describe('atendimento direto universal', () => {
  it('encaminha referência de anúncio diretamente', () => {
    expect(shouldAttendDirect('Tenho interesse no AP01247', {}, {})).toBe(true);
  });
  it('consulta pedido aberto sem exigir código ou dois critérios', () => {
    for (const text of ['Quero apartamento em Moema', 'Preciso de detergente 5L', 'Tem sabão líquido?', 'Consultar meu pedido']) {
      expect(shouldAttendDirect(text, {}, { ad_auto_detect: false })).toBe(true);
    }
  });
  it('respeita a desativação da consulta por pedidos abertos', () => {
    expect(shouldAttendDirect('Preciso de detergente', {}, { ad_auto_detect: false, direct_open_requests: false })).toBe(false);
  });
  it('mantém saudações e escolhas no menu', () => {
    for (const text of ['Olá!', 'Bom dia', '1', 'opt2']) expect(shouldAttendDirect(text, {}, {})).toBe(false);
  });
  it('respeita regras específicas mesmo sem reconhecimento automático', () => {
    expect(shouldAttendDirect('Informações sobre o Twin Towers', {}, { ad_auto_detect: false, direct_open_requests: false, ad_keywords: 'Twin Towers', ad_match_mode: 'contains' })).toBe(true);
    expect(matchCustomAdRules('Quero detergente', 'detergente', 'exact')).toBe(false);
    expect(matchCustomAdRules('Quero detergente', 'quero', 'starts')).toBe(true);
  });
  it('reconhece a origem Meta informada na mensagem', () => {
    expect(shouldAttendDirect('Mais detalhes por favor', { contextInfo: { externalAdReply: { sourceUrl: 'https://facebook.com/example' } } }, {})).toBe(true);
  });
});