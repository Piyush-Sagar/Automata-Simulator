import {
  DEFAULT_SIMULATION_LIMITS,
  startStateOf,
  stateLabel,
  type DFA,
  type DFATransition,
  type SimulationLimits,
  type SimulationResult,
} from "../types";
import { validateDFA } from "./validate";
import { limitError } from "../common/limits";

export interface DFAStep {
  step: number;
  currentState: string;
  inputSymbol: string | null;
  inputIndex: number;
  nextState: string | null;
  transitionId: string | null;
}

export function transitionKey(from: string, symbol: string): string {
  return `${from}::${symbol}`;
}

export function buildDFATransitionTable(dfa: DFA): Map<string, DFATransition> {
  const table = new Map<string, DFATransition>();
  for (const t of dfa.transitions) {
    table.set(transitionKey(t.from, t.symbol), t);
  }
  return table;
}

export function simulateDFA(
  dfa: DFA,
  input: string,
  limits: SimulationLimits = DEFAULT_SIMULATION_LIMITS,
): SimulationResult<DFAStep> {
  const errors = validateDFA(dfa);
  if (errors.length > 0) {
    return {
      status: "ERROR",
      steps: [],
      message:
        "The automaton configuration is invalid and cannot be simulated.\n" +
        errors.map((e) => `- ${e.message}`).join("\n"),
    };
  }

  const start = startStateOf(dfa);
  if (!start) {
    return {
      status: "ERROR",
      steps: [],
      message: "The automaton has no start state.",
    };
  }

  const symbols = Array.from(input);
  const limitProblem = limitError(input, dfa.alphabet, limits);
  if (limitProblem)
    return {
      status: symbols.length > limits.maxInputLength ? "TIMEOUT" : "ERROR",
      steps: [],
      message: limitProblem,
    };
  const table = buildDFATransitionTable(dfa);
  const steps: DFAStep[] = [
    {
      step: 0,
      currentState: start.id,
      inputSymbol: null,
      inputIndex: -1,
      nextState: null,
      transitionId: null,
    },
  ];

  let current = start.id;

  for (let i = 0; i < symbols.length; i += 1) {
    if (i >= limits.maxSteps)
      return {
        status: "TIMEOUT",
        steps,
        message: "Step limit reached before the input was exhausted.",
      };
    const symbol = symbols[i];
    const transition = table.get(transitionKey(current, symbol));

    if (transition === undefined) {
      steps.push({
        step: steps.length,
        currentState: current,
        inputSymbol: symbol,
        inputIndex: i,
        nextState: null,
        transitionId: null,
      });
      return {
        status: "REJECTED",
        steps,
        message: `No transition exists from state ${stateLabel(dfa, current)} for input symbol '${symbol}' (position ${i + 1} of the input).`,
      };
    }

    steps.push({
      step: steps.length,
      currentState: current,
      inputSymbol: symbol,
      inputIndex: i,
      nextState: transition.to,
      transitionId: transition.id,
    });

    current = transition.to;
  }

  const accepted = dfa.acceptStates.includes(current);
  return {
    status: accepted ? "ACCEPTED" : "REJECTED",
    steps,
    message: accepted
      ? `Input accepted. The machine halted in accepting state ${stateLabel(dfa, current)}.`
      : input.length === 0
        ? `Empty input rejected: the start state ${stateLabel(dfa, current)} is not an accepting state.`
        : `Input rejected. The machine consumed all input but halted in non-accepting state ${stateLabel(dfa, current)}.`,
  };
}

export function acceptsDFA(
  dfa: DFA,
  input: string,
  limits?: SimulationLimits,
): boolean {
  return simulateDFA(dfa, input, limits).status === "ACCEPTED";
}
