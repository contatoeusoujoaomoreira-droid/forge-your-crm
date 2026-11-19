import { describe, expect, it, vi } from 'vitest';
import { readConversationState } from '../lib/conversationState';

describe('abrir o chat não altera o atendimento', () => {
  it('não cria uma conversa com IA desligada quando a mensagem ainda está sendo recebida', async () => {
    const insert = vi.fn();
    const update = vi.fn();
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), insert, update };
    expect(await readConversationState({ from: () => query }, 'lead-recebendo-mensagem')).toBeNull();
    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
  it('preserva IA ligada para o lead ao recarregar mensagens', async () => {
    const state = { ai_active: true, mode: 'ai', assigned_agent_id: 'agente-escolhido' };
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: state, error: null }) };
    expect(await readConversationState({ from: () => query }, 'lead')).toEqual(state);
  });
});