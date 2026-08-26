/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ErrorWeights } from '../../types/learning';

/*
AI_CONTEXT:
This module defines the global defaults for the learning intelligence layer.
These values are used to calibrate the reliability and mastery inference 
across all tracks.
*/

export const PlatformDefaultErrorWeights: ErrorWeights = {
  INCORRECT: 1.0,
  TIMEOUT: 0.5,
  HINT_USED: 0.25,
};

export const RELIABILITY_RATIO = 0.6;
export const PHASE_COVERAGE_THRESHOLD = 1.0;
