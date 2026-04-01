# Diagnóstico Completo do Módulo CRM - ForgeAI

## 1. Erros e Bugs Identificados

| Categoria | Descrição do Problema | Impacto |
| :--- | :--- | :--- |
| **Ingestão de Leads** | Leads vindos de formulários públicos (`ContactFormRenderer.tsx`) não possuem `user_id` nem `pipeline_id`. | Os leads são criados no banco mas não aparecem no dashboard do usuário. |
| **Duplicidade** | Falta lógica de verificação de duplicidade por e-mail ou telefone ao adicionar leads manualmente ou via importação. | Poluição do banco de dados e confusão na gestão de contatos. |
| **Ações em Massa** | A interface de seleção múltipla existe, mas as operações de exclusão e movimentação em massa estão incompletas. | Baixa produtividade para usuários com muitos leads. |
| **Importação CSV** | O mapeamento de campos e a lógica de inserção em lote não estão totalmente implementados. | Dificuldade na migração de dados de outros CRMs. |
| **Consistência de Dados** | Divergência entre a interface `Lead` no `CRMKanban.tsx` e `LeadViewer.tsx`. | Possível perda de dados ao editar leads em diferentes telas. |

## 2. Gaps de Inteligência e Automação

*   **Alertas de Estagnação**: O sistema define `STAGNATION_DAYS` mas não sinaliza visualmente leads parados no Kanban.
*   **Fluxo de Recompra**: Não há automação para criar tarefas ou alertas de follow-up após o fechamento de uma venda (`RECOMPRA_ALERT_DAYS`).
*   **Lead Scoring**: O sistema possui pesos para scoring, mas o score não é calculado nem exibido para priorização.
*   **Previsibilidade**: O dashboard não exibe a receita projetada baseada na probabilidade de fechamento.

## 3. Plano de Implementação (Nativo e Sem IA)

### Fase 1: Correções Críticas
1.  **Correção da Ingestão**: Atualizar os renderizadores de formulários para capturar o `user_id` do dono da página e associar a uma etapa padrão.
2.  **Verificação de Duplicados**: Implementar check automático antes da inserção.
3.  **Finalização de Bulk Actions**: Implementar `delete` e `move` em lote.

### Fase 2: Automação "Mestre" (Performance e Vendas)
1.  **Visualizador de "Temperatura"**: Implementar badges de estagnação e score de lead nos cards do Kanban.
2.  **Dashboard de Previsão**: Adicionar gráfico de "Pipeline Value vs Weighted Value" (Valor Real vs Valor Probabilístico).
3.  **Atalhos de Produtividade**: Implementar navegação por teclado (shortcuts).
4.  **WhatsApp Dinâmico**: Melhorar a substituição de variáveis nos templates de WhatsApp.

### Fase 3: Funcionalidades Exclusivas
1.  **Timeline de Atividades**: Registro automático de cada mudança de etapa e alteração de valor.
2.  **Recorrência Nativa**: Suporte a `revenue_type` (Mensal vs Único) com cálculo de LTV projetado.
