import {
  DEFAULT_SIMULATION_LIMITS,
  startStateOf,
  type ENFA,
  type NFA,
  type SimulationLimits,
  type SimulationResult,
} from "../types";
import { validateNFA } from "./validate";
import { createEpsilonClosure } from "./epsilonClosure";
import { limitError } from "../common/limits";

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

  const symbols = Array.from(input);
  const limitProblem = limitError(input, nfa.alphabet, limits);
  if (limitProblem)
    return {
      status: symbols.length > limits.maxInputLength ? "TIMEOUT" : "ERROR",
      steps: [],
      message: limitProblem,
    };
  // Initial closure
  const closure = createEpsilonClosure(nfa);
  const table = new Map<string, typeof nfa.transitions>();
  for (const t of nfa.transitions) {
    const key = JSON.stringify([t.from, t.symbol]);
    const list = table.get(key) ?? [];
    list.push(t);
    table.set(key, list);
  }
  const initialClosure = Array.from(closure([start.id])).sort();
  const closureEdges = (states: string[]) =>
    states.flatMap((id) =>
      (table.get(JSON.stringify([id, "ε"])) ?? []).map((t) => t.id),
    );

  const steps: NFAStep[] = [
    {
      step: 0,
      currentStates: initialClosure,
      inputSymbol: null,
      inputIndex: -1,
      nextStates: initialClosure,
      transitionIds: closureEdges(initialClosure),
    },
  ];

  let currentStates = initialClosure;
  let traceSize = initialClosure.length;

  for (let i = 0; i < symbols.length; i += 1) {
    if (i >= limits.maxSteps)
      return {
        status: "TIMEOUT",
        steps,
        message: "Step limit reached before the input was exhausted.",
      };
    const symbol = symbols[i];
    const nextStatesSet = new Set<string>();
    const transitionIds = new Set<string>();

    for (const state of currentStates) {
      const transitions = table.get(JSON.stringify([state, symbol])) ?? [];
      for (const t of transitions) {
        nextStatesSet.add(t.to);
        transitionIds.add(t.id);
      }
    }

    // Apply epsilon closure on the resulting states
    const closedNextStates = Array.from(closure(nextStatesSet)).sort();
    for (const id of closureEdges(closedNextStates)) transitionIds.add(id);
    traceSize += closedNextStates.length + transitionIds.size;
    if (traceSize > 2_000_000)
      return {
        status: "TIMEOUT",
        steps,
        message: "Trace memory budget reached; acceptance is unknown.",
      };

    steps.push({
      step: steps.length,
      currentStates,
      inputSymbol: symbol,
      inputIndex: i,
      nextStates: closedNextStates,
      transitionIds: Array.from(transitionIds),
    });

    currentStates = closedNextStates;

    if (currentStates.length === 0 && i === symbols.length - 1) {
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
