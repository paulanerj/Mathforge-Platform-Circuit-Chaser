/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SkillOntology } from '../../types/learning';

/*
AI_CONTEXT:
This module defines the pedagogical skill tree for the platform.
The engine is agnostic to these definitions; it only provides the telemetry 
that this ontology interprets.
Do not modify skill IDs without PM authorization; they are the canonical 
keys for cross-session learner history.
*/

export const PlatformSkillOntology: SkillOntology = {
  skills: {
    'arithmetic.multiplication.retrieval': {
      id: 'arithmetic.multiplication.retrieval',
      title: 'Multiplication Retrieval',
      description: 'The ability to retrieve multiplication facts from memory under pressure.',
    },
    'arithmetic.multiplication.fluency': {
      id: 'arithmetic.multiplication.fluency',
      title: 'Multiplication Fluency',
      description: 'The overall speed and accuracy of multiplication operations.',
    },
    'arithmetic.skipcount.sequence': {
      id: 'arithmetic.skipcount.sequence',
      title: 'Skip-Counting Sequence',
      description: 'The ability to maintain a consistent skip-counting rhythm and sequence.',
    },
    'arithmetic.pattern.recognition': {
      id: 'arithmetic.pattern.recognition',
      title: 'Pattern Recognition',
      description: 'The ability to identify and project arithmetic patterns.',
    },
  },
};
