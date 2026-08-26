/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useCircuitClimbPrototypeRuntime } from './runtime/useCircuitClimbPrototypeRuntime';
import { CircuitClimbSurface } from './CircuitClimbSurface';

interface CircuitClimbDevHarnessProps {
  onExit: () => void;
}

export const CircuitClimbDevHarness: React.FC<CircuitClimbDevHarnessProps> = ({
  onExit,
}) => {
  const runtime = useCircuitClimbPrototypeRuntime();

  return (
    <div className="relative w-full h-full max-w-xl mx-auto flex items-center justify-center bg-[#03060d] rounded-3xl overflow-hidden shadow-2xl p-4">
      <CircuitClimbSurface
        runtime={runtime}
        onExit={onExit}
      />
    </div>
  );
};

export default CircuitClimbDevHarness;
