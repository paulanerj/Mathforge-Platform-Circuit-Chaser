export type ProgressionStage = 'started' | 'improving' | 'strong' | 'mastered';

export function getProgressionStage(masteryLevel: 'weak' | 'developing' | 'strong' | 'mastered' | undefined): ProgressionStage {
  switch (masteryLevel) {
    case 'weak':
      return 'started';
    case 'developing':
      return 'improving';
    case 'strong':
      return 'strong';
    case 'mastered':
      return 'mastered';
    default:
      return 'started';
  }
}

export function getStageLevel(stage: ProgressionStage): number {
  switch (stage) {
    case 'started': return 1;
    case 'improving': return 2;
    case 'strong': return 3;
    case 'mastered': return 4;
    default: return 0;
  }
}
