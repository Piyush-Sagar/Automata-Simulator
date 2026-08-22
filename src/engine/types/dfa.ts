import type { BaseAutomaton } from "./automaton";

export interface DFATransition {
  id: string;
  from: string;
  to: string;
  symbol: string;
}

export interface DFA extends BaseAutomaton {
  readonly type: "DFA";
  transitions: DFATransition[];
}
