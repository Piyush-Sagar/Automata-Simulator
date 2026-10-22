import type {
  AnyAutomaton,
  PDAConfiguration,
  SimulationLimits,
  SimulationResult,
} from "./types";
import { simulateDFA } from "./dfa/simulate";
import { simulateNFA } from "./nfa/simulate";
import { simulatePDA } from "./pda/simulate";
import { simulateTM } from "./tm/simulate";

export interface ExecutionStep {
  step: number;
  activeStates: string[];
  transitionIds: string[];
  inputIndex: number;
  description: string;
  configurations?: PDAConfiguration[];
  tape?: [number, string][];
  head?: number;
}
export function simulateMachine(
  a: AnyAutomaton,
  input: string,
  limits: SimulationLimits,
): SimulationResult<ExecutionStep> {
  if (a.type === "DFA") {
    const result = simulateDFA(a, input, limits);
    return {
      ...result,
      steps: result.steps.map((s) => ({
        step: s.step,
        activeStates: [s.nextState ?? s.currentState],
        transitionIds: s.transitionId ? [s.transitionId] : [],
        inputIndex: s.step === 0 ? 0 : s.inputIndex + (s.nextState ? 1 : 0),
        description:
          s.inputSymbol === null
            ? "Initial configuration"
            : `Read ${s.inputSymbol}`,
      })),
    };
  }
  if (a.type === "NFA" || a.type === "ENFA") {
    const result = simulateNFA(a, input, limits);
    return {
      ...result,
      steps: result.steps.map((s) => ({
        step: s.step,
        activeStates: s.nextStates,
        transitionIds: s.transitionIds,
        inputIndex: s.inputIndex + 1,
        description:
          s.step === 0
            ? "Initial ε-closure"
            : `Read ${s.inputSymbol}; apply ε-closure`,
      })),
    };
  }
  if (a.type === "PDA") {
    const result = simulatePDA(a, input, limits);
    return {
      ...result,
      steps: result.steps.map((s) => ({
        ...s,
        activeStates: [...new Set(s.configurations.map((c) => c.state))],
        inputIndex: Math.max(...s.configurations.map((c) => c.inputIndex)),
        description: `${s.configurations.length} reachable configuration${s.configurations.length === 1 ? "" : "s"}`,
      })),
    };
  }
  const result = simulateTM(a, input, limits);
  return {
    ...result,
    steps: result.steps.map((s) => ({
      ...s,
      activeStates: [s.currentState],
      transitionIds: s.transitionId ? [s.transitionId] : [],
      inputIndex: 0,
      description: `Head at cell ${s.head}`,
    })),
  };
}
