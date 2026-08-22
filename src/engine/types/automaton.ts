export type AutomatonType = "DFA" | "NFA" | "ENFA" | "PDA" | "TM";

export const EPSILON = "\u03B5";

export interface State {
  id: string;
  label: string;
  x: number;
  y: number;
  isStart: boolean;
  isAccept: boolean;
}

export interface BaseAutomaton {
  id: string;
  name: string;
  type: AutomatonType;
  states: State[];
  alphabet: string[];
  startState: string | null;
  acceptStates: string[];
}

export function findState(automaton: BaseAutomaton, stateId: string): State | undefined {
  return automaton.states.find((s) => s.id === stateId);
}

export function stateLabel(automaton: BaseAutomaton, stateId: string): string {
  return findState(automaton, stateId)?.label ?? stateId;
}

export function startStateOf(automaton: BaseAutomaton): State | null {
  if (!automaton.startState) return null;
  return findState(automaton, automaton.startState) ?? null;
}

export function isAccepting(
  automaton: BaseAutomaton,
  stateId: string,
): boolean {
  return automaton.acceptStates.includes(stateId);
}
