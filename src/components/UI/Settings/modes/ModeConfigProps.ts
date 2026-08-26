import { AppConfig } from '../../../../types';

export interface ModeConfigProps {
  config: AppConfig;
  update: (key: keyof AppConfig, value: any) => void;
  updateOp: (op: string, value: boolean) => void;
}
