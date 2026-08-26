export interface VisualStep {
  currentValue: number | string;
  modifier?: number;
  operation?: string;
  mode: 'NM' | 'QMM' | 'DM' | 'HIDDEN' | 'SURVIVAL';
  options: number[];
  correctAnswer: number;
  stepId?: string;
  
  // Visual Metadata
  timerSeconds?: number;
  currentLevel?: number;
  activeTable?: number;
  isMystery?: boolean;
  usesRingTimer?: boolean;
  isPaused?: boolean;
  streakTier?: number;
  rhythm?: { chainLength: number; chainMultiplier: number; maxChain: number };
  modifiers?: Array<{
    position: 'left' | 'right' | 'top' | 'bottom';
    operation: string;
    text?: string;
    value: string | number;
  }>;
}
