import { PracticeLevelConfig } from '../types/practicePlan';

export interface ActivityPreset {
  name: string;
  subtitle: string;
  config: Partial<PracticeLevelConfig>;
}

export const ACTIVITY_PRESETS: ActivityPreset[] = [
  {
    name: "Counting by 2s",
    subtitle: "Skip Counting Practice",
    config: {
      mode: "skipcount",
      skipStep: 2,
      steps: 20,
      difficulty: 2,
      targetResponseTime: 3
    }
  },
  {
    name: "Counting by 3s",
    subtitle: "Skip Counting Practice",
    config: {
      mode: "skipcount",
      skipStep: 3,
      steps: 20,
      difficulty: 2,
      targetResponseTime: 3
    }
  },
  {
    name: "Counting by 4s",
    subtitle: "Skip Counting Practice",
    config: {
      mode: "skipcount",
      skipStep: 4,
      steps: 20,
      difficulty: 2,
      targetResponseTime: 3
    }
  },
  {
    name: "Multiplication Table 3",
    subtitle: "Fluency Drill",
    config: {
      mode: "multiplication_fluency",
      tableSelection: [3],
      steps: 20,
      difficulty: 3,
      targetResponseTime: 3
    }
  },
  {
    name: "Multiplication Table 7",
    subtitle: "Fluency Drill",
    config: {
      mode: "multiplication_fluency",
      tableSelection: [7],
      steps: 20,
      difficulty: 3,
      targetResponseTime: 3
    }
  },
  {
    name: "Pattern +3",
    subtitle: "Pattern Recognition",
    config: {
      mode: "pattern",
      patternType: "arithmetic",
      patternRule: "+3",
      sequenceLength: 4,
      steps: 20,
      difficulty: 3,
      targetResponseTime: 5
    }
  },
  {
    name: "Pattern +5",
    subtitle: "Pattern Recognition",
    config: {
      mode: "pattern",
      patternType: "arithmetic",
      patternRule: "+5",
      sequenceLength: 4,
      steps: 20,
      difficulty: 3,
      targetResponseTime: 5
    }
  },
  {
    name: "Skip Rhythm (4)",
    subtitle: "Momentum Chains",
    config: {
      mode: "skip_rhythm",
      skipStep: 4,
      patternType: "linear",
      steps: 20,
      difficulty: 3,
      targetResponseTime: 4
    }
  }
];
