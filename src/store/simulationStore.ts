import { create } from "zustand";
import type { SimulationResult } from "../engine/types";
import type { DFAStep } from "../engine/dfa/simulate";

type SimulationState = {
  inputString: string;
  setInputString: (input: string) => void;

  simulationResult: SimulationResult<any> | null;
  setSimulationResult: (result: SimulationResult<any> | null) => void;

  currentStepIndex: number;
  setCurrentStepIndex: (index: number) => void;

  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;

  playbackSpeed: number; // milliseconds per step
  setPlaybackSpeed: (speed: number) => void;

  stepForward: () => void;
  stepBackward: () => void;
  resetSimulation: () => void;
};

export const useSimulationStore = create<SimulationState>((set, get) => ({
  inputString: "",
  setInputString: (input) => set({ inputString: input }),

  simulationResult: null as SimulationResult<any> | null,
  setSimulationResult: (result) =>
    set({
      simulationResult: result,
      currentStepIndex: 0,
      isPlaying: false,
    }),

  currentStepIndex: 0,
  setCurrentStepIndex: (index) => set({ currentStepIndex: index }),

  isPlaying: false,
  setIsPlaying: (isPlaying) => set({ isPlaying }),

  playbackSpeed: 1000,
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  stepForward: () => {
    const { currentStepIndex, simulationResult, setIsPlaying } = get();
    if (!simulationResult) return;

    if (currentStepIndex < simulationResult.steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    } else {
      setIsPlaying(false);
    }
  },

  stepBackward: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  resetSimulation: () => {
    set({
      currentStepIndex: 0,
      isPlaying: false,
    });
  },
}));
