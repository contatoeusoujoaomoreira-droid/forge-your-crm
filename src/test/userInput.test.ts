import { describe, it, expect } from 'vitest';
import { normalizedEmail } from '../../supabase/functions/_shared/userInput';

describe('e-mail de novo acesso', () => {
  it('remove espaços externos e normaliza letras', () => {
    expect(normalizedEmail.parse('  Pessoa@Empresa.com  ')).toBe('pessoa@empresa.com');
  });
  it('recusa endereço incompleto antes de criar a conta', () => {
    expect(normalizedEmail.safeParse('pessoa').success).toBe(false);
    expect(normalizedEmail.safeParse('pessoa@').success).toBe(false);
    expect(normalizedEmail.safeParse('pessoa @empresa.com').success).toBe(false);
  });
});