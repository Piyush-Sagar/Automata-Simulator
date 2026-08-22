import {
  DEFAULT_SIMULATION_LIMITS,
  startStateOf,
  type ENFA,
  type NFA,
  type SimulationLimits,
  type SimulationResult,
} from "../types";
import { validateNFA } from "./validate";
import { epsilonClosure } from "./epsilonClosure";

export interface NFAStep {
  step: number;
  currentStates: string[];
  inputSymbol: string | null;
  inputIndex: number;
  nextStates: string[];
  transitionIds: string[];
}

export function simulateNFA(
  nfa: NFA | ENFA,
  input: string,
  limits: SimulationLimits = DEFAULT_SIMULATION_LIMITS,
): SimulationResult<NFAStep> {
  const errors = validateNFA(nfa);
  if (errors.length > 0) {
    return {
      status: "ERROR",
      steps: [],
      message:
        "The automaton configuration is invalid and cannot be simulated.\n" +
        errors.map((e) => `- ${e.message}`).join("\n"),
    };
  }

  const start = startStateOf(nfa);
  if (!start) {
    return {
      status: "ERROR",
      steps: [],
      message: "The automaton has no start state.",
    };
  }

  if (input.length > limits.maxInputLength) {
    return {
      status: "TIMEOUT",
      steps: [],
      message: `Input length ${input.length} exceeds maximum of ${limits.maxInputLength}.`,
    };
  }

  // Initial closure
  const initialClosure = Array.from(epsilonClosure(nfa, [start.id])).sort();
  
  const steps: NFAStep[] = [
    {
      step: 0,
      currentStates: initialClosure,
      inputSymbol: null,
      inputIndex: -1,
      nextStates: initialClosure,
      transitionIds: [],
    },
  ];

  let currentStates = initialClosure;

  for (let i = 0; i < input.length; i += 1) {
    const symbol = input[i];
    const nextStatesSet = new Set<string>();
    const transitionIds = new Set<string>();

    for (const state of currentStates) {
      const transitions = nfa.transitions.filter(
        (t) => t.from === state && t.symbol === symbol,
      );
      for (const t of transitions) {
        nextStatesSet.add(t.to);
        transitionIds.add(t.id);
      }
    }

    // Apply epsilon closure on the resulting states
    const closedNextStates = Array.from(epsilonClosure(nfa, nextStatesSet)).sort();

    steps.push({
      step: steps.length,
      currentStates,
      inputSymbol: symbol,
      inputIndex: i,
      nextStates: closedNextStates,
      transitionIds: Array.from(transitionIds),
    });

    currentStates = closedNextStates;
    
    if (currentStates.length === 0) {
      // Fast fail if we reach an empty state set
      return {
        status: "REJECTED",
        steps,
        message: `Simulation halted early: no valid transitions for input symbol '${symbol}' at position ${i + 1}.`,
      };
    }
  }

  const accepted = currentStates.some((s) => nfa.acceptStates.includes(s));
  return {
    status: accepted ? "ACCEPTED" : "REJECTED",
    steps,
    message: accepted
      ? "Input accepted."
      : "Input rejected. None of the active states are accepting.",
  };
}
