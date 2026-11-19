export async function readConversationState(client: { from: (table: string) => any }, clientId: string) {
  const { data, error } = await client.from('conversation_state').select('*').eq('client_id', clientId).maybeSingle();
  if (error) throw error;
  return data;
}