export type StudioElementKind =
  | 'start'
  | 'activity'
  | 'system-task'
  | 'gateway'
  | 'flow'
  | 'end'
  | 'notification'
  | 'unsupported'

export function getStudioElementKind(type?: string): StudioElementKind {
  switch (type) {
    case 'bpmn:StartEvent':
      return 'start'

    case 'bpmn:Task':
    case 'bpmn:UserTask':
    case 'bpmn:ManualTask':
    case 'bpmn:BusinessRuleTask':
    case 'bpmn:ScriptTask':
    case 'bpmn:ReceiveTask':
    case 'bpmn:CallActivity':
    case 'bpmn:SubProcess':
      return 'activity'

    case 'bpmn:ServiceTask':
      return 'system-task'

    case 'bpmn:SendTask':
    case 'bpmn:IntermediateThrowEvent':
    case 'bpmn:IntermediateCatchEvent':
      return 'notification'

    case 'bpmn:ExclusiveGateway':
    case 'bpmn:InclusiveGateway':
    case 'bpmn:ParallelGateway':
    case 'bpmn:EventBasedGateway':
    case 'bpmn:ComplexGateway':
      return 'gateway'

    case 'bpmn:SequenceFlow':
      return 'flow'

    case 'bpmn:EndEvent':
      return 'end'

    default:
      return 'unsupported'
  }
}

export function isConfigurableBpmnElement(type?: string) {
  return getStudioElementKind(type) !== 'unsupported'
}