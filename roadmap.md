# Solicitação atual
- [ ] Concluir revisão da loja, implantação das funções, testes reais de pedido e validação da segurança dos pedidos antigos.
- [ ] Reformular a loja pública com cabeçalho comercial, categorias, banner, filtros e informações de atendimento, preservando produtos e serviços.
- [ ] Ampliar configurações da loja com orientações de tamanho e upload WEBP.
- [ ] Permitir habilitar catálogo, estoque, links e acompanhamento de pedidos no agente.
- [ ] Unificar confirmação InfinitePay, situação de pagamento, estoque e acompanhamento seguro pelo cliente.
- [ ] Validar os fluxos da loja no computador e celular, testes e implantação.
- [x] Remover criação automática de estado humano pelo chat; oito testes passaram e IA reativada na conversa afetada, com persistência conferida após recarregar (nova resposta WhatsApp ainda depende de mensagem real).
- [x] Impedir fluxos antigos de interceptar o WhatsApp e encerrar sessões legadas sem apagar históricos; confirmado que a conta não possui fluxos legados ativos.
- [x] Configurar consulta direta por mensagens abertas, regras e instruções; nove testes passaram, atualização do atendimento implantada e salvamento/reabertura conferidos na conta conectada.
- [ ] Confirmar resposta e consulta externa em conversa real no WhatsApp (aguarda nova mensagem recebida após a implantação; não enviar mensagens a clientes para testar).
- [x] Bloquear e-mail inválido no cadastro de usuários, normalizar espaços e mostrar erro sem interromper o painel; teste de tela e serviço concluídos.
- [x] Simplificar integrações REST com credenciais protegidas e métodos configuráveis.
- [x] Corrigir incompatibilidade da validação de sessão, endereço padrão e exclusão remota do OmniConect, mantendo IA desativada por padrão.
- [x] Verificar cadastro e exclusão de integração pela tela e executar seis testes.
- [ ] Validar pareamento e exclusão de instância real (aguarda token administrativo substituído e conexão de teste; não alterar instâncias existentes).
- [ ] Conectar Ellite Flats (aguarda endereço e documentação da API e substituição da chave exposta).
- [ ] Conferir avisos e valor de aluguel do Ellite Flats (aguarda acesso/documentação do outro projeto).
# Catálogo e anúncios — solicitação confirmada
- [x] Gerar Feed XML público de produtos publicados, sem dados internos.
- [x] Importar feeds XML compatíveis por arquivo ou HTTPS, com prévia, atualização por SKU e fotos somente por upload.
- [x] Pixels Meta, Google/GA4 e TikTok disparam na hora (sem aviso), incluindo compra confirmada ao voltar do pagamento.
- [ ] Testar importação autenticada, feed público, bloqueio por privacidade e layouts.
# Próximas fases (pedidas em sequência)
- [ ] Fase 2: Área de Membros (cursos/aulas) + acesso enviado no WhatsApp após pagamento InfinitePay; checkout sem endereço para digital.
- [ ] Fase 3: Cupons (painel + campo no carrinho), Order Bump e Upsell.
- [ ] Fase 4: Carrossel de banners, várias fotos por produto, destaques e frete por CEP/região.
