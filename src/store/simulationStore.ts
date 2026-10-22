import { create } from "zustand";
import type { SimulationResult } from "../engine/types";
import type { ExecutionStep } from "../engine/simulate";

type SimulationState = {
  inputString: string;
  setInputString: (s: string) => void;
  simulationResult: SimulationResult<ExecutionStep> | null;
  setSimulationResult: (r: SimulationResult<ExecutionStep> | null) => void;
  currentStepIndex: number;
  setCurrentStepIndex: (i: number) => void;
  isPlaying: boolean;
  setIsPlaying: (b: boolean) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (n: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  resetSimulation: () => void;
};
export const useSimulationStore = create<SimulationState>((set, get) => ({
  inputString: "",
  setInputString: (inputString) =>
    set({
      inputString,
      simulationResult: null,
      isPlaying: false,
      currentStepIndex: 0,
    }),
  simulationResult: null,
  setSimulationResult: (simulationResult) =>
    set({ simulationResult, currentStepIndex: 0, isPlaying: false }),
  currentStepIndex: 0,
  setCurrentStepIndex: (i) =>
    set({
      currentStepIndex: Math.max(
        0,
        Math.min(i, (get().simulationResult?.steps.length ?? 1) - 1),
      ),
      isPlaying: false,
    }),
  isPlaying: false,
  setIsPlaying: (isPlaying) =>
    set({ isPlaying: isPlaying && !!get().simulationResult?.steps.length }),
  playbackSpeed: 700,
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  stepForward: () => {
    const s = get();
    const last = Math.max(0, (s.simulationResult?.steps.length ?? 1) - 1);
    set({
      currentStepIndex: Math.min(s.currentStepIndex + 1, last),
      isPlaying: s.isPlaying && s.currentStepIndex + 1 < last,
    });
  },
  stepBackward: () =>
    set({
      currentStepIndex: Math.max(0, get().currentStepIndex - 1),
      isPlaying: false,
    }),
  resetSimulation: () => set({ currentStepIndex: 0, isPlaying: false }),
}));
