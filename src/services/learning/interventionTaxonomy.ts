/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface InterventionDefinition {
  type: string;
  category: 'conceptual' | 'behavioral' | 'cognitive_mode';
  description: string;
  cognitiveMeaning: string;
  recommendedClass: string;
}

export const InterventionTaxonomy: Record<string, InterventionDefinition> = {
  // Conceptual Errors
  CARRY_OMISSION: {
    type: 'CARRY_OMISSION',
    category: 'conceptual',
    description: 'Learner consistently fails to carry digits during addition/multiplication.',
    cognitiveMeaning: 'Procedural gap in multi-digit arithmetic.',
    recommendedClass: 'procedural_scaffolding'
  },
  PLACE_VALUE_MISALIGNMENT: {
    type: 'PLACE_VALUE_MISALIGNMENT',
    category: 'conceptual',
    description: 'Incorrect alignment of digits in multi-digit operations.',
    cognitiveMeaning: 'Weak mental model of positional notation.',
    recommendedClass: 'visual_alignment_aid'
  },
  OPERATION_CONFUSION: {
    type: 'OPERATION_CONFUSION',
    category: 'conceptual',
    description: 'Applying the wrong operation (e.g., adding when multiplying).',
    cognitiveMeaning: 'Symbol-operation mapping interference.',
    recommendedClass: 'symbol_reinforcement'
  },
  STRUCTURAL_MISSEQUENCING: {
    type: 'STRUCTURAL_MISSEQUENCING',
    category: 'conceptual',
    description: 'Incorrect order of operations in multi-step problems.',
    cognitiveMeaning: 'Executive function load in procedural sequencing.',
    recommendedClass: 'step_by_step_guidance'
  },

  // Behavioral Signals
  STRUCTURAL_HESITATION: {
    type: 'STRUCTURAL_HESITATION',
    category: 'behavioral',
    description: 'High attempt depth or long latency on specific structural phases.',
    cognitiveMeaning: 'High cognitive load during procedural transitions.',
    recommendedClass: 'pacing_adjustment'
  },
  TIMEOUT_CLUSTERING: {
    type: 'TIMEOUT_CLUSTERING',
    category: 'behavioral',
    description: 'Multiple timeouts occurring in close succession.',
    cognitiveMeaning: 'Working memory saturation or disengagement.',
    recommendedClass: 'break_suggestion'
  },
  RESPONSE_DRIFT: {
    type: 'RESPONSE_DRIFT',
    category: 'behavioral',
    description: 'Accuracy or latency degrading over time within a session.',
    cognitiveMeaning: 'Fatigue or depletion of attentional resources.',
    recommendedClass: 'fatigue_mitigation'
  },
  FATIGUE_PATTERN: {
    type: 'FATIGUE_PATTERN',
    category: 'behavioral',
    description: 'Late-session errors on previously mastered skills.',
    cognitiveMeaning: 'Performance degradation due to mental exhaustion.',
    recommendedClass: 'session_termination'
  },

  // Cognitive Mode Signals
  QMM_CONTINUITY_COLLAPSE: {
    type: 'QMM_CONTINUITY_COLLAPSE',
    category: 'cognitive_mode',
    description: 'Failure to maintain mental state during QuickMind transitions.',
    cognitiveMeaning: 'Inability to simulate continuous state under time pressure.',
    recommendedClass: 'qmm_rhythm_slowing'
  },
  DARK_MODE_RETENTION_FAILURE: {
    type: 'DARK_MODE_RETENTION_FAILURE',
    category: 'cognitive_mode',
    description: 'Inability to recall state when visual feedback is removed.',
    cognitiveMeaning: 'Weak mental scratchpad representation.',
    recommendedClass: 'visual_persistence_training'
  },
  PATTERN_ANTICIPATION_BREAKDOWN: {
    type: 'PATTERN_ANTICIPATION_BREAKDOWN',
    category: 'cognitive_mode',
    description: 'Failure to recognize or predict recurring arithmetic patterns.',
    cognitiveMeaning: 'Weak heuristic formation.',
    recommendedClass: 'pattern_highlighting'
  }
};
