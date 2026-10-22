export type SimulationStatus = "ACCEPTED" | "REJECTED" | "ERROR" | "TIMEOUT";

export interface SimulationResult<TStep> {
  status: SimulationStatus;
  steps: TStep[];
  message?: string;
}

export interface SimulationLimits {
  maxSteps: number;
  maxInputLength: number;
  maxConfigurations?: number;
  maxStackDepth?: number;
}

export const DEFAULT_SIMULATION_LIMITS: SimulationLimits = {
  maxSteps: 10000,
  maxInputLength: 10000,
  maxConfigurations: 2000,
  maxStackDepth: 256,
};
