/**
 * 🔒 STRICT RENDERER CONTRACT
 * All renderers MUST conform to this interface.
 * No renderer may access game logic directly.
 */
import { VisualStep } from '../contracts/visualStep';

export interface RendererProps {
  visualStep: VisualStep | null;
  mode?: string;
  uiSkin?: 'default' | 'forge';
  timer?: {
    remaining: number;
    total: number;
  };
  // Adding the props currently used to avoid compilation errors
  flashState?: 'correct' | 'incorrect' | null;
  chainLength?: number;
  streakTier?: number;
  streakCount?: number;
  onCenterClick?: () => void;
}
