/**
 * studioElementKinds.ts
 *
 * Mapeia tipos BPMN → StudioElementKind.
 *
 * Distinção fundamental:
 *   'activity'     → tarefa com executor humano, prazo e ações (aprovar/reprovar)
 *   'notification' → disparo automático do fluxo, sem executor, sem prazo de tarefa
 *                    (SendTask, IntermediateThrowEvent, IntermediateCatchEvent)
 */

export type StudioElementKind =
  | 'start'
  | 'activity'
  | 'system-task'    // ServiceTask — execução automática pelo motor (sem executor humano)
  | 'gateway'
  | 'flow'
  | 'end'
  | 'notification'
  | 'unsupported'

export function getStudioElementKind(type?: string): StudioElementKind {
  switch (type) {
    // ── Eventos iniciais ──────────────────────────────────────────
    case 'bpmn:StartEvent':
      return 'start'

    // ── Atividades humanas ────────────────────────────────────────
    // Têm executor, prazo e ações (aprovar/reprovar/devolver)
    case 'bpmn:Task':
    case 'bpmn:UserTask':
    case 'bpmn:ManualTask':
    case 'bpmn:BusinessRuleTask':
    case 'bpmn:ScriptTask':
    case 'bpmn:ReceiveTask':
    case 'bpmn:CallActivity':
    case 'bpmn:SubProcess':
      return 'activity'

    // ── Tarefas de sistema ────────────────────────────────────────
    // Execução automática pelo motor — sem executor humano.
    // Usadas para: incrementar revisão, atualizar metadado, chamar API, etc.
    case 'bpmn:ServiceTask':
      return 'system-task'

    // ── Notificações do fluxo ─────────────────────────────────────
    // Disparos automáticos — sem executor, sem prazo de tarefa.
    // SendTask (ícone envelope) e eventos intermediários de mensagem.
    case 'bpmn:SendTask':
    case 'bpmn:IntermediateThrowEvent':
    case 'bpmn:IntermediateCatchEvent':
      return 'notification'

    // ── Gateways ──────────────────────────────────────────────────
    case 'bpmn:ExclusiveGateway':
    case 'bpmn:InclusiveGateway':
    case 'bpmn:ParallelGateway':
    case 'bpmn:EventBasedGateway':
    case 'bpmn:ComplexGateway':
      return 'gateway'

    // ── Fluxo de sequência ────────────────────────────────────────
    case 'bpmn:SequenceFlow':
      return 'flow'

    // ── Eventos finais ────────────────────────────────────────────
    case 'bpmn:EndEvent':
      return 'end'

    default:
      return 'unsupported'
  }
}