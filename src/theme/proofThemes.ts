import { PartialMathForgeTheme } from './themeTypes';

export const crystalForgeProofTheme: PartialMathForgeTheme = {
  id: "crystal-forge-proof",
  name: "Crystal Forge Proof",
  version: "0.1.0",
  description: "Non-gameplay shell proof theme for SkinLab token validation.",
  tokens: {
    startScreen: {
      mainPanel: {
        background: "rgba(17, 24, 39, 0.98)", // Very dark slate
        borderColor: "#06b6d4", // Cyan
      },
      title: {
        textShadow: "0 0 15px rgba(6, 182, 212, 0.8)", // Cyan glow
        primaryColor: "#e0e7ff",
      },
      splashCard: {
        background: "rgba(49, 46, 129, 0.95)", // Solid dark violet
        borderColor: "#22d3ee", // Bright cyan
        boxShadow: "0 0 30px rgba(34, 211, 238, 0.4)", // Cyan shadow
      }
    },
    panels: {
      pause: {
        backdrop: "rgba(17, 24, 39, 0.9)", // Dark slate backdrop
        panel: {
          background: "linear-gradient(145deg, #2e1065, #4c1d95)", // Purple gradient
          borderColor: "#22d3ee", // Cyan border
          boxShadow: "0 0 40px rgba(139, 92, 246, 0.6)", // Violet glow
        },
        titleColor: "#22d3ee", // Cyan title
      },
      help: {
        backdrop: "rgba(17, 24, 39, 0.9)",
        panel: {
          background: "linear-gradient(145deg, #2e1065, #4c1d95)",
          borderColor: "#22d3ee",
          boxShadow: "0 0 40px rgba(139, 92, 246, 0.6)",
        },
        titleColor: "#22d3ee",
      },
      settings: {
        backdrop: "rgba(17, 24, 39, 0.9)",
        panel: {
          background: "linear-gradient(145deg, #2e1065, #4c1d95)",
          borderColor: "#22d3ee",
          boxShadow: "0 0 40px rgba(139, 92, 246, 0.6)",
        },
        titleColor: "#22d3ee",
        bodyColor: "#e0e7ff",
      }
    }
  }
};
